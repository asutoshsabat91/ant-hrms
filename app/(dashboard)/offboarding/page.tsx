import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { OffboardingBoard } from "@/components/offboarding/OffboardingBoard";
import { OffboardingInitiationForm } from "@/components/offboarding/OffboardingInitiationForm";
import { UserMinus, FileText, ShieldOff, Mail } from "lucide-react";

export default async function OffboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ employeeId?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";
  const { employeeId: defaultEmpId } = await searchParams;

  const [availableEmployees, offboardingEmployees] = await Promise.all([
    prisma.employee.findMany({
      where: { status: { in: ["ACTIVE", "ONBOARDING"] } },
      orderBy: { firstName: "asc" },
      select: { id: true, firstName: true, lastName: true, designation: true },
    }),
    prisma.employee.findMany({
      where: { status: "OFFBOARDING" },
      include: {
        department: true,
        offboardingTasks: { orderBy: { order: "asc" } },
      },
      orderBy: { lastWorkingDate: "asc" },
    }),
  ]);

  const tasksOpen = offboardingEmployees.reduce(
    (acc, e) => acc + e.offboardingTasks.filter((t) => t.status !== "COMPLETED").length,
    0
  );

  const statItems = [
    { icon: UserMinus, label: "In Pipeline",   value: offboardingEmployees.length, color: "text-violet-600 bg-violet-50 border-violet-100" },
    { icon: FileText,  label: "Open Tasks",    value: tasksOpen,                    color: "text-amber-600 bg-amber-50 border-amber-100" },
    { icon: ShieldOff, label: "Access Revokes",value: offboardingEmployees.filter((e) => e.offboardingTasks.some((t) => t.status === "PENDING")).length, color: "text-rose-600 bg-rose-50 border-rose-100" },
    { icon: Mail,      label: "Docs Pending",  value: tasksOpen,                    color: "text-sky-600 bg-sky-50 border-sky-100" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">HR · Exit Management</p>
        <h2 className="text-2xl font-extrabold text-zinc-950">Offboarding</h2>
        <p className="text-xs text-zinc-400 font-medium mt-1">
          Manage employee exits, access revocation, document issuance and alumni transitions.
        </p>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statItems.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className={`flex items-center gap-3 rounded-xl border bg-white p-4 shadow-sm ${color.split(" ").find(c => c.startsWith("border-")) ?? "border-zinc-100"}`}>
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color.split(" ").filter(c => !c.startsWith("border-")).join(" ")}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-lg font-bold text-zinc-900 leading-none">{value}</p>
              <p className="text-[10px] font-semibold text-zinc-400 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main layout */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Pipeline board */}
        <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
          <OffboardingBoard
            employees={offboardingEmployees.map((e) => ({
              id: e.id,
              firstName: e.firstName,
              lastName: e.lastName,
              designation: e.designation,
              department: { name: e.department.name },
              manager: null,
              lastWorkingDate: e.lastWorkingDate?.toISOString() ?? null,
              offboardingTasks: e.offboardingTasks.map((t) => ({
                id: t.id,
                status: t.status,
                dueDate: t.dueDate?.toISOString() ?? null,
              })),
            }))}
          />
        </div>

        {/* Sticky initiation form */}
        {isAdmin && (
          <div className="lg:sticky lg:top-20 h-fit">
            <OffboardingInitiationForm
              employees={availableEmployees}
              defaultEmployeeId={defaultEmpId}
            />
          </div>
        )}
      </div>
    </div>
  );
}
