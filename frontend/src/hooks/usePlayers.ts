import { useEffect, useState } from "react";
import { listPlayers, type Player } from "../lib/api";

export function usePlayers(leagueId: string | null) {
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    if (!leagueId) {
      setPlayers([]);
      return;
    }
    setLoading(true);
    listPlayers(leagueId)
      .then(setPlayers)
      .catch(() => setPlayers([]))
      .finally(() => setLoading(false));
  }, [leagueId]);

  return { players, loading, setPlayers };
}
