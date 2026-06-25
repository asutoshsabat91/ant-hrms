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

  // Fetch all leave types ordered by name
  const leaveTypes = await prisma.leaveType.findMany({
    orderBy: { name: "asc" },
  });

  // Map to safe client types
  const safeLeaveTypes = leaveTypes.map((lt) => ({
    id: lt.id,
    name: lt.name,
    code: lt.code,
    daysPerYear: lt.daysPerYear,
    accrual: lt.accrual,
    priorNoticeHours: lt.priorNoticeHours,
    applicableTo: lt.applicableTo,
    isPaid: lt.isPaid,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Company profile, office location, departments, policies, and audit log"
      />

      <SettingsPageClient
        user={user}
        isSuperAdmin={isSuperAdmin}
        officeLat={officeLat}
        officeLon={officeLon}
        officeRadius={officeRadius}
        initialLeaveTypes={safeLeaveTypes}
      />
    </div>
  );
}
