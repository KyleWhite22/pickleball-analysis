import { useEffect, useState } from "react";
import { getStandings, type Standing } from "../lib/api";

export function useStandings(leagueId: string | null) {
  const [loading, setLoading] = useState(false);
  const [standings, setStandings] = useState<Standing[] | null>(null);

  useEffect(() => {
    if (!leagueId) {
      setStandings(null);
      return;
    }
    setLoading(true);
    getStandings(leagueId)
      .then(setStandings)
      .catch(() => setStandings(null))
      .finally(() => setLoading(false));
  }, [leagueId]);

  return { standings, loading, setStandings };
}
