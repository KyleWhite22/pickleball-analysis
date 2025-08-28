// src/components/metrics/MetricsSection.tsx
import { useStandings } from "../../hooks/useStandings";
import KPI from "./KPI";
import StreakLeaders from "./StreakLeaders";
import Standings from "./Standings";

export default function MetricsSection({ leagueId }: { leagueId: string | null }) {
    const { standings, loading } = useStandings(leagueId);

    // Compute simple KPIs from standings
    const totalPlayers = standings?.length ?? 0;
    const totalMatches = standings
        ? Math.floor(standings.reduce((sum, p) => sum + p.wins + p.losses, 0) / 2)
        : 0;
    const avgWinPct = standings && standings.length > 0
        ? (standings.reduce((s, p) => s + p.winPct, 0) / standings.length) * 100
        : 0;

    return (
        <section className="space-y-6">
            {/* KPIs row */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <KPI label="Players" value={totalPlayers} />
                <KPI label="Matches" value={totalMatches} />
                <KPI label="Avg win %" value={`${avgWinPct.toFixed(1)}%`} />
            </div>

            {/* Main grid: Standings left, Streaks right */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Standings leagueId={leagueId} />
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <h2 className="mb-2 text-lg font-semibold">Streak leaders</h2>
                    <StreakLeaders standings={standings} />
                </div>
            </div>
        </section>
    );
}
