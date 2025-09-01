// src/pages/Home.tsx
import { useAuthEmail } from "../hooks/useAuthEmail";
import { useLeagues } from "../hooks/useLeagues";
import TopActions from "../components/TopActions";
import MetricsSection from "../components/metrics/MetricsSection";
import { MetricsProvider } from "../components/metrics/MetricsProvider";

export default function Home() {
  const { signedIn } = useAuthEmail();
  const {
    yourLeagues,
    publicLeagues,
    selectedLeagueId,
    setSelectedLeagueId,
    ownsSelected,
    addYourLeague,
    refreshLeagues,
  } = useLeagues(signedIn);

  return (
    <div className="relative min-h-[100dvh] text-white space-y-6">
      {/* Provider must wrap TopActions + tiles */}
      <MetricsProvider leagueId={selectedLeagueId}>
        <TopActions
          yourLeagues={yourLeagues}
          publicLeagues={publicLeagues}
          selectedLeagueId={selectedLeagueId}
          onSelectLeague={setSelectedLeagueId}
          ownsSelected={ownsSelected}
           onLeagueCreated={(league) => { addYourLeague(league); }}
          onRefreshLeagues={refreshLeagues}
        />
        <MetricsSection />
      </MetricsProvider>
    </div>
  );
}
