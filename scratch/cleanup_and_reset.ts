import { PrismaClient } from "@prisma/client";
import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log("Starting DB & Sheet Cleanup (Keeping ONLY Rohit, Chandrita, and Asutosh)...");

  // 1. Identify User & Employee IDs to KEEP
  const emailsToKeep = [
    "rohit@theantbox.com",
    "chandrita@theantbox.com",
    "asutosh.sabat@theantbox.com"
  ];

  const employeesToKeep = await prisma.employee.findMany({
    where: {
      email: { in: emailsToKeep }
    },
    select: { id: true, userId: true, email: true, firstName: true, lastName: true }
  });

  const keepEmpIds = employeesToKeep.map(e => e.id);
  const keepUserIds = employeesToKeep.map(e => e.userId).filter(Boolean) as string[];

  console.log("Employees to KEEP in Database:", employeesToKeep.map(e => `${e.firstName} ${e.lastName} (${e.email})`));

  // 2. Delete ALL transactional records from Database
  console.log("Deleting transactional data...");

  await prisma.payrollLine.deleteMany({});
  await prisma.payrollRun.deleteMany({});
  await prisma.leaveRequest.deleteMany({});
  await prisma.regularizationRequest.deleteMany({});
  await prisma.attendancePunch.deleteMany({});
  await prisma.attendanceRecord.deleteMany({});
  await prisma.separation.deleteMany({});
  await prisma.offboardingTask.deleteMany({});
  await prisma.onboardingTask.deleteMany({});
  await prisma.onboardingRequest.deleteMany({});
  await prisma.reimbursement.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.guestInvitation.deleteMany({});
  await prisma.documentRequest.deleteMany({});
  await prisma.hRDocument.deleteMany({});
  await prisma.pOSHReport.deleteMany({});
  await prisma.auditLog.deleteMany({});

  console.log("Deleted all leaves, attendance, separations, offboarding, onboarding, reimbursements, notifications!");

  // 3. Delete all employees EXCEPT Rohit, Chandrita, Asutosh
  const deletedEmps = await prisma.employee.deleteMany({
    where: {
      id: { notIn: keepEmpIds }
    }
  });
  console.log(`Deleted ${deletedEmps.count} other employee records.`);

  // 4. Delete all users EXCEPT Rohit, Chandrita, Asutosh
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      email: { notIn: emailsToKeep }
    }
  });
  console.log(`Deleted ${deletedUsers.count} other user accounts.`);

  // Verify remaining DB count
  const empCount = await prisma.employee.count();
  const userCount = await prisma.user.count();
  console.log(`\nRemaining DB Employees: ${empCount}, Remaining DB Users: ${userCount}`);

  // 5. Clean Google Spreadsheet tabs except headers
  console.log("\nClearing Google Spreadsheet data rows (preserving headers)...");

  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!spreadsheetId || !clientEmail || !privateKey) {
    console.error("Missing Google Sheets API credentials in .env");
    return;
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const tabsToClear = ["Employees", "Leaves", "Separations", "Offboarding", "Attendance", "Reimbursements"];

  for (const tab of tabsToClear) {
    try {
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${tab}!A2:Z1000`
      });
      console.log(`Cleared tab: ${tab}`);
    } catch (err: any) {
      console.warn(`Could not clear tab ${tab}: ${err.message}`);
    }
  }

  // 6. Write ONLY Rohit, Chandrita, and Asutosh to "Employees" tab
  const remainingEmps = await prisma.employee.findMany({
    where: { id: { in: keepEmpIds } },
    include: { department: true }
  });

  const rowsToWrite = remainingEmps.map(emp => [
    emp.employeeId || "",
    emp.firstName || "",
    emp.lastName || "",
    emp.email || "",
    emp.personalEmail || "",
    emp.phone || "",
    emp.dateOfBirth ? new Date(emp.dateOfBirth).toISOString().split("T")[0] : "",
    emp.gender || "",
    emp.bloodGroup || "",
    emp.address || "",
    emp.city || "",
    emp.state || "",
    emp.pincode || "",
    emp.emergencyContact || "",
    emp.emergencyPhone || "",
    emp.designation || "",
    "", // Reporting Manager
    emp.department?.name || "",
    emp.deployedCompany || "AntBox",
    emp.employmentType || "FULL_TIME",
    emp.workMode || "ONSITE",
    emp.status || "ACTIVE",
    emp.joiningDate ? new Date(emp.joiningDate).toISOString().split("T")[0] : "",
    emp.ctc ? String(emp.ctc) : "",
    emp.basicSalary ? String(emp.basicSalary) : "",
    emp.hra ? String(emp.hra) : ""
  ]);

  if (rowsToWrite.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Employees!A2",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: rowsToWrite }
    });
    console.log(`Updated Employees tab with ${rowsToWrite.length} master accounts.`);
  }

  console.log("\nCleanup and Google Sheet reset complete!");
}

main().catch(console.error);
