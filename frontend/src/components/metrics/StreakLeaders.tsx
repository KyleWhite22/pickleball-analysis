import { useMetrics } from "./MetricsProvider";

export default function StreakLeaders() {
  const { standings, loading } = useMetrics();

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="mb-2 text-lg font-semibold">Streak leaders</h2>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-6 w-full animate-pulse rounded bg-white/10" />
          ))}
        </div>
      </div>
    );
  }

  if (!standings || standings.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="mb-2 text-lg font-semibold">Streak leaders</h2>
        <p className="text-sm text-zinc-400">No matches yet.</p>
      </div>
    );
  }

  const wins = [...standings].filter(p => p.streak > 0).sort((a,b)=>b.streak-a.streak).slice(0,5);
  const losses = [...standings].filter(p => p.streak < 0).sort((a,b)=>a.streak-b.streak).slice(0,5);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <h2 className="mb-2 text-lg font-semibold">Streak leaders</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-zinc-300">Win streaks</h3>
          {wins.length === 0 ? (
            <p className="text-xs text-zinc-500">—</p>
          ) : (
           <ul className="divide-y divide-white/10">
  {wins.map((p) => (
    <li key={p.playerId} className="flex items-center justify-between py-2">
      <span className="truncate">{p.name}</span>
      {/* modern green for win streaks */}
      <span className="tabular-nums text-emerald-400">W{p.streak}</span>
    </li>
  ))}
</ul>
          )}
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-zinc-300">Losing streaks</h3>
          {losses.length === 0 ? (
            <p className="text-xs text-zinc-500">—</p>
          ) : (
            <ul className="divide-y divide-white/10">
              {losses.map((p) => (
                <li key={p.playerId} className="flex items-center justify-between py-2">
                  <span className="truncate">{p.name}</span>
                  <span className="tabular-nums text-rose-300">L{Math.abs(p.streak)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}