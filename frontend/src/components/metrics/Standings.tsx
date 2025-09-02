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
    {/* Header */}
    <li
      className="grid items-center py-1 text-[11px] uppercase tracking-wide
                 [grid-template-columns:1.25rem_minmax(0,1fr)_minmax(2.75rem,3.25rem)_minmax(3.5rem,4rem)_minmax(3.25rem,4rem)] gap-x-1.5"
    >
      <span /> {/* rank placeholder */}
      <span className="min-w-0" /> {/* name placeholder */}
      <span className="text-right text-white font-semibold leading-tight">Rec</span>
      <span className="text-right text-white font-semibold leading-tight">Win%</span>
      <span className="text-right text-white font-semibold leading-tight">PF/PA</span>
    </li>

    {standings.map((p, i) => (
      <li
        key={p.playerId}
        className="grid items-center py-1 leading-tight
                   [grid-template-columns:1.25rem_minmax(0,1fr)_minmax(2.75rem,3.25rem)_minmax(3.5rem,4rem)_minmax(3.25rem,4rem)] gap-x-1.5"
      >
        {/* Rank */}
        <span
          className={`text-right tabular-nums ${
            i === 0 ? "text-yellow-400 font-semibold" : "text-zinc-400"
          }`}
        >
          {i + 1}
        </span>

        {/* Name */}
        <span
          className={`min-w-0 truncate font-medium ${
            i === 0 ? "text-yellow-400 font-semibold" : ""
          }`}
        >
          {p.name}
        </span>

        {/* Record */}
        <span className="text-right text-zinc-400 tabular-nums whitespace-nowrap">
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
      </li>
    ))}
  </ul>
</div>


  );
}
