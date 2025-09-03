// src/components/metrics/MetricsSection.tsx
import Standings from "./Standings";
import StreakDivergingChart from "./StreakDivergingChart";
import LastGame from "./LastGame";
import PlayerMetrics from "./PlayerMetrics";
type Props = { leagueId: string | null };

/*function KPIRow() {
  const { standings, loading } = useMetrics();

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl border border-white/10 bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  const totalPlayers = standings?.length ?? 0;
  const totalMatches = standings ? Math.floor(standings.reduce((s, p) => s + p.wins + p.losses, 0) / 4) : 0;
  const avgWinPct = standings && standings.length
    ? (standings.reduce((s, p) => s + p.winPct, 0) / standings.length) * 100
    : 0;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <KPI label="Players" value={totalPlayers} />
      <KPI label="Matches" value={totalMatches} />
      <KPI label="Avg win %" value={`${avgWinPct.toFixed(1)}%`} />
    </div>
  );
}*/

export default function MetricsSection({ leagueId }: Props) {
  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left column: standings + chart */}
        <div className="space-y-6">
          <Standings />
          <StreakDivergingChart />
        </div>

        {/* Right column: last game + player metrics */}
        <div className="space-y-6">
          <LastGame leagueId={leagueId} />
          <PlayerMetrics />
        </div>
      </div>
    </section>
  );
}
