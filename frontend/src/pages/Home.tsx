import { useEffect, useState } from "react";
import { useAuthEmail } from "../hooks/useAuthEmail";
import { useLeagues } from "../hooks/useLeagues";
import StandingsCard from "../components/StandingsCard";
import TopActions from "../components/TopActions";

export default function Home() {
  const { signedIn } = useAuthEmail();
  const {
    yourLeagues,
    publicLeagues,
    selectedLeagueId,
    setSelectedLeagueId,
    ownsSelected,
    addYourLeague,      // ✅ keep
    // refreshLeagues,   // ❌ remove if unused
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
        onLeagueCreated={(league) => {
          addYourLeague(league);             // update list immediately
        }}
      />

      <section>
        <StandingsCard key={`${selectedLeagueId ?? "none"}-${refreshKey}`} leagueId={selectedLeagueId} />
      </section>
    </div>
  );
}