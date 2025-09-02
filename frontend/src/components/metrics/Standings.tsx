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
    {/* Header row */}
    <li className="flex items-center py-1 text-[11px] uppercase tracking-wide text-zinc-400">
      <span className="w-5" /> {/* Rank placeholder */}
      <span className="flex-1 min-w-0 px-1" /> {/* Empty so names align */}
      <span className="flex-shrink-0 w-auto px-1 text-right">Rec</span>
      <span className="flex-shrink-0 w-auto px-1 text-right">Win%</span>
      <span className="flex-shrink-0 w-auto px-1 text-right">PF/PA</span>
      <span className="flex-shrink-0 w-auto px-1 text-right">Str</span>
    </li>

    {standings.map((p, i) => (
      <li key={p.playerId} className="flex items-center py-1">
        {/* Rank */}
        <span className="w-5 text-right text-zinc-400 text-xs">{i + 1}</span>

        {/* Name */}
        <span className="flex-1 min-w-0 truncate font-medium px-1">
          {p.name}
        </span>

        {/* Record */}
        <span className="flex-shrink-0 w-auto px-1 tabular-nums text-right">
          {p.wins}-{p.losses}
        </span>

        {/* Win % */}
        <span className="flex-shrink-0 w-auto px-1 text-zinc-400 tabular-nums text-right">
          {(p.winPct * 100).toFixed(0)}%
        </span>

        {/* PF/PA */}
        <span className="flex-shrink-0 w-auto px-1 text-zinc-400 tabular-nums whitespace-nowrap text-right">
          {p.pointsFor}/{p.pointsAgainst}
        </span>

        {/* Streak */}
        <span
          className={`flex-shrink-0 w-auto px-1 tabular-nums text-right ${
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
  );
}
