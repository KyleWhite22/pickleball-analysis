import { useMemo, useState } from "react";
import { useMetrics } from "./MetricsProvider";
import { SkeletonCard } from "../../ui/SkeletonCard";  // <-- import skeleton

type SortKey = "default" | "rec" | "winpct" | "diff" | "name";

export default function Standings() {
  const { standings, loading } = useMetrics();

  const [sortKey, setSortKey] = useState<SortKey>("default");
  const data = Array.isArray(standings) ? standings : [];

  const sorted = useMemo(() => {
    if (sortKey === "default") return data;
    const withDiff = data.map((p) => ({
      ...p,
      _diff: (p.pointsFor ?? 0) - (p.pointsAgainst ?? 0),
    }));

    switch (sortKey) {
      case "rec":
        return data;
      case "winpct":
        return [...withDiff].sort(
          (a, b) =>
            b.winPct - a.winPct ||
            b.wins - a.wins ||
            b._diff - a._diff ||
            a.name.localeCompare(b.name)
        );
      case "diff":
        return [...withDiff].sort(
          (a, b) =>
            b._diff - a._diff ||
            b.winPct - a.winPct ||
            b.wins - a.wins ||
            a.name.localeCompare(b.name)
        );
      case "name":
        return [...withDiff].sort((a, b) => a.name.localeCompare(b.name));
      default:
        return data;
    }
  }, [data, sortKey]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Leaderboard</h2>

        {/* simple sort controls */}
        <div className="flex items-center gap-1 text-xs">
          <SortChip label="Record" active={sortKey === "rec"} onClick={() => setSortKey("rec")} />
          <SortChip label="Win %" active={sortKey === "winpct"} onClick={() => setSortKey("winpct")} />
          <SortChip label="Point Diff" active={sortKey === "diff"} onClick={() => setSortKey("diff")} />
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <SkeletonCard />   // ⬅️ show skeleton during load
      ) : !standings ? (
        <p className="text-sm text-zinc-400">Select a league</p>
      ) : standings.length === 0 ? (
        <p className="text-sm text-zinc-400">No matches yet.</p>
      ) : (
        <ul className="divide-y divide-white/10 text-[13px] sm:text-sm">
          {/* header */}
          <li
            className="grid items-center py-1 text-[11px] uppercase tracking-wide
                       [grid-template-columns:1.25rem_minmax(0,1fr)_minmax(2.75rem,3.25rem)_minmax(3.5rem,4rem)_minmax(3.25rem,4rem)] gap-x-1.5"
          >
            <span />
            <span className="min-w-0 text-zinc-400">Name</span>
            <span className="text-right text-white font-semibold leading-tight">Rec</span>
            <span className="text-right text-white font-semibold leading-tight">Win%</span>
            <span className="text-right text-white font-semibold leading-tight">PF/PA</span>
          </li>

          {sorted.map((p, i) => (
            <li
              key={p.playerId}
              className="grid items-center py-1 leading-tight
                         [grid-template-columns:1.25rem_minmax(0,1fr)_minmax(2.75rem,3.25rem)_minmax(3.5rem,4rem)_minmax(3.25rem,4rem)] gap-x-1.5"
            >
              <span className={`text-right tabular-nums ${i === 0 ? "text-yellow-400 font-semibold" : "text-zinc-400"}`}>
                {i + 1}
              </span>
              <span className={`min-w-0 truncate font-medium ${i === 0 ? "text-yellow-400 font-semibold" : ""}`}>
                {p.name}
              </span>
              <span className="text-right text-zinc-400 tabular-nums whitespace-nowrap">
                {p.wins}-{p.losses}
              </span>
              <span className="text-right text-zinc-400 tabular-nums whitespace-nowrap">
                {(p.winPct * 100).toFixed(0)}%
              </span>
              <span className="text-right text-zinc-400 tabular-nums whitespace-nowrap">
                {p.pointsFor}/{p.pointsAgainst}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SortChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full px-2 py-0.5",
        "border text-[11px]",
        active
          ? "border-mint/40 bg-mint/15 text-mint"
          : "border-white/10 bg-black/30 text-zinc-300 hover:bg-white/10",
      ].join(" ")}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}
