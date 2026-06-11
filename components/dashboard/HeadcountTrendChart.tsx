"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface HeadcountTrendChartProps {
  activeCount: number;
}

export function HeadcountTrendChart({ activeCount }: HeadcountTrendChartProps) {
  const count = activeCount || 312;
  const data = [
    { name: "Jan", headcount: Math.round(count * 0.77) },
    { name: "Feb", headcount: Math.round(count * 0.8) },
    { name: "Mar", headcount: Math.round(count * 0.85) },
    { name: "Apr", headcount: Math.round(count * 0.89) },
    { name: "May", headcount: Math.round(count * 0.94) },
    { name: "Jun", headcount: count },
  ];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-sm transition-all duration-500 ease-[var(--ease-out-expo)] hover:border-zinc-300 hover:shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Headcount Trend
          </p>
          <h3 className="text-base font-bold text-zinc-900 mt-1">
            Growing the <span className="italic-serif text-lg font-light text-[var(--purple)]">tribe</span>, month by month
          </h3>
        </div>
        <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-50 border border-zinc-100 rounded-full px-2.5 py-1">
          Last 6 months
        </span>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorHeadcount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8e43ac" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#8e43ac" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="name"
              stroke="#a1a1aa"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis
              stroke="#a1a1aa"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              dx={-5}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e4e4e7",
                borderRadius: "8px",
                fontSize: "11px",
              }}
            />
            <Area
              type="monotone"
              dataKey="headcount"
              stroke="#8e43ac"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorHeadcount)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
