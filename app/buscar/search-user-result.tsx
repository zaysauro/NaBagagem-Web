"use client";

import Link from "next/link";
import { useState } from "react";

type User = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio?: string | null;
  isFollowing?: boolean;
  followsMe?: boolean;
};

export default function SearchUserResult({ user }: { user: User }) {
  const [following, setFollowing] = useState(Boolean(user.isFollowing));
  const [followsMe] = useState(Boolean(user.followsMe));
  const [loading, setLoading] = useState(false);

  const profilePath = "/perfil/" + encodeURIComponent(user.username || user.id);
  const label = following
    ? followsMe
      ? "Amigos"
      : "Seguindo"
    : followsMe
      ? "Seguir de volta"
      : "Seguir";

  async function toggleFollow() {
    if (loading) return;
    setLoading(true);

    const response = await fetch("/api/social/follow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.id,
        action: following ? "unfollow" : "follow",
      }),
    });

    if (response.ok) {
      setFollowing(!following);
    }

    setLoading(false);
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-neutral-50 p-3">
      <Link href={profilePath} className="flex min-w-0 flex-1 items-center gap-3">
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-sm font-bold text-white">
            {(user.display_name || user.username || "U")[0].toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate font-semibold">{user.display_name || "Viajante"}</p>
          {user.username ? (
            <p className="truncate text-xs text-neutral-500">@{user.username}</p>
          ) : (
            <p className="truncate text-xs text-neutral-500">Perfil do viajante</p>
          )}
        </div>
      </Link>

      <button
        type="button"
        onClick={toggleFollow}
        disabled={loading}
        className={
          "shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition disabled:opacity-50 " +
          (following
            ? "border bg-white text-neutral-900 hover:bg-neutral-100"
            : "bg-neutral-950 text-white hover:bg-neutral-800")
        }
      >
        {loading ? "..." : label}
      </button>
    </div>
  );
}
