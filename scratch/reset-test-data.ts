import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting test data reset for production office launch...");

  // 1. Delete all transactional / testing history records
  const leaves = await prisma.leaveRequest.deleteMany({});
  console.log(`Deleted ${leaves.count} LeaveRequest records.`);

  const punches = await prisma.attendancePunch.deleteMany({});
  console.log(`Deleted ${punches.count} AttendancePunch records.`);

  const attendance = await prisma.attendanceRecord.deleteMany({});
  console.log(`Deleted ${attendance.count} AttendanceRecord records.`);

  const separations = await prisma.separation.deleteMany({});
  console.log(`Deleted ${separations.count} Separation records.`);

  const offboarding = await prisma.offboardingTask.deleteMany({});
  console.log(`Deleted ${offboarding.count} OffboardingTask records.`);

  const onboarding = await prisma.onboardingTask.deleteMany({});
  console.log(`Deleted ${onboarding.count} OnboardingTask records.`);

  const docs = await prisma.hRDocument.deleteMany({});
  console.log(`Deleted ${docs.count} HRDocument records.`);

  const reimbursements = await prisma.reimbursement.deleteMany({});
  console.log(`Deleted ${reimbursements.count} Reimbursement records.`);

  const payrollLines = await prisma.payrollLine.deleteMany({});
  console.log(`Deleted ${payrollLines.count} PayrollLine records.`);

  const payrollRuns = await prisma.payrollRun.deleteMany({});
  console.log(`Deleted ${payrollRuns.count} PayrollRun records.`);

  const notifications = await prisma.notification.deleteMany({});
  console.log(`Deleted ${notifications.count} Notification records.`);

  // 2. Reset all non-admin employees to ONBOARDING status so they onboard from scratch
  const resetEmployees = await prisma.employee.updateMany({
    data: {
      status: "ONBOARDING",
      onboardingWizardCompleted: false,
      personalDetailsFilled: false,
    },
  });
  console.log(`Reset ${resetEmployees.count} Employee records to ONBOARDING state.`);

  console.log("Test data cleanup successfully completed! The app is ready for fresh office onboarding.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
