import { createContext, useContext, useMemo } from "react";
import type { Standing } from "../../lib/api";
import { useStandings } from "../../hooks/useStandings";

type MetricsContextType = {
  standings: Standing[] | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const MetricsContext = createContext<MetricsContextType | null>(null);

export function MetricsProvider({
  leagueId,
  children,
}: {
  leagueId: string | null;
  children: React.ReactNode;
}) {
  const { standings, loading, refresh } = useStandings(leagueId);

  const value = useMemo(
    () => ({ standings, loading, refresh }),
    [standings, loading, refresh]
  );

  return <MetricsContext.Provider value={value}>{children}</MetricsContext.Provider>;
}

export function useMetrics() {
  const ctx = useContext(MetricsContext);
  if (!ctx) throw new Error("useMetrics must be used inside <MetricsProvider>");
  return ctx;
}