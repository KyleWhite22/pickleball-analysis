// e.g., src/components/metrics/Standings.tsx
import { useMetrics } from "./MetricsProvider";

export default function Standings() {
  const { standings, loading } = useMetrics();
  if (loading) return <p className="text-sm text-zinc-400">Loading…</p>;
  if (!standings) return <p className="text-sm text-zinc-400">Select a league</p>;
  if (standings.length === 0) return <p className="text-sm text-zinc-400">No matches yet.</p>;
  return (
    <ul className="divide-y divide-white/10">
      {standings.map((p, i) => (
        <li key={p.playerId} className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <span className="w-6 text-right text-zinc-400">{i + 1}</span>
            <span className="font-medium">{p.name}</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="tabular-nums">{p.wins}-{p.losses}</span>
            <span className="text-zinc-400 tabular-nums">{(p.winPct * 100).toFixed(1)}%</span>
            <span className="text-zinc-400 tabular-nums">PF {p.pointsFor} / PA {p.pointsAgainst}</span>
            <span className={`tabular-nums ${p.streak>0?'text-emerald-400':p.streak<0?'text-rose-400':'text-zinc-400'}`}>
              {p.streak>0?`W${p.streak}`:p.streak<0?`L${-p.streak}`:"—"}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
