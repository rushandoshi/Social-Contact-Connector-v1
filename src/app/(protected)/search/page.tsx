"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Friendship } from "@/lib/types/database";
import FriendRequestButton from "@/components/FriendRequestButton";
import { Search, Loader2, Users } from "lucide-react";

interface SearchResult {
  id: string;
  full_name: string;
  bio: string;
  avatar_url: string;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [friendships, setFriendships] = useState<Record<string, Friendship>>(
    {}
  );
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const supabase = createClient();

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    setCurrentUserId(user.id);

    // Search profiles by name or email (case-insensitive).
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, bio, avatar_url")
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
      .neq("id", user.id)
      .limit(20);

    const found = profiles ?? [];
    setResults(found);

    // Fetch existing friendship rows for these users.
    if (found.length > 0) {
      const ids = found.map((p) => p.id);
      const { data: ships } = await supabase
        .from("friendships")
        .select("*")
        .or(
          ids
            .flatMap((id) => [
              `and(requester_id.eq.${user.id},receiver_id.eq.${id})`,
              `and(requester_id.eq.${id},receiver_id.eq.${user.id})`,
            ])
            .join(",")
        );

      const map: Record<string, Friendship> = {};
      (ships ?? []).forEach((s) => {
        const otherId =
          s.requester_id === user.id ? s.receiver_id : s.requester_id;
        map[otherId] = s;
      });
      setFriendships(map);
    } else {
      setFriendships({});
    }

    setLoading(false);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Find People</h1>

      <form onSubmit={handleSearch} className="flex gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-2"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Search"
          )}
        </button>
      </form>

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            No users found matching &ldquo;{query}&rdquo;
          </p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-3">
          {results.map((person) => (
            <div
              key={person.id}
              className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-indigo-600 font-semibold">
                    {person.full_name?.charAt(0)?.toUpperCase() || "?"}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {person.full_name || "Unnamed"}
                  </p>
                  {person.bio && (
                    <p className="text-sm text-gray-500 truncate">
                      {person.bio}
                    </p>
                  )}
                </div>
              </div>
              <FriendRequestButton
                currentUserId={currentUserId}
                targetUserId={person.id}
                initialFriendship={friendships[person.id] ?? null}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
