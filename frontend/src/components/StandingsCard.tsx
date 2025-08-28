import Standings from "./Standings";
import { useStandings } from "../hooks/useStandings";

export default function StandingsCard({ leagueId }: { leagueId: string | null }) {
  const { standings, loading } = useStandings(leagueId);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Standings</h2>
        {!leagueId && (
          <span className="text-xs text-zinc-400">Select a league</span>
        )}
      </div>

      <Standings standings={standings} loading={loading} />
    </section>
  );
}