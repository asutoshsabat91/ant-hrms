import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const requests = await prisma.leaveRequest.findMany({
    include: {
      employee: true,
      leaveType: true,
    },
  });
  console.log(`Found ${requests.length} leave requests in DB.`);
  for (const r of requests) {
    console.log({
      id: r.id,
      employeeId: r.employeeId,
      hasEmployee: !!r.employee,
      hasLeaveType: !!r.leaveType,
      startDate: r.startDate,
      endDate: r.endDate,
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
