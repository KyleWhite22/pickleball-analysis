import { useCallback, useEffect, useState } from "react";
import { getStandings, type Standing } from "../lib/api";

export function useStandings(leagueId: string | null) {
  const [standings, setStandings] = useState<Standing[] | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!leagueId) {
      setStandings(null);
      return;
    }
    try {
      setLoading(true);
      const rows = await getStandings(leagueId);
      setStandings(rows);
    } catch (e) {
      console.error(e);
      setStandings(null);
    } finally {
      setLoading(false);
    }
  }, [leagueId]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { standings, loading, refresh };
}