import { format } from "date-fns";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCalendarOverview } from "@/lib/calendar";
import { PageHeader } from "@/components/layout/PageHeader";
import { CompanyCalendar } from "@/components/calendar/CompanyCalendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function CalendarPage() {
  const session = await auth();
  const canManage = !!session?.user && ["ADMIN"].includes(session.user.role);
  const isSuperAdmin = session?.user?.role === "ADMIN";
  
  let googleCalendarConnected = false;
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { employee: { select: { googleRefreshToken: true } } },
    });
    googleCalendarConnected = !!user?.employee?.googleRefreshToken;
  }

  const { upcomingHolidays, upcomingLeaves, upcomingBirthdays, horizon } = await getCalendarOverview();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company Calendar"
        description="Upcoming holidays, approved leave windows, and celebratory dates"
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming holidays</CardTitle>
            <CardDescription>Next 30 days of company holidays.</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingHolidays.length === 0 ? (
              <p className="text-sm text-[var(--neutral-500)]">
                No holidays scheduled in the next 30 days.
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingHolidays.map((holiday) => (
                  <div key={holiday.id} className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-3">
                    <div>
                      <p className="font-semibold text-[var(--brand-secondary)]">{holiday.name}</p>
                      <p className="text-xs text-[var(--neutral-500)]">{format(new Date(holiday.date), "dd MMM yyyy")}</p>
                    </div>
                    <Badge variant="secondary">Holiday</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming leaves</CardTitle>
            <CardDescription>Approved leave windows across the team.</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingLeaves.length === 0 ? (
              <p className="text-sm text-[var(--neutral-500)]">No approved leaves in the next 30 days.</p>
            ) : (
              <div className="space-y-3">
                {upcomingLeaves.slice(0, 6).map((leave) => (
                  <div key={leave.id} className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-3">
                    <p className="font-semibold text-[var(--brand-secondary)]">{leave.employee.firstName} {leave.employee.lastName}</p>
                    <p className="text-sm">{leave.leaveType.name}</p>
                    <p className="text-xs text-[var(--neutral-500)]">
                      {format(new Date(leave.startDate), "dd MMM")} — {format(new Date(leave.endDate), "dd MMM")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Birthdays</CardTitle>
            <CardDescription>Upcoming team birthdays before {format(horizon, "MMM d")}</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingBirthdays.length === 0 ? (
              <p className="text-sm text-[var(--neutral-500)]">
                No birthdays in the next 30 days.
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingBirthdays.map((entry) => (
                  <div key={entry.employee.id} className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-3">
                    <div>
                      <p className="font-semibold text-[var(--brand-secondary)]">
                        {entry.employee.firstName} {entry.employee.lastName}
                      </p>
                      <p className="text-xs text-[var(--neutral-500)]">{format(entry.date, "dd MMM")}</p>
                    </div>
                    <Badge variant="secondary">Birthday</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <CompanyCalendar 
          canManage={canManage} 
          isSuperAdmin={isSuperAdmin} 
          googleCalendarConnected={googleCalendarConnected} 
        />
      </div>
    </div>
  );
}
