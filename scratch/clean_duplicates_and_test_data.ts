import { PrismaClient } from "@prisma/client";
import { exportDbToGoogleSheetsOnly } from "../lib/googleSheets";

const prisma = new PrismaClient();

const PRESERVED_EMAILS = [
  "rohit@theantbox.com",
  "chandrita@theantbox.com",
  "asutosh.sabat@theantbox.com"
];

async function main() {
  console.log("=== Purging Test Data & Synthetic Duplicates from Database ===");

  const testEmps = await prisma.employee.findMany({
    where: {
      email: { notIn: PRESERVED_EMAILS }
    },
    select: { id: true, userId: true, email: true, employeeId: true, firstName: true, lastName: true }
  });

  console.log(`Found ${testEmps.length} test employee records to remove.`);

  const testEmpIds = testEmps.map(e => e.id);
  const testUserIds = testEmps.map(e => e.userId).filter((id): id is string => Boolean(id));

  // 1. Wipe foreign key relations safely
  await prisma.leaveRequest.deleteMany({ where: { employeeId: { in: testEmpIds } } });
  await prisma.leaveBalance.deleteMany({ where: { employeeId: { in: testEmpIds } } });
  await prisma.attendanceRecord.deleteMany({ where: { employeeId: { in: testEmpIds } } });
  await prisma.attendancePunch.deleteMany({ where: { employeeId: { in: testEmpIds } } });
  await prisma.regularizationRequest.deleteMany({ where: { employeeId: { in: testEmpIds } } });
  await prisma.reimbursement.deleteMany({ where: { employeeId: { in: testEmpIds } } });
  await prisma.separation.deleteMany({ where: { employeeId: { in: testEmpIds } } });
  await prisma.offboardingTask.deleteMany({ where: { employeeId: { in: testEmpIds } } });
  await prisma.onboardingRequest.deleteMany({});
  await prisma.payrollLine.deleteMany({ where: { employeeId: { in: testEmpIds } } });
  await prisma.notification.deleteMany({ where: { userId: { in: testUserIds } } });

  // 2. Clear manager references pointing to deleted employees
  await prisma.employee.updateMany({
    where: { managerId: { in: testEmpIds } },
    data: { managerId: null }
  });

  // 3. Delete test employees and users
  const deletedEmps = await prisma.employee.deleteMany({
    where: { id: { in: testEmpIds } }
  });
  console.log(`Deleted ${deletedEmps.count} test employees from DB.`);

  const deletedUsers = await prisma.user.deleteMany({
    where: {
      AND: [
        { email: { notIn: PRESERVED_EMAILS } },
        { role: { notIn: ["ADMIN"] } }
      ]
    }
  });
  console.log(`Deleted ${deletedUsers.count} test users from DB.`);

  // 4. Ensure preserved master accounts have clean roles and IDs
  const rohit = await prisma.employee.findFirst({ where: { email: "rohit@theantbox.com" } });
  if (rohit) {
    await prisma.employee.update({
      where: { id: rohit.id },
      data: { employeeId: "ANT-001", designation: "CEO", jobRole: "CEO", employmentType: "FULL_TIME" }
    });
  }

  const chandrita = await prisma.employee.findFirst({ where: { email: "chandrita@theantbox.com" } });
  if (chandrita) {
    await prisma.employee.update({
      where: { id: chandrita.id },
      data: { employeeId: "ANT-016", designation: "HR Manager", jobRole: "HR Manager", employmentType: "FULL_TIME" }
    });
  }

  const asutosh = await prisma.employee.findFirst({ where: { email: "asutosh.sabat@theantbox.com" } });
  if (asutosh) {
    await prisma.employee.update({
      where: { id: asutosh.id },
      data: { employeeId: "ANT-250138", designation: "Software Engineer", jobRole: "Software Engineer", employmentType: "INTERN" }
    });
  }

  const remaining = await prisma.employee.findMany({ select: { employeeId: true, firstName: true, lastName: true, email: true } });
  console.log("\nPreserved Accounts in DB:", remaining);

  console.log("\nStep 5: Rewriting Clean Google Sheet State...");
  const exportRes = await exportDbToGoogleSheetsOnly();
  console.log("Export Result:", exportRes);
  console.log("\nDone!");
}

main().catch(console.error);
