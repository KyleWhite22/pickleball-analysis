// src/components/metrics/MetricsSection.tsx
import Standings from "./Standings";
import StreakDivergingChart from "./StreakDivergingChart";
import LastGame from "./LastGame";
import PlayerMetrics from "./PlayerMetrics";
import Superlatives from "./Superlatives";
import WinSharePie from "./WinSharePie";
import PointDiffBars from "./PointDiffBars";
type Props = { leagueId: string | null };



export default function MetricsSection({ leagueId }: Props) {
  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Standings />
                    <PlayerMetrics leagueId={leagueId} />

          <WinSharePie leagueId={leagueId} />
          <Superlatives key={leagueId ?? "none"} leagueId={leagueId} />

        </div>

        <div className="space-y-6">


          <LastGame leagueId={leagueId} />

          <StreakDivergingChart />
                    <PointDiffBars />


        </div>
      </div>
    </section>
  );
}
