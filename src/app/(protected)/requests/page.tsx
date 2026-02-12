"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Friendship } from "@/lib/types/database";
import {
  UserCheck,
  X,
  Loader2,
  Inbox,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";

interface RequestWithProfile extends Friendship {
  profile: {
    id: string;
    full_name: string;
    bio: string;
  };
}

export default function RequestsPage() {
  const [incoming, setIncoming] = useState<RequestWithProfile[]>([]);
  const [outgoing, setOutgoing] = useState<RequestWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const supabase = createClient();

  const loadRequests = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Incoming pending requests.
    const { data: inReqs } = await supabase
      .from("friendships")
      .select("*")
      .eq("receiver_id", user.id)
      .eq("status", "pending");

    // Outgoing pending requests.
    const { data: outReqs } = await supabase
      .from("friendships")
      .select("*")
      .eq("requester_id", user.id)
      .eq("status", "pending");

    // Fetch profile data for all involved users.
    const inIds = (inReqs ?? []).map((r) => r.requester_id);
    const outIds = (outReqs ?? []).map((r) => r.receiver_id);
    const allIds = [...new Set([...inIds, ...outIds])];

    let profileMap: Record<string, { id: string; full_name: string; bio: string }> = {};
    if (allIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, bio")
        .in("id", allIds);

      (profiles ?? []).forEach((p) => {
        profileMap[p.id] = p;
      });
    }

    setIncoming(
      (inReqs ?? []).map((r) => ({
        ...r,
        profile: profileMap[r.requester_id] ?? {
          id: r.requester_id,
          full_name: "Unknown",
          bio: "",
        },
      }))
    );

    setOutgoing(
      (outReqs ?? []).map((r) => ({
        ...r,
        profile: profileMap[r.receiver_id] ?? {
          id: r.receiver_id,
          full_name: "Unknown",
          bio: "",
        },
      }))
    );

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  async function acceptRequest(id: string) {
    setActionLoading(id);
    await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", id);
    setIncoming((prev) => prev.filter((r) => r.id !== id));
    setActionLoading(null);
  }

  async function declineRequest(id: string) {
    setActionLoading(id);
    await supabase.from("friendships").delete().eq("id", id);
    setIncoming((prev) => prev.filter((r) => r.id !== id));
    setActionLoading(null);
  }

  async function cancelRequest(id: string) {
    setActionLoading(id);
    await supabase.from("friendships").delete().eq("id", id);
    setOutgoing((prev) => prev.filter((r) => r.id !== id));
    setActionLoading(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">
        Connection Requests
      </h1>

      {/* Incoming requests */}
      <section className="mb-10">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
          <ArrowDownLeft className="w-5 h-5 text-green-600" />
          Received
          {incoming.length > 0 && (
            <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {incoming.length}
            </span>
          )}
        </h2>

        {incoming.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-xl">
            <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No pending requests</p>
          </div>
        ) : (
          <div className="space-y-3">
            {incoming.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-green-700 font-semibold">
                      {req.profile.full_name?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {req.profile.full_name}
                    </p>
                    {req.profile.bio && (
                      <p className="text-sm text-gray-500 truncate max-w-xs">
                        {req.profile.bio}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {actionLoading === req.id ? (
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  ) : (
                    <>
                      <button
                        onClick={() => acceptRequest(req.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
                      >
                        <UserCheck className="w-4 h-4" />
                        Accept
                      </button>
                      <button
                        onClick={() => declineRequest(req.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Outgoing requests */}
      <section>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
          <ArrowUpRight className="w-5 h-5 text-yellow-600" />
          Sent
          {outgoing.length > 0 && (
            <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {outgoing.length}
            </span>
          )}
        </h2>

        {outgoing.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-xl">
            <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No pending sent requests</p>
          </div>
        ) : (
          <div className="space-y-3">
            {outgoing.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                    <span className="text-yellow-700 font-semibold">
                      {req.profile.full_name?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {req.profile.full_name}
                    </p>
                    {req.profile.bio && (
                      <p className="text-sm text-gray-500 truncate max-w-xs">
                        {req.profile.bio}
                      </p>
                    )}
                  </div>
                </div>
                {actionLoading === req.id ? (
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                ) : (
                  <button
                    onClick={() => cancelRequest(req.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-100 transition"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
