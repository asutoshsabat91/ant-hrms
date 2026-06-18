"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface DeptData { name: string; headcount: number; }

export function DeptHeadcountChart({ data }: { data: DeptData[] }) {
  const total = data.reduce((s, d) => s + d.headcount, 0);
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-5 h-full">
      <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Headcount by Department</p>
      <p className="text-2xl font-extrabold text-zinc-900 mb-4">
        {total} <span className="text-sm font-medium text-zinc-400">total</span>
      </p>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e4e4e7" }}
            formatter={(v) => [`${v} people`, "Headcount"]}
          />
          <Bar dataKey="headcount" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={i % 2 === 0 ? "var(--purple)" : "#e4e4e7"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
