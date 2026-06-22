"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function AttendancePulseChart({ data }: { data?: { name: string; attendance: number }[] }) {
  const defaultData = [
    { name: "Mon", attendance: 92.5 },
    { name: "Tue", attendance: 94.6 },
    { name: "Wed", attendance: 96.8 },
    { name: "Thu", attendance: 95.2 },
    { name: "Fri", attendance: 93.4 },
  ];
  const chartData = data && data.length > 0 ? data : defaultData;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-sm transition-all duration-500 ease-[var(--ease-out-expo)] hover:border-zinc-300 hover:shadow-md">
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          This Week
        </p>
        <h3 className="text-base font-bold text-zinc-900 mt-1">
          Attendance <span className="italic-serif text-lg font-light text-[var(--purple)]">pulse</span>
        </h3>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            barSize={16}
          >
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
              domain={[0, 100]}
              dx={-5}
            />
            <Tooltip
              formatter={(value) => [`${value}%`, "Attendance"]}
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e4e4e7",
                borderRadius: "8px",
                fontSize: "11px",
              }}
            />
            <Bar
              dataKey="attendance"
              fill="#8e43ac"
              radius={[3, 3, 0, 0]}
              background={{ fill: '#f4f4f5', radius: 3 }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
