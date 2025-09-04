import { useAuthEmail } from "../hooks/useAuthEmail";
import { useLeagues } from "../hooks/useLeagues";
import TopActions from "../components/TopActions";
import MetricsSection from "../components/metrics/MetricsSection";
import { MetricsProvider } from "../components/metrics/MetricsProvider";
import { useSelectedLeague } from "../state/SelectedLeagueProvider";

export default function Home() {
  const { signedIn } = useAuthEmail();

  // still use useLeagues() for lists & ownership
  const {
    yourLeagues,
    publicLeagues,
    ownsSelected,
    addYourLeague,
    refreshLeagues,
  } = useLeagues(signedIn);

  // single source of truth for selected league
  const { selectedLeagueId } = useSelectedLeague();

  return (
    <div className="relative min-h-[100dvh] text-white space-y-6">
      <MetricsProvider key={selectedLeagueId || "none"} leagueId={selectedLeagueId}>
        <TopActions
          yourLeagues={yourLeagues}
          publicLeagues={publicLeagues}
          selectedLeagueId={selectedLeagueId}
          ownsSelected={ownsSelected}
          onLeagueCreated={(league) => { addYourLeague(league); }}
          onRefreshLeagues={refreshLeagues}
        />
        <MetricsSection leagueId={selectedLeagueId} />
      </MetricsProvider>
    </div>
  );
}
