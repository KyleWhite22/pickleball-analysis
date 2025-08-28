// src/components/metrics/StreakLeaders.tsx
import type { Standing } from "../../lib/api";

export default function StreakLeaders({ standings }: { standings: Standing[] | null }) {
  if (!standings || standings.length === 0) {
    return <p className="text-sm text-zinc-400">No matches yet.</p>;
  }

  const byWinStreak = [...standings]
    .filter((p) => p.streak > 0)
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 5);

  const byLossStreak = [...standings]
    .filter((p) => p.streak < 0)
    .sort((a, b) => a.streak - b.streak) // more negative first
    .slice(0, 5);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-zinc-300">Win streaks</h3>
        {byWinStreak.length === 0 ? (
          <p className="text-xs text-zinc-500">—</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {byWinStreak.map((p) => (
              <li key={p.playerId} className="flex items-center justify-between py-2">
                <span className="truncate">{p.name}</span>
                <span className="tabular-nums text-mint-light">W{p.streak}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-zinc-300">Losing streaks</h3>
        {byLossStreak.length === 0 ? (
          <p className="text-xs text-zinc-500">—</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {byLossStreak.map((p) => (
              <li key={p.playerId} className="flex items-center justify-between py-2">
                <span className="truncate">{p.name}</span>
                <span className="tabular-nums text-rose-300">L{Math.abs(p.streak)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
