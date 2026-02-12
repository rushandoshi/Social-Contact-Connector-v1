"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, ProfileUpdate } from "@/lib/types/database";
import {
  Save,
  Loader2,
  User,
  Mail,
  Phone,
  MapPin,
  Eye,
  EyeOff,
} from "lucide-react";

type PrivacyField = "email_public" | "phone_public" | "address_public";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const supabase = createClient();

  const loadProfile = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) setProfile(data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    setMessage(null);

    const updates: ProfileUpdate = {
      full_name: profile.full_name,
      email: profile.email,
      phone: profile.phone,
      address: profile.address,
      bio: profile.bio,
      email_public: profile.email_public,
      phone_public: profile.phone_public,
      address_public: profile.address_public,
    };
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", profile.id);

    setSaving(false);
    setMessage(
      error
        ? { type: "error", text: "Failed to save profile." }
        : { type: "success", text: "Profile updated." }
    );
  }

  function togglePrivacy(field: PrivacyField) {
    if (!profile) return;
    setProfile({ ...profile, [field]: !profile[field] });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20 text-gray-500">
        Profile not found. Please log in.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Full Name */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
            <User className="w-4 h-4" />
            Full Name
          </label>
          <input
            type="text"
            value={profile.full_name}
            onChange={(e) =>
              setProfile({ ...profile, full_name: e.target.value })
            }
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
          />
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bio
          </label>
          <textarea
            value={profile.bio}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition resize-none"
          />
        </div>

        {/* Email — with privacy toggle */}
        <FieldWithPrivacy
          icon={<Mail className="w-4 h-4" />}
          label="Email"
          type="email"
          value={profile.email}
          isPublic={profile.email_public}
          onChange={(v) => setProfile({ ...profile, email: v })}
          onToggle={() => togglePrivacy("email_public")}
        />

        {/* Phone — with privacy toggle */}
        <FieldWithPrivacy
          icon={<Phone className="w-4 h-4" />}
          label="Phone"
          type="tel"
          value={profile.phone}
          isPublic={profile.phone_public}
          onChange={(v) => setProfile({ ...profile, phone: v })}
          onToggle={() => togglePrivacy("phone_public")}
        />

        {/* Address — with privacy toggle */}
        <FieldWithPrivacy
          icon={<MapPin className="w-4 h-4" />}
          label="Address"
          type="text"
          value={profile.address}
          isPublic={profile.address_public}
          onChange={(v) => setProfile({ ...profile, address: v })}
          onToggle={() => togglePrivacy("address_public")}
        />

        {message && (
          <p
            className={`text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}
          >
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> Save Profile
            </>
          )}
        </button>
      </form>
    </div>
  );
}

function FieldWithPrivacy({
  icon,
  label,
  type,
  value,
  isPublic,
  onChange,
  onToggle,
}: {
  icon: React.ReactNode;
  label: string;
  type: string;
  value: string;
  isPublic: boolean;
  onChange: (v: string) => void;
  onToggle: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          {icon}
          {label}
        </label>
        <button
          type="button"
          onClick={onToggle}
          className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition ${
            isPublic
              ? "bg-green-100 text-green-700 hover:bg-green-200"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {isPublic ? (
            <>
              <Eye className="w-3 h-3" /> Public
            </>
          ) : (
            <>
              <EyeOff className="w-3 h-3" /> Friends Only
            </>
          )}
        </button>
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
      />
    </div>
  );
}
