import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getStandings, type Standing } from "../../lib/api";

type MetricsContextType = {
  standings: Standing[] | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const MetricsCtx = createContext<MetricsContextType | null>(null);

export function MetricsProvider({
  leagueId,
  children,
}: {
  leagueId: string | null;
  children: ReactNode;
}) {
  const [standings, setStandings] = useState<Standing[] | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchOnce = useCallback(async () => {
    if (!leagueId) {
      setStandings(null);
      return;
    }
    setLoading(true);
    try {
      const rows = await getStandings(leagueId);
      setStandings(rows);
    } finally {
      setLoading(false);
    }
  }, [leagueId]);

  // fetch when league changes
  useEffect(() => {
    void fetchOnce();
  }, [fetchOnce]);

  const refresh = useCallback(async () => {
    await fetchOnce();
  }, [fetchOnce]);

  return (
    <MetricsCtx.Provider value={{ standings, loading, refresh }}>
      {children}
    </MetricsCtx.Provider>
  );
}

export function useMetrics() {
  const ctx = useContext(MetricsCtx);
  if (!ctx) throw new Error("useMetrics must be used inside <MetricsProvider>");
  return ctx;
}

// Optional helper to avoid hard crash if used outside provider
export function useMetricsOptional() {
  return useContext(MetricsCtx);
}