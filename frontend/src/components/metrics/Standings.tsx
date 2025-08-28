import { useStandings } from "../../hooks/useStandings";

export default function Standings({ leagueId }: { leagueId: string | null }) {
  const { standings, loading } = useStandings(leagueId);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Standings</h2>
        {!leagueId && <span className="text-xs text-zinc-400">Select a league</span>}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-8 w-full animate-pulse rounded bg-white/10" />
          ))}
        </div>
      ) : standings && standings.length > 0 ? (
        <ul className="divide-y divide-white/10">
          {standings.map((p, idx) => (
            <li key={p.playerId} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <span className="w-6 text-right text-zinc-400 tabular-nums">{idx + 1}</span>
                <span className="font-medium">{p.name}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="tabular-nums">
                  {p.wins}-{p.losses}
                </span>
                <span className="text-zinc-400 tabular-nums">
                  {(p.winPct * 100).toFixed(1)}%
                </span>
                <span className="text-zinc-400 tabular-nums">
                  PF {p.pointsFor} / PA {p.pointsAgainst}
                </span>
                <span
                  className={[
                    "tabular-nums",
                    p.streak > 0
                      ? "text-mint-light"
                      : p.streak < 0
                      ? "text-rose-300"
                      : "text-zinc-400",
                  ].join(" ")}
                >
                  {p.streak > 0 ? `W${p.streak}` : p.streak < 0 ? `L${-p.streak}` : "—"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-400">No matches yet.</p>
      )}
    </div>
  );
}