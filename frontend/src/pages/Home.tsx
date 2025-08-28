import { useEffect, useState } from "react";
import { signInWithRedirect } from "aws-amplify/auth";
import { useAuthEmail } from "../hooks/useAuthEmail";
import { useLeagues } from "../hooks/useLeagues";
import StandingsCard from "../components/StandingsCard";
import TopActions from "../components/TopActions";
import ActionsCard from "../components/ActionsCard.tsx";
import CreateLeagueCard from "../components/CreateLeagueCard";
import { createLeague as apiCreateLeague } from "../lib/api";

export default function Home() {
  const { signedIn } = useAuthEmail();
  const {
    yourLeagues,
    publicLeagues,
    selectedLeagueId,
    setSelectedLeagueId,
    ownsSelected,
  } = useLeagues(signedIn);

  // bump this whenever matches change to force standings refresh
  const [refreshKey, setRefreshKey] = useState(0);
  const onChanged = () => setRefreshKey((k) => k + 1);

  // Ensure something is selected by default
  useEffect(() => {
    if (!selectedLeagueId && publicLeagues.length) {
      setSelectedLeagueId(publicLeagues[0].leagueId);
    }
  }, [publicLeagues, selectedLeagueId, setSelectedLeagueId]);

  return (
    <div className="relative min-h-[100dvh] text-white space-y-6">
      {/* Top row: League name + Choose League + Log Match */}
      <TopActions
        yourLeagues={yourLeagues}
        publicLeagues={publicLeagues}
        selectedLeagueId={selectedLeagueId}
        onSelectLeague={setSelectedLeagueId}
        ownsSelected={ownsSelected}
        onChanged={onChanged}
      />

      {/* Middle: Standings */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <StandingsCard
          // remount on change to refetch
          key={`${selectedLeagueId ?? "none"}-${refreshKey}`}
          leagueId={selectedLeagueId}
        />

        {/* Optional: keep Create League on the right (or remove/move as you like) */}
        <CreateLeagueCard onCreated={(league) => setSelectedLeagueId(league.leagueId)} />
      </section>
    </div>
  );
}