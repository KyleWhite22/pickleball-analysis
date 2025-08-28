import { useEffect, useMemo, useState } from "react";
import { listLeagues, listPublicLeagues, type League } from "../lib/api";

export function useLeagues(signedIn: boolean) {
  const [yourLeagues, setYourLeagues] = useState<League[]>([]);
  const [publicLeagues, setPublicLeagues] = useState<League[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const rows = await listLeagues(); // [] for guests
        setYourLeagues(rows);
        const remembered = localStorage.getItem("leagueId");
        if (!selectedLeagueId) {
          const candidate =
            (remembered && rows.find((l) => l.leagueId === remembered)?.leagueId) ||
            rows[0]?.leagueId || null;
          if (candidate) setSelectedLeagueId(candidate);
        }
      } catch {
        setYourLeagues([]);
      }
    })();
    // signedIn re-run picks up newly accessible leagues
  }, [signedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    (async () => {
      try {
        setPublicLeagues(await listPublicLeagues());
      } catch {
        setPublicLeagues([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedLeagueId) localStorage.setItem("leagueId", selectedLeagueId);
  }, [selectedLeagueId]);

  const ownsSelected = useMemo(
    () => !!selectedLeagueId && yourLeagues.some(l => l.leagueId === selectedLeagueId),
    [selectedLeagueId, yourLeagues]
  );

  return {
    yourLeagues,
    publicLeagues,
    selectedLeagueId,
    setSelectedLeagueId,
    ownsSelected,
  };
}
