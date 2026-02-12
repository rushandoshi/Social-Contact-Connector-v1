# Nexus Contacts

A social address book where contact info is only visible to verified friends.

## Tech Stack

- **Frontend:** Next.js 16 (App Router), Tailwind CSS, Lucide React
- **Backend/Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth (Magic Links)

## Getting Started

### 1. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the SQL migration in the Supabase SQL Editor: `supabase/migrations/001_schema.sql`
3. Copy your project URL and anon key from **Settings > API**

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase credentials.

### 3. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
  app/
    page.tsx                     # Landing page
    login/page.tsx               # Magic link auth
    auth/callback/route.ts       # OAuth callback
    (protected)/                 # Auth-guarded route group
      layout.tsx                 # Navigation wrapper
      dashboard/page.tsx         # "My Connections" contact list
      profile/page.tsx           # Edit profile + privacy toggles
      search/page.tsx            # Find users by name/email
      requests/page.tsx          # Manage incoming/outgoing requests
  components/
    Navigation.tsx               # App navigation bar
    FriendRequestButton.tsx      # Connect/Pending/Accept state machine
  lib/
    supabase/
      client.ts                  # Browser Supabase client
      server.ts                  # Server Supabase client
      middleware.ts              # Session refresh middleware
    types/
      database.ts                # TypeScript types for Supabase schema
  middleware.ts                  # Next.js middleware (auth guard)
supabase/
  migrations/
    001_schema.sql               # Full schema + RLS policies
```

## Security Model

- **Row-Level Security (RLS)** enforced at the database level
- Sensitive fields (email, phone, address) masked via a `profiles_safe` PostgreSQL view
- Fields only revealed if: you own the profile, the field is marked public, or you're an accepted friend
- Friendship requires mutual consent (requester sends, receiver accepts)
- Per-field privacy toggles: each field can be "Public" or "Friends Only"
