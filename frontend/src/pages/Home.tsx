import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

type League = { id: string; name: string };
type Metric = { label: string; value: number | string };
type MatchPayload = {
  date: string;
  players: { name: string; team: "A" | "B" }[];
  scores: { a: number; b: number }[];
  idempotencyKey?: string;
};

// TODO: replace with your real auth
async function getIdToken(): Promise<string | undefined> {
  // e.g., from Amplify Auth.currentSession().getIdToken().getJwtToken()
  return localStorage.getItem("idToken") || undefined;
}

export default function Home() {
  const [token, setToken] = useState<string | undefined>();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | undefined>();
  const [creating, setCreating] = useState(false);
  const [newLeagueName, setNewLeagueName] = useState("");
  const [metrics, setMetrics] = useState<Metric[] | null>(null);
  const [loadingLeagues, setLoadingLeagues] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [matchForm, setMatchForm] = useState<MatchPayload>({
    date: new Date().toISOString().slice(0, 10),
    players: [
      { name: "", team: "A" },
      { name: "", team: "A" },
      { name: "", team: "B" },
      { name: "", team: "B" }
    ],
    scores: [{ a: 11, b: 8 }]
  });

  // Load token & leagues on mount
  useEffect(() => {
    (async () => {
      const t = await getIdToken();
      setToken(t);
      if (!t) return; // redirect to login in your router if desired
      await refreshLeagues(t);
    })();
  }, []);

  // When league changes, load metrics
  useEffect(() => {
    if (!token || !selectedLeagueId) return;
    (async () => {
      setLoadingMetrics(true);
      try {
        const m = await api.metrics(selectedLeagueId, token);
        // Expecting something like: { players:[...], teams:[...], updatedAt:... }
        // Convert to a quick display list (customize as you like)
        const flat: Metric[] = [
          { label: "Updated", value: m.updatedAt || "-" },
          { label: "Players", value: m.players?.length ?? 0 },
          { label: "Teams", value: m.teams?.length ?? 0 }
        ];
        setMetrics(flat);
      } catch (e) {
        console.error(e);
        setMetrics(null);
      } finally {
        setLoadingMetrics(false);
      }
    })();
  }, [token, selectedLeagueId]);

  const selectedLeague = useMemo(
    () => leagues.find((l) => l.id === selectedLeagueId),
    [leagues, selectedLeagueId]
  );

  async function refreshLeagues(t: string) {
    setLoadingLeagues(true);
    try {
      const list: League[] = await api.leagues(t);
      setLeagues(list);
      // pick first league if none selected
      if (list.length && !selectedLeagueId) setSelectedLeagueId(list[0].id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLeagues(false);
    }
  }

  async function onCreateLeague() {
    if (!token || !newLeagueName.trim()) return;
    try {
      setCreating(true);
      const created = await api.createLeague(newLeagueName.trim(), token);
      setNewLeagueName("");
      setCreating(false);
      await refreshLeagues(token);
      setSelectedLeagueId(created.id); // jump to the new league
    } catch (e) {
      console.error(e);
      setCreating(false);
    }
  }

  async function onSubmitMatch(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !selectedLeagueId) return;
    try {
      const idempotencyKey = cryptoRandom();
      await api.postMatch(
        selectedLeagueId,
        { ...matchForm, idempotencyKey },
        token
      );
      // After posting, refresh metrics (and optionally a recent matches list)
      const m = await api.metrics(selectedLeagueId, token);
      const flat: Metric[] = [
        { label: "Updated", value: m.updatedAt || "-" },
        { label: "Players", value: m.players?.length ?? 0 },
        { label: "Teams", value: m.teams?.length ?? 0 }
      ];
      setMetrics(flat);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pickleball Dashboard</h1>
        <div className="flex items-center gap-3">
          {/* League switcher */}
          <select
            className="bg-black border rounded px-3 py-2"
            value={selectedLeagueId || ""}
            onChange={(e) => setSelectedLeagueId(e.target.value)}
            disabled={loadingLeagues || leagues.length === 0}
          >
            {leagues.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>

          {/* Create League (inline) */}
          <div className="flex items-center gap-2">
            <input
              className="bg-black border rounded px-3 py-2"
              placeholder="New league name"
              value={newLeagueName}
              onChange={(e) => setNewLeagueName(e.target.value)}
            />
            <button
              className="border rounded px-3 py-2 hover:bg-white hover:text-black transition"
              onClick={onCreateLeague}
              disabled={creating || !newLeagueName.trim()}
            >
              {creating ? "Creating..." : "Create League"}
            </button>
          </div>
        </div>
      </header>

      {/* Metrics */}
      <section className="border rounded p-4">
        <h2 className="font-semibold mb-3">
          {selectedLeague ? `Metrics: ${selectedLeague.name}` : "Metrics"}
        </h2>
        {loadingMetrics ? (
          <p>Loading metrics…</p>
        ) : metrics ? (
          <ul className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {metrics.map((m) => (
              <li key={m.label} className="border rounded p-3">
                <div className="text-sm text-gray-400">{m.label}</div>
                <div className="text-xl">{m.value}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p>No metrics yet.</p>
        )}
      </section>

      {/* Log Match */}
      <section className="border rounded p-4">
        <h2 className="font-semibold mb-3">Log Match</h2>
        <form className="space-y-3" onSubmit={onSubmitMatch}>
          <div className="flex gap-3 items-center">
            <label className="w-24">Date</label>
            <input
              type="date"
              className="bg-black border rounded px-3 py-2"
              value={matchForm.date}
              onChange={(e) => setMatchForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {matchForm.players.map((p, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  className="flex-1 bg-black border rounded px-3 py-2"
                  placeholder={`Player ${i + 1} name`}
                  value={p.name}
                  onChange={(e) => {
                    const v = e.target.value;
                    setMatchForm((f) => {
                      const players = [...f.players];
                      players[i] = { ...players[i], name: v };
                      return { ...f, players };
                    });
                  }}
                />
                <select
                  className="bg-black border rounded px-2 py-2"
                  value={p.team}
                  onChange={(e) => {
                    const v = e.target.value as "A" | "B";
                    setMatchForm((f) => {
                      const players = [...f.players];
                      players[i] = { ...players[i], team: v };
                      return { ...f, players };
                    });
                  }}
                >
                  <option value="A">Team A</option>
                  <option value="B">Team B</option>
                </select>
              </div>
            ))}
          </div>

          <div className="flex gap-3 items-center">
            <label className="w-24">Game 1</label>
            <input
              type="number"
              className="w-24 bg-black border rounded px-3 py-2"
              value={matchForm.scores[0]?.a ?? 0}
              onChange={(e) =>
                setMatchForm((f) => {
                  const scores = [...f.scores];
                  scores[0] = { ...(scores[0] || { a: 0, b: 0 }), a: Number(e.target.value) };
                  return { ...f, scores };
                })
              }
            />
            <span>:</span>
            <input
              type="number"
              className="w-24 bg-black border rounded px-3 py-2"
              value={matchForm.scores[0]?.b ?? 0}
              onChange={(e) =>
                setMatchForm((f) => {
                  const scores = [...f.scores];
                  scores[0] = { ...(scores[0] || { a: 0, b: 0 }), b: Number(e.target.value) };
                  return { ...f, scores };
                })
              }
            />
          </div>

          <button
            className="border rounded px-4 py-2 hover:bg-white hover:text-black transition"
            type="submit"
            disabled={!selectedLeagueId}
          >
            Submit Match
          </button>
        </form>
      </section>
    </div>
  );
}

// Small helper (browser-safe)
function cryptoRandom() {
  // try crypto.randomUUID if available
  // @ts-ignore
  if (crypto?.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}