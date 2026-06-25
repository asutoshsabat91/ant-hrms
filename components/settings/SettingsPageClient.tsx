"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OfficeLocationCard } from "@/components/settings/OfficeLocationCard";

interface SettingsPageClientProps {
  user: {
    email: string;
    role: string;
    employee?: {
      firstName: string;
      lastName: string;
      employeeId: string;
    } | null;
  } | null;
  isSuperAdmin: boolean;
  officeLat: number;
  officeLon: number;
  officeRadius: number;
}

export function SettingsPageClient({
  user,
  isSuperAdmin,
  officeLat,
  officeLon,
  officeRadius,
}: SettingsPageClientProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Profile Card */}
      <Card className="border border-zinc-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-zinc-950 font-bold text-base">Profile</CardTitle>
          <CardDescription className="text-zinc-500 text-xs">Logged-in account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Email</p>
            <p className="text-sm font-medium text-zinc-900 mt-0.5">{user?.email}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Role</p>
            <p className="text-sm font-medium text-zinc-900 mt-0.5">{user?.role?.replace("_", " ")}</p>
          </div>
          {user?.employee && (
            <>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Employee</p>
                <p className="text-sm font-medium text-zinc-900 mt-0.5">
                  {user.employee.firstName} {user.employee.lastName}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Employee ID</p>
                <p className="text-sm font-mono font-semibold text-[var(--purple)] mt-0.5">{user.employee.employeeId}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* App Status */}
      <Card className="border border-zinc-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-zinc-950 font-bold text-base">App Status</CardTitle>
          <CardDescription className="text-zinc-500 text-xs">Environment and runtime info</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Environment</p>
            <p className="text-sm font-medium text-zinc-900 mt-0.5">{process.env.NODE_ENV ?? "development"}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Next.js</p>
            <p className="text-sm font-medium text-zinc-900 mt-0.5">14.2.35</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Database</p>
            <p className="text-sm font-medium text-zinc-900 mt-0.5">PostgreSQL via Prisma</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Office Location</p>
            <p className="text-sm font-mono text-zinc-600 mt-0.5">{officeLat}, {officeLon}</p>
          </div>
        </CardContent>
      </Card>

      {/* Office Location (Super Admin only) */}
      {isSuperAdmin ? (
        <OfficeLocationCard
          initialLat={officeLat}
          initialLon={officeLon}
          initialRadius={officeRadius}
        />
      ) : (
        <Card className="border border-zinc-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-zinc-950 font-bold text-base">Workspace</CardTitle>
            <CardDescription className="text-zinc-500 text-xs">AntBox HRMS configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500">
              Settings are managed by your Super Admin. Contact HR for changes to office policies or account configuration.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
