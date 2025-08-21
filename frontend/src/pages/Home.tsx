import { useState, useEffect } from "react";
import {
  listLeagues,
  listPublicLeagues,      // 👈 NEW
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
  const [leagues, setLeagues] = useState<League[]>([]);
  const [publicLeagues, setPublicLeagues] = useState<League[]>([]); // 👈 NEW
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [newLeagueName, setNewLeagueName] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [creating, setCreating] = useState(false);

  const [standings, setStandings] = useState<Standing[] | null>(null);
  const [loadingStandings, setLoadingStandings] = useState(false);

  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  const [a1, setA1] = useState("");
  const [a2, setA2] = useState("");
  const [b1, setB1] = useState("");
  const [b2, setB2] = useState("");
  const [sa, setSa] = useState<number | "">("");
  const [sb, setSb] = useState<number | "">("");
  const [savingMatch, setSavingMatch] = useState(false);

  const ownerId = "u_42";
  const ownsSelected = !!selectedLeagueId && leagues.some(l => l.leagueId === selectedLeagueId);

  // Load "your leagues"
  useEffect(() => {
    (async () => {
      try {
        const mine = await listLeagues(ownerId);
        setLeagues(mine);
        // Prefer last-used league, else first of mine; if none, we'll try public later
        if (!selectedLeagueId) {
          const remembered = localStorage.getItem("leagueId");
          const initial =
            remembered && mine.find(l => l.leagueId === remembered)
              ? remembered
              : (mine[0]?.leagueId ?? null);
          if (initial) setSelectedLeagueId(initial);
        }
      } catch (e) {
        console.error(e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load public leagues
  useEffect(() => {
    (async () => {
      try {
        const pubs = await listPublicLeagues();
        setPublicLeagues(pubs);
        // If user had none and nothing selected yet, pick the first public
        if (!selectedLeagueId && pubs.length) {
          setSelectedLeagueId(pubs[0].leagueId);
        }
      } catch (e) {
        console.error(e);
        setPublicLeagues([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedLeagueId) localStorage.setItem("leagueId", selectedLeagueId);
  }, [selectedLeagueId]);

  // Standings + players fetch (unchanged)
  useEffect(() => {
    if (!selectedLeagueId) {
      setStandings(null);
      setPlayers([]);
      return;
    }
    setLoadingStandings(true);
    getStandings(selectedLeagueId, ownerId)
      .then(setStandings)
      .catch(e => { console.error(e); setStandings(null); })
      .finally(() => setLoadingStandings(false));

    setLoadingPlayers(true);
    listPlayers(selectedLeagueId, ownerId)
      .then(setPlayers)
      .catch(e => { console.error(e); setPlayers([]); })
      .finally(() => setLoadingPlayers(false));
  }, [selectedLeagueId]);

  async function onCreateLeague() {
    if (!newLeagueName.trim()) return;
    try {
      setCreating(true);
      const created = await apiCreateLeague(newLeagueName.trim(), ownerId, visibility);
      setNewLeagueName("");
      setLeagues(prev => [created, ...prev]);
      setSelectedLeagueId(created.leagueId);
    } catch (e) {
      console.error(e);
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
        createdBy: ownerId,
      });

      // refresh standings + players (new names appear in autocomplete)
      const [rows, pl] = await Promise.all([
        getStandings(selectedLeagueId),
        listPlayers(selectedLeagueId),
      ]);
      setStandings(rows);
      setPlayers(pl);

      // clear scores; keep names for quick repeat entry
      setSa("");
      setSb("");
    } catch (err) {
      console.error(err);
    } finally {
      setSavingMatch(false);
    }
  }
  // Helper: bind select value only if the id exists in that list
  const yourValue =
    selectedLeagueId && leagues.some(l => l.leagueId === selectedLeagueId)
      ? selectedLeagueId
      : "";
  const publicValue =
    selectedLeagueId && publicLeagues.some(l => l.leagueId === selectedLeagueId)
      ? selectedLeagueId
      : "";

  return (
    <div className="space-y-8 p-4">
      {/* Create + selectors */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Leagues</h2>

        {/* Create form */}
        <div className="flex gap-2 items-center">
          <input
            value={newLeagueName}
            onChange={e => setNewLeagueName(e.target.value)}
            placeholder="New league name"
            className="border px-3 py-1 rounded"
          />
          <select
            value={visibility}
            onChange={e => setVisibility(e.target.value as "public" | "private")}
            className="border px-2 py-1 rounded"
            title="Visibility"
          >
            <option value="private">Private</option>
            <option value="public">Public</option>
          </select>
          <button
            disabled={creating || !newLeagueName.trim()}
            onClick={onCreateLeague}
            className="bg-green-600 text-white px-3 py-1 rounded disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create League"}
          </button>
        </div>

        {/* Your leagues dropdown */}
        <div className="mt-3">
          <label className="block text-sm text-gray-600 mb-1">Your leagues</label>
          <select
            value={yourValue}
            onChange={e => setSelectedLeagueId(e.target.value || null)}
            className="border rounded px-2 py-1 w-full"
          >
            <option value="">— Select one of yours —</option>
            {leagues.map(l => (
              <option key={l.leagueId} value={l.leagueId}>
                {l.name} (code: {l.inviteCode})
              </option>
            ))}
          </select>
        </div>

        {/* Public leagues dropdown */}
        <div className="mt-3">
          <label className="block text-sm text-gray-600 mb-1">Public leagues</label>
          <select
            value={publicValue}
            onChange={e => setSelectedLeagueId(e.target.value || null)}
            className="border rounded px-2 py-1 w-full"
          >
            <option value="">— Browse public leagues —</option>
            {publicLeagues.map(l => (
              <option key={l.leagueId} value={l.leagueId}>
                {l.name} (code: {l.inviteCode})
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
            {standings.map(p => (
              <li key={p.playerId}>
                {p.name}: {p.wins}-{p.losses} ({(p.winPct * 100).toFixed(1)}%) •
                PF {p.pointsFor} / PA {p.pointsAgainst} • Streak{" "}
                {p.streak > 0 ? `W${p.streak}` : p.streak < 0 ? `L${-p.streak}` : "—"}
              </li>
            ))}
          </ul>
        )}
        {standings && standings.length === 0 && <p>No matches yet.</p>}
      </section>

      {/* Log match (singles for now) */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Log Match (Singles)</h2>
        {!ownsSelected && (
          <p className="text-sm text-gray-500 mb-2">
            Viewing a public league. You can’t add or edit matches unless you own this league.
          </p>
        )}
        <datalist id="league-players">
          {players.map(p => (
            <option key={p.playerId} value={p.name} />
          ))}
        </datalist>
        {loadingPlayers && <p className="text-sm text-gray-500">Loading players…</p>}

        <form onSubmit={onSubmitMatch} className="space-y-2">
          <div className="flex gap-2">
            <input
              list="league-players"
              value={a1}
              onChange={e => setA1(e.target.value)}
              placeholder="Player A"
              className="border px-2 py-1 rounded"
            />
            <input
              list="league-players"
              value={b1}
              onChange={e => setB1(e.target.value)}
              placeholder="Player B"
              className="border px-2 py-1 rounded"
            />
          </div>

          <div className="flex gap-2 opacity-60">
            <input value={a2} onChange={e => setA2(e.target.value)} placeholder="(future) A teammate" className="border px-2 py-1 rounded" />
            <input value={b2} onChange={e => setB2(e.target.value)} placeholder="(future) B teammate" className="border px-2 py-1 rounded" />
          </div>

          <div className="flex gap-2">
            <input
              type="number"
              value={sa}
              onChange={e => setSa(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="Score A"
              className="border px-2 py-1 rounded w-24"
            />
            <input
              type="number"
              value={sb}
              onChange={e => setSb(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="Score B"
              className="border px-2 py-1 rounded w-24"
            />
          </div>

          <button
            type="submit"
            disabled={savingMatch || !selectedLeagueId || !ownsSelected}
            className="bg-blue-600 text-white px-4 py-1 rounded disabled:opacity-50"
          >
            {savingMatch ? "Saving…" : "Submit Match"}
          </button>

          <button
            type="button"
            disabled={!ownsSelected}
            onClick={async () => {
              if (!selectedLeagueId || !ownsSelected) return;
              try {
                await deleteLastMatch(selectedLeagueId, ownerId);
                const [rows, pl] = await Promise.all([
                  getStandings(selectedLeagueId, ownerId),
                  listPlayers(selectedLeagueId, ownerId),
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

        <p className="text-xs text-gray-500 mt-1">
          Start typing a name to pick an existing player — avoids duplicates like “Amy”, “amy ”, “AMY”.
        </p>
      </section>
    </div>
  );
}
