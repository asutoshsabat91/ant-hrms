import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/dateHelpers";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, FileText, CreditCard, IdCard } from "lucide-react";
import { EditProfileButton } from "@/components/employees/EditProfileButton";

export default async function EmployeeProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "COMPANY_ADMIN") {
    redirect("/employees");
  }

  const { id } = await params;

  let employee;
  try {
    employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        manager: { select: { firstName: true, lastName: true, id: true } },
        user: { select: { role: true, email: true } },
        documents: { orderBy: { createdAt: "desc" }, take: 30 },
      },
    });
  } catch {
    notFound();
  }

  if (!employee) notFound();

  const isOnboarding = employee.status === "ONBOARDING";

  // Compute onboarding milestone progress
  const hasIdProof = employee.documents.some(
    (d) =>
      d.title?.toLowerCase().includes("aadhaar") ||
      d.title?.toLowerCase().includes("pan") ||
      d.title?.toLowerCase().includes("certificate") ||
      d.title?.toLowerCase().includes("degree")
  );
  const hasBanking = !!(employee.bankName && employee.bankAccountNo && employee.ifscCode);
  const hasIdForm = employee.documents.some((d) => d.title === "ID Card Form Data");
  const milestoneCount = [hasIdProof, hasBanking, hasIdForm].filter(Boolean).length;

  const milestones = [
    { label: "Documents", done: hasIdProof, icon: FileText, href: "/documents" },
    { label: "Banking Details", done: hasBanking, icon: CreditCard, href: `/onboarding/${employee.id}` },
    { label: "ID Card Form", done: hasIdForm, icon: IdCard, href: `/onboarding/${employee.id}` },
  ];

  return (
    <div>
      <PageHeader
        title={`${employee.firstName} ${employee.lastName}`}
        description={employee.designation}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/employees" className={cn(buttonVariants({ variant: "outline" }))}>
              Back to directory
            </Link>
            {session.user.role === "ADMIN" && (
              <EditProfileButton employee={employee} />
            )}
            {isOnboarding && (
              <Link
                href={`/onboarding/${employee.id}`}
                className={cn(buttonVariants(), "bg-violet-600 text-white hover:bg-violet-700")}
              >
                View Onboarding Tasks
              </Link>
            )}
            {employee.status !== "OFFBOARDING" && !isOnboarding && (
              <Link
                href={`/offboarding?employeeId=${employee.id}`}
                className={cn(buttonVariants(), "bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-accent)]")}
              >
                Initiate Offboarding
              </Link>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Profile Card */}
        <div className="space-y-4 lg:col-span-1">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            {/* Avatar */}
            {employee.profilePhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={employee.profilePhoto}
                alt="Profile"
                className="h-20 w-20 rounded-2xl object-cover border border-zinc-200 shadow-sm"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-zinc-950 text-2xl font-bold text-white">
                {employee.firstName[0]}{employee.lastName[0]}
              </div>
            )}
            <p className="mt-4 font-mono text-sm text-zinc-600">{employee.employeeId}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge>{employee.status.replace("_", " ")}</Badge>
              <Badge variant="outline">{employee.employmentType.replace("_", " ")}</Badge>
            </div>
          </div>

          {/* Onboarding Progress Widget — shown when employee is in ONBOARDING */}
          {isOnboarding && (
            <div className="rounded-2xl border-2 border-violet-200 bg-gradient-to-b from-violet-50 to-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-violet-500">Onboarding</p>
                  <p className="text-sm font-bold text-zinc-900 mt-0.5">Tasks Progress</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${milestoneCount === 3 ? "bg-emerald-100 text-emerald-700" : "bg-violet-100 text-violet-700"}`}>
                  {milestoneCount}/3
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 rounded-full bg-zinc-100 overflow-hidden mb-4">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${milestoneCount === 3 ? "bg-emerald-500" : "bg-violet-500"}`}
                  style={{ width: `${(milestoneCount / 3) * 100}%` }}
                />
              </div>

              {/* Milestone list */}
              <div className="space-y-2.5">
                {milestones.map((m, i) => {
                  const Icon = m.icon;
                  return (
                    <Link
                      key={m.label}
                      href={m.href}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all hover:bg-violet-100/60 ${m.done ? "bg-emerald-50" : i > 0 && !milestones[i - 1].done ? "opacity-50 pointer-events-none" : "bg-white border border-zinc-100"}`}
                    >
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${m.done ? "bg-emerald-500 text-white" : "bg-zinc-100 text-zinc-400"}`}>
                        {m.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                      </div>
                      <div className="flex-1">
                        <p className={`text-xs font-semibold ${m.done ? "text-emerald-800" : "text-zinc-700"}`}>
                          {i + 1}. {m.label}
                        </p>
                        <p className="text-[10px] text-zinc-400">
                          {m.done ? "Completed" : i > 0 && !milestones[i - 1].done ? "Locked" : "Pending"}
                        </p>
                      </div>
                      {m.done
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        : i > 0 && !milestones[i - 1].done
                        ? <AlertCircle className="h-4 w-4 text-zinc-300 shrink-0" />
                        : <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                      }
                    </Link>
                  );
                })}
              </div>

              <Link
                href={`/onboarding/${employee.id}`}
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-violet-600 py-2.5 text-xs font-bold text-white hover:bg-violet-700 transition-colors"
              >
                Manage Onboarding Tasks →
              </Link>
            </div>
          )}
        </div>

        {/* Right: Details */}
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 font-semibold text-zinc-900">Professional Details</h3>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-[10px] font-bold uppercase text-zinc-400">Department</dt>
                <dd className="text-sm font-semibold text-zinc-900 mt-1">{employee.department.name}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase text-zinc-400">Email</dt>
                <dd className="text-sm font-semibold text-zinc-900 mt-1">{employee.email}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase text-zinc-400">Joining Date</dt>
                <dd className="text-sm font-semibold text-zinc-900 mt-1">{formatDate(employee.joiningDate)}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase text-zinc-400">Manager</dt>
                <dd className="text-sm font-semibold text-zinc-900 mt-1">
                  {employee.manager
                    ? `${employee.manager.firstName} ${employee.manager.lastName}`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase text-zinc-400">Role</dt>
                <dd className="text-sm font-semibold text-zinc-900 mt-1">{employee.user.role}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase text-zinc-400">Phone</dt>
                <dd className="text-sm font-semibold text-zinc-900 mt-1">{employee.phone ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase text-zinc-400">Deployed Company</dt>
                <dd className="text-sm font-semibold text-zinc-900 mt-1">{employee.deployedCompany ?? "—"}</dd>
              </div>
              {employee.bloodGroup && (
                <div>
                  <dt className="text-[10px] font-bold uppercase text-zinc-400">Blood Group</dt>
                  <dd className="text-sm font-semibold text-zinc-900 mt-1">{employee.bloodGroup}</dd>
                </div>
              )}
              {employee.emergencyContact && (
                <div>
                  <dt className="text-[10px] font-bold uppercase text-zinc-400">Emergency Contact</dt>
                  <dd className="text-sm font-semibold text-zinc-900 mt-1">
                    {employee.emergencyContact}
                    {employee.emergencyPhone && <span className="ml-2 text-zinc-500">+91 {employee.emergencyPhone}</span>}
                  </dd>
                </div>
              )}
            </dl>
          </section>

          {(employee.ctc || employee.basicSalary) && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 font-semibold text-zinc-900">Compensation</h3>
              <dl className="grid gap-4 sm:grid-cols-3">
                {employee.ctc && (
                  <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-4">
                    <dt className="text-[10px] font-bold uppercase text-zinc-400">Annual CTC</dt>
                    <dd className="text-lg font-extrabold text-zinc-900 mt-1">
                      ₹{employee.ctc.toLocaleString("en-IN")}
                    </dd>
                  </div>
                )}
                {employee.basicSalary && (
                  <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-4">
                    <dt className="text-[10px] font-bold uppercase text-zinc-400">Basic / month</dt>
                    <dd className="text-lg font-extrabold text-zinc-900 mt-1">
                      ₹{employee.basicSalary.toLocaleString("en-IN")}
                    </dd>
                  </div>
                )}
                {employee.hra && (
                  <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-4">
                    <dt className="text-[10px] font-bold uppercase text-zinc-400">HRA / month</dt>
                    <dd className="text-lg font-extrabold text-zinc-900 mt-1">
                      ₹{employee.hra.toLocaleString("en-IN")}
                    </dd>
                  </div>
                )}
              </dl>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
