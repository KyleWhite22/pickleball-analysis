// src/pages/Home.tsx
import { useAuthEmail } from "../hooks/useAuthEmail";
import { useLeagues } from "../hooks/useLeagues";
import TopActions from "../components/TopActions";
import MetricsSection from "../components/metrics/MetricsSection";
import { MetricsProvider } from "../components/metrics/MetricsProvider";
import { useSelectedLeague } from "../state/SelectedLeagueProvider";

export default function Home() {
  const { signedIn } = useAuthEmail();

  // Keep useLeagues for lists, ownership, and refresh — but NOT for selectedLeagueId.
  const {
    yourLeagues,
    publicLeagues,
    ownsSelected,         // this may depend on provider’s selectedLeagueId internally
    addYourLeague,
    refreshLeagues,
    // selectedLeagueId,   // ❌ stop using this from useLeagues
    // setSelectedLeagueId // ❌ stop using this from useLeagues
  } = useLeagues(signedIn);

  // ✅ single source of truth
  const { selectedLeagueId, setSelectedLeagueId } = useSelectedLeague();

  return (
    <div className="relative min-h-[100dvh] text-white space-y-6">
      <MetricsProvider leagueId={selectedLeagueId}>
        <TopActions
          yourLeagues={yourLeagues}
          publicLeagues={publicLeagues}
          selectedLeagueId={selectedLeagueId}        // ✅ from provider
          onSelectLeague={setSelectedLeagueId}       // ✅ from provider
          ownsSelected={ownsSelected}
          onLeagueCreated={(league) => { addYourLeague(league); }}
          onRefreshLeagues={refreshLeagues}
        />
        <MetricsSection leagueId={selectedLeagueId} />
      </MetricsProvider>
    </div>
  );
}
