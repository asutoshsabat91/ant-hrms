"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer, Event } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight } from "lucide-react";

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

type CompanyCalendarEvent = {
  id: string;
  title: string;
  start: string | Date;
  end: string | Date;
  allDay: boolean;
  category: string;
};

const categoryStyles: Record<string, { background: string; border: string }> = {
  HOLIDAY: { background: "#FDE68A", border: "#F59E0B" },
  COMPANY_EVENT: { background: "#BFDBFE", border: "#3B82F6" },
  TRAINING: { background: "#D1FAE5", border: "#22C55E" },
  LEAVE: { background: "#FBCFE8", border: "#EC4899" },
  BIRTHDAY: { background: "#E0E7FF", border: "#6366F1" },
};

export function CompanyCalendar({ canManage }: { canManage?: boolean }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("COMPANY_EVENT");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [currentView, setCurrentView] = useState<"month" | "week" | "day">("month");

  const handleNavigate = (action: "PREV" | "NEXT" | "TODAY") => {
    let nextDate = new Date(currentDate);
    if (action === "TODAY") {
      nextDate = new Date();
    } else {
      const multiplier = action === "PREV" ? -1 : 1;
      if (currentView === "month") {
        nextDate.setMonth(nextDate.getMonth() + multiplier);
      } else if (currentView === "week") {
        nextDate.setDate(nextDate.getDate() + multiplier * 7);
      } else if (currentView === "day") {
        nextDate.setDate(nextDate.getDate() + multiplier);
      }
    }
    setCurrentDate(nextDate);
  };

  const currentPeriodTitle = useMemo(() => {
    if (currentView === "month") {
      return format(currentDate, "MMMM yyyy");
    } else if (currentView === "week") {
      const start = startOfWeek(currentDate);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      if (start.getMonth() === end.getMonth()) {
        return `${format(start, "MMMM d")} – ${format(end, "d, yyyy")}`;
      } else if (start.getFullYear() === end.getFullYear()) {
        return `${format(start, "MMMM d")} – ${format(end, "MMMM d, yyyy")}`;
      } else {
        return `${format(start, "MMMM d, yyyy")} – ${format(end, "MMMM d, yyyy")}`;
      }
    } else {
      return format(currentDate, "MMMM d, yyyy");
    }
  }, [currentDate, currentView]);

  const fetchEvents = useCallback(async (targetDate: Date) => {
    setLoading(true);
    setError(null);

    // Calculate a 3-month range centered around targetDate to ensure overlap is fetched properly
    const start = new Date(targetDate.getFullYear(), targetDate.getMonth() - 1, 1);
    const end = new Date(targetDate.getFullYear(), targetDate.getMonth() + 2, 0);

    try {
      const response = await fetch(
        `/api/calendar?start=${start.toISOString()}&end=${end.toISOString()}`
      );
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || "Unable to load calendar events.");
      } else {
        setEvents(
          (payload.events as CompanyCalendarEvent[]).map((event) => ({
            ...event,
            start: new Date(event.start),
            end: new Date(event.end),
          }))
        );
      }
    } catch {
      setError("Unable to load calendar events.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents(currentDate);
  }, [currentDate, fetchEvents]);

  async function handleCreateEvent() {
    if (!title || !startDate || !endDate) {
      setError("Please complete the event form.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, category, description, startDate, endDate, allDay: true }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || "Unable to create event.");
      } else {
        setTitle("");
        setCategory("COMPANY_EVENT");
        setStartDate("");
        setEndDate("");
        setDescription("");
        setShowForm(false);
        fetchEvents(currentDate);
      }
    } catch {
      setError("Unable to create event.");
    } finally {
      setSubmitting(false);
    }
  }

  const eventStyleGetter = (event: Event) => {
    const typedEvent = event as CompanyCalendarEvent;
    const style = categoryStyles[typedEvent.category] ?? {
      background: "#E5E7EB",
      border: "#9CA3AF",
    };

    return {
      style: {
        backgroundColor: style.background,
        borderColor: style.border,
        color: "#111827",
        borderRadius: "0.5rem",
        borderWidth: 1,
        borderStyle: "solid",
      },
    };
  };

  const legendItems = useMemo(
    () => [
      { label: "Holiday", category: "HOLIDAY" },
      { label: "Company event", category: "COMPANY_EVENT" },
      { label: "Training", category: "TRAINING" },
      { label: "Leave", category: "LEAVE" },
      { label: "Birthday", category: "BIRTHDAY" },
    ],
    []
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Company calendar</CardTitle>
            <CardDescription>Month view of holidays, leave, and key events.</CardDescription>
          </div>
          {canManage && (
            <Button variant="secondary" onClick={() => setShowForm((current) => !current)}>
              {showForm ? "Hide event form" : "Add event"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--neutral-700)]">Title</label>
                <Input value={title} onChange={(event) => setTitle(event.target.value)} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--neutral-700)]">Category</label>
                <Select value={category} onValueChange={(value) => setCategory(value ?? "COMPANY_EVENT") }>
                  <SelectTrigger className="w-full">
                    <SelectValue>{category.replace("_", " ")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COMPANY_EVENT">Company event</SelectItem>
                    <SelectItem value="HOLIDAY">Holiday</SelectItem>
                    <SelectItem value="TRAINING">Training</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--neutral-700)]">Dates</label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                  <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
                </div>
              </div>
            </div>
            <div className="mt-4">
              <label className="mb-2 block text-sm font-medium text-[var(--neutral-700)]">Description</label>
              <Textarea value={description} onChange={(event) => setDescription(event.target.value)} />
            </div>
            {error && <p className="mt-3 text-sm text-[var(--destructive)]">{error}</p>}
            <div className="mt-4 flex justify-end">
              <Button onClick={handleCreateEvent} disabled={submitting}>
                {submitting ? "Saving..." : "Create event"}
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-3 text-[var(--neutral-500)]">
            <span className="h-4 w-4 animate-spin rounded-full border border-current border-t-transparent" />
            <span>Loading calendar events...</span>
          </div>
        ) : error ? (
          <p className="text-sm text-[var(--destructive)]">{error}</p>
        ) : (
          <div className="space-y-6">
            {/* Custom Calendar Navigation Toolbar */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-150 pb-5">
              {/* Left Side: Shift buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleNavigate("TODAY")}
                  className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 hover:-translate-y-0.5 transition-all duration-300 shadow-sm"
                >
                  Today
                </button>
                <div className="flex items-center rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                  <button
                    onClick={() => handleNavigate("PREV")}
                    className="p-2 text-zinc-700 hover:bg-zinc-50 transition-colors border-r border-zinc-200"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleNavigate("NEXT")}
                    className="p-2 text-zinc-700 hover:bg-zinc-50 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <h3 className="text-sm font-extrabold text-zinc-950 ml-1 select-none capitalize">
                  {currentPeriodTitle}
                </h3>
              </div>

              {/* Right Side: View switcher segment */}
              <div className="flex items-center rounded-xl border border-zinc-200 bg-zinc-50/50 p-1 shadow-sm self-start sm:self-auto">
                {(["month", "week", "day"] as const).map((viewOption) => (
                  <button
                    key={viewOption}
                    onClick={() => setCurrentView(viewOption)}
                    className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all duration-300 ${
                      currentView === viewOption
                        ? "bg-zinc-950 text-white shadow-sm scale-[1.02]"
                        : "text-zinc-500 hover:text-zinc-900"
                    }`}
                  >
                    {viewOption}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-5">
              {legendItems.map((item) => (
                <div key={item.category} className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-xs text-[var(--neutral-700)]">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: categoryStyles[item.category].border }} />
                  {item.label}
                </div>
              ))}
            </div>
            <div className="min-h-[420px]">
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 520 }}
                eventPropGetter={eventStyleGetter}
                toolbar={false}
                view={currentView}
                onView={(v) => setCurrentView(v as "month" | "week" | "day")}
                views={{ month: true, week: true, day: true }}
                popup
                date={currentDate}
                onNavigate={(newDate) => setCurrentDate(newDate)}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
