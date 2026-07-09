import { google, sheets_v4 } from "googleapis";
import type { EmployeeStatus, EmploymentType, PunchType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import crypto from "crypto";
import bcrypt from "bcryptjs";

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

  const cleanKey = privateKey
    .replace(/\\n/g, "\n")
    .replace(/^['"]|['"]$/g, "")
    .trim();

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

// 3. Export all types (Dashboard, Leaves, Calendar) - redirected to unified sync
export async function exportDataToGoogleSheets() {
  return syncGoogleSheetsWithDb();
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

    let headers: string[] = [];
    let employeeDataRows: string[][] = [];
    let isParsingEmployees = false;

    for (let i = 0; i < rows.length; i++) {
      const firstCell = (rows[i]?.[0] || "").toString().trim();
      if (firstCell.startsWith("SECTION 1:")) {
        const headerRow = rows[i + 1] || [];
        headers = headerRow.map((h) => String(h).trim().toLowerCase());
        isParsingEmployees = true;
        i++; // skip header row in the next loop
        continue;
      }
      
      if (isParsingEmployees) {
        if (firstCell.startsWith("SECTION ") || firstCell === "") {
          isParsingEmployees = false;
          break;
        }
        employeeDataRows.push(rows[i]);
      }
    }

    // Fallback if no sections exist yet
    if (headers.length === 0 && rows.length > 0) {
      headers = rows[0].map((h) => String(h).trim().toLowerCase());
      employeeDataRows = rows.slice(1);
    }

    if (employeeDataRows.length > 0 && headers.length > 0) {
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

      for (const row of employeeDataRows) {
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
        const emergencyContact = getColVal(row, ["Emergency Contact Name", "Emergency Contact", "emergencycontact"]);
        const emergencyPhone = getColVal(row, ["Emergency Contact Phone", "Emergency Phone", "emergencyphone"]);
        const bankName = getColVal(row, ["Bank Name", "bankname"]);
        const bankAccountNo = getColVal(row, ["Bank Account Number", "Bank Account No", "bankaccountno", "account number"]);
        const ifscCode = getColVal(row, ["IFSC Code", "ifsccode", "ifsc"]);
        const pan = getColVal(row, ["PAN", "pan card", "pancard"]);
        const uan = getColVal(row, ["UAN", "uan number", "uannumber"]);

        const ctcVal = getColVal(row, ["CTC", "ctc"]);
        const ctc = ctcVal ? parseFloat(ctcVal) : 0;

        const basicVal = getColVal(row, ["Basic Salary", "basicsalary", "basic"]);
        const basicSalary = basicVal ? parseFloat(basicVal) : 0;

        const hraVal = getColVal(row, ["HRA", "hra"]);
        const hra = hraVal ? parseFloat(hraVal) : 0;

        const specialVal = getColVal(row, ["Special Allowance", "specialallowance", "special"]);
        const specialAllowance = specialVal ? parseFloat(specialVal) : 0;

        const pfVal = getColVal(row, ["PF", "pf"]);
        const pf = pfVal ? parseFloat(pfVal) : 0;

        const ptVal = getColVal(row, ["Professional Tax", "professionaltax", "pt"]);
        const professionalTax = ptVal ? parseFloat(ptVal) : 200;

        const city = getColVal(row, ["City", "city"]);
        const state = getColVal(row, ["State", "state"]) || "Odisha";
        const pincode = getColVal(row, ["Pincode", "pincode"]);

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
          city: city || null,
          state: state || "Odisha",
          pincode: pincode || null,
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
          departmentId,
          ctc,
          basicSalary,
          hra,
          specialAllowance,
          pf,
          professionalTax,
        };

        const sheetPassword = getColVal(row, ["Password", "Password (Bcrypt Hash)", "password"]);
        let newPasswordHash: string | undefined = undefined;
        if (sheetPassword && !sheetPassword.startsWith("$2a$") && !sheetPassword.startsWith("$2b$") && !sheetPassword.startsWith("$2y$")) {
          newPasswordHash = await bcrypt.hash(sheetPassword, 12);
        }

        if (existingEmp) {
          await prisma.employee.update({
            where: { id: existingEmp.id },
            data: updatePayload
          });

          const isActive = status !== "INACTIVE" && status !== "ALUMNI";
          await prisma.user.update({
            where: { id: existingEmp.userId },
            data: {
              isActive,
              ...(newPasswordHash ? { passwordHash: newPasswordHash } : {})
            }
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

          const tempPassword = sheetPassword || crypto.randomBytes(6).toString("hex") + "!";
          const passwordHash = newPasswordHash || await bcrypt.hash(tempPassword, 12);

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
          
          createdCount++;
        }
      }
    }

    // 2. Fetch all database models and update Google Sheets format to match Export Report
    const [allEmployees, allLeaves, allReimbursements, allSeparations] = await Promise.all([
      prisma.employee.findMany({
        include: { department: true },
        orderBy: { employeeId: "asc" }
      }),
      prisma.leaveRequest.findMany({
        include: { employee: true, leaveType: true },
        orderBy: { createdAt: "desc" }
      }),
      prisma.reimbursement.findMany({
        include: { employee: true },
        orderBy: { createdAt: "desc" }
      }),
      prisma.separation.findMany({
        include: { employee: true },
        orderBy: { createdAt: "desc" }
      })
    ]);

    // Ensure all target worksheets exist sequentially to prevent concurrent write collisions
    await ensureWorksheetExists(sheets, spreadsheetId, "Employees");
    await ensureWorksheetExists(sheets, spreadsheetId, "Leave Requests");
    await ensureWorksheetExists(sheets, spreadsheetId, "Reimbursements");
    await ensureWorksheetExists(sheets, spreadsheetId, "Separations");

    // 1. Employees Tab Data
    const employeeRows: unknown[][] = [
      [
        "Employee ID", "First Name", "Last Name", "Official Email", "Personal Email", "Phone",
        "Date of Birth", "Gender", "Blood Group", "Permanent Address", "City", "State", "Pincode",
        "Emergency Contact Name", "Emergency Contact Phone", "Designation", "Department",
        "Employment Type", "Status", "Joining Date", "CTC", "Basic Salary", "HRA",
        "Special Allowance", "PF", "Professional Tax", "Bank Name", "Bank Account Number",
        "IFSC Code", "PAN", "UAN", "Password (Bcrypt Hash)"
      ]
    ];

    const users = await prisma.user.findMany({ select: { email: true, passwordHash: true } });
    const userPasswordMap = new Map(users.map(u => [u.email.toLowerCase(), u.passwordHash]));

    allEmployees.forEach((emp) => {
      const personalEmail = emp.personalEmail || "—";
      const phone = emp.phone || "—";
      const dob = emp.dateOfBirth ? new Date(emp.dateOfBirth).toISOString().slice(0, 10) : "—";
      const gender = emp.gender || "—";
      const bloodGroup = emp.bloodGroup || "—";
      const permAddress = emp.permanentAddress || "—";
      const city = emp.city || "—";
      const state = emp.state || "Odisha";
      const pincode = emp.pincode || "—";
      const emergencyContact = emp.emergencyContact || "—";
      const emergencyPhone = emp.emergencyPhone || "—";
      const joiningDate = emp.joiningDate ? new Date(emp.joiningDate).toISOString().slice(0, 10) : "—";
      const ctc = emp.ctc ?? 0;
      const basic = emp.basicSalary ?? 0;
      const hra = emp.hra ?? 0;
      const special = emp.specialAllowance ?? 0;
      const pf = emp.pf ?? 0;
      const pt = emp.professionalTax ?? 200;
      const bankName = emp.bankName || "—";
      const bankAccountNo = emp.bankAccountNo || "—";
      const ifsc = emp.ifscCode || "—";
      const pan = emp.pan || "—";
      const uan = emp.uan || "—";
      const passwordHash = userPasswordMap.get(emp.email.toLowerCase()) || "";

      employeeRows.push([
        emp.employeeId,
        emp.firstName,
        emp.lastName,
        emp.email,
        personalEmail,
        phone,
        dob,
        gender,
        bloodGroup,
        permAddress,
        city,
        state,
        pincode,
        emergencyContact,
        emergencyPhone,
        emp.designation,
        emp.department?.name ?? "—",
        emp.employmentType,
        emp.status,
        joiningDate,
        ctc,
        basic,
        hra,
        special,
        pf,
        pt,
        bankName,
        bankAccountNo,
        ifsc,
        pan,
        uan,
        passwordHash
      ]);
    });

    // 2. Leave Requests Tab Data
    const leaveRows: unknown[][] = [
      ["Employee ID", "Employee Name", "Leave Type", "Start Date", "End Date", "Days", "Reason", "Status"]
    ];
    allLeaves.forEach((req) => {
      const empName = `${req.employee?.firstName ?? ""} ${req.employee?.lastName ?? ""}`;
      const startDate = req.startDate ? new Date(req.startDate).toISOString().slice(0, 10) : "—";
      const endDate = req.endDate ? new Date(req.endDate).toISOString().slice(0, 10) : "—";
      leaveRows.push([
        req.employee?.employeeId ?? "—",
        empName,
        req.leaveType?.name ?? "—",
        startDate,
        endDate,
        req.days,
        req.reason || "",
        req.status
      ]);
    });

    // 3. Reimbursement Claims Tab Data
    const reimbursementRows: unknown[][] = [
      ["Employee ID", "Employee Name", "Title", "Category", "Amount", "Currency", "Date", "Status"]
    ];
    allReimbursements.forEach((r) => {
      const empName = `${r.employee?.firstName ?? ""} ${r.employee?.lastName ?? ""}`;
      const claimDate = r.date ? new Date(r.date).toISOString().slice(0, 10) : "—";
      reimbursementRows.push([
        r.employee?.employeeId ?? "—",
        empName,
        r.title,
        r.category,
        r.amount,
        r.currency,
        claimDate,
        r.status
      ]);
    });

    // 4. Separation Initiations Tab Data
    const separationRows: unknown[][] = [
      ["Employee ID", "Employee Name", "Status", "Notice Days", "Reason", "Initiated At"]
    ];
    allSeparations.forEach((s) => {
      const empName = `${s.employee?.firstName ?? ""} ${s.employee?.lastName ?? ""}`;
      const initiatedAt = s.initiatedAt ? new Date(s.initiatedAt).toISOString().slice(0, 10) : "—";
      separationRows.push([
        s.employee?.employeeId ?? "—",
        empName,
        s.status,
        s.noticeDays,
        s.reason,
        initiatedAt
      ]);
    });

    // Execute clear and update sequentially to prevent write conflicts
    // Employees
    await sheets.spreadsheets.values.clear({ spreadsheetId, range: "Employees!A:Z" });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Employees!A1",
      valueInputOption: "RAW",
      requestBody: { values: employeeRows }
    });

    // Leave Requests
    await sheets.spreadsheets.values.clear({ spreadsheetId, range: "'Leave Requests'!A:Z" });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "'Leave Requests'!A1",
      valueInputOption: "RAW",
      requestBody: { values: leaveRows }
    });

    // Reimbursements
    await sheets.spreadsheets.values.clear({ spreadsheetId, range: "Reimbursements!A:Z" });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Reimbursements!A1",
      valueInputOption: "RAW",
      requestBody: { values: reimbursementRows }
    });

    // Separations
    await sheets.spreadsheets.values.clear({ spreadsheetId, range: "Separations!A:Z" });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Separations!A1",
      valueInputOption: "RAW",
      requestBody: { values: separationRows }
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

// Helper for Kolkata Work Date calculation
function getKolkataWorkDateLocal(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return new Date(Date.UTC(year, month - 1, day));
}

// Helper for worked hours sum
function sumWorkedHoursLocal(punches: { punchType: string; punchedAt: Date }[]) {
  let totalMs = 0;
  let openIn: Date | null = null;

  for (const punch of punches) {
    if (punch.punchType === "IN") {
      openIn = punch.punchedAt;
    } else if (openIn) {
      totalMs += punch.punchedAt.getTime() - openIn.getTime();
      openIn = null;
    }
  }

  return Math.round((totalMs / 3600000) * 100) / 100;
}

// Sync all attendance records to Google Sheets
export async function syncAttendanceToGoogleSheets() {
  const client = getSheetsClient();
  if (!client) {
    console.warn("[Google Sheets] Simulation mode active. Cannot sync attendance logs.");
    return { success: true, simulated: true };
  }

  const { sheets, spreadsheetId } = client;
  const sheetName = "Attendance Logs";

  try {
    await ensureWorksheetExists(sheets, spreadsheetId, sheetName);

    // Fetch all attendance records with punches and employee names
    const records = await prisma.attendanceRecord.findMany({
      include: {
        employee: true,
        punches: {
          orderBy: { punchedAt: "asc" },
        },
      },
      orderBy: { workDate: "desc" },
    });

    const spreadsheetRows: string[][] = [];
    // Header
    spreadsheetRows.push([
      "Date",
      "Employee ID",
      "Employee Name",
      "Status",
      "First Punch",
      "Latest Punch",
      "Clock Cycles",
      "Total Hours"
    ]);

    records.forEach((record) => {
      const empName = `${record.employee.firstName} ${record.employee.lastName}`;
      const workDate = new Date(record.workDate).toISOString().slice(0, 10);

      const firstPunch = record.punches[0]?.punchedAt
        ? new Date(record.punches[0].punchedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
        : record.checkIn
        ? new Date(record.checkIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
        : "—";

      const lastPunch = record.punches.at(-1)?.punchedAt
        ? new Date(record.punches.at(-1)!.punchedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
        : record.checkOut
        ? new Date(record.checkOut).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
        : "—";

      // Calculate clock cycles
      const cycles: string[] = [];
      const punches = record.punches;
      for (let i = 0; i < punches.length; i += 2) {
        const inPunch = punches[i];
        const outPunch = punches[i + 1];
        const inStr = inPunch
          ? new Date(inPunch.punchedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
          : "—";
        const outStr = outPunch
          ? new Date(outPunch.punchedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
          : "—";

        if (inPunch && outPunch) {
          const diffMs = new Date(outPunch.punchedAt).getTime() - new Date(inPunch.punchedAt).getTime();
          const hrs = (diffMs / (1000 * 60 * 60)).toFixed(2);
          cycles.push(`${inStr} to ${outStr} (${hrs} hrs)`);
        } else if (inPunch) {
          cycles.push(`${inStr} to — (Active)`);
        }
      }
      const cyclesStr = cycles.join(" | ") || "—";

      spreadsheetRows.push([
        workDate,
        record.employee.employeeId,
        empName,
        record.status,
        firstPunch,
        lastPunch,
        cyclesStr,
        (record.totalHours ?? 0).toString()
      ]);
    });

    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${sheetName}!A:H`,
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: "RAW",
      requestBody: {
        values: spreadsheetRows,
      },
    });

    console.log(`[Google Sheets] Exported ${records.length} attendance records to tab "Attendance Logs".`);
    return { success: true, simulated: false };
  } catch (error) {
    console.error("[Google Sheets] Sync attendance failed:", error);
    return { success: false, simulated: false, error: String(error) };
  }
}

// Import biometric punch logs from Google Sheets
export async function importBiometricFromGoogleSheets() {
  const client = getSheetsClient();
  if (!client) {
    console.warn("[Google Sheets] Simulation mode active. Mocking biometric import.");
    // Simulate importing mock data
    return {
      success: true,
      simulated: true,
      importedCount: 6,
      duplicateCount: 2,
      nonAntboxCount: 0,
      invalidCount: 0,
    };
  }

  const { sheets, spreadsheetId } = client;
  const sheetName = "Biometric Import";

  try {
    await ensureWorksheetExists(sheets, spreadsheetId, sheetName);

    // Try reading rows
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:C`,
    });

    const rows = response.data.values || [];
    if (rows.length === 0) {
      // If blank, write default headers for user convenience
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [["employeeId", "punchedAt", "punchType"]],
        },
      });
      return {
        success: true,
        simulated: false,
        importedCount: 0,
        duplicateCount: 0,
        nonAntboxCount: 0,
        invalidCount: 0,
      };
    }

    const headers = rows[0].map((h) => String(h).trim().toLowerCase());
    const dataRows = rows.slice(1);

    // Fetch all AntBox deployed employees
    const antboxEmployees = await prisma.employee.findMany({
      where: { deployedCompany: "AntBox" },
      select: { id: true, employeeId: true },
    });
    const employeeMap = new Map(antboxEmployees.map((e) => [e.employeeId.toLowerCase().trim(), e.id]));

    let importedCount = 0;
    let duplicateCount = 0;
    let nonAntboxCount = 0;
    let invalidCount = 0;

    const groups: Record<
      string,
      { employeeDbId: string; workDate: Date; punches: { punchedAt: Date; punchType: string }[] }
    > = {};

    const empIdx = headers.indexOf("employeeid");
    const dateIdx = headers.indexOf("punchedat");
    const typeIdx = headers.indexOf("punchtype");

    if (empIdx === -1 || dateIdx === -1 || typeIdx === -1) {
      throw new Error(`Invalid headers on Biometric Import tab. Expected columns: employeeId, punchedAt, punchType`);
    }

    for (const row of dataRows) {
      const empId = (row[empIdx] || "").toString().trim();
      const dateStr = (row[dateIdx] || "").toString().trim();
      const typeStr = (row[typeIdx] || "").toString().trim();

      if (!empId || !dateStr || !typeStr) {
        invalidCount++;
        continue;
      }

      const parsedDate = new Date(dateStr);
      if (isNaN(parsedDate.getTime())) {
        invalidCount++;
        continue;
      }

      const upperType = typeStr.toUpperCase();
      if (upperType !== "IN" && upperType !== "OUT") {
        invalidCount++;
        continue;
      }

      const employeeDbId = employeeMap.get(empId.toLowerCase().trim());
      if (!employeeDbId) {
        nonAntboxCount++;
        continue;
      }

      const workDate = getKolkataWorkDateLocal(parsedDate);
      const groupKey = `${employeeDbId}_${workDate.getTime()}`;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          employeeDbId,
          workDate,
          punches: [],
        };
      }

      groups[groupKey].punches.push({
        punchedAt: parsedDate,
        punchType: upperType,
      });
    }

    // Process groups
    for (const groupKey in groups) {
      const { employeeDbId, workDate, punches } = groups[groupKey];

      await prisma.$transaction(async (tx) => {
        const record = await tx.attendanceRecord.upsert({
          where: {
            employeeId_workDate: {
              employeeId: employeeDbId,
              workDate,
            },
          },
          create: {
            employeeId: employeeDbId,
            workDate,
            status: "PRESENT",
          },
          update: {},
        });

        const existingPunches = await tx.attendancePunch.findMany({
          where: {
            attendanceId: record.id,
          },
        });

        const newPunchesToCreate = [];
        for (const p of punches) {
          const exists = existingPunches.some((ep) => ep.punchedAt.getTime() === p.punchedAt.getTime());
          if (exists) {
            duplicateCount++;
          } else {
            newPunchesToCreate.push(p);
          }
        }

        if (newPunchesToCreate.length > 0) {
          await tx.attendancePunch.createMany({
            data: newPunchesToCreate.map((p) => ({
              attendanceId: record.id,
              employeeId: employeeDbId,
              punchType: p.punchType as PunchType,
              punchedAt: p.punchedAt,
              device: "Google Sheets Import",
            })),
          });
          importedCount += newPunchesToCreate.length;
        }

        const allPunches = await tx.attendancePunch.findMany({
          where: { attendanceId: record.id },
          orderBy: { punchedAt: "asc" },
        });

        if (allPunches.length > 0) {
          const totalHours = sumWorkedHoursLocal(allPunches);
          const firstIn = allPunches.find((item) => item.punchType === "IN");
          const lastOut = [...allPunches].reverse().find((item) => item.punchType === "OUT");
          const isIncomplete = allPunches.at(-1)?.punchType === "IN";

          await tx.attendanceRecord.update({
            where: { id: record.id },
            data: {
              checkIn: firstIn?.punchedAt ?? null,
              checkOut: isIncomplete ? null : lastOut?.punchedAt ?? null,
              totalHours,
              status: isIncomplete ? "INCOMPLETE" : "PRESENT",
            },
          });
        }
      });
    }

    return {
      success: true,
      simulated: false,
      importedCount,
      duplicateCount,
      nonAntboxCount,
      invalidCount,
    };
  } catch (error) {
    console.error("[Google Sheets] Import biometric failed:", error);
    return {
      success: false,
      simulated: false,
      error: String(error),
      importedCount: 0,
      duplicateCount: 0,
      nonAntboxCount: 0,
      invalidCount: 0,
    };
  }
}

