// e.g., src/components/metrics/Standings.tsx
import { useMetrics } from "./MetricsProvider";

export default function Standings() {
  const { standings, loading } = useMetrics();
  if (loading) return <p className="text-sm text-zinc-400">Loading…</p>;
  if (!standings) return <p className="text-sm text-zinc-400">Select a league</p>;
  if (standings.length === 0) return <p className="text-sm text-zinc-400">No matches yet.</p>;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
  <h2 className="mb-2 text-lg font-semibold">Leaderboard</h2>

  {/* allow horizontal scroll on narrow phones */}
  <div className="-mx-5 overflow-x-auto">
    <ul className="divide-y divide-white/10 text-[13px]">
  {/* Header row */}
  <li className="flex items-center py-1 text-[11px] uppercase tracking-wide text-zinc-400">
    <span className="w-5" /> {/* Rank */}
    <span className="ml-2 flex-1 min-w-0" /> {/* Name */}
    <span className="w-10 text-right">Rec</span>
    <span className="w-11 text-right">Win%</span>
    <span className="w-16 text-right">PF/PA</span>
    <span className="w-10 text-right">Str</span>
  </li>

  {standings.map((p, i) => (
    <li key={p.playerId} className="flex items-center py-1">
      {/* Rank */}
      <span className="w-5 text-right text-zinc-400">{i + 1}</span>

      {/* Name */}
      <span className="ml-2 flex-1 min-w-0 truncate font-medium">{p.name}</span>

      {/* Record */}
      <span className="w-10 text-right tabular-nums">
        {p.wins}-{p.losses}
      </span>

      {/* Win % */}
      <span className="w-11 text-right text-zinc-400 tabular-nums">
        {(p.winPct * 100).toFixed(0)}%
      </span>

      {/* PF/PA */}
      <span className="w-16 text-right text-zinc-400 tabular-nums whitespace-nowrap">
        {p.pointsFor}/{p.pointsAgainst}
      </span>

      {/* Streak */}
      <span
        className={`w-10 text-right tabular-nums ${
          p.streak > 0
            ? "text-emerald-400"
            : p.streak < 0
            ? "text-rose-400"
            : "text-zinc-400"
        }`}
      >
        {p.streak > 0 ? `W${p.streak}` : p.streak < 0 ? `L${-p.streak}` : "—"}
      </span>
    </li>
  ))}
</ul>
  </div>
</div>
  );
}
