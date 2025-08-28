import Standings from "./Standings";
import { useStandings } from "../hooks/useStandings";

export default function StandingsCard({ leagueId }: { leagueId: string | null }) {
  const { standings, loading } = useStandings(leagueId);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur shadow-[0_10px_30px_rgba(0,0,0,.35)]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Standings</h2>
        {!leagueId && <span className="text-xs text-zinc-400">Select a league</span>}
      </div>
      <Standings standings={standings} loading={loading} />
    </div>
  );
}
