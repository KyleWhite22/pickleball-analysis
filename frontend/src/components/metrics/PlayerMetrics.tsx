// src/components/metrics/PlayerMetrics.tsx
import { useMemo, useState, useEffect, useCallback } from "react";
import { useMetrics } from "./MetricsProvider";
import { getLeagueMetrics, type MatchDTO } from "../../lib/api";
import {
  computeElo,
  computeBestPartners,
  type BestPartnersMap,
  computeCompositeScores,
  computeGrades,
} from "../../hooks/stats";

type MaybeExtendedStanding = {
  playerId: string;
  name: string;
  wins: number;
  losses: number;
  winPct: number; // 0..1
  pointsFor: number;
  pointsAgainst: number;
  elo?: number;
  photoUrl? : string;
};

/** Build a per-player longest win streak map from doubles matches */
function computeLongestWinStreaks(matches: MatchDTO[]): Record<string, number> {
  // process in chronological order
  const ms = [...matches].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  type StreakAgg = { cur: number; best: number };
  const m: Record<string, StreakAgg> = {};
  const ensure = (id: string) => (m[id] ??= { cur: 0, best: 0 });

  for (const match of ms) {
    const [t1, t2] = match.teams;
    const A = t1?.players?.map((p) => p.id) ?? [];
    const B = t2?.players?.map((p) => p.id) ?? [];
    if (A.length !== 2 || B.length !== 2) continue;

    const t1Won = match.winnerTeam === 0;
    const t2Won = match.winnerTeam === 1;

    // update streaks for winners/losers
    const apply = (ids: string[], won: boolean) => {
      for (const id of ids) {
        const s = ensure(id);
        if (won) {
          s.cur = Math.max(1, s.cur + 1);
          s.best = Math.max(s.best, s.cur);
        } else {
          s.cur = 0;
        }
      }
    };

    // ties/unknown winner → break both teams’ streaks
    if (!t1Won && !t2Won) {
      apply(A, false);
      apply(B, false);
    } else {
      apply(A, t1Won);
      apply(B, t2Won);
    }
  }

  const out: Record<string, number> = {};
  for (const id in m) out[id] = m[id].best;
  return out;
}

export default function PlayerMetrics({ leagueId }: { leagueId: string | null }) {
  const { standings, loading, version } = useMetrics();

  // ---- partners, elo, and longest streaks from /metrics.recentMatches ----
  const [partners, setPartners] = useState<BestPartnersMap>({});
  const [elo, setElo] = useState<Record<string, number>>({});
  const [streaks, setStreaks] = useState<Record<string, number>>({});
const [photoOverrides, setPhotoOverrides] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!leagueId) {
        setPartners({});
        setElo({});
        setStreaks({});
        return;
      }
      try {
        const { recentMatches } = await getLeagueMetrics(leagueId);
        if (!alive) return;
        const ms = recentMatches as MatchDTO[];
        setPartners(computeBestPartners(ms));
        setElo(computeElo(ms));
        setStreaks(computeLongestWinStreaks(ms));
      } catch (e) {
        console.warn("[PlayerMetrics] metrics load failed:", e);
        if (!alive) return;
        setPartners({});
        setElo({});
        setStreaks({});
      }
    })();
    return () => {
      alive = false;
    };
  }, [leagueId, version]);

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
  useEffect(() => {
    setIdx(0);
  }, [ordered.length]);
  const current = ordered[idx];
  const canPrev = idx > 0;
  const canNext = idx + 1 < ordered.length;
  const goPrev = useCallback(() => {
    if (canPrev) setIdx((i) => i - 1);
  }, [canPrev]);
  const goNext = useCallback(() => {
    if (canNext) setIdx((i) => i + 1);
  }, [canNext]);

  // optional keyboard nav
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext]);

  // compute grade map from standings + elo
  const gradeMap = useMemo(() => {
    if (!standings) return {};
    const composite = computeCompositeScores(standings as any, elo);
    return computeGrades(composite);
  }, [standings, elo]);

  // helpers
  const diff = current ? current.pointsFor - current.pointsAgainst : 0;
  const diffSigned = diff > 0 ? `+${diff}` : `${diff}`; // includes zero as "0"
  const longest = current ? streaks[current.playerId] ?? 0 : 0;
const handlePhotoChange = async (file: File) => {
  if (!current) return;

  const formData = new FormData();
  formData.append("photo", file);

  const res = await fetch(`/players/${current.playerId}/photo`, {
    method: "POST",
    body: formData,
  });

  const { photoUrl } = await res.json();

  // instant UI update
  setPhotoOverrides((prev) => ({
    ...prev,
    [current.playerId]: photoUrl,
  }));
};

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Player Metrics</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            disabled={!canPrev}
            className={`rounded-lg px-2 py-1 text-base leading-none ${
              canPrev ? "text-mint hover:bg-white/10" : "text-zinc-500 cursor-not-allowed"
            }`}
            aria-label="Previous player"
          >
            ‹
          </button>
          <span className="text-xs text-zinc-400 tabular-nums">
            {ordered.length ? `${idx + 1} / ${ordered.length}` : "0 / 0"}
          </span>
          <button
            onClick={goNext}
            disabled={!canNext}
            className={`rounded-lg px-2 py-1 text-base leading-none ${
              canNext ? "text-mint hover:bg-white/10" : "text-zinc-500 cursor-not-allowed"
            }`}
            aria-label="Next player"
          >
            ›
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-28 rounded-xl border border-white/10 bg-white/5 animate-pulse" />
      ) : !standings ? (
        <p className="text-sm text-zinc-400">Select a league</p>
      ) : ordered.length === 0 ? (
        <p className="text-sm text-zinc-400">No players yet.</p>
      ) : current ? (
        <div className="space-y-4">
         <div className="flex items-baseline justify-between">
  <div className="min-w-0 flex items-center gap-3">
    <ProfilePic
  photoUrl={photoOverrides[current.playerId] ?? current.photoUrl}
  onChange={handlePhotoChange}
/>


    <div className="min-w-0">
      <div className="truncate text-xl font-semibold">
        {current.name}
      </div>

      {gradeMap[current.playerId] && (
        <span className="text-sm text-zinc-400">
          Rank:{" "}
          <span className="font-semibold text-white">
            {gradeMap[current.playerId].grade}
          </span>
        </span>
      )}
    </div>
  </div>
</div>


          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatBox
              label="ELO"
              value={
                elo[current.playerId] != null ? Math.round(elo[current.playerId]).toString() : "—"
              }
            />
            <StatBox label="Record" value={`${current.wins}-${current.losses}`} />
            <StatBox label="Win %" value={`${(current.winPct * 100).toFixed(0)}%`} />
            {/* Combined PF/PA + Diff */}
            <StatBox label="PF/PA (Diff)" value={`${current.pointsFor}/${current.pointsAgainst} (${diffSigned})`} />
            {/* New: Longest Win Streak */}
            <StatBox label="Longest Win Streak" value={longest ? `${longest}` : "—"} />
            <StatBox
              label="Highest Synergy Partner"
              value={
                partners[current.playerId]
                  ? `${partners[current.playerId]!.partnerName} (${Math.round(
                      partners[current.playerId]!.winPct * 100
                    )}%)`
                  : "—"
              }
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
function ProfilePic({
  photoUrl,
  onChange,
}: {
  photoUrl?: string;
  onChange: (file: File) => void;
}) {
  return (
    <label className="relative h-16 w-16 shrink-0 cursor-pointer">
      <img
        src={photoUrl || "/default-avatar.png"}
        alt="Profile"
        className="h-16 w-16 rounded-full object-cover border border-white/10"
      />
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            onChange(e.target.files[0]);
          }
        }}
      />
      <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center text-xs">
        Edit
      </div>
    </label>
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
