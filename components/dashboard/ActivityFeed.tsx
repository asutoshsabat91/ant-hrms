import { formatDistanceToNow } from "date-fns";

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  type: "hire" | "leave" | "payroll" | "grievance" | "system";
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  const displayItems = items.length > 0 ? items : [
    {
      id: "1",
      title: "Ananya Gupta approved leave request for Ishita Sen",
      createdAt: new Date(Date.now() - 12 * 60000),
    },
    {
      id: "2",
      title: "System auto-generated payroll report for May 2026",
      createdAt: new Date(Date.now() - 60 * 60000),
    },
    {
      id: "3",
      title: "Maya Krishnan added a new employee Tanvi Bose",
      createdAt: new Date(Date.now() - 180 * 60000),
    },
    {
      id: "4",
      title: "Karthik Reddy raised a grievance GRV-11",
      createdAt: new Date(Date.now() - 24 * 3600000),
    },
    {
      id: "5",
      title: "Priya Sharma uploaded document Sprint Brief Q2",
      createdAt: new Date(Date.now() - 36 * 3600000),
    }
  ];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-sm flex flex-col h-full transition-all duration-500 ease-[var(--ease-out-expo)] hover:border-zinc-300 hover:shadow-md">
      <h3 className="mb-4 text-sm font-bold text-zinc-900">
        Activity
      </h3>
      <div className="space-y-3 flex-1 overflow-y-auto pr-1">
        {displayItems.map((item) => (
          <div key={item.id} className="group/item flex items-start gap-3 p-1 rounded-lg hover:bg-zinc-50/50 transition-colors duration-300">
            <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-300 group-hover/item:bg-[var(--purple)] group-hover/item:scale-125 group-hover/item:shadow-[0_0_6px_var(--purple)] transition-all duration-300" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-zinc-900 leading-snug group-hover/item:text-zinc-950 transition-colors duration-300">
                {item.title}
              </p>
              <p className="mt-0.5 text-[10px] text-zinc-400 font-medium">
                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
