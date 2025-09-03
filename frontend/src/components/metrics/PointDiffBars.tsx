// src/components/metrics/PointDiffBars.tsx
import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Cell,
  LabelList,
} from "recharts";
import { useMetrics } from "./MetricsProvider";

type Row = {
  playerId: string;
  name: string;
  pointsFor: number;
  pointsAgainst: number;
};

export default function PointDiffBars() {
  const { standings, loading } = useMetrics();

  const data = useMemo(() => {
    if (!Array.isArray(standings)) return [];
    return (standings as Row[]).map((r) => {
      const diff = (r.pointsFor || 0) - (r.pointsAgainst || 0);
      const pos = diff > 0 ? diff : 0;
      const neg = diff < 0 ? diff : 0; // keep negative
      return {
        id: r.playerId,
        name: r.name,
        diff,
        pos,
        neg,
        // Only give a label to the series that has a visible bar
        posName: pos > 0 ? r.name : "",
        negName: neg < 0 ? r.name : "",
      };
    });
  }, [standings]);

  // Symmetric Y domain for balanced diverging chart
  const yDomain = useMemo<[number, number]>(() => {
    const maxAbs = Math.max(0, ...data.map((d) => Math.abs(d.diff)));
    const pad = Math.ceil(maxAbs * 0.1);
    const bound = maxAbs + pad;
    return [-bound, bound];
  }, [data]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <h2 className="mb-2 text-lg font-semibold">Point Differential</h2>
      <p className="mb-3 text-xs text-zinc-400">
        Green bars up (positive), red bars down (negative). Names sit below green, above red.
      </p>

      {loading ? (
        <div className="h-64 rounded-xl border border-white/10 bg-white/5 animate-pulse" />
      ) : !data.length ? (
        <p className="text-sm text-zinc-400">No players yet.</p>
      ) : (
        <div style={{ height: 340 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 30, right: 16, bottom: 36, left: 12 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              {/* Hide default X tick labels; we draw names as LabelLists */}
              <XAxis dataKey="name" tick={false} axisLine={false} />
              <YAxis width={40} domain={yDomain as any} tick={{ fill: "#a1a1aa", fontSize: 12 }} />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.35)" strokeWidth={1} />

              {/* Positive (green, up) */}
              <Bar dataKey="pos" barSize={28} radius={[6, 6, 0, 0]} isAnimationActive={false}>
                {data.map((d, i) => (
                  <Cell key={`pos-${d.id || i}`} fill="#22c55e" />
                ))}
                <LabelList
                  dataKey="posName"
                  position="bottom"
                  offset={14}
                  fill="#22c55e"
                  style={{ pointerEvents: "none" }}
                />
              </Bar>

              {/* Negative (red, down) */}
              <Bar dataKey="neg" barSize={28} radius={[6, 6, 0, 0]} isAnimationActive={false}>
                {data.map((d, i) => (
                  <Cell key={`neg-${d.id || i}`} fill="#ef4444" />
                ))}
                <LabelList
                  dataKey="negName"
                  position="top"
                  offset={10}
                  fill="#ef4444"
                  style={{ pointerEvents: "none" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
