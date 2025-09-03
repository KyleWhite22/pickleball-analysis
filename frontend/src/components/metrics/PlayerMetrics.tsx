// src/components/metrics/PlayerMetrics.tsx
import { useMemo, useState, useEffect, useCallback } from "react";
import { useMetrics } from "./MetricsProvider";
import { listMatches, type MatchDTO } from "../../lib/api";
import { computeElo, computeBestPartners, type BestPartnersMap } from "../../hooks/stats";

type MaybeExtendedStanding = {
  playerId: string;
  name: string;
  wins: number;
  losses: number;
  winPct: number;      // 0..1
  pointsFor: number;
  pointsAgainst: number;
  elo?: number;
};

export default function PlayerMetrics({ leagueId }: { leagueId: string | null }) {
  const { standings, loading } = useMetrics();

  // ---- partners map (playerId -> best partner) ----
  const [partners, setPartners] = useState<BestPartnersMap>({});

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!leagueId) { setPartners({}); return; }
      try {
        // pull enough history to be meaningful
        const { matches } = await listMatches(leagueId, { limit: 300 });
        if (!alive) return;
        setPartners(computeBestPartners(matches as MatchDTO[]));
      } catch {
        if (alive) setPartners({});
      }
    }
    load();
    return () => { alive = false; };
  }, [leagueId]);

  // ---- ordering (best to worst) ----
  const data: MaybeExtendedStanding[] = Array.isArray(standings) ? (standings as any) : [];
  const ordered = useMemo(() => {
    return [...data].sort(
      (a, b) =>
        b.wins - a.wins ||
        b.winPct - a.winPct ||
        (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst) ||
        a.name.localeCompare(b.name)
    );
  }, [data]);

  // ---- pager ----
  const [idx, setIdx] = useState(0);
  useEffect(() => { setIdx(0); }, [ordered.length]);
  const current = ordered[idx];
  const canPrev = idx > 0;
  const canNext = idx + 1 < ordered.length;
  const goPrev = useCallback(() => { if (canPrev) setIdx(i => i - 1); }, [canPrev]);
  const goNext = useCallback(() => { if (canNext) setIdx(i => i + 1); }, [canNext]);

  // optional keyboard nav
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
      if (e.key === "ArrowRight") { e.preventDefault(); goNext(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext]);

  // lookup best partner for current player
  const best = current ? partners[current.playerId] : null;
const [elo, setElo] = useState<Record<string, number>>({});
useEffect(() => {
  (async () => {
    if (!leagueId) return;            // make sure you have leagueId in this component props or context
    const { matches } = await listMatches(leagueId, { limit: 500 });
    setElo(computeElo(matches));      // <-- Elo map
    setPartners(computeBestPartners(matches));
  })();
}, [leagueId]);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Player Metrics</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            disabled={!canPrev}
            className={`rounded-lg px-2 py-1 text-base leading-none ${canPrev ? "text-mint hover:bg-white/10" : "text-zinc-500 cursor-not-allowed"}`}
            aria-label="Previous player"
          >‹</button>
          <span className="text-xs text-zinc-400 tabular-nums">
            {ordered.length ? `${idx + 1} / ${ordered.length}` : "0 / 0"}
          </span>
          <button
            onClick={goNext}
            disabled={!canNext}
            className={`rounded-lg px-2 py-1 text-base leading-none ${canNext ? "text-mint hover:bg-white/10" : "text-zinc-500 cursor-not-allowed"}`}
            aria-label="Next player"
          >›</button>
        </div>
      </div>

      {loading ? (
        <div className="h-28 rounded-xl border border-white/10 bg-white/5 animate-pulse" />
      ) : !standings ? (
        <p className="text-sm text-zinc-400">Select a league</p>
      ) : ordered.length === 0 ? (
        <p className="text-sm text-zinc-400">No players yet.</p>
      ) : current && (
        <div className="space-y-4">
          <div className="flex items-baseline justify-between">
            <div className="min-w-0">
              <div className="truncate text-xl font-semibold">{current.name}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatBox label="Record" value={`${current.wins}-${current.losses}`} />
            <StatBox label="Win %" value={`${(current.winPct * 100).toFixed(0)}%`} />
            <StatBox label="PF / PA" value={`${current.pointsFor}/${current.pointsAgainst}`} />
            <StatBox label="Point Diff" value={`${current.pointsFor - current.pointsAgainst}`} />
            <StatBox label="ELO" value={elo[current.playerId] != null ? Math.round(elo[current.playerId]).toString() : "—"} />
            <StatBox
              label="Highest Synergy Partner"
              value={
                best
                  ? `${best.partnerName} (${Math.round(best.winPct * 100)}%)`
                  : "—"
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-zinc-400">{label}</div>
      <div className="mt-0.5 text-lg font-semibold text-white tabular-nums">{value}</div>
    </div>
  );
}
