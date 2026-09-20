"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewTripPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          start_date: startDate || null,
          end_date: endDate || null,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Não foi possível criar a viagem.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/dashboard" className="text-sm font-semibold text-neutral-600">
          ← Voltar para minhas viagens
        </Link>

        <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-7 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">Nova viagem</p>
          <h1 className="mt-1 text-3xl font-bold text-neutral-950">
            Vamos colocar essa viagem na bagagem.
          </h1>

          <form onSubmit={submit} className="mt-8 space-y-5">
            <label className="block">
              <span className="text-sm font-semibold text-neutral-800">Nome</span>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Japão 2027"
                className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-neutral-950"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-neutral-800">Descrição</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Uma lembrança, objetivo ou descrição da viagem..."
                rows={4}
                className="mt-2 w-full resize-none rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-neutral-950"
              />
            </label>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-neutral-800">Começa em</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-neutral-800">Termina em</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3"
                />
              </label>
            </div>

            {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

            <button
              disabled={loading}
              className="w-full rounded-xl bg-neutral-950 px-4 py-3 font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Criando..." : "Criar viagem"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
