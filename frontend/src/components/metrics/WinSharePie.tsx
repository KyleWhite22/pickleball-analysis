import { useEffect, useMemo, useState, useCallback } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";
import { getLeagueMetrics, type MatchDTO } from "../../lib/api";
import { useMetrics } from "./MetricsProvider";

// Generate N distinct orange shades (HSL from light → dark)
function orangeScale(
  n: number,
  opts?: { hue?: number; sat?: number; lMin?: number; lMax?: number }
) {
  const hue = opts?.hue ?? 28;   // orange-ish
  const sat = opts?.sat ?? 95;   // vivid
  const lMin = opts?.lMax ?? 88; // lightest
  const lMax = opts?.lMin ?? 38; // darkest
  if (n <= 0) return [];
  if (n === 1) return [`hsl(${hue} ${sat}% ${Math.round((lMax + lMin) / 2)}%)`];

  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const L = Math.round(lMax + (lMin - lMax) * t);
    out.push(`hsl(${hue} ${sat}% ${L}%)`);
  }
  return out;
}

/** Count wins per player (each winning teammate gets 1) */
function winsPerPlayer(matches: MatchDTO[]): Map<string, { name: string; wins: number }> {
  const map = new Map<string, { name: string; wins: number }>();
  for (const m of matches) {
    const wt = m.winnerTeam;
    if (wt !== 0 && wt !== 1) continue; // skip ties/unknown
    const winners = m.teams[wt]?.players ?? [];
    for (const p of winners) {
      if (!p?.id) continue;
      const prev = map.get(p.id) || { name: p.name || p.id, wins: 0 };
      map.set(p.id, { name: p.name || prev.name, wins: prev.wins + 1 });
    }
  }
  return map;
}

export default function WonSharePie({ leagueId }: { leagueId: string | null }) {
  const { version } = useMetrics();
  const [data, setData] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!leagueId) { setData([]); return; }
      setLoading(true);
      try {
        const { recentMatches } = await getLeagueMetrics(leagueId);
        if (!alive) return;

        const wins = winsPerPlayer(recentMatches as MatchDTO[]);
        const totalWins = Array.from(wins.values()).reduce((s, r) => s + r.wins, 0);

        if (totalWins === 0) {
          setData([]); // no decisive games
        } else {
          const rows = Array.from(wins.values())
            .map(r => ({ name: r.name, value: r.wins }))
            .filter(r => r.value > 0) // hide 0-win players
            .sort((a, b) => b.value - a.value);
          setData(rows);
        }
      } catch (e) {
        console.warn("[WonSharePie] load failed:", e);
        if (alive) setData([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [leagueId, version]);

  const colors = useMemo(() => orangeScale(data.length), [data.length]);

  // Custom outside labels
const label = useCallback((props: PieLabelRenderProps) => {
  const { cx = 0, cy = 0, midAngle = 0, outerRadius = 0, percent = 0, payload, fill } = props || {};
  if (!percent || percent < 0.04 || !payload?.name) return null;
  const RAD = Math.PI / 180;
  const r = Number(outerRadius) + 14;   // ensure number for TS + perf
  const x = Number(cx) + r * Math.cos(-midAngle * RAD);
  const y = Number(cy) + r * Math.sin(-midAngle * RAD);
  return (
    <text
      x={x}
      y={y}
      textAnchor={x > Number(cx) ? "start" : "end"}
      dominantBaseline="central"
      fontSize={12}
      fill={fill ?? "#fff"}
    >
      {`${payload.name} ${(percent * 100).toFixed(0)}%`}
    </text>
  );
}, []);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <h2 className="mb-2 text-lg font-semibold">Win Percentages</h2>
     
      {loading ? (
        <div className="h-64 rounded-xl border border-white/10 bg-white/5 animate-pulse" />
      ) : !leagueId ? (
        <p className="text-sm text-zinc-400">Select a league</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-zinc-400">No games yet.</p>
      ) : (
        <div style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                labelLine={false}
                label={label}
                isAnimationActive={false} 
              >
                {data.map((_, i) => (
                  <Cell key={`cell-${i}`} fill={colors[i]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any, _n, props: any) => {
                  const wins = Number(value) || 0;
                  const pct = props?.payload?.percent ? (props.payload.percent * 100).toFixed(1) : "0.0";
                  return [`${wins} wins (${pct}%)`, "Win Share"];
                }}
                labelFormatter={(label: string) => label}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                wrapperStyle={{ fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
