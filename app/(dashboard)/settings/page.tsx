import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { OfficeLocationCard } from "@/components/settings/OfficeLocationCard";

export default async function SettingsPage() {
  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { id: session?.user?.id ?? "" },
    include: { employee: true },
  });

  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
  let officeLat = 20.352346;
  let officeLon = 85.816088;
  let officeRadius = 200;

  try {
    const config = await prisma.officeConfig.findFirst();
    if (config) {
      officeLat = config.lat;
      officeLon = config.lon;
      officeRadius = config.radiusM;
    } else {
      const dbConfig = await prisma.officeConfig.create({
        data: {
          lat: parseFloat(process.env.OFFICE_LAT ?? "20.352346"),
          lon: parseFloat(process.env.OFFICE_LON ?? "85.816088"),
          radiusM: parseInt(process.env.OFFICE_RADIUS_M ?? "200"),
        },
      });
      officeLat = dbConfig.lat;
      officeLon = dbConfig.lon;
      officeRadius = dbConfig.radiusM;
    }
  } catch {
    // DB not ready or connection failed fallback
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Company profile, office location, departments, policies, and audit log"
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Profile card */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Logged-in account details</CardDescription>
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

        {/* App status */}
        <Card>
          <CardHeader>
            <CardTitle>App Status</CardTitle>
            <CardDescription>Environment and runtime info</CardDescription>
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

        {/* Office Location (super admin only) */}
        {isSuperAdmin && (
          <OfficeLocationCard
            initialLat={officeLat}
            initialLon={officeLon}
            initialRadius={officeRadius}
          />
        )}

        {!isSuperAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Workspace</CardTitle>
              <CardDescription>AntBox HRMS configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-500">
                Settings are managed by your Super Admin. Contact HR for changes to office policies or account configuration.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
