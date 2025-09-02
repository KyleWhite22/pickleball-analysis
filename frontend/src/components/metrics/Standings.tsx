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
    <ul className="min-w-[460px] sm:min-w-0 divide-y divide-white/10 px-5">
      {/* Header row */}
      <li className="flex items-center py-2 text-[11px] uppercase tracking-wide text-zinc-400">
        <span className="w-6" />
        <span className="ml-3 flex-1 min-w-0" />
        <span className="w-12 text-right">Record</span>
        <span className="w-12 text-right">Win %</span>
        <span className="w-20 text-right">PF/PA</span>
        <span className="w-10 text-right">Streak</span>
      </li>

      {standings.map((p, i) => (
        <li key={p.playerId} className="flex items-center py-2">
          {/* Rank */}
          <span className="w-6 text-right text-zinc-400 text-sm">{i + 1}</span>

          {/* Name */}
          <span className="ml-3 flex-1 min-w-0 font-medium truncate text-sm">
            {p.name}
          </span>

          {/* Record */}
          <span className="w-12 text-[13px] tabular-nums text-right shrink-0">
            {p.wins}-{p.losses}
          </span>

          {/* Win % */}
          <span className="w-12 text-[13px] text-zinc-400 tabular-nums text-right shrink-0">
            {(p.winPct * 100).toFixed(1)}%
          </span>

          {/* PF/PA (abbrev) */}
          <span className="w-20 text-[13px] text-zinc-400 tabular-nums text-right whitespace-nowrap shrink-0">
            {p.pointsFor}/{p.pointsAgainst}
          </span>

          {/* Streak */}
          <span
            className={`w-10 text-[13px] tabular-nums text-right shrink-0 ${
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
