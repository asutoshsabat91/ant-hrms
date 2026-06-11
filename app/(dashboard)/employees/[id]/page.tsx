import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/dateHelpers";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function EmployeeProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let employee;
  try {
    employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        manager: { select: { firstName: true, lastName: true, id: true } },
        user: { select: { role: true, email: true } },
      },
    });
  } catch {
    notFound();
  }

  if (!employee) notFound();

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
            {employee.status !== "OFFBOARDING" && (
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
        <div className="rounded-xl border border-[var(--card-border)] bg-white p-6 lg:col-span-1">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--brand-primary)] text-2xl font-bold text-white">
            {employee.firstName[0]}
            {employee.lastName[0]}
          </div>
          <p className="mt-4 font-mono text-sm text-[var(--neutral-600)]">
            {employee.employeeId}
          </p>
          <div className="mt-2 flex gap-2">
            <Badge>{employee.status}</Badge>
            <Badge variant="outline">{employee.employmentType}</Badge>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border border-[var(--card-border)] bg-white p-6">
            <h3 className="mb-4 font-semibold text-[var(--brand-secondary)]">
              Professional
            </h3>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-[var(--neutral-600)]">Department</dt>
                <dd className="text-sm font-medium">{employee.department.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--neutral-600)]">Email</dt>
                <dd className="text-sm font-medium">{employee.email}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--neutral-600)]">Joining Date</dt>
                <dd className="text-sm font-medium">
                  {formatDate(employee.joiningDate)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--neutral-600)]">Manager</dt>
                <dd className="text-sm font-medium">
                  {employee.manager
                    ? `${employee.manager.firstName} ${employee.manager.lastName}`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--neutral-600)]">Role</dt>
                <dd className="text-sm font-medium">{employee.user.role}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--neutral-600)]">Phone</dt>
                <dd className="text-sm font-medium">{employee.phone ?? "—"}</dd>
              </div>
            </dl>
          </section>

          {(employee.ctc || employee.basicSalary) && (
            <section className="rounded-xl border border-[var(--card-border)] bg-white p-6">
              <h3 className="mb-4 font-semibold text-[var(--brand-secondary)]">
                Compensation
              </h3>
              <dl className="grid gap-3 sm:grid-cols-2">
                {employee.ctc && (
                  <div>
                    <dt className="text-xs text-[var(--neutral-600)]">Annual CTC</dt>
                    <dd className="text-sm font-medium">
                      ₹{employee.ctc.toLocaleString("en-IN")}
                    </dd>
                  </div>
                )}
                {employee.basicSalary && (
                  <div>
                    <dt className="text-xs text-[var(--neutral-600)]">Basic (monthly)</dt>
                    <dd className="text-sm font-medium">
                      ₹{employee.basicSalary.toLocaleString("en-IN")}
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
