// src/components/metrics/PlayerMetrics.tsx
import { useMemo, useState, useEffect, useCallback } from "react";
import { useMetrics } from "./MetricsProvider";

// If your backend later adds these, they’ll show automatically.
// Otherwise they just render "—".
type MaybeExtendedStanding = {
  playerId: string;
  name: string;
  wins: number;
  losses: number;
  winPct: number;      // 0..1
  pointsFor: number;
  pointsAgainst: number;
  elo?: number;        // optional
  bestPartnerName?: string; // optional
};

export default function PlayerMetrics() {
  const { standings, loading } = useMetrics();

  // Hooks must be unconditional:
  const data: MaybeExtendedStanding[] = Array.isArray(standings) ? standings as any : [];
  // Default order: best record first (same as your leaderboard default)
  const ordered = useMemo(() => {
    return [...data].sort(
      (a, b) =>
        b.wins - a.wins ||
        b.winPct - a.winPct ||
        (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst) ||
        a.name.localeCompare(b.name)
    );
  }, [data]);

  const [idx, setIdx] = useState(0);

  // Reset index if the list changes size
  useEffect(() => {
    setIdx(0);
  }, [ordered.length]);

  const current = ordered[idx];

  const canPrev = idx > 0;
  const canNext = idx + 1 < ordered.length;

  const goPrev = useCallback(() => {
    if (canPrev) setIdx(i => i - 1);
  }, [canPrev]);

  const goNext = useCallback(() => {
    if (canNext) setIdx(i => i + 1);
  }, [canNext]);

  // Keyboard arrows (optional nicety)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
      if (e.key === "ArrowRight") { e.preventDefault(); goNext(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Player Metrics</h2>

        {/* Pager: mint when clickable, subtle when not */}
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            disabled={!canPrev}
            className={[
              "rounded-lg px-2 py-1 text-base leading-none",
              canPrev
                ? "text-mint hover:bg-white/10"
                : "text-zinc-500 cursor-not-allowed"
            ].join(" ")}
            aria-label="Previous player"
            title="Previous player"
          >
            ‹
          </button>
          <span className="text-xs text-zinc-400 tabular-nums">
            {ordered.length ? `${idx + 1} / ${ordered.length}` : "0 / 0"}
          </span>
          <button
            onClick={goNext}
            disabled={!canNext}
            className={[
              "rounded-lg px-2 py-1 text-base leading-none",
              canNext
                ? "text-mint hover:bg-white/10"
                : "text-zinc-500 cursor-not-allowed"
            ].join(" ")}
            aria-label="Next player"
            title="Next player"
          >
            ›
          </button>
        </div>
      </div>

      {/* Body states */}
      {loading ? (
        <div className="h-28 rounded-xl border border-white/10 bg-white/5 animate-pulse" />
      ) : !standings ? (
        <p className="text-sm text-zinc-400">Select a league</p>
      ) : ordered.length === 0 ? (
        <p className="text-sm text-zinc-400">No players yet.</p>
      ) : (
        current && (
          <div className="space-y-4">
            {/* Name + rank-ish badge */}
            <div className="flex items-baseline justify-between">
              <div className="min-w-0">
                <div className="truncate text-xl font-semibold">{current.name}</div>
                
              </div>
            </div>

            {/* Stat grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatBox label="Record" value={`${current.wins}-${current.losses}`} />
              <StatBox label="Win %" value={`${(current.winPct * 100).toFixed(0)}%`} />
              <StatBox
                label="PF / PA"
                value={`${current.pointsFor}/${current.pointsAgainst}`}
              />
              <StatBox label="Point Diff" value={`${current.pointsFor - current.pointsAgainst}`} />
              <StatBox label="ELO" value={current.elo != null ? Math.round(current.elo).toString() : "—"} />
              <StatBox label="Best Partner" value={current.bestPartnerName ?? "—"} />
            </div>
          </div>
        )
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
