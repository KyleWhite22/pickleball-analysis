import { useEffect, useState } from "react";
import { listMatches, type MatchDTO } from "../../lib/api";
import { ChevronLeft, ChevronRight } from "lucide-react";


export default function LastGame({ leagueId }: { leagueId: string | null }) {
  const [pages, setPages] = useState<MatchDTO[][]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [index, setIndex] = useState(0); // index within the concatenated list
  const [loading, setLoading] = useState(false);

  const flat = pages.flat();
  const current = flat[index] || null;

  useEffect(() => {
    // reset when league changes
    setPages([]);
    setCursor(null);
    setIndex(0);
  }, [leagueId]);

  useEffect(() => {
    if (!leagueId || pages.length) return;
    (async () => {
      setLoading(true);
      try {
        const { matches, nextCursor } = await listMatches(leagueId, { limit: 10 });
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
      const { matches, nextCursor } = await listMatches(leagueId, { limit: 10, cursor });
      setPages(prev => [...prev, matches]);
      setCursor(nextCursor);
    } finally {
      setLoading(false);
    }
  }

  function goPrev() {
    if (index + 1 < flat.length) {
      setIndex(i => i + 1);
    } else if (cursor) {
      // at end of loaded list; fetch more then advance
      void (async () => {
        await loadMore();
        setIndex(i => Math.min(i + 1, pages.flat().length)); // safe advance
      })();
    }
  }
  function goNext() {
    setIndex(i => Math.max(0, i - 1));
  }

  if (!leagueId) return <div className="text-sm text-zinc-400">Select a league</div>;
  if (loading && !current) return <div className="text-sm text-zinc-400">Loading…</div>;
  if (!current) return <div className="text-sm text-zinc-400">No matches yet.</div>;

  const t1 = current.teams[0]?.players?.map(p => p.name).join(" & ") || "Team A";
  const t2 = current.teams[1]?.players?.map(p => p.name).join(" & ") || "Team B";
  const s1 = current.score.team1, s2 = current.score.team2;
  const won = current.winnerTeam;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between">
  <h2 className="text-lg font-semibold">Last Game</h2>
  <div className="flex gap-2">
    {/* Next = newer (to the right) */}
    <button
      onClick={goNext}
      disabled={index === 0}
      className="rounded-lg bg-white/10 p-2 hover:bg-white/15 disabled:opacity-50"
      aria-label="Newer"
    >
      <ChevronLeft className="h-4 w-4" />
    </button>
    {/* Prev = older (to the left) */}
    <button
      onClick={goPrev}
      disabled={!cursor && index + 1 >= flat.length}
      className="rounded-lg bg-white/10 p-2 hover:bg-white/15 disabled:opacity-50"
      aria-label="Older"
    >
      <ChevronRight className="h-4 w-4" />
    </button>
  </div>
</div>

      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
        <div className={`truncate ${won === 0 ? "text-emerald-300 font-semibold" : "text-zinc-300"}`}>{t1}</div>
        <div className="text-zinc-400 tabular-nums">{s1} — {s2}</div>
        <div className={`truncate text-right ${won === 1 ? "text-emerald-300 font-semibold" : "text-zinc-300"}`}>{t2}</div>
      </div>

      <div className="mt-2 text-xs text-zinc-400">{new Date(current.createdAt).toLocaleString()}</div>
      {cursor && (index >= flat.length - 1) && (
        <div className="mt-2 text-xs text-zinc-500">More history available…</div>
      )}
    </div>
  );
}
