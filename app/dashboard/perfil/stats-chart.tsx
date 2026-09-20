"use client";

type Month = { label: string; trips: number; expenses: number };

export function StatsChart({ data }: { data: Month[] }) {
  const maxTrips = Math.max(1, ...data.map((x) => x.trips));
  const maxExpenses = Math.max(1, ...data.map((x) => x.expenses));
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <h3 className="mb-3 text-sm font-semibold">Viagens por mês</h3>
        <div className="flex h-44 items-end gap-2 rounded-2xl bg-neutral-50 p-4">
          {data.map((m) => <div key={m.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[10px] text-neutral-500">{m.trips || ""}</span>
            <div className="w-full rounded-t-md bg-neutral-900" style={{height: Math.max(4,(m.trips/maxTrips)*105)}} />
            <span className="text-[9px] text-neutral-400">{m.label}</span>
          </div>)}
        </div>
      </div>
      <div>
        <h3 className="mb-3 text-sm font-semibold">Gastos por mês</h3>
        <div className="flex h-44 items-end gap-2 rounded-2xl bg-neutral-50 p-4">
          {data.map((m) => <div key={m.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[10px] text-neutral-500">{m.expenses ? Math.round(m.expenses) : ""}</span>
            <div className="w-full rounded-t-md bg-neutral-500" style={{height: Math.max(4,(m.expenses/maxExpenses)*105)}} />
            <span className="text-[9px] text-neutral-400">{m.label}</span>
          </div>)}
        </div>
      </div>
    </div>
  );
}
