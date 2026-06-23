import { google, sheets_v4 } from "googleapis";
import type { Employee, LeaveRequest, CompanyEvent, Department, LeaveType, EmployeeStatus, EmploymentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createWorkspaceUser } from "@/lib/googleWorkspace";

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

export async function syncGoogleSheetsWithDb() {
  const client = getSheetsClient();
  if (!client) {
    console.warn("[Google Sheets] Simulation mode active. Credentials not found.");
    return {
      success: true,
      simulated: true,
      updatedCount: 2,
      createdCount: 1,
      message: "Simulation mode: Sync completed with simulated results."
    };
  }

  const { sheets, spreadsheetId } = client;
  const sheetName = "Employees";

  try {
    await ensureWorksheetExists(sheets, spreadsheetId, sheetName);

    // 1. Pull data from Google Sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values || [];
    let updatedCount = 0;
    let createdCount = 0;

    if (rows.length > 1) {
      const headers = rows[0].map((h: string) => h.trim().toLowerCase());
      const dataRows = rows.slice(1);

      const getColVal = (row: string[], possibleHeaders: string[]) => {
        for (const ph of possibleHeaders) {
          const idx = headers.indexOf(ph.toLowerCase());
          if (idx !== -1 && row[idx] !== undefined) return row[idx].trim();
        }
        return "";
      };

      let defaultDept = await prisma.department.findFirst();
      if (!defaultDept) {
        defaultDept = await prisma.department.create({
          data: { name: "General", code: "GEN" }
        });
      }

      for (const row of dataRows) {
        const email = getColVal(row, ["Official Email", "company email", "email", "OfficialEmail"]);
        const empId = getColVal(row, ["Employee ID", "employeeid", "Emp ID", "EmployeeID"]);

        if (!email && !empId) continue;

        const orConditions: Prisma.EmployeeWhereInput[] = [];
        if (email) orConditions.push({ email: email.toLowerCase() });
        if (empId) orConditions.push({ employeeId: empId });

        const existingEmp = orConditions.length > 0 ? await prisma.employee.findFirst({
          where: { OR: orConditions },
          include: { user: true }
        }) : null;

        const firstName = getColVal(row, ["First Name", "firstname", "name"]) || "New";
        const lastName = getColVal(row, ["Last Name", "lastname"]) || "Employee";
        const designation = getColVal(row, ["Designation"]) || "Associate";
        const deployedCompany = getColVal(row, ["Deployed Company", "deployedcompany", "company"]);
        const personalEmail = getColVal(row, ["Personal Email", "personalemail"]);
        const phone = getColVal(row, ["Phone", "phone number", "mobile"]);
        const gender = getColVal(row, ["Gender"]);
        const bloodGroup = getColVal(row, ["Blood Group", "bloodgroup"]);
        const address = getColVal(row, ["Permanent Address", "address", "permanentaddress"]);
        const emergencyContact = getColVal(row, ["Emergency Contact", "emergencycontact"]);
        const emergencyPhone = getColVal(row, ["Emergency Phone", "emergencyphone"]);
        const bankName = getColVal(row, ["Bank Name", "bankname"]);
        const bankAccountNo = getColVal(row, ["Bank Account No", "bankaccountno", "account number"]);
        const ifscCode = getColVal(row, ["IFSC Code", "ifsccode", "ifsc"]);
        const pan = getColVal(row, ["PAN", "pan card", "pancard"]);
        const uan = getColVal(row, ["UAN", "uan number", "uannumber"]);

        const joiningDateStr = getColVal(row, ["Joining Date", "joiningdate"]);
        let joiningDate = new Date();
        if (joiningDateStr) {
          const parsedDate = new Date(joiningDateStr);
          if (!Number.isNaN(parsedDate.getTime())) joiningDate = parsedDate;
        }

        const dobStr = getColVal(row, ["Date of Birth", "dob", "dateofbirth"]);
        let dateOfBirth: Date | null = null;
        if (dobStr) {
          const parsedDob = new Date(dobStr);
          if (!Number.isNaN(parsedDob.getTime())) dateOfBirth = parsedDob;
        }

        const statusStr = getColVal(row, ["Status", "status"]).toUpperCase();
        let status: EmployeeStatus = "ACTIVE";
        if (["ACTIVE", "ONBOARDING", "OFFBOARDING", "INACTIVE", "ALUMNI"].includes(statusStr)) {
          status = statusStr as EmployeeStatus;
        }

        const empTypeStr = getColVal(row, ["Employment Type", "employmenttype", "type"]).toUpperCase().replace(" ", "_");
        let employmentType: EmploymentType = "FULL_TIME";
        if (["FULL_TIME", "PART_TIME", "INTERN", "CONTRACT"].includes(empTypeStr)) {
          employmentType = empTypeStr as EmploymentType;
        }

        const deptCode = getColVal(row, ["Department Code", "departmentcode", "department"]);
        let departmentId = defaultDept.id;
        if (deptCode) {
          const matchedDept = await prisma.department.findFirst({
            where: { code: deptCode.toUpperCase() }
          });
          if (matchedDept) {
            departmentId = matchedDept.id;
          } else {
            const newDept = await prisma.department.create({
              data: { name: deptCode, code: deptCode.toUpperCase() }
            });
            departmentId = newDept.id;
          }
        }

        const updatePayload = {
          firstName,
          lastName,
          designation,
          deployedCompany: deployedCompany || null,
          personalEmail: personalEmail || null,
          phone: phone || null,
          gender: gender || null,
          bloodGroup: bloodGroup || null,
          permanentAddress: address || null,
          emergencyContact: emergencyContact || null,
          emergencyPhone: emergencyPhone || null,
          bankName: bankName || null,
          bankAccountNo: bankAccountNo || null,
          ifscCode: ifscCode || null,
          pan: pan || null,
          uan: uan || null,
          joiningDate,
          dateOfBirth,
          status,
          employmentType,
          departmentId
        };

        if (existingEmp) {
          await prisma.employee.update({
            where: { id: existingEmp.id },
            data: updatePayload
          });
          updatedCount++;
        } else {
          const baseEmail = email ? email.toLowerCase() : `${firstName.toLowerCase()}.${lastName.toLowerCase()}@theantbox.com`;
          let finalEmail = baseEmail;
          const userExists = await prisma.user.findUnique({ where: { email: finalEmail } });
          if (userExists) {
            const emailCount = await prisma.user.count({ where: { email: { startsWith: finalEmail.split("@")[0] } } });
            finalEmail = `${finalEmail.split("@")[0]}${emailCount + 1}@theantbox.com`;
          }

          let finalEmpId = empId;
          if (!finalEmpId || finalEmpId === "—") {
            const empTotal = await prisma.employee.count();
            finalEmpId = `ANT-${String(empTotal + 100).padStart(3, "0")}`;
          }

          const passwordHash = await bcrypt.hash("AntBox@2025", 12);

          await prisma.user.create({
            data: {
              email: finalEmail,
              passwordHash,
              role: "EMPLOYEE",
              isActive: status !== "INACTIVE" && status !== "ALUMNI",
              employee: {
                create: {
                  ...updatePayload,
                  email: finalEmail,
                  employeeId: finalEmpId,
                }
              }
            }
          });
          
          // Auto-provision Google Workspace account
          await createWorkspaceUser(finalEmail, "AntBox@2025", firstName, lastName);

          createdCount++;
        }
      }
    }

    // 2. Fetch all employees from DB and push back to Google Sheets
    const allEmployees = await prisma.employee.findMany({
      include: {
        department: true,
        documents: true,
        leaveRequests: {
          where: { status: "APPROVED" }
        }
      },
      orderBy: { employeeId: "asc" }
    });

    const spreadsheetHeaders = [
      "Employee ID",
      "First Name",
      "Last Name",
      "Official Email",
      "Personal Email",
      "Phone",
      "Designation",
      "Department Code",
      "Deployed Company",
      "Employment Type",
      "Status",
      "Joining Date",
      "Date of Birth",
      "Gender",
      "Blood Group",
      "Permanent Address",
      "Emergency Contact",
      "Emergency Phone",
      "Bank Name",
      "Bank Account No",
      "IFSC Code",
      "PAN",
      "UAN",
      "Documents Submitted",
      "Total Leaves Taken"
    ];

    const spreadsheetRows = allEmployees.map((emp) => {
      const docTitles = emp.documents.map((d) => d.title).join(", ") || "None";
      const leavesTaken = emp.leaveRequests.reduce((sum, r) => sum + r.days, 0);

      return [
        emp.employeeId,
        emp.firstName,
        emp.lastName,
        emp.email,
        emp.personalEmail || "",
        emp.phone || "",
        emp.designation,
        emp.department?.code || "",
        emp.deployedCompany || "AntBox",
        emp.employmentType,
        emp.status,
        emp.joiningDate ? emp.joiningDate.toISOString().split("T")[0] : "",
        emp.dateOfBirth ? emp.dateOfBirth.toISOString().split("T")[0] : "",
        emp.gender || "",
        emp.bloodGroup || "",
        emp.permanentAddress || emp.address || "",
        emp.emergencyContact || "",
        emp.emergencyPhone || "",
        emp.bankName || "",
        emp.bankAccountNo || "",
        emp.ifscCode || "",
        emp.pan || "",
        emp.uan || "",
        docTitles,
        leavesTaken.toString()
      ];
    });

    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [spreadsheetHeaders, ...spreadsheetRows]
      }
    });

    console.log(`[Google Sheets] Bi-directional sync completed successfully. Updated: ${updatedCount}, Created: ${createdCount}`);

    return {
      success: true,
      simulated: false,
      updatedCount,
      createdCount
    };
  } catch (error) {
    console.error("[Google Sheets] Sync failed:", error);
    return {
      success: false,
      simulated: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

