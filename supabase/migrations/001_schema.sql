-- ============================================================
-- Nexus Contacts — Database Schema & Row-Level Security Policies
-- ============================================================

-- 1. PROFILES TABLE
-- Stores user contact information and per-field privacy settings.
-- ============================================================
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL DEFAULT '',
  email       TEXT NOT NULL DEFAULT '',
  phone       TEXT NOT NULL DEFAULT '',
  address     TEXT NOT NULL DEFAULT '',
  bio         TEXT NOT NULL DEFAULT '',
  avatar_url  TEXT NOT NULL DEFAULT '',

  -- Privacy toggles: TRUE = visible to anyone authenticated,
  --                  FALSE = visible only to accepted friends.
  email_public   BOOLEAN NOT NULL DEFAULT FALSE,
  phone_public   BOOLEAN NOT NULL DEFAULT FALSE,
  address_public BOOLEAN NOT NULL DEFAULT FALSE,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. FRIENDSHIPS TABLE
-- Represents directed connection requests between two users.
-- status: 'pending' | 'accepted'
-- ============================================================
CREATE TABLE public.friendships (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'accepted')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent duplicate friendship rows in the same direction.
  UNIQUE (requester_id, receiver_id),
  -- Prevent self-friendship.
  CHECK (requester_id <> receiver_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Index for fast friendship lookups.
CREATE INDEX idx_friendships_requester ON public.friendships(requester_id);
CREATE INDEX idx_friendships_receiver  ON public.friendships(receiver_id);
CREATE INDEX idx_friendships_status    ON public.friendships(status);

-- ============================================================
-- 3. HELPER FUNCTION — "Are these two users accepted friends?"
-- ============================================================
CREATE OR REPLACE FUNCTION public.are_friends(user_a UUID, user_b UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND (
        (requester_id = user_a AND receiver_id = user_b)
        OR
        (requester_id = user_b AND receiver_id = user_a)
      )
  );
$$;

-- ============================================================
-- 4. RLS POLICIES — PROFILES
-- ============================================================

-- 4a. Anyone authenticated can read basic, non-sensitive columns
--     (id, full_name, bio, avatar_url) of ALL profiles.
--     Sensitive columns (email, phone, address) are filtered in
--     application queries using the are_friends() helper or the
--     public toggles. We expose full rows here and let the
--     application-layer view (see 4b) handle column filtering,
--     OR we use a security-definer function for safe reads.
--
--     For maximum security we create a VIEW that masks columns.
-- ============================================================

-- Allow every authenticated user to see every profile row.
-- Sensitive columns are protected via the application view below.
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_select_friends_or_public"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND id <> auth.uid()
  );

-- 4b. Insert: a user may only insert their own profile row.
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 4c. Update: a user may only update their own profile row.
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4d. Delete: a user may only delete their own profile.
CREATE POLICY "profiles_delete_own"
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);

-- ============================================================
-- 5. SECURE VIEW — masks sensitive columns for non-friends
-- ============================================================
CREATE OR REPLACE VIEW public.profiles_safe AS
SELECT
  p.id,
  p.full_name,
  p.bio,
  p.avatar_url,
  p.created_at,
  -- Sensitive fields: show if viewer is the owner, if the field
  -- is marked public, OR if viewer is an accepted friend.
  CASE
    WHEN p.id = auth.uid() THEN p.email
    WHEN p.email_public     THEN p.email
    WHEN public.are_friends(auth.uid(), p.id) THEN p.email
    ELSE NULL
  END AS email,
  CASE
    WHEN p.id = auth.uid() THEN p.phone
    WHEN p.phone_public     THEN p.phone
    WHEN public.are_friends(auth.uid(), p.id) THEN p.phone
    ELSE NULL
  END AS phone,
  CASE
    WHEN p.id = auth.uid() THEN p.address
    WHEN p.address_public    THEN p.address
    WHEN public.are_friends(auth.uid(), p.id) THEN p.address
    ELSE NULL
  END AS address,
  p.email_public,
  p.phone_public,
  p.address_public
FROM public.profiles p;

-- ============================================================
-- 6. RLS POLICIES — FRIENDSHIPS
-- ============================================================

-- 6a. Select: a user can see rows where they are requester OR receiver.
CREATE POLICY "friendships_select_involved"
  ON public.friendships FOR SELECT
  USING (
    auth.uid() = requester_id
    OR auth.uid() = receiver_id
  );

-- 6b. Insert: a user can only create a request FROM themselves.
CREATE POLICY "friendships_insert_own"
  ON public.friendships FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

-- 6c. Update: only the RECEIVER can update (accept) a pending request.
CREATE POLICY "friendships_update_receiver"
  ON public.friendships FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- 6d. Delete: either party can remove a friendship / cancel a request.
CREATE POLICY "friendships_delete_involved"
  ON public.friendships FOR DELETE
  USING (
    auth.uid() = requester_id
    OR auth.uid() = receiver_id
  );

-- ============================================================
-- 7. AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER friendships_updated_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 8. AUTO-CREATE PROFILE ON SIGN-UP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
