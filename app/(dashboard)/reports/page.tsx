import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";

export default async function ReportsPage() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Optimized backend database aggregations run in parallel
  const [
    employeeCount,
    openGrievances,
    pendingLeaves,
    draftReimbursements,
    payrollRun,
    departments,
    employeesForDiversity,
    leaveStats,
    reimbursementStats,
  ] = await Promise.all([
    prisma.employee.count({ where: { status: { in: ["ACTIVE", "ONBOARDING"] } } }),
    prisma.grievance.count({ where: { status: "OPEN" } }),
    prisma.leaveRequest.count({ where: { status: "PENDING" } }),
    prisma.reimbursement.count({ where: { status: "DRAFT" } }),
    prisma.payrollRun.findUnique({ where: { month_year: { month: currentMonth, year: currentYear } } }),
    prisma.department.findMany({
      include: {
        employees: {
          where: { status: { in: ["ACTIVE", "ONBOARDING"] } },
          select: { ctc: true, gender: true },
        },
      },
    }),
    prisma.employee.findMany({
      where: { status: { in: ["ACTIVE", "ONBOARDING"] } },
      select: { gender: true },
    }),
    prisma.leaveRequest.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    prisma.reimbursement.groupBy({
      by: ["status"],
      _sum: { amount: true },
    }),
  ]);

  // 1. Compute Department Stats
  const deptStats = departments
    .map((dept) => {
      const headcount = dept.employees.length;
      const totalCtc = dept.employees.reduce((sum, emp) => sum + (emp.ctc || 0), 0);
      const avgCtc = headcount > 0 ? Math.round(totalCtc / headcount) : 0;
      return {
        id: dept.id,
        name: dept.name,
        headcount,
        avgCtc,
      };
    })
    .sort((a, b) => b.headcount - a.headcount);

  const maxHeadcount = Math.max(...deptStats.map((d) => d.headcount), 1);

  // 2. Compute Gender Diversity Stats
  const totalDiversityCount = employeesForDiversity.length;
  const femaleCount = employeesForDiversity.filter((e) => e.gender?.toLowerCase() === "female").length;
  const maleCount = employeesForDiversity.filter((e) => e.gender?.toLowerCase() === "male").length;
  
  const femalePct = totalDiversityCount > 0 ? Math.round((femaleCount / totalDiversityCount) * 100) : 0;
  const malePct = totalDiversityCount > 0 ? Math.round((maleCount / totalDiversityCount) * 100) : 0;
  const nonBinaryPct = totalDiversityCount > 0 ? 100 - femalePct - malePct : 0;

  // 3. Compute Leave requests count
  const leaveCounts = {
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
  };
  leaveStats.forEach((stat) => {
    if (stat.status in leaveCounts) {
      leaveCounts[stat.status as keyof typeof leaveCounts] = stat._count.id;
    }
  });

  // 4. Compute Reimbursement Sums
  let approvedExpenses = 0;
  let pendingExpenses = 0;
  reimbursementStats.forEach((stat) => {
    if (stat.status === "APPROVED") {
      approvedExpenses = stat._sum.amount || 0;
    } else if (["SUBMITTED", "UNDER_REVIEW"].includes(stat.status)) {
      pendingExpenses += stat._sum.amount || 0;
    }
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Comprehensive insights on headcount, department compensation, workspace diversity and claims."
      />

      {/* Main KPI Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Active Headcount</p>
          <p className="mt-3 text-3xl font-extrabold text-zinc-950">{employeeCount}</p>
          <span className="text-[10px] font-semibold text-zinc-400 block mt-1.5">Active & onboarding teammates</span>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Approved Claims</p>
          <p className="mt-3 text-3xl font-extrabold text-zinc-950">₹{approvedExpenses.toLocaleString("en-IN")}</p>
          <span className="text-[10px] font-semibold text-zinc-400 block mt-1.5">Approved reimbursements payout</span>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Pending Leaves</p>
          <p className="mt-3 text-3xl font-extrabold text-zinc-950">{pendingLeaves}</p>
          <span className="text-[10px] font-semibold text-zinc-400 block mt-1.5">Requests awaiting review</span>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Open Grievances</p>
          <p className="mt-3 text-3xl font-extrabold text-zinc-950">{openGrievances}</p>
          <span className="text-[10px] font-semibold text-zinc-400 block mt-1.5">Unresolved workspace issues</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Left Card: Department metrics */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold text-zinc-950 tracking-tight">Departmental Breakdown</h3>
          <p className="text-xs text-zinc-400 font-medium mt-1">Headcount distribution and average compensation benchmarks.</p>
          
          <div className="mt-6 space-y-5">
            {deptStats.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-6">No department statistics available.</p>
            ) : (
              deptStats.map((dept) => {
                const widthPct = Math.round((dept.headcount / maxHeadcount) * 100);
                return (
                  <div key={dept.id} className="group space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-zinc-800">{dept.name}</span>
                      <div className="flex gap-4">
                        <span className="text-zinc-500 font-medium">{dept.headcount} member{dept.headcount === 1 ? "" : "s"}</span>
                        <span className="text-zinc-950">₹{dept.avgCtc.toLocaleString("en-IN")}/yr avg</span>
                      </div>
                    </div>
                    {/* Visual Bar Indicator */}
                    <div className="w-full h-2 bg-zinc-50 rounded-full overflow-hidden border border-zinc-100 shadow-inner">
                      <div
                        className="h-full bg-zinc-950 rounded-full transition-all duration-500 group-hover:bg-zinc-800"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Cards: Diversity, Leave status, Reimbursement details */}
        <div className="space-y-6">
          {/* Gender Diversity Card */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-bold text-zinc-950 tracking-tight">Gender Diversity Ratio</h3>
            <p className="text-xs text-zinc-400 font-medium mt-1">Breakdown of teammate gender disclosures.</p>
            
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-800">
                <span className="text-zinc-900 font-bold">Female ({femalePct}%)</span>
                <span className="text-zinc-500 font-medium">Male ({malePct}%)</span>
              </div>
              
              {/* Diversity split bar */}
              <div className="w-full h-3 bg-zinc-100 rounded-full overflow-hidden flex shadow-inner">
                {femalePct > 0 && <div className="h-full bg-zinc-950 transition-all duration-300" style={{ width: `${femalePct}%` }} />}
                {malePct > 0 && <div className="h-full bg-zinc-300 transition-all duration-300" style={{ width: `${malePct}%` }} />}
                {nonBinaryPct > 0 && <div className="h-full bg-zinc-150 transition-all duration-300" style={{ width: `${nonBinaryPct}%` }} />}
              </div>
              
              <div className="flex justify-between text-[10px] text-zinc-400 font-semibold pt-1">
                <span>{femaleCount} Female</span>
                <span>{maleCount} Male</span>
                <span>{totalDiversityCount - femaleCount - maleCount} Non-binary / Other</span>
              </div>
            </div>
          </div>

          {/* Time Off & Claims Card */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-zinc-950 tracking-tight">Leave Request Tracking</h3>
            <div className="grid grid-cols-3 gap-2.5 text-center text-xs font-bold">
              <div className="bg-zinc-50 border border-zinc-150 rounded-xl p-3 shadow-inner">
                <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Approved</p>
                <p className="mt-1.5 text-lg font-extrabold text-zinc-950">{leaveCounts.APPROVED}</p>
              </div>
              <div className="bg-zinc-50 border border-zinc-150 rounded-xl p-3 shadow-inner">
                <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Pending</p>
                <p className="mt-1.5 text-lg font-extrabold text-zinc-950">{leaveCounts.PENDING}</p>
              </div>
              <div className="bg-zinc-50 border border-zinc-150 rounded-xl p-3 shadow-inner">
                <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Rejected</p>
                <p className="mt-1.5 text-lg font-extrabold text-zinc-950">{leaveCounts.REJECTED}</p>
              </div>
            </div>

            <div className="border-t border-zinc-100 pt-4 space-y-3">
              <h4 className="text-xs font-bold text-zinc-950 tracking-tight">Finance Reimbursement Pipeline</h4>
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-zinc-500">Draft Claims Count:</span>
                <span className="text-zinc-900 font-bold">{draftReimbursements} claims</span>
              </div>
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-zinc-500">Awaiting Settlement Payout:</span>
                <span className="text-zinc-900 font-bold">₹{pendingExpenses.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-xs font-semibold pt-1 border-t border-zinc-100/60">
                <span className="text-zinc-500">Payroll ({now.toLocaleString("default", { month: "long" })}):</span>
                <span className="text-zinc-900 font-bold capitalize">{payrollRun?.status ?? "Not Started"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
