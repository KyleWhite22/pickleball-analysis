// src/pages/Home.tsx
import { useState, useEffect } from "react";
import { signInWithRedirect, fetchAuthSession } from "aws-amplify/auth";
import {
  listLeagues,
  listPublicLeagues,
  createLeague as apiCreateLeague,
  getStandings,
  createMatch,
  listPlayers,
  deleteLastMatch,
  type League,
  type Standing,
  type Player,
} from "../lib/api";

export default function Home() {
  // auth (guest-friendly)
  const [signedIn, setSignedIn] = useState(false);

  // data
  const [leagues, setLeagues] = useState<League[]>([]);
  const [publicLeagues, setPublicLeagues] = useState<League[]>([]);
  const [standings, setStandings] = useState<Standing[] | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);

  // selection / create
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [newLeagueName, setNewLeagueName] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("private");

  // UI state
  const [creating, setCreating] = useState(false);
  const [loadingStandings, setLoadingStandings] = useState(false);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [savingMatch, setSavingMatch] = useState(false);

  // match form (singles)
  const [a1, setA1] = useState("");
  const [b1, setB1] = useState("");
  const [sa, setSa] = useState<number | "">("");
  const [sb, setSb] = useState<number | "">("");

  // are we the owner of the selected league?
  const ownsSelected =
    !!selectedLeagueId && leagues.some((l) => l.leagueId === selectedLeagueId);

  // Detect signed-in state (no redirect — guests can browse)
  useEffect(() => {
    (async () => {
      try {
        const s = await fetchAuthSession();
        setSignedIn(!!s.tokens?.idToken);
      } catch {
        setSignedIn(false);
      }
    })();
  }, []);

  // Load "your leagues" (if signed in, token is attached by buildHeaders())
  useEffect(() => {
    (async () => {
      try {
        const rows = await listLeagues(); // guests likely get []
        setLeagues(rows);

        // Prefer remembered selection if still valid
        const remembered = localStorage.getItem("leagueId");
        if (!selectedLeagueId) {
          const candidate =
            (remembered && rows.find((l) => l.leagueId === remembered)?.leagueId) ||
            rows[0]?.leagueId ||
            null;
          if (candidate) setSelectedLeagueId(candidate);
        }
      } catch (err) {
        console.error(err);
        setLeagues([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]); // re-check when auth state changes

  // Load public leagues (always)
  useEffect(() => {
    (async () => {
      try {
        const pubs = await listPublicLeagues();
        setPublicLeagues(pubs);

        // If nothing selected yet, choose first public
        if (!selectedLeagueId && pubs.length) {
          setSelectedLeagueId(pubs[0].leagueId);
        }
      } catch (e) {
        console.error(e);
        setPublicLeagues([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // persist selection
  useEffect(() => {
    if (selectedLeagueId) localStorage.setItem("leagueId", selectedLeagueId);
  }, [selectedLeagueId]);

  // fetch standings + players when league changes
  useEffect(() => {
    if (!selectedLeagueId) {
      setStandings(null);
      setPlayers([]);
      return;
    }

    setLoadingStandings(true);
    getStandings(selectedLeagueId)
      .then(setStandings)
      .catch((e) => {
        console.error(e);
        setStandings(null);
      })
      .finally(() => setLoadingStandings(false));

    setLoadingPlayers(true);
    listPlayers(selectedLeagueId)
      .then(setPlayers)
      .catch((e) => {
        console.error(e);
        setPlayers([]);
      })
      .finally(() => setLoadingPlayers(false));
  }, [selectedLeagueId]);

  async function onCreateLeague() {
    if (!newLeagueName.trim()) return;
    if (!signedIn) {
      // Gate creation behind Hosted UI
      await signInWithRedirect();
      return;
    }
    try {
      setCreating(true);
      const created = await apiCreateLeague(newLeagueName.trim(), visibility);
      setNewLeagueName("");
      setLeagues((prev) => [created, ...prev]);
      setSelectedLeagueId(created.leagueId);
    } catch (e) {
      console.error(e);
      alert("Could not create league. Are you signed in?");
    } finally {
      setCreating(false);
    }
  }

  async function onSubmitMatch(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLeagueId) return;

    const p1 = a1.trim();
    const p2 = b1.trim();
    if (!p1 || !p2) return;

    try {
      setSavingMatch(true);
      await createMatch(selectedLeagueId, {
        player1Name: p1,
        player2Name: p2,
        score1: Number(sa || 0),
        score2: Number(sb || 0),
      });

      const [rows, pl] = await Promise.all([
        getStandings(selectedLeagueId),
        listPlayers(selectedLeagueId),
      ]);
      setStandings(rows);
      setPlayers(pl);

      // clear only scores; keep names for quick repeat logging
      setSa("");
      setSb("");
    } catch (err) {
      console.error(err);
      alert("Could not save match. Only the owner can log matches.");
    } finally {
      setSavingMatch(false);
    }
  }

  // Helper: bind select values only if the selected id exists in that list
  const yourValue =
    selectedLeagueId && leagues.some((l) => l.leagueId === selectedLeagueId)
      ? selectedLeagueId
      : "";
  const publicValue =
    selectedLeagueId &&
    publicLeagues.some((l) => l.leagueId === selectedLeagueId)
      ? selectedLeagueId
      : "";

  return (
    <div className="space-y-8 p-4">
      {/* Create + selectors */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Leagues</h2>

        {/* Create form (gated) */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={newLeagueName}
            onChange={(e) => setNewLeagueName(e.target.value)}
            placeholder="New league name"
            className="border px-3 py-1 rounded"
          />
          <select
            value={visibility}
            onChange={(e) =>
              setVisibility(e.target.value as "public" | "private")
            }
            className="border px-2 py-1 rounded"
            title="Visibility"
          >
            <option value="private">Private</option>
            <option value="public">Public</option>
          </select>
          <button
            disabled={creating || !newLeagueName.trim()}
            onClick={onCreateLeague}
            className="bg-emerald-600 text-white px-3 py-1 rounded disabled:opacity-50"
            title={signedIn ? "Create a new league" : "Sign in to create a league"}
          >
            {signedIn ? (creating ? "Creating…" : "Create League") : "Sign in to create"}
          </button>
        </div>
        {!signedIn && (
          <p className="text-xs text-gray-600 mt-1">
            Browsing as guest. Public leagues are available below.
          </p>
        )}

        {/* Your leagues (only meaningful when signed in) */}
        {signedIn && (
          <div className="mt-3">
            <label className="block text-sm text-gray-600 mb-1">Your leagues</label>
            <select
              value={yourValue}
              onChange={(e) => setSelectedLeagueId(e.target.value || null)}
              className="border rounded px-2 py-1 w-full"
            >
              <option value="">— Select one of yours —</option>
              {leagues.map((l) => (
                <option key={l.leagueId} value={l.leagueId}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Public leagues (always visible) */}
        <div className="mt-3">
          <label className="block text-sm text-gray-600 mb-1">Public Leagues</label>
          <select
            value={publicValue}
            onChange={(e) => setSelectedLeagueId(e.target.value || null)}
            className="border rounded px-2 py-1 w-full"
          >
            <option value="">— Browse public leagues —</option>
            {publicLeagues.map((l) => (
              <option key={l.leagueId} value={l.leagueId}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Standings */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Standings</h2>
        {!selectedLeagueId && <p>Select a league to view standings.</p>}
        {loadingStandings && <p>Loading…</p>}
        {standings && standings.length > 0 && (
          <ul className="mt-2 space-y-1">
            {standings.map((p) => (
              <li key={p.playerId}>
                {p.name}: {p.wins}-{p.losses} ({(p.winPct * 100).toFixed(1)}%) •
                PF {p.pointsFor} / PA {p.pointsAgainst} • Streak{" "}
                {p.streak > 0
                  ? `W${p.streak}`
                  : p.streak < 0
                  ? `L${-p.streak}`
                  : "—"}
              </li>
            ))}
          </ul>
        )}
        {standings && standings.length === 0 && <p>No matches yet.</p>}
      </section>

      {/* Log match (owners only) */}
      {ownsSelected && (
        <section>
          <h2 className="text-xl font-semibold mb-2">Log Match (Singles)</h2>

          {/* Autocomplete from players in this league */}
          <datalist id="league-players">
            {players.map((p) => (
              <option key={p.playerId} value={p.name} />
            ))}
          </datalist>
          {loadingPlayers && (
            <p className="text-sm text-gray-500">Loading players…</p>
          )}

          <form onSubmit={onSubmitMatch} className="space-y-2">
            <div className="flex gap-2">
              <input
                list="league-players"
                value={a1}
                onChange={(e) => setA1(e.target.value)}
                placeholder="Player A"
                className="border px-2 py-1 rounded"
              />
              <input
                list="league-players"
                value={b1}
                onChange={(e) => setB1(e.target.value)}
                placeholder="Player B"
                className="border px-2 py-1 rounded"
              />
            </div>

            <div className="flex gap-2">
              <input
                type="number"
                value={sa}
                onChange={(e) =>
                  setSa(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="Score A"
                className="border px-2 py-1 rounded w-24"
              />
              <input
                type="number"
                value={sb}
                onChange={(e) =>
                  setSb(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="Score B"
                className="border px-2 py-1 rounded w-24"
              />
            </div>

            <button
              type="submit"
              disabled={savingMatch || !selectedLeagueId}
              className="bg-blue-600 text-white px-4 py-1 rounded disabled:opacity-50"
            >
              {savingMatch ? "Saving…" : "Submit Match"}
            </button>

            <button
              type="button"
              disabled={!ownsSelected || !selectedLeagueId}
              onClick={async () => {
                if (!selectedLeagueId) return;
                try {
                  await deleteLastMatch(selectedLeagueId);
                  const [rows, pl] = await Promise.all([
                    getStandings(selectedLeagueId),
                    listPlayers(selectedLeagueId),
                  ]);
                  setStandings(rows);
                  setPlayers(pl);
                } catch (e) {
                  console.error(e);
                  alert("Could not delete last match.");
                }
              }}
              className="mt-2 bg-red-600 text-white px-3 py-1 rounded disabled:opacity-50"
            >
              Undo last match
            </button>
          </form>
        </section>
      )}

      {!ownsSelected && selectedLeagueId && (
        <p className="text-sm text-gray-500">
          Viewing a public league — only the owner can log matches.
        </p>
      )}
    </div>
  );
}
