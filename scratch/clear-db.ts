import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Clearing all records from database to ensure a clean seed...");
  
  // Delete in correct order of dependency
  await prisma.attendancePunch.deleteMany({});
  await prisma.attendanceRecord.deleteMany({});
  await prisma.leaveRequest.deleteMany({});
  await prisma.leaveBalance.deleteMany({});
  await prisma.payrollLine.deleteMany({});
  await prisma.payrollRun.deleteMany({});
  await prisma.hRDocument.deleteMany({});
  await prisma.iTTask.deleteMany({});
  await prisma.reimbursement.deleteMany({});
  await prisma.grievanceComment.deleteMany({});
  await prisma.grievance.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.performanceGoal.deleteMany({});
  await prisma.performanceReview.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.pOSHReport.deleteMany({});
  await prisma.separation.deleteMany({});
  await prisma.onboardingTask.deleteMany({});
  
  // Finally delete Employees and Users
  const deleteEmployees = await prisma.employee.deleteMany({});
  console.log(`Deleted ${deleteEmployees.count} Employee records.`);
  
  const deleteUsers = await prisma.user.deleteMany({});
  console.log(`Deleted ${deleteUsers.count} User records.`);
  
  console.log("Database cleared successfully!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
