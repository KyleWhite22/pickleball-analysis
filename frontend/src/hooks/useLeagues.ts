// src/hooks/useLeagues.ts
import { useEffect, useMemo, useState, useCallback } from "react";
import { listLeagues, listPublicLeagues, type League } from "../lib/api";

export function useLeagues(signedIn: boolean) {
  const [yourLeagues, setYourLeagues] = useState<League[]>([]);
  const [publicLeagues, setPublicLeagues] = useState<League[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);

  const refreshLeagues = useCallback(async () => {
    try {
      const [yours, pubs] = await Promise.all([listLeagues(), listPublicLeagues()]);
      setYourLeagues(yours);
      setPublicLeagues(pubs);
    } catch {
      setYourLeagues([]);
      setPublicLeagues([]);
    }
  }, []);

useEffect(() => {
  (async () => {
    try {
      const [yours, pubs] = await Promise.all([listLeagues(), listPublicLeagues()]);
      setYourLeagues(yours);
      setPublicLeagues(pubs);

      // ✅ Remembered ID from localStorage
      const remembered = localStorage.getItem("leagueId");

      if (!selectedLeagueId) {
        let candidate: string | null = null;

        // 1. If remembered league still exists, use it
        if (remembered) {
          candidate =
            yours.find((l) => l.leagueId === remembered)?.leagueId ||
            pubs.find((l) => l.leagueId === remembered)?.leagueId ||
            null;
        }

        // 2. If not, fall back to first of "yours", then first of "public"
        if (!candidate) {
          candidate = yours[0]?.leagueId || pubs[0]?.leagueId || null;
        }

        if (candidate) setSelectedLeagueId(candidate);
      }
    } catch (err) {
      console.error(err);
      setYourLeagues([]);
      setPublicLeagues([]);
    }
  })();
}, [signedIn]); // re-run when auth state changes

useEffect(() => {
  if (selectedLeagueId) {
    localStorage.setItem("leagueId", selectedLeagueId);
  }
}, [selectedLeagueId]);

  const addYourLeague = useCallback((league: League) => {
    setYourLeagues((prev) => {
      // de-dupe and put on top
      const filtered = prev.filter((l) => l.leagueId !== league.leagueId);
      return [league, ...filtered];
    });
  }, []);

  const ownsSelected = useMemo(
    () => !!selectedLeagueId && yourLeagues.some((l) => l.leagueId === selectedLeagueId),
    [selectedLeagueId, yourLeagues]
  );

  return {
    yourLeagues,
    publicLeagues,
    selectedLeagueId,
    setSelectedLeagueId,
    ownsSelected,
    refreshLeagues,
    addYourLeague,
  };
}
