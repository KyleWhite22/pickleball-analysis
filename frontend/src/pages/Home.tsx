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

  // Load "your leagues"
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
  }, [signedIn]);

  // Load public leagues (always)
  useEffect(() => {
    (async () => {
      try {
        const pubs = await listPublicLeagues();
        setPublicLeagues(pubs);

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
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-[#0b0b0e] text-white">
      {/* background glows */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-[38rem] w-[38rem] rounded-full bg-[#112] blur-3xl opacity-50" />
      <div className="pointer-events-none absolute -top-24 right-0 h-[32rem] w-[32rem] rounded-full bg-[#121a2a] blur-3xl opacity-60" />

      <main className="relative mx-auto max-w-6xl px-5 py-8 md:py-12 space-y-8">
        {/* HERO */}
        <section className="grid grid-cols-1 items-center gap-6 md:grid-cols-[1.1fr_.9fr]">
          <div>
            <h1 className="text-3xl md:text-5xl font-semibold tracking-tight">
              Pickleball. <span className="text-[#8ef17d]">Tracked.</span>
            </h1>
            <p className="mt-2 text-zinc-300">
              Create leagues, log matches, and watch the standings update live.
            </p>
            {!signedIn && (
              <p className="mt-1 text-xs text-zinc-400">
                Browsing as guest — public leagues are available below.
              </p>
            )}
          </div>

          {/* Quick selectors card */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur shadow-[0_10px_30px_rgba(0,0,0,.35)]">
            <h2 className="text-sm font-medium text-zinc-200">Quick Select</h2>
            <div className="mt-3 grid gap-3">
              {signedIn && (
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">
                    Your leagues
                  </label>
                  <select
                    value={yourValue}
                    onChange={(e) => setSelectedLeagueId(e.target.value || null)}
                    className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#8ef17d]/40"
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

              <div>
                <label className="mb-1 block text-xs text-zinc-400">
                  Public leagues
                </label>
                <select
                  value={publicValue}
                  onChange={(e) => setSelectedLeagueId(e.target.value || null)}
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#8ef17d]/40"
                >
                  <option value="">— Browse public leagues —</option>
                  {publicLeagues.map((l) => (
                    <option key={l.leagueId} value={l.leagueId}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* CREATE LEAGUE */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur shadow-[0_10px_30px_rgba(0,0,0,.35)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-zinc-400">
                New league name
              </label>
              <input
                value={newLeagueName}
                onChange={(e) => setNewLeagueName(e.target.value)}
                placeholder="e.g., Campus Doubles Ladder"
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-[#8ef17d]/40"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-zinc-400">Visibility</label>
              <select
                value={visibility}
                onChange={(e) =>
                  setVisibility(e.target.value as "public" | "private")
                }
                className="w-40 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#8ef17d]/40"
                title="Visibility"
              >
                <option value="private">Private</option>
                <option value="public">Public</option>
              </select>
            </div>

            <button
              disabled={creating || !newLeagueName.trim()}
              onClick={onCreateLeague}
              className="inline-flex items-center justify-center rounded-lg bg-[#8ef17d] px-4 py-2 text-sm font-semibold text-black transition hover:brightness-95 disabled:opacity-50"
              title={signedIn ? "Create a new league" : "Sign in to create a league"}
            >
              {signedIn ? (creating ? "Creating…" : "Create League") : "Sign in to create"}
            </button>
          </div>
        </section>

        {/* STANDINGS + LOG MATCH */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_.9fr]">
          {/* Standings card */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur shadow-[0_10px_30px_rgba(0,0,0,.35)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Standings</h2>
              {!selectedLeagueId && (
                <span className="text-xs text-zinc-400">Select a league</span>
              )}
            </div>

            {loadingStandings && (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-8 w-full animate-pulse rounded bg-white/10" />
                ))}
              </div>
            )}

            {standings && standings.length > 0 && (
              <ul className="divide-y divide-white/10">
                {standings.map((p, idx) => (
                  <li
                    key={p.playerId}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-right text-zinc-400">{idx + 1}</span>
                      <span className="font-medium">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="tabular-nums">
                        {p.wins}-{p.losses}
                      </span>
                      <span className="text-zinc-400 tabular-nums">
                        {(p.winPct * 100).toFixed(1)}%
                      </span>
                      <span className="text-zinc-400 tabular-nums">
                        PF {p.pointsFor} / PA {p.pointsAgainst}
                      </span>
                      <span
                        className={`tabular-nums ${
                          p.streak > 0
                            ? "text-emerald-400"
                            : p.streak < 0
                            ? "text-rose-400"
                            : "text-zinc-400"
                        }`}
                      >
                        {p.streak > 0 ? `W${p.streak}` : p.streak < 0 ? `L${-p.streak}` : "—"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {standings && standings.length === 0 && (
              <p className="text-sm text-zinc-400">No matches yet.</p>
            )}
          </div>

          {/* Log match (owners only) */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur shadow-[0_10px_30px_rgba(0,0,0,.35)]">
            <h2 className="text-lg font-semibold">Log Match (Singles)</h2>

            {!ownsSelected && selectedLeagueId && (
              <p className="mt-1 text-xs text-zinc-400">
                Viewing a public league — only the owner can log matches.
              </p>
            )}

            {ownsSelected && (
              <>
                <datalist id="league-players">
                  {players.map((p) => (
                    <option key={p.playerId} value={p.name} />
                  ))}
                </datalist>
                {loadingPlayers && (
                  <p className="mt-1 text-xs text-zinc-400">Loading players…</p>
                )}

                <form onSubmit={onSubmitMatch} className="mt-4 space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input
                      list="league-players"
                      value={a1}
                      onChange={(e) => setA1(e.target.value)}
                      placeholder="Player A"
                      className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-[#8ef17d]/40"
                    />
                    <input
                      list="league-players"
                      value={b1}
                      onChange={(e) => setB1(e.target.value)}
                      placeholder="Player B"
                      className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-[#8ef17d]/40"
                    />
                  </div>

                  <div className="flex gap-3">
                    <input
                      type="number"
                      value={sa}
                      onChange={(e) =>
                        setSa(e.target.value === "" ? "" : Number(e.target.value))
                      }
                      placeholder="Score A"
                      className="w-28 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-[#8ef17d]/40"
                    />
                    <input
                      type="number"
                      value={sb}
                      onChange={(e) =>
                        setSb(e.target.value === "" ? "" : Number(e.target.value))
                      }
                      placeholder="Score B"
                      className="w-28 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-[#8ef17d]/40"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="submit"
                      disabled={savingMatch || !selectedLeagueId}
                      className="inline-flex items-center justify-center rounded-lg bg-[#7db2ff] px-4 py-2 text-sm font-semibold text-black transition hover:brightness-95 disabled:opacity-50"
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
                      className="inline-flex items-center justify-center rounded-lg bg-rose-500/90 px-3 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-50"
                    >
                      Undo last match
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
