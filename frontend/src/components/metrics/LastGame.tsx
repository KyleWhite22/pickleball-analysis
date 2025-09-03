import { useEffect, useState } from "react";
import { listMatches, type MatchDTO } from "../../lib/api";

export default function LastGame({ leagueId }: { leagueId: string | null }) {
  const [pages, setPages] = useState<MatchDTO[][]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [index, setIndex] = useState(0); // starting index into flat list
  const [loading, setLoading] = useState(false);

  const flat = pages.flat();
  const visible = flat.slice(index, index + 3);

  // reset when league changes
  useEffect(() => {
    setPages([]);
    setCursor(null);
    setIndex(0);
  }, [leagueId]);

  // initial load
  useEffect(() => {
    if (!leagueId || pages.length) return;
    (async () => {
      setLoading(true);
      try {
        const { matches, nextCursor } = await listMatches(leagueId, { limit: 12 });
        setPages([matches]);
        setCursor(nextCursor);
      } finally {
        setLoading(false);
      }
    })();
  }, [leagueId, pages.length]);

  async function loadMore() {
    if (!leagueId || !cursor || loading) return;
    setLoading(true);
    try {
      const { matches, nextCursor } = await listMatches(leagueId, { limit: 12, cursor });
      setPages(prev => [...prev, matches]);
      setCursor(nextCursor);
    } finally {
      setLoading(false);
    }
  }

  async function goOlder() {
    // move down (toward older)
    if (index + 3 >= flat.length && cursor) {
      await loadMore();
    }
    if (index + 3 < flat.length) {
      setIndex(i => i + 1);
    }
  }

  function goNewer() {
    // move up (toward newer)
    if (index > 0) {
      setIndex(i => i - 1);
    }
  }

  if (!leagueId) return <div className="text-sm text-zinc-400">Select a league</div>;
  if (loading && flat.length === 0) return <div className="text-sm text-zinc-400">Loading…</div>;
  if (flat.length === 0) return <div className="text-sm text-zinc-400">No matches yet.</div>;

  function TeamLine({ m }: { m: MatchDTO }) {
    const t1 = m.teams[0]?.players?.map(p => p.name).join(" & ") || "Team A";
    const t2 = m.teams[1]?.players?.map(p => p.name).join(" & ") || "Team B";
    const s1 = m.score.team1, s2 = m.score.team2;
    const won = m.winnerTeam;
    return (
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
        <div className={`truncate ${won === 0 ? "text-emerald-300 font-semibold" : "text-zinc-300"}`}>{t1}</div>
        <div className="text-zinc-400 tabular-nums">{s1} — {s2}</div>
        <div className={`truncate text-right ${won === 1 ? "text-emerald-300 font-semibold" : "text-zinc-300"}`}>{t2}</div>
      </div>
    );
  }

  function MatchCard({ m }: { m: MatchDTO }) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
        <TeamLine m={m} />
        <div className="mt-1 text-xs text-zinc-400">{new Date(m.createdAt).toLocaleString()}</div>
      </div>
    );
  }

  const canGoNewer = index > 0;
  const canGoOlder = (index + 3) < flat.length || !!cursor;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 flex flex-col items-stretch">
      <h2 className="text-lg font-semibold mb-2">Recent Games</h2>
{/* Up arrow (newer) */}
<div className="flex justify-center mb-2">
  <button
    onClick={goNewer}
    disabled={!canGoNewer}
    className={`text-2xl font-bold transition
      ${canGoNewer ? "text-mint hover:brightness-110" : "text-zinc-500 cursor-not-allowed"}`}
    aria-label="Show newer games"
    title="Show newer games"
  >
    ^
  </button>
</div>

{/* 3 visible games */}
<div className="space-y-3">
  {visible.map(v => <MatchCard key={v.matchId} m={v} />)}
</div>

{/* Down arrow (older) */}
<div className="flex justify-center mt-2">
  <button
    onClick={goOlder}
    disabled={!canGoOlder}
    className={`text-2xl font-bold transition
      ${canGoOlder ? "text-mint hover:brightness-110" : "text-zinc-500 cursor-not-allowed"}`}
    aria-label="Show older games"
    title="Show older games"
  >
    ∨
  </button>
</div>

 
    </div>
  );
}
