export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Friendship } from "@/lib/types/database";
import {
  Users,
  UserPlus,
  Search,
  Mail,
  Phone,
  MapPin,
  Lock,
} from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch accepted friendships involving the current user.
  const { data: friendships } = await supabase
    .from("friendships")
    .select("*")
    .eq("status", "accepted")
    .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .returns<Friendship[]>();

  // Collect the IDs of friends.
  const friendIds = (friendships ?? []).map((f) =>
    f.requester_id === user.id ? f.receiver_id : f.requester_id
  );

  // Fetch friend profiles through the secure view.
  let friends: Array<{
    id: string;
    full_name: string;
    bio: string;
    avatar_url: string;
    email: string | null;
    phone: string | null;
    address: string | null;
  }> = [];

  if (friendIds.length > 0) {
    const { data } = await supabase
      .from("profiles_safe")
      .select("id, full_name, bio, avatar_url, email, phone, address")
      .in("id", friendIds);
    friends = data ?? [];
  }

  // Pending requests received (for badge count).
  const { count: pendingCount } = await supabase
    .from("friendships")
    .select("*", { count: "exact", head: true })
    .eq("receiver_id", user.id)
    .eq("status", "pending");

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Connections</h1>
          <p className="text-gray-500 mt-1">
            {friends.length} friend{friends.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/search"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            <Search className="w-4 h-4" />
            Find People
          </Link>
          <Link
            href="/requests"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition relative"
          >
            <UserPlus className="w-4 h-4" />
            Requests
            {(pendingCount ?? 0) > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Friends list */}
      {friends.length === 0 ? (
        <div className="text-center py-20">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900">
            No connections yet
          </h2>
          <p className="text-gray-500 mt-2 mb-6">
            Search for people and send connection requests to start building
            your address book.
          </p>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
          >
            <Search className="w-4 h-4" />
            Find People
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {friends.map((friend) => (
            <div
              key={friend.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-indigo-600 font-semibold text-lg">
                    {friend.full_name?.charAt(0)?.toUpperCase() || "?"}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {friend.full_name || "Unnamed"}
                  </h3>
                  {friend.bio && (
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                      {friend.bio}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <ContactField
                  icon={<Mail className="w-4 h-4" />}
                  value={friend.email}
                  label="Email"
                />
                <ContactField
                  icon={<Phone className="w-4 h-4" />}
                  value={friend.phone}
                  label="Phone"
                />
                <ContactField
                  icon={<MapPin className="w-4 h-4" />}
                  value={friend.address}
                  label="Address"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ContactField({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string | null;
  label: string;
}) {
  if (!value) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        {icon}
        <Lock className="w-3 h-3" />
        <span>{label} hidden</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-sm text-gray-700">
      {icon}
      <span className="truncate">{value}</span>
    </div>
  );
}
