// e.g., src/components/metrics/StreakDivergingChart.tsx
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ReferenceLine,
  LabelList,
  Label
} from "recharts";
import { useMemo } from "react";
import { useMetrics } from "./MetricsProvider";

export default function StreakDivergingChart() {
  const { standings } = useMetrics();

const { data, maxAbs } = useMemo(() => {
  const rows =
    (standings ?? [])
      .filter(p => typeof p?.streak === "number" && p.streak !== 0)
      // ✅ sort so wins first (descending), then losses (ascending)
      .sort((a, b) => {
        if (a.streak > 0 && b.streak <= 0) return -1; // a win above a loss
        if (a.streak <= 0 && b.streak > 0) return 1;  // a loss below a win
        // both same sign → sort by absolute streak magnitude
        return Math.abs(b.streak) - Math.abs(a.streak);
      })
      .slice(0, 12)
      .map(p => {
        const win  = p.streak > 0 ? p.streak : 0;
        const loss = p.streak < 0 ? p.streak : 0;
        return {
          name: p.name,
          win,
          loss,
          winName:  win  > 0 ? p.name : undefined,
          lossName: loss < 0 ? p.name : undefined,
        };
      });

  const m = rows.length
    ? Math.max(...rows.map(d => Math.max(Math.abs(d.win), Math.abs(d.loss))))
    : 0;

  return { data: rows, maxAbs: m };
}, [standings]);

const domain: [number, number] = maxAbs > 0 ? [-maxAbs, maxAbs] : [-1, 1];
const rowHeight = 18;                         // try 16–20
const basePadding = 40;                       // top+bottom room for axes/labels
const chartHeight = Math.max(220, basePadding + data.length * rowHeight);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <h2 className="mb-2 text-lg font-semibold">Streak Chart</h2>

<div style={{ height: chartHeight }}>

 <ResponsiveContainer width="100%" height="100%">
  <BarChart
    data={data}  // [{ name, win (>0), loss (<0), winName?, lossName? }]
    layout="vertical"
    margin={{ top: 6, right: 64, bottom: 28, left: 48 }} // <- extra right space for loss names
    barCategoryGap="28%"
  >
    {/* Zero axis */}
    <ReferenceLine x={0} stroke="rgba(255,255,255,0.18)" />

    {/* Whole-number ticks; hide 0; bottom labels */}
    <XAxis
      type="number"
      domain={domain}
      allowDecimals={false}
      tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
      axisLine={{ stroke: "rgba(255,255,255,0.18)" }}
      tickLine={false}
      tickFormatter={(v: number) => (v === 0 ? "" : String(Math.abs(Math.trunc(v))))}
    >
      <Label
        value="Losses"
        position="insideBottomLeft"
        offset={0}
        style={{ fill: "rgb(248,113,113)", fontSize: 11, fontWeight: 600 }}
      />
      <Label
        value="Wins"
        position="insideBottomRight"
        offset={0}
        style={{ fill: "rgb(52,211,153)", fontSize: 11, fontWeight: 600 }}
      />
    </XAxis>

    <YAxis dataKey="name" type="category" hide />

    {/* 🔴 LOSS bar (negative values) */}
    <Bar
      dataKey="loss"
      barSize={8}
      radius={[4, 4, 4, 4]}
      fill="rgb(244,63,94)"
      isAnimationActive={false}  // <— helpful while debugging label positions
    >
      <LabelList
        dataKey="lossName"    // ensure you set this field only for losses
        position="left"      // right edge of red bar == zero axis
        offset={10}           // push name further right of axis
        fill="#fff"
        fontSize={12}
        fontWeight={600}
      />
    </Bar>

    {/* 🟢 WIN bar (positive values) */}
    <Bar
      dataKey="win"
      barSize={8}
      radius={[4, 4, 4, 4]}
      fill="rgb(52,211,153)"
      isAnimationActive={false}
    >
      <LabelList
        dataKey="winName"     // ensure you set this field only for wins
        position="left"       // left edge of green bar == zero axis
        offset={8}            // small nudge left of axis
        fill="#fff"
        fontSize={12}
        fontWeight={600}
      />
    </Bar>
  </BarChart>
</ResponsiveContainer>
      </div>
    </div>
  );
}
