import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { WEIGHTS, WEIGHT_LABELS } from "../../lib/constants";
import type { Business } from "../../lib/types";

export function ScoreBreakdownChart({ business }: { business: Business }) {
  const data = (Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[]).map((dim) => ({
    dimension: `${WEIGHT_LABELS[dim]} ${Math.round(WEIGHTS[dim] * 100)}%`,
    contribution: business.qualityContributions[dim],
    max: Math.round(WEIGHTS[dim] * 100),
  }));

  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 24, right: 16, top: 4, bottom: 4 }}>
          <CartesianGrid horizontal={false} stroke="#DDD8CC" />
          <XAxis type="number" tick={{ fontSize: 11, fontFamily: "DM Mono", fill: "#6B6B5A" }} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="dimension"
            width={130}
            tick={{ fontSize: 11, fontFamily: "DM Mono", fill: "#1A1A1A" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value, _name, props) => [`${value} / ${props.payload.max}`, "contribution"]}
            contentStyle={{ fontFamily: "DM Mono", fontSize: 12, border: "1px solid #DDD8CC", borderRadius: 4 }}
          />
          <Bar dataKey="contribution" radius={2} barSize={16}>
            {data.map((_, i) => (
              <Cell key={i} fill="#2D6A4F" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
