import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { OnboardingMilestones } from "@/components/onboarding/OnboardingMilestones";

export default async function OnboardingDetailPage({
  params,
}: {
  params: Promise<{ hireId: string }>;
}) {
  const session = await auth();
  const { hireId } = await params;

  const employee = await prisma.employee.findUnique({
    where: { id: hireId },
    include: {
      department: true,
      manager: true,
      onboardingTasks: { orderBy: { order: "asc" } },
      documents: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!employee) notFound();

  const isAdmin = session?.user?.role === "ADMIN";
  const isOwnProfile = employee.userId === session?.user?.id;

  const hasIdProof = employee.documents.some((d) =>
    d.title?.toLowerCase().includes("aadhaar") ||
    d.title?.toLowerCase().includes("pan") ||
    d.title?.toLowerCase().includes("certificate") ||
    d.title?.toLowerCase().includes("degree")
  );
  const hasBanking = !!(employee.bankName && employee.bankAccountNo && employee.ifscCode);
  const hasIdForm = employee.documents.some((d) => d.title === "ID Card Form Data");
  const completedCount = [hasIdProof, hasBanking, hasIdForm].filter(Boolean).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        {employee.profilePhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={employee.profilePhoto} alt="Profile" className="h-16 w-14 rounded-xl object-cover border border-zinc-200 shadow-sm shrink-0" />
        ) : (
          <div className="flex h-16 w-14 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-white font-bold text-xl">
            {employee.firstName[0]}{employee.lastName[0]}
          </div>
        )}
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-0.5">Onboarding · {employee.employeeId}</p>
          <h2 className="text-2xl font-extrabold text-zinc-950">{employee.firstName} {employee.lastName}</h2>
          <p className="text-xs text-zinc-400">{employee.designation} · {employee.department.name}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase self-start ${completedCount === 3 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
          {completedCount}/3 Tasks
        </span>
      </div>

      {/* Progress bar */}
      <div className="rounded-xl border border-zinc-100 bg-white px-5 py-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-zinc-700">Onboarding Tasks</p>
          <p className="text-xs font-semibold text-zinc-400">{completedCount}/3 completed</p>
        </div>
        <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${completedCount === 3 ? "bg-emerald-500" : "bg-[var(--purple)]"}`} style={{ width: `${(completedCount / 3) * 100}%` }} />
        </div>
        <div className="flex gap-6 mt-2">
          {["1. Documents", "2. Banking Details", "3. ID Form"].map((label, i) => (
            <span key={label} className={`text-[10px] font-semibold ${i < completedCount ? "text-emerald-600" : "text-zinc-400"}`}>
              {i < completedCount ? "✓ " : ""}{label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        {/* Left: employee details */}
        <div className="rounded-xl border border-zinc-100 bg-white p-5 shadow-sm space-y-3 h-fit">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Employee Details</p>
          {[
            ["Designation", employee.designation],
            ["Department", employee.department.name],
            ["Manager", employee.manager ? `${employee.manager.firstName} ${employee.manager.lastName}` : "Unassigned"],
            ["Type", employee.employmentType.replace("_", " ")],
            ["Joining", employee.joiningDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })],
            ["Email", employee.email],
            ["Phone", employee.phone ?? "—"],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] text-zinc-400">{label}</p>
              <p className="text-xs font-semibold text-zinc-800 mt-0.5 truncate">{value}</p>
            </div>
          ))}
        </div>

        {/* Right: 3 milestones */}
        <OnboardingMilestones
          employeeId={employee.id}
          isAdmin={isAdmin}
          isOwnProfile={isOwnProfile}
          milestone1Done={hasIdProof}
          milestone2Done={hasBanking}
          milestone3Done={hasIdForm}
          bankingData={{
            bankName: employee.bankName,
            bankAccountNo: employee.bankAccountNo,
            ifscCode: employee.ifscCode,
            pan: employee.pan,
            uan: employee.uan,
          }}
          employeeName={`${employee.firstName} ${employee.lastName}`}
          employeeEmail={employee.email}
          employeeIdCode={employee.employeeId}
          bloodGroup={employee.bloodGroup}
        />
      </div>
    </div>
  );
}
