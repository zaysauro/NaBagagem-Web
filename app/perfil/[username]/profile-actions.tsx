"use client";

import { useEffect, useState } from "react";

type ConnectionUser = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export default function ProfileActions({ username }: { username: string }) {
  const [data, setData] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [list, setList] = useState<ConnectionUser[] | null>(null);
  const [listType, setListType] = useState<"followers" | "following">("followers");
  const [listLoading, setListLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  async function load() {
    const r = await fetch("/api/social/profile?username=" + encodeURIComponent(username), { cache: "no-store" });
    const d = await r.json();
    if (r.ok) setData(d);
    else setMessage(d.error || "Não foi possível carregar o perfil.");
  }

  useEffect(() => { load(); }, [username]);

  async function showConnections(type: "followers" | "following") {
    setListType(type);
    setListLoading(true);
    setList(null);
    const r = await fetch("/api/social/connections?username=" + encodeURIComponent(username) + "&type=" + type, { cache: "no-store" });
    const d = await r.json();
    if (r.ok) setList(d.users || []);
    else setMessage(d.error || "Não foi possível carregar a lista.");
    setListLoading(false);
  }

  async function toggleFollow() {
    const target = data?.profile?.id;
    if (!target || actionLoading) return;
    setActionLoading(true);
    setMessage("");
    const action = data.isFollowing ? "unfollow" : "follow";
    const r = await fetch("/api/social/follow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: target, action }),
    });
    const d = await r.json();
    if (!r.ok) {
      setMessage(d.error || "Não foi possível atualizar o seguimento.");
      setActionLoading(false);
      return;
    }
    await load();
    setActionLoading(false);
  }

  if (!data) return <div className="mt-4 text-sm text-white/45">Carregando conexões...</div>;

  const followLabel = data.isFollowing
    ? data.isMutual ? "Amigos" : "Seguindo"
    : data.followsMe ? "Seguir de volta" : "Seguir";

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3">
      <button onClick={() => showConnections("followers")} className="text-left text-sm text-white/55 hover:text-white">
        <b className="text-white">{data.followers}</b> seguidores
      </button>
      <button onClick={() => showConnections("following")} className="text-left text-sm text-white/55 hover:text-white">
        <b className="text-white">{data.following}</b> seguindo
      </button>
      {data.profile?.id && (
        <button
          onClick={toggleFollow}
          disabled={actionLoading}
          className={"rounded-xl px-4 py-2 text-sm font-bold transition disabled:opacity-50 " + (
            data.isFollowing
              ? "border border-white/15 bg-white text-neutral-900 hover:bg-neutral-100"
              : "bg-white text-neutral-900 hover:bg-neutral-200"
          )}
        >
          {actionLoading ? "Atualizando..." : followLabel}
        </button>
      )}
      {message && <span className="w-full text-sm text-red-300">{message}</span>}

      {(listLoading || list) && (
        <div className="w-full rounded-2xl border border-white/10 bg-white/[.06] p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-white">{listType === "followers" ? "Seguidores" : "Seguindo"}</p>
            <button onClick={() => setList(null)} className="text-xs font-semibold text-white/45 hover:text-white">Fechar</button>
          </div>
          {listLoading ? (
            <p className="mt-3 text-sm text-white/45">Carregando...</p>
          ) : list?.length ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {list.map((u) => (
                <a key={u.id} href={"/perfil/" + (u.username || u.id)} className="flex items-center gap-3 rounded-xl bg-white/10 p-2 transition hover:bg-white/15">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} className="h-9 w-9 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-xs font-bold text-neutral-900">
                      {(u.display_name || u.username || "U")[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{u.display_name || "Viajante"}</p>
                    <p className="truncate text-xs text-white/45">@{u.username || "sem username"}</p>
                  </div>
                </a>
              ))}
            </div>
          ) : <p className="mt-3 text-sm text-white/45">Nenhuma conexão encontrada.</p>}
        </div>
      )}
    </div>
  );
}
