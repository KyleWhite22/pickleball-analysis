// src/components/Standings.tsx
import type { Standing } from "../lib/api";

interface StandingsProps {
  standings: Standing[] | null;
  loading: boolean;
  emptyText?: string;
}

export default function Standings({ standings, loading, emptyText = "No matches yet." }: StandingsProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-8 w-full animate-pulse rounded bg-white/10" />
        ))}
      </div>
    );
  }

  if (!standings) {
    return <p className="text-sm text-zinc-400">Select a league to view standings.</p>;
  }

  if (standings.length === 0) {
    return <p className="text-sm text-zinc-400">{emptyText}</p>;
  }

  return (
    <ul className="divide-y divide-white/10">
      {standings.map((p, idx) => (
        <li key={p.playerId} className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <span className="w-6 text-right text-zinc-400">{idx + 1}</span>
            <span className="font-medium">{p.name}</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="tabular-nums">{p.wins}-{p.losses}</span>
            <span className="text-zinc-400 tabular-nums">{(p.winPct * 100).toFixed(1)}%</span>
            <span className="text-zinc-400 tabular-nums">PF {p.pointsFor} / PA {p.pointsAgainst}</span>
            <span
              className={`tabular-nums ${
                p.streak > 0 ? "text-emerald-400" : p.streak < 0 ? "text-rose-400" : "text-zinc-400"
              }`}
            >
              {p.streak > 0 ? `W${p.streak}` : p.streak < 0 ? `L${-p.streak}` : "—"}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
