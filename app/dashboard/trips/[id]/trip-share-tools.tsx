"use client";

import { useRef, useState } from "react";
import TripQr from "./trip-qr";

export default function TripShareTools({ tripId }: { tripId: string }) {
  const [shareUrl, setShareUrl] = useState("");
  const [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function share() {
    const r = await fetch("/api/trips/" + tripId + "/share", { method: "POST" });
    const d = await r.json();
    if (!r.ok) { setMessage(d.error || "Não foi possível gerar o link."); return; }
    const url = window.location.origin + d.url;
    setShareUrl(url);
    try { await navigator.clipboard.writeText(url); setMessage("Link público copiado."); }
    catch { setMessage("Link público gerado."); }
  }

  function exportFile(format: "gpx" | "kml" | "json") {
    window.location.href = "/api/trips/" + tripId + "/export?format=" + format;
  }

  async function importFile(file: File) {
    const form = new FormData();
    form.append("file", file);
    const r = await fetch("/api/trips/import", { method: "POST", body: form });
    const d = await r.json();
    if (!r.ok) { setMessage(d.error || "Falha na importação."); return; }
    window.location.href = "/dashboard/trips/" + d.trip.id;
  }

  return <section className="mt-7 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
    <h2 className="text-xl font-bold">Compartilhar e exportar</h2>
    <p className="mt-1 text-sm text-neutral-500">Publique uma versão somente leitura ou leve o roteiro para outros aplicativos.</p>
    <div className="mt-4 flex flex-wrap gap-2">
      <button onClick={share} className="rounded-xl bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white">Gerar link público</button>
      <button onClick={() => exportFile("gpx")} className="rounded-xl border px-4 py-2.5 text-sm font-semibold">Exportar GPX</button>
      <button onClick={() => exportFile("kml")} className="rounded-xl border px-4 py-2.5 text-sm font-semibold">Exportar KML</button>
      <button onClick={() => exportFile("json")} className="rounded-xl border px-4 py-2.5 text-sm font-semibold">Backup JSON</button>
      <button onClick={() => exportFile("ics")} className="rounded-xl border px-4 py-2.5 text-sm font-semibold">Calendário .ics</button>
      <label className="cursor-pointer rounded-xl border px-4 py-2.5 text-sm font-semibold">
        Importar GPX/KML/JSON
        <input ref={input} type="file" accept=".gpx,.kml,.json,application/gpx+xml,application/vnd.google-earth.kml+xml,application/json" className="hidden"
          onChange={e => { const file = e.target.files?.[0]; if (file) importFile(file); }} />
      </label>
    </div>
    {shareUrl && <><input readOnly value={shareUrl} onFocus={e => e.currentTarget.select()} className="mt-4 w-full rounded-xl border bg-neutral-50 px-3 py-2 text-sm" /><TripQr shareUrl={shareUrl} /></>}
    {message && <p className="mt-3 text-sm text-neutral-600">{message}</p>}
  </section>;
}
