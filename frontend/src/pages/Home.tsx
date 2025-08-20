import { useState, useEffect } from "react";
import {
  listLeagues,
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
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [newLeagueName, setNewLeagueName] = useState("");
  const [creating, setCreating] = useState(false);

  const [standings, setStandings] = useState<Standing[] | null>(null);
  const [loadingStandings, setLoadingStandings] = useState(false);

  // ✅ players for autocomplete
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  // match form state (singles)
  const [a1, setA1] = useState("");
  const [a2, setA2] = useState(""); // future doubles
  const [b1, setB1] = useState("");
  const [b2, setB2] = useState(""); // future doubles
  const [sa, setSa] = useState<number | "">("");
  const [sb, setSb] = useState<number | "">("");
  const [savingMatch, setSavingMatch] = useState(false);

  // TEMP owner id
  const ownerId = "u_42";

  // initial fetch of leagues
  useEffect(() => {
    (async () => {
      try {
        const rows = await listLeagues(ownerId);
        setLeagues(rows);
        if (!selectedLeagueId && rows.length) {
          const remembered = localStorage.getItem("leagueId");
          const initial =
            remembered && rows.find(l => l.leagueId === remembered)
              ? remembered
              : rows[0].leagueId;
          setSelectedLeagueId(initial);
        }
      } catch (err) {
        console.error(err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // persist selection
  useEffect(() => {
    if (selectedLeagueId) localStorage.setItem("leagueId", selectedLeagueId);
  }, [selectedLeagueId]);

  // fetch standings when league changes
  useEffect(() => {
    if (!selectedLeagueId) {
      setStandings(null);
      return;
    }
    setLoadingStandings(true);
    getStandings(selectedLeagueId)
      .then(rows => setStandings(rows))
      .catch(err => {
        console.error(err);
        setStandings(null);
      })
      .finally(() => setLoadingStandings(false));
  }, [selectedLeagueId]);

  // ✅ fetch players when league changes (for autocomplete)
  useEffect(() => {
    if (!selectedLeagueId) {
      setPlayers([]);
      return;
    }
    setLoadingPlayers(true);
    listPlayers(selectedLeagueId)
      .then(setPlayers)
      .catch(err => {
        console.error(err);
        setPlayers([]);
      })
      .finally(() => setLoadingPlayers(false));
  }, [selectedLeagueId]);

  async function onCreateLeague() {
    if (!newLeagueName.trim()) return;
    try {
      setCreating(true);
      const created = await apiCreateLeague(newLeagueName.trim(), ownerId);
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

      // refresh standings + players list (new names appear for autocomplete)
      const [rows, pl] = await Promise.all([
        getStandings(selectedLeagueId),
        listPlayers(selectedLeagueId),
      ]);
      setStandings(rows);
      setPlayers(pl);

      // clear scores; keep names for quick repeat
      setSa("");
      setSb("");
    } catch (err) {
      console.error(err);
    } finally {
      setSavingMatch(false);
    }
  }

  return (
    <div className="space-y-8 p-4">
      {/* League picker */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Leagues</h2>
        <div className="flex gap-2">
          <input
            value={newLeagueName}
            onChange={e => setNewLeagueName(e.target.value)}
            placeholder="New league name"
            className="border px-3 py-1 rounded"
          />
          <button
            disabled={creating || !newLeagueName.trim()}
            onClick={onCreateLeague}
            className="bg-green-600 text-white px-3 py-1 rounded disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create League"}
          </button>
        </div>

        <select
          value={selectedLeagueId ?? ""}
          onChange={e => setSelectedLeagueId(e.target.value)}
          className="mt-2 border rounded px-2 py-1"
        >
          <option value="" disabled>Select a league…</option>
          {leagues.map(l => (
            <option key={l.leagueId} value={l.leagueId}>
              {l.name} (code: {l.inviteCode})
            </option>
          ))}
        </select>
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

        {/* ✅ datalist fed by league players */}
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

          {/* Keep these for later doubles support; ignored for now */}
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
            disabled={savingMatch || !selectedLeagueId}
            className="bg-blue-600 text-white px-4 py-1 rounded disabled:opacity-50"
          >
            {savingMatch ? "Saving…" : "Submit Match"}
          </button>
          <button
            type="button"
            onClick={async () => {
              if (!selectedLeagueId) return;
              try {
                await deleteLastMatch(selectedLeagueId, ownerId);
                // refresh standings (and players list just in case)
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
            className="mt-2 bg-red-600 text-white px-3 py-1 rounded"
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