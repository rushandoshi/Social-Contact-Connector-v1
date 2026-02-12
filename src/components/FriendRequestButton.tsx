"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Friendship } from "@/lib/types/database";
import { UserPlus, UserCheck, Clock, Loader2, X } from "lucide-react";

type FriendshipState = "none" | "pending_sent" | "pending_received" | "accepted";

interface Props {
  currentUserId: string;
  targetUserId: string;
  initialFriendship: Friendship | null;
}

export default function FriendRequestButton({
  currentUserId,
  targetUserId,
  initialFriendship,
}: Props) {
  const [friendship, setFriendship] = useState<Friendship | null>(
    initialFriendship
  );
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  function getState(): FriendshipState {
    if (!friendship) return "none";
    if (friendship.status === "accepted") return "accepted";
    if (friendship.requester_id === currentUserId) return "pending_sent";
    return "pending_received";
  }

  async function sendRequest() {
    setLoading(true);
    const { data, error } = await supabase
      .from("friendships")
      .insert({
        requester_id: currentUserId,
        receiver_id: targetUserId,
      })
      .select()
      .single();

    if (!error && data) setFriendship(data);
    setLoading(false);
  }

  async function acceptRequest() {
    if (!friendship) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", friendship.id)
      .select()
      .single();

    if (!error && data) setFriendship(data);
    setLoading(false);
  }

  async function cancelOrRemove() {
    if (!friendship) return;
    setLoading(true);
    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", friendship.id);

    if (!error) setFriendship(null);
    setLoading(false);
  }

  const state = getState();

  if (loading) {
    return (
      <button
        disabled
        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm font-medium"
      >
        <Loader2 className="w-4 h-4 animate-spin" />
      </button>
    );
  }

  switch (state) {
    case "none":
      return (
        <button
          onClick={sendRequest}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
        >
          <UserPlus className="w-4 h-4" />
          Connect
        </button>
      );

    case "pending_sent":
      return (
        <button
          onClick={cancelOrRemove}
          className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg text-sm font-medium hover:bg-yellow-100 transition"
        >
          <Clock className="w-4 h-4" />
          Pending
          <X className="w-3 h-3" />
        </button>
      );

    case "pending_received":
      return (
        <div className="flex gap-2">
          <button
            onClick={acceptRequest}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
          >
            <UserCheck className="w-4 h-4" />
            Accept
          </button>
          <button
            onClick={cancelOrRemove}
            className="inline-flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      );

    case "accepted":
      return (
        <button
          onClick={cancelOrRemove}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-medium hover:bg-green-100 transition"
        >
          <UserCheck className="w-4 h-4" />
          Connected
        </button>
      );
  }
}
