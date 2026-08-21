import { formatDistanceToNow } from "date-fns";

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  type: "hire" | "leave" | "payroll" | "system";
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  const displayItems = items;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-sm flex flex-col h-full transition-all duration-500 ease-[var(--ease-out-expo)] hover:border-zinc-300 hover:shadow-md">
      <h3 className="mb-4 text-sm font-bold text-zinc-900">
        Activity
      </h3>
      <div className="space-y-3 flex-1 overflow-y-auto pr-1">
        {displayItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center text-zinc-400 font-medium text-xs">
            No recent activity
          </div>
        ) : (
          displayItems.map((item) => (
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
          ))
        )}
      </div>
    </div>
  );
}
