"use client";

import { useEffect, useState } from "react";

type Member = {
  id: string;
  user_id: string;
  role: "editor" | "viewer";
  profiles?: { id: string; display_name: string | null; username: string | null; avatar_url: string | null } | null;
};

export default function TripCollaboration({ tripId }: { tripId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [owner, setOwner] = useState<Member["profiles"] | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<Member["role"]>("editor");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/trips/" + tripId + "/members");
    const data = await response.json();
    if (!response.ok) { setMessage(data.error || "Não foi possível carregar os colaboradores."); setLoading(false); return; }
    setMembers(data.members || []);
    setOwner(data.owner || null);
    setCanManage(Boolean(data.canManage));
    setCurrentUserId(data.currentUserId || "");
    setLoading(false);
  }

  useEffect(() => { load(); }, [tripId]);

  async function addMember(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/trips/" + tripId + "/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, role }),
    });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error || "Não foi possível adicionar."); return; }
    setUsername("");
    setMembers((current) => [...current.filter((item) => item.user_id !== data.member.user_id), data.member]);
    setMessage("Colaborador adicionado.");
  }

  async function changeRole(memberId: string, nextRole: Member["role"]) {
    const response = await fetch("/api/trips/" + tripId + "/members?memberId=" + memberId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: nextRole }),
    });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error || "Não foi possível alterar a permissão."); return; }
    setMembers((current) => current.map((item) => item.id === memberId ? data.member : item));
  }

  async function removeMember(memberId?: string, userId?: string) {
    if (!confirm("Remover este colaborador da viagem?")) return;
    const query = memberId ? "memberId=" + memberId : "userId=" + userId;
    const response = await fetch("/api/trips/" + tripId + "/members?" + query, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error || "Não foi possível remover."); return; }
    setMembers((current) => current.filter((item) => item.id !== memberId && item.user_id !== userId));
  }

  return <section className="mt-7 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Equipe</p><h2 className="mt-1 text-xl font-bold text-neutral-950">Colaboração</h2>
      <p className="mt-1 text-sm text-neutral-500">Convide outros viajantes para consultar ou editar esta viagem.</p>
    </div>
    {canManage && <form onSubmit={addMember} className="mt-5 grid gap-2 md:grid-cols-[1fr_auto_auto]">
      <input required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@username do viajante" className="rounded-xl border border-neutral-300 px-3 py-2.5" />
      <select value={role} onChange={(e) => setRole(e.target.value as Member["role"])} className="rounded-xl border border-neutral-300 px-3 py-2.5"><option value="editor">Pode editar</option><option value="viewer">Somente visualizar</option></select>
      <button className="rounded-xl bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white">Adicionar</button>
    </form>}
    {loading ? <p className="mt-5 text-sm text-neutral-500">Carregando colaboradores...</p> : <div className="mt-5 space-y-2">
      {owner && <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3">{owner.avatar_url ? <img src={owner.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">{(owner.display_name || owner.username || "U").slice(0,1).toUpperCase()}</div>}<div><p className="font-semibold">{owner.display_name || "Viajante"}</p><p className="text-xs text-neutral-500">@{owner.username || "sem username"}</p></div></div><span className="rounded-full bg-neutral-950 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">Proprietário</span></div>}
      {members.length === 0 ? <p className="text-sm text-neutral-500">Nenhum colaborador além do proprietário.</p> : members.map((member) => <div key={member.id} className="flex flex-col gap-3 rounded-2xl bg-neutral-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {member.profiles?.avatar_url ? <img src={member.profiles.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">{(member.profiles?.display_name || member.profiles?.username || "U").slice(0,1).toUpperCase()}</div>}
          <div><p className="font-semibold">{member.profiles?.display_name || "Viajante"}</p><p className="text-xs text-neutral-500">@{member.profiles?.username || "sem username"}</p></div>
        </div>
        <div className="flex items-center gap-2">
          {canManage ? <><select value={member.role} onChange={(e) => changeRole(member.id, e.target.value as Member["role"])} className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-xs"><option value="editor">Editor</option><option value="viewer">Visualizador</option></select><button onClick={() => removeMember(member.id)} className="text-xs font-semibold text-red-600">Remover</button></> : member.user_id === currentUserId ? <button onClick={() => removeMember(undefined, member.user_id)} className="text-xs font-semibold text-red-600">Sair da viagem</button> : <span className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs text-neutral-600">{member.role === "editor" ? "Editor" : "Visualizador"}</span>}
        </div>
      </div>)}
    </div>}
    {message && <p className="mt-3 text-sm text-neutral-600">{message}</p>}
  </section>;
}
