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

  <ul className="divide-y divide-white/10 text-[13px] sm:text-sm">
    {/* Header row (no Name label) */}
    <li className="grid items-center gap-x-2 py-1 text-[11px] uppercase tracking-wide text-zinc-400
                   [grid-template-columns:1.25rem_minmax(0,1fr)_3.25rem_3.25rem_6rem_2.75rem]">
      <span />               {/* rank placeholder */}
      <span className="min-w-0" /> {/* name placeholder */}
      <span className="text-right leading-tight">Rec</span>
      <span className="text-right leading-tight">Win%</span>
      <span className="text-right leading-tight">PF/PA</span>
      <span className="text-right leading-tight">Str</span>
    </li>

    {standings.map((p, i) => (
      <li key={p.playerId}
          className="grid items-center gap-x-2 py-1 leading-tight
                     [grid-template-columns:1.25rem_minmax(0,1fr)_3.25rem_3.25rem_6rem_2.75rem]">
        {/* Rank */}
        <span className={`text-right tabular-nums ${i === 0 ? "text-yellow-400 font-semibold" : "text-zinc-400"}`}>
          {i + 1}
        </span>

        {/* Name */}
        <span className={`min-w-0 truncate font-medium ${i === 0 ? "text-yellow-400 font-semibold" : ""}`}>
          {p.name}
        </span>

        {/* Record */}
        <span className="text-right tabular-nums whitespace-nowrap">
          {p.wins}-{p.losses}
        </span>

        {/* Win % */}
        <span className="text-right text-zinc-400 tabular-nums whitespace-nowrap">
          {(p.winPct * 100).toFixed(0)}%
        </span>

        {/* PF/PA */}
        <span className="text-right text-zinc-400 tabular-nums whitespace-nowrap">
          {p.pointsFor}/{p.pointsAgainst}
        </span>

        {/* Streak */}
        <span className={`text-right tabular-nums ${
          p.streak > 0 ? "text-emerald-400" : p.streak < 0 ? "text-rose-400" : "text-zinc-400"
        }`}>
          {p.streak > 0 ? `W${p.streak}` : p.streak < 0 ? `L${-p.streak}` : "—"}
        </span>
      </li>
    ))}
  </ul>
</div>

  );
}
