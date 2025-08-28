import { useCallback, useEffect, useState } from "react";
import { listLeagues, listPublicLeagues, type League } from "../lib/api";

export function useLeagues(signedIn: boolean) {
  const [yourLeagues, setYourLeagues] = useState<League[]>([]);
  const [publicLeagues, setPublicLeagues] = useState<League[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);

  const ownsSelected = !!selectedLeagueId && yourLeagues.some(l => l.leagueId === selectedLeagueId);

  const refreshLeagues = useCallback(async () => {
    try {
      const [yours, pubs] = await Promise.all([listLeagues(), listPublicLeagues()]);
      setYourLeagues(yours);
      setPublicLeagues(pubs);

      // keep current selection if it still exists; otherwise recover from localStorage; else pick first sensible
      setSelectedLeagueId(prev => {
        if (prev && (yours.some(l => l.leagueId === prev) || pubs.some(l => l.leagueId === prev))) {
          return prev;
        }
        const remembered = localStorage.getItem("leagueId");
        if (remembered && (yours.some(l => l.leagueId === remembered) || pubs.some(l => l.leagueId === remembered))) {
          return remembered;
        }
        return yours[0]?.leagueId ?? pubs[0]?.leagueId ?? null;
      });
    } catch (e) {
      console.error(e);
      setYourLeagues([]);
      setPublicLeagues([]);
    }
  }, []);

  // initial + on auth change
  useEffect(() => { void refreshLeagues(); }, [signedIn, refreshLeagues]);

  // persist selection
  useEffect(() => {
    if (selectedLeagueId) localStorage.setItem("leagueId", selectedLeagueId);
  }, [selectedLeagueId]);

  function addYourLeague(league: League) {
    setYourLeagues(prev => [league, ...prev]);
  }

  return {
    yourLeagues,
    publicLeagues,
    selectedLeagueId,
    setSelectedLeagueId,
    ownsSelected,
    addYourLeague,
    refreshLeagues,          // 👈 expose this
  };
}