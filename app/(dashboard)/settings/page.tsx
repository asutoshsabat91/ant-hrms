import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { SettingsPageClient } from "@/components/settings/SettingsPageClient";

export default async function SettingsPage() {
  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { id: session?.user?.id ?? "" },
    include: { employee: true },
  });

  const isSuperAdmin = session?.user?.role === "ADMIN";
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

  let employeesForAccess: Array<{ id: string; name: string; email: string; employeeId: string; userId: string; isActive: boolean }> = [];
  if (isSuperAdmin) {
    try {
      const emps = await prisma.employee.findMany({
        include: { user: true },
        orderBy: { firstName: "asc" },
      });
      employeesForAccess = emps
        .filter((e) => e.userId)
        .map((e) => ({
          id: e.id,
          name: `${e.firstName} ${e.lastName}`,
          email: e.email,
          employeeId: e.employeeId,
          userId: e.userId,
          isActive: e.user?.isActive ?? false,
        }));
    } catch (e) {
      console.error("Failed to load employees for access settings", e);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Company profile, office location, departments, and user access control"
      />

      <SettingsPageClient
        user={user}
        isSuperAdmin={isSuperAdmin}
        officeLat={officeLat}
        officeLon={officeLon}
        officeRadius={officeRadius}
        employeesForAccess={employeesForAccess}
      />
    </div>
  );
}
