import { useEffect, useState } from "react";
import { getLeagueMetrics, type MatchDTO } from "../../lib/api";
import { computeSuperlatives, type Superlatives } from "../../hooks/stats";

export default function Superlatives({ leagueId }: { leagueId: string | null }) {
  const [data, setData] = useState<Superlatives>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setData({});
    setLoading(false);

    (async () => {
      if (!leagueId) return;
      setLoading(true);
      try {
        const { recentMatches } = await getLeagueMetrics(leagueId);
        if (!alive) return;
        setData(computeSuperlatives(recentMatches as MatchDTO[]));
      } catch (e) {
        console.warn("[Superlatives] metrics load failed:", e);
        if (!alive) return;
        setData({});
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [leagueId]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <h2 className="mb-3 text-lg font-semibold">League Superlatives</h2>

      {loading ? (
        <div className="h-28 rounded-xl border border-white/10 bg-white/5 animate-pulse" />
      ) : !leagueId ? (
        <p className="text-sm text-zinc-400">Select a league</p>
      ) : (
        <ul className="space-y-2 text-sm">
          <Item
            label="King of the Court"
            value={
              data.kingOfTheCourt
                ? `${data.kingOfTheCourt.name} (${data.kingOfTheCourt.matchesAtFirst} matches in first)`
                : "—"
            }
          />
          <Item
            label="Most Clutch"
            value={
              data.mostClutch
                ? `${data.mostClutch.name} (avg margin ${data.mostClutch.avgWinMargin.toFixed(1)})`
                : "—"
            }
          />
          <Item
            label="Most Heated Rivalry"
            value={
              data.mostHeatedRivalry
                ? `${data.mostHeatedRivalry.aName} vs ${data.mostHeatedRivalry.bName} (${data.mostHeatedRivalry.winsA}–${data.mostHeatedRivalry.winsB}, ${data.mostHeatedRivalry.total} games)`
                : "—"
            }
          />
          <Item
            label="Longest Win Streak"
            value={
              data.longestWinStreak
                ? `${data.longestWinStreak.name} (${data.longestWinStreak.streak})`
                : "—"
            }
          />
          <Item
            label="Upset King"
            value={data.upsetKing ? `${data.upsetKing.name} (${data.upsetKing.upsets})` : "—"}
          />
          <Item
            label="Dominator"
            value={
              data.dominator
                ? `${data.dominator.name} (avg margin ${data.dominator.avgMargin.toFixed(1)})`
                : "—"
            }
          />
          <Item
            label="Most Matches Played"
            value={data.ironman ? `${data.ironman.name} (${data.ironman.matches} matches)` : "—"}
          />
          <Item
            label="Partner Hopper"
            value={
              data.partnerHopper
                ? `${data.partnerHopper.name} (${data.partnerHopper.partners} partners)`
                : "—"
            }
          />
        </ul>
      )}
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex flex-wrap justify-between gap-y-1">
      <span className="text-zinc-400 whitespace-nowrap">{label}:</span>
      <span className="font-medium text-white text-right">{value}</span>
    </li>
  );
}
