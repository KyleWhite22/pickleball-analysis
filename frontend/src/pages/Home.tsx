// src/pages/Home.tsx
import { useEffect, useState } from "react";
import { useAuthEmail } from "../hooks/useAuthEmail";
import { useLeagues } from "../hooks/useLeagues";
import StandingsCard from "../components/StandingsCard";
import TopActions from "../components/TopActions";
import CreateLeagueCard from "../components/CreateLeagueCard"; // keep

export default function Home() {
  const { signedIn } = useAuthEmail();
  const {
    yourLeagues,
    publicLeagues,
    selectedLeagueId,
    setSelectedLeagueId,
    ownsSelected,
  } = useLeagues(signedIn);

  const [refreshKey, setRefreshKey] = useState(0);
  const onChanged = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    if (!selectedLeagueId && publicLeagues.length) {
      setSelectedLeagueId(publicLeagues[0].leagueId);
    }
  }, [publicLeagues, selectedLeagueId, setSelectedLeagueId]);

  return (
    <div className="relative min-h-[100dvh] text-white space-y-6">
      <TopActions
        yourLeagues={yourLeagues}
        publicLeagues={publicLeagues}
        selectedLeagueId={selectedLeagueId}
        onSelectLeague={setSelectedLeagueId}
        ownsSelected={ownsSelected}
        onChanged={onChanged}
      />

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <StandingsCard key={`${selectedLeagueId ?? "none"}-${refreshKey}`} leagueId={selectedLeagueId} />
        <CreateLeagueCard onCreated={(league) => setSelectedLeagueId(league.leagueId)} />
      </section>
    </div>
  );
}
