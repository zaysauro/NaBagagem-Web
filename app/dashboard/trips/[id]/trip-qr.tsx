"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function TripQr({ shareUrl }: { shareUrl: string }) {
  const [dataUrl, setDataUrl] = useState("");
  useEffect(() => {
    if (!shareUrl) { setDataUrl(""); return; }
    QRCode.toDataURL(shareUrl, { width: 240, margin: 2, errorCorrectionLevel: "M" }).then(setDataUrl).catch(() => setDataUrl(""));
  }, [shareUrl]);

  if (!shareUrl || !dataUrl) return null;
  return <div className="mt-4 flex flex-col items-center rounded-2xl border bg-neutral-50 p-5 sm:flex-row sm:items-center sm:gap-5">
    <img src={dataUrl} alt="QR Code para abrir a viagem" width={180} height={180} className="h-[180px] w-[180px] rounded-xl bg-white p-2" />
    <div><p className="text-sm font-bold">Abrir no celular</p><p className="mt-1 text-xs text-neutral-500">Escaneie o QR Code para abrir a versão pública desta viagem.</p></div>
  </div>;
}
