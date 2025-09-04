// src/components/metrics/LastGame.tsx
import { useEffect, useState } from "react";
import { getLeagueMetrics, type MatchDTO } from "../../lib/api";
import { useMetrics } from "./MetricsProvider";
import { SkeletonCard } from "../../ui/SkeletonCard";

export default function LastGame({ leagueId }: { leagueId: string | null }) {
  const { version } = useMetrics();
  const [recent, setRecent] = useState<MatchDTO[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const visible = recent.slice(index, index + 3);

  // Reset immediately when league changes (seed loading to show skeleton)
  useEffect(() => {
    setRecent([]);
    setIndex(0);
    setErr(null);
    setLoading(!!leagueId);
  }, [leagueId]);

  // Fetch from /metrics (refetch on version bumps)
  useEffect(() => {
    if (!leagueId) return;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const { recentMatches } = await getLeagueMetrics(leagueId);
        setRecent(recentMatches || []);
        setIndex(0); // jump to newest after refresh
      } catch (e: any) {
        console.warn("[LastGame] metrics load failed:", e);
        setErr(e?.message || "Failed to load recent games");
        setRecent([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [leagueId, version]);

  function goOlder() {
    if (index + 3 < recent.length) setIndex((i) => i + 1);
  }
  function goNewer() {
    if (index > 0) setIndex((i) => i - 1);
  }

  if (!leagueId) return <div className="text-sm text-zinc-400">Select a league</div>;
  if (loading) return <SkeletonCard />;
  if (err) return <div className="text-sm text-rose-300">Error: {err}</div>;
  if (recent.length === 0) return <div className="text-sm text-zinc-400">No matches yet.</div>;

  function TeamLine({ m }: { m: MatchDTO }) {
    const t1 = m.teams[0]?.players?.map((p) => p.name).join(" & ") || "Team A";
    const t2 = m.teams[1]?.players?.map((p) => p.name).join(" & ") || "Team B";
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
  const canGoOlder = index + 3 < recent.length;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 flex flex-col items-stretch">
      <h2 className="text-lg font-semibold mb-2">Recent Games</h2>

      {/* Up arrow (newer) */}
      <div className="flex justify-center mb-2">
        <button
          onClick={goNewer}
          disabled={!canGoNewer}
          className={`text-2xl font-bold transition ${
            canGoNewer ? "text-mint hover:brightness-110" : "text-zinc-500 cursor-not-allowed"
          }`}
          aria-label="Show newer games"
          title="Show newer games"
        >
          ^
        </button>
      </div>

      {/* 3 visible games */}
      <div className="space-y-3">
        {visible.map((v) => (
          <MatchCard key={v.matchId} m={v} />
        ))}
      </div>

      {/* Down arrow (older) */}
      <div className="flex justify-center mt-2">
        <button
          onClick={goOlder}
          disabled={!canGoOlder}
          className={`text-2xl font-bold transition ${
            canGoOlder ? "text-mint hover:brightness-110" : "text-zinc-500 cursor-not-allowed"
          }`}
          aria-label="Show older games"
          title="Show older games"
        >
          ∨
        </button>
      </div>
    </div>
  );
}
