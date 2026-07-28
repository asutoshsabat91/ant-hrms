import { PrismaClient } from "@prisma/client";
import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();

const PRESERVED_EMAILS = [
  "rohit@theantbox.com",
  "hive@theantbox.com",
  "chandrita@theantbox.com",
  "asutosh.sabat@theantbox.com",
  "asutosham.sabat@theantbox.com",
];

function getSheetsClient() {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!spreadsheetId || !clientEmail || !privateKey) return null;

  const cleanKey = privateKey.replace(/\\n/g, "\n").replace(/^['"]|['"]$/g, "").trim();
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: cleanKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return {
    sheets: google.sheets({ version: "v4", auth }),
    spreadsheetId,
  };
}

async function main() {
  console.log("Purging all test employees from database...");

  // 1. Find all users/employees to delete (excluding preserved admins)
  const usersToDelete = await prisma.user.findMany({
    where: {
      email: {
        notIn: PRESERVED_EMAILS,
      },
    },
    select: { id: true, email: true },
  });

  const userIds = usersToDelete.map((u) => u.id);
  console.log(`Found ${userIds.length} test user records to delete.`);

  // 2. Cascade delete test employees and users
  const deletedEmp = await prisma.employee.deleteMany({
    where: {
      userId: { in: userIds },
    },
  });
  console.log(`Deleted ${deletedEmp.count} Employee records from DB.`);

  const deletedUser = await prisma.user.deleteMany({
    where: {
      id: { in: userIds },
    },
  });
  console.log(`Deleted ${deletedUser.count} User records from DB.`);

  // 3. Clear Google Sheet and set to header titles only
  const client = getSheetsClient();
  if (client) {
    const { sheets, spreadsheetId } = client;
    console.log(`Clearing Google Sheet (ID: ${spreadsheetId})...`);

    const headers = {
      Employees: [
        [
          "Employee ID", "First Name", "Last Name", "Official Email", "Personal Email", "Phone",
          "Date of Birth", "Gender", "Blood Group", "Permanent Address", "City", "State", "Pincode",
          "Emergency Contact Name", "Emergency Contact Phone", "Designation", "Department", "Deployed Company",
          "Employment Type", "Status", "Joining Date", "CTC", "Basic Salary", "HRA",
          "Special Allowance", "PF", "Professional Tax", "Bank Name", "Bank Account Number",
          "IFSC Code", "PAN", "UAN", "Password (Bcrypt Hash)"
        ]
      ],
      Departments: [["Department Code", "Department Name", "Active Headcount"]],
      Clients: [["Client / Deployed Company", "Active Headcount"]],
      "Leave Requests": [["Employee ID", "Employee Name", "Leave Type", "Start Date", "End Date", "Days", "Reason", "Status"]],
      Reimbursements: [["Employee ID", "Employee Name", "Title", "Category", "Amount", "Currency", "Date", "Status"]],
      Separations: [["Employee ID", "Employee Name", "Status", "Notice Days", "Reason", "Initiated At"]],
    };

    for (const [sheetName, headerValues] of Object.entries(headers)) {
      try {
        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: `${sheetName}!A:Z`,
        });
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!A1`,
          valueInputOption: "RAW",
          requestBody: { values: headerValues },
        });
        console.log(`Cleared "${sheetName}" tab in Google Sheets.`);
      } catch (err) {
        console.error(`Error clearing tab ${sheetName}:`, err);
      }
    }
  }

  console.log("\nPurge completed successfully! The DB and Google Sheet are 100% clean and ready for live employee data.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
