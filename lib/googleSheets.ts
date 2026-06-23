import { google, sheets_v4 } from "googleapis";
import type { Employee, LeaveRequest, CompanyEvent, Department, LeaveType } from "@prisma/client";

function getSheetsClient() {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!spreadsheetId || !clientEmail || !privateKey) {
    console.warn(
      "[Google Sheets] Missing credentials/config (GOOGLE_SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY). Sheets integration disabled."
    );
    return null;
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return {
    sheets: google.sheets({ version: "v4", auth }),
    spreadsheetId,
  };
}

async function ensureWorksheetExists(sheets: sheets_v4.Sheets, spreadsheetId: string, title: string) {
  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const exists = spreadsheet.data.sheets?.some((s: { properties?: { title?: string | null } }) => s.properties?.title === title) || false;
    if (!exists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: { title },
              },
            },
          ],
        },
      });
      console.log(`[Google Sheets] Created worksheet: ${title}`);
    }
  } catch (error) {
    console.error(`[Google Sheets] Error ensuring worksheet ${title} exists:`, error);
  }
}

// 1. Append Employee
export async function appendEmployeeToSheet(employee: {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  designation: string;
  deployedCompany?: string | null;
  joiningDate: Date | string;
  status: string;
}) {
  const client = getSheetsClient();
  if (!client) return { success: true, simulated: true };

  try {
    const { sheets, spreadsheetId } = client;
    await ensureWorksheetExists(sheets, spreadsheetId, "Employees");

    const values = [
      [
        employee.employeeId,
        employee.firstName,
        employee.lastName,
        employee.email,
        employee.designation,
        employee.deployedCompany || "AntBox",
        new Date(employee.joiningDate).toLocaleDateString(),
        employee.status,
      ],
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Employees!A:H",
      valueInputOption: "RAW",
      requestBody: { values },
    });

    console.log(`[Google Sheets] Appended employee: ${employee.email}`);
    return { success: true };
  } catch (error) {
    console.error("[Google Sheets] Failed to append employee:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// 2. Update Employee Status & Deployed Company (Offboarding Exit automation)
export async function updateEmployeeInSheet(
  employeeId: string,
  status: string,
  deployedCompany: string
) {
  const client = getSheetsClient();
  if (!client) return { success: true, simulated: true };

  try {
    const { sheets, spreadsheetId } = client;
    await ensureWorksheetExists(sheets, spreadsheetId, "Employees");

    // Fetch all rows
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Employees!A:H",
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex((row: string[]) => row[0] === employeeId);

    if (rowIndex === -1) {
      console.warn(`[Google Sheets] Employee ID ${employeeId} not found in spreadsheet.`);
      return { success: false, error: "Employee not found in sheet" };
    }

    // Google Sheets index is 1-based
    const sheetRowNumber = rowIndex + 1;

    // Update Deployed Company (Column F, index 5) and Status (Column H, index 7)
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Employees!F${sheetRowNumber}:H${sheetRowNumber}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[deployedCompany, rows[rowIndex][6] || "", status]],
      },
    });

    console.log(`[Google Sheets] Updated employee ${employeeId} to ${status} in sheet.`);
    return { success: true };
  } catch (error) {
    console.error("[Google Sheets] Failed to update employee:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// 3. Export all types (Dashboard, Leaves, Calendar)
export async function exportDataToGoogleSheets(data: {
  employees: Array<Employee & { department?: Department | null }>;
  leaveRequests: Array<
    LeaveRequest & {
      employee?: (Employee & { user?: unknown }) | null;
      leaveType?: LeaveType | null;
    }
  >;
  companyEvents: CompanyEvent[];
}) {
  const client = getSheetsClient();
  if (!client) return { success: true, simulated: true };

  try {
    const { sheets, spreadsheetId } = client;

    // A. Export Employees
    await ensureWorksheetExists(sheets, spreadsheetId, "Employees");
    await sheets.spreadsheets.values.clear({ spreadsheetId, range: "Employees!A:Z" });
    const employeeHeaders = [
      "Employee ID",
      "First Name",
      "Last Name",
      "Official Email",
      "Designation",
      "Deployed Company",
      "Joining Date",
      "Status",
    ];
    const employeeRows = data.employees.map((emp) => [
      emp.employeeId,
      emp.firstName,
      emp.lastName,
      emp.email,
      emp.designation,
      emp.deployedCompany || "AntBox",
      emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : "",
      emp.status,
    ]);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Employees!A1",
      valueInputOption: "RAW",
      requestBody: { values: [employeeHeaders, ...employeeRows] },
    });

    // B. Export Leaves
    await ensureWorksheetExists(sheets, spreadsheetId, "Leaves");
    await sheets.spreadsheets.values.clear({ spreadsheetId, range: "Leaves!A:Z" });
    const leaveHeaders = [
      "Employee ID",
      "Employee Name",
      "Leave Type",
      "Start Date",
      "End Date",
      "Days",
      "Reason",
      "Status",
    ];
    const leaveRows = data.leaveRequests.map((req) => [
      req.employee?.employeeId || "—",
      `${req.employee?.firstName || ""} ${req.employee?.lastName || ""}`,
      req.leaveType?.name || "—",
      req.startDate ? new Date(req.startDate).toLocaleDateString() : "",
      req.endDate ? new Date(req.endDate).toLocaleDateString() : "",
      req.days,
      req.reason || "",
      req.status,
    ]);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Leaves!A1",
      valueInputOption: "RAW",
      requestBody: { values: [leaveHeaders, ...leaveRows] },
    });

    // C. Export Calendar
    await ensureWorksheetExists(sheets, spreadsheetId, "Calendar");
    await sheets.spreadsheets.values.clear({ spreadsheetId, range: "Calendar!A:Z" });
    const calendarHeaders = ["Title", "Description", "Category", "Start Date", "End Date", "All Day"];
    const calendarRows = data.companyEvents.map((evt) => [
      evt.title,
      evt.description || "",
      evt.category,
      evt.startDate ? new Date(evt.startDate).toLocaleDateString() : "",
      evt.endDate ? new Date(evt.endDate).toLocaleDateString() : "",
      evt.allDay ? "Yes" : "No",
    ]);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Calendar!A1",
      valueInputOption: "RAW",
      requestBody: { values: [calendarHeaders, ...calendarRows] },
    });

    console.log("[Google Sheets] Exported all HRMS data sheets successfully.");
    return { success: true };
  } catch (error) {
    console.error("[Google Sheets] Failed to export data:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// 4. Import Employees from Google Sheets
export async function importEmployeesFromGoogleSheets(departments: Array<{ id: string; name: string }>) {
  const client = getSheetsClient();
  if (!client) return [];

  try {
    const { sheets, spreadsheetId } = client;
    await ensureWorksheetExists(sheets, spreadsheetId, "Employees");

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Employees!A:H",
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return [];

    const headers = rows[0].map((h: string) => h.trim().toLowerCase());
    const dataRows = rows.slice(1);

    return dataRows.map((row: string[]) => {
      const getVal = (possibleHeaders: string[]) => {
        for (const ph of possibleHeaders) {
          const idx = headers.indexOf(ph.toLowerCase());
          if (idx !== -1) return row[idx] || "";
        }
        return "";
      };

      const firstName = getVal(["first name", "firstname", "name"]) || "";
      const lastName = getVal(["last name", "lastname"]) || "";
      const email = getVal(["official email", "company email", "email"]) || "";
      const designation = getVal(["designation"]) || "";
      const deptName = getVal(["department"]) || "";
      const joiningDateStr = getVal(["joining date", "joiningdate"]) || new Date().toISOString().slice(0, 10);
      
      const matchedDept = departments.find(
        (d) => d.name.toLowerCase() === deptName.toLowerCase()
      ) || departments[0];

      return {
        firstName,
        lastName,
        email,
        designation,
        departmentId: matchedDept?.id || "",
        joiningDate: joiningDateStr,
        employmentType: "FULL_TIME",
        employeeId: getVal(["employee id", "employeeid"]),
        deployedCompany: getVal(["deployed company", "deployedcompany", "company"]),
        status: getVal(["status"]) || "ACTIVE",
      };
    }).filter(emp => emp.firstName && emp.email);
  } catch (error) {
    console.error("[Google Sheets] Failed to import employees:", error);
    return [];
  }
}
