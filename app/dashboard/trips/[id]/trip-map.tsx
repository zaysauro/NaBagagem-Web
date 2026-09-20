"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Point = { id: string; name: string; city: string | null; country: string | null; latitude: number | null; longitude: number | null };

export default function TripMap({ locations }: { locations: Point[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const points = locations.filter((p) => p.latitude != null && p.longitude != null) as Array<Point & { latitude: number; longitude: number }>;
    const map = L.map(ref.current, { scrollWheelZoom: true });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    if (!points.length) {
      map.setView([20, 0], 2);
    } else {
      const bounds = L.latLngBounds(points.map((p) => [p.latitude, p.longitude] as [number, number]));
      map.fitBounds(bounds.pad(0.2), { maxZoom: 13 });
      points.forEach((p, index) => {
        L.marker([p.latitude, p.longitude])
          .addTo(map)
          .bindPopup("<strong>" + escapeHtml(String(index + 1) + ". " + p.name) + "</strong><br/>" + escapeHtml([p.city, p.country].filter(Boolean).join(", ")));
      });
      if (points.length > 1) {
        L.polyline(points.map((p) => [p.latitude, p.longitude] as [number, number]), { weight: 4 }).addTo(map);
      }
    }

    const timer = window.setTimeout(() => map.invalidateSize(), 100);

    return () => {
      window.clearTimeout(timer);
      map.remove();
    };
  }, [locations]);

  return <div ref={ref} className="h-[420px] w-full overflow-hidden rounded-2xl" />;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char] || char));
}
