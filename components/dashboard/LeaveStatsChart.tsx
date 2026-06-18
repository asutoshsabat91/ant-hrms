"use client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface LeaveStatItem { status: string; count: number; }

const COLORS: Record<string, string> = {
  PENDING:   "#F59E0B",
  APPROVED:  "#22C55E",
  REJECTED:  "#EF4444",
  CANCELLED: "#A1A1AA",
  WITHDRAWN: "#A1A1AA",
};

export function LeaveStatsChart({ data }: { data: LeaveStatItem[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-5 h-full">
      <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Leave Overview</p>
      <p className="text-2xl font-extrabold text-zinc-900 mb-2">
        {total} <span className="text-sm font-medium text-zinc-400">requests</span>
      </p>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={40} outerRadius={60}>
            {data.map((entry, i) => (
              <Cell key={i} fill={COLORS[entry.status] || "#6366F1"} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v, name) => [v as number, String(name).toLowerCase()]}
            contentStyle={{ fontSize: 11 }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
