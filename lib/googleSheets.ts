import { google, sheets_v4 } from "googleapis";
import type { EmployeeStatus, EmploymentType, PunchType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
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
    // 0. Pull Departments tab if present
    try {
      const deptRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Departments!A:C",
      });
      const deptRows = deptRes.data.values || [];
      if (deptRows.length > 1) {
        for (let i = 1; i < deptRows.length; i++) {
          const code = (deptRows[i][0] || "").toString().trim().toUpperCase();
          const name = (deptRows[i][1] || "").toString().trim();
          if (code && name) {
            await prisma.department.upsert({
              where: { code },
              update: { name },
              create: { code, name },
            });
          }
        }
      }
    } catch {
      // Departments sheet optional
    }

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
      const cleanNumber = (val: string): number | undefined => {
        if (!val || val === "—") return undefined;
        const cleaned = val.replace(/[^0-9.-]/g, "");
        if (!cleaned) return undefined;
        const num = parseFloat(cleaned);
        return Number.isNaN(num) ? undefined : num;
      };

      const parseSheetDate = (val: string): Date | undefined => {
        if (!val || val === "—") return undefined;
        const parsed = new Date(val);
        return Number.isNaN(parsed.getTime()) ? undefined : parsed;
      };

      const getColVal = (row: string[], possibleHeaders: string[]) => {
        for (const ph of possibleHeaders) {
          const idx = headers.indexOf(ph.toLowerCase());
          if (idx !== -1 && row[idx] !== undefined) return String(row[idx]).trim();
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

        const firstName = getColVal(row, ["First Name", "firstname", "name"]);
        const lastName = getColVal(row, ["Last Name", "lastname"]);
        const designation = getColVal(row, ["Designation"]);
        const jobRole = getColVal(row, ["Job Role", "jobrole", "job role", "role"]);
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
        const basicVal = getColVal(row, ["Basic Salary", "basicsalary", "basic"]);
        const hraVal = getColVal(row, ["HRA", "hra"]);
        const specialVal = getColVal(row, ["Special Allowance", "specialallowance", "special"]);
        const pfVal = getColVal(row, ["PF", "pf"]);
        const ptVal = getColVal(row, ["Professional Tax", "professionaltax", "pt"]);

        const city = getColVal(row, ["City", "city"]);
        const state = getColVal(row, ["State", "state"]);
        const pincode = getColVal(row, ["Pincode", "pincode"]);

        const joiningDateStr = getColVal(row, ["Joining Date", "joiningdate"]);
        const dobStr = getColVal(row, ["Date of Birth", "dob", "dateofbirth"]);

        const statusStr = getColVal(row, ["Status", "status"]).toUpperCase();
        const empTypeStr = getColVal(row, ["Employment Type", "employmenttype", "type"]).toUpperCase().replace(" ", "_");

        const deptCode = getColVal(row, ["Department Code", "departmentcode", "department"]);
        let departmentId: string | undefined = undefined;
        if (deptCode) {
          const matchedDept = await prisma.department.findFirst({
            where: {
              OR: [
                { code: deptCode.toUpperCase() },
                { name: { equals: deptCode, mode: "insensitive" } }
              ]
            }
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

        const sheetPassword = getColVal(row, ["Password", "Password (Bcrypt Hash)", "password"]);
        let newPasswordHash: string | undefined = undefined;
        if (sheetPassword && !sheetPassword.startsWith("$2a$") && !sheetPassword.startsWith("$2b$") && !sheetPassword.startsWith("$2y$")) {
          newPasswordHash = await bcrypt.hash(sheetPassword, 12);
        }

        if (existingEmp) {
          // Perform safe, non-destructive update
          const updatePayload: Prisma.EmployeeUpdateInput = {};

          if (firstName && firstName !== "—") updatePayload.firstName = firstName;
          if (lastName && lastName !== "—") updatePayload.lastName = lastName;
          if (jobRole && jobRole !== "—") {
            updatePayload.jobRole = jobRole;
            updatePayload.designation = jobRole;
          } else if (designation && designation !== "—") {
            updatePayload.jobRole = designation;
            updatePayload.designation = designation;
          }
          if (deployedCompany && deployedCompany !== "—") updatePayload.deployedCompany = deployedCompany;
          if (personalEmail && personalEmail !== "—") updatePayload.personalEmail = personalEmail;
          if (phone && phone !== "—") updatePayload.phone = phone;
          if (gender && gender !== "—") updatePayload.gender = gender;
          if (bloodGroup && bloodGroup !== "—") updatePayload.bloodGroup = bloodGroup;
          if (address && address !== "—") updatePayload.permanentAddress = address;
          if (city && city !== "—") updatePayload.city = city;
          if (state && state !== "—") updatePayload.state = state;
          if (pincode && pincode !== "—") updatePayload.pincode = pincode;
          if (emergencyContact && emergencyContact !== "—") updatePayload.emergencyContact = emergencyContact;
          if (emergencyPhone && emergencyPhone !== "—") updatePayload.emergencyPhone = emergencyPhone;
          if (bankName && bankName !== "—") updatePayload.bankName = bankName;
          if (bankAccountNo && bankAccountNo !== "—") updatePayload.bankAccountNo = bankAccountNo;
          if (ifscCode && ifscCode !== "—") updatePayload.ifscCode = ifscCode;
          if (pan && pan !== "—") updatePayload.pan = pan;
          if (uan && uan !== "—") updatePayload.uan = uan;

          const parsedCtc = cleanNumber(ctcVal);
          if (parsedCtc !== undefined) updatePayload.ctc = parsedCtc;

          const parsedBasic = cleanNumber(basicVal);
          if (parsedBasic !== undefined) updatePayload.basicSalary = parsedBasic;

          const parsedHra = cleanNumber(hraVal);
          if (parsedHra !== undefined) updatePayload.hra = parsedHra;

          const parsedSpecial = cleanNumber(specialVal);
          if (parsedSpecial !== undefined) updatePayload.specialAllowance = parsedSpecial;

          const parsedPf = cleanNumber(pfVal);
          if (parsedPf !== undefined) updatePayload.pf = parsedPf;

          const parsedPt = cleanNumber(ptVal);
          if (parsedPt !== undefined) updatePayload.professionalTax = parsedPt;

          const parsedJoining = parseSheetDate(joiningDateStr);
          if (parsedJoining) updatePayload.joiningDate = parsedJoining;

          const parsedDob = parseSheetDate(dobStr);
          if (parsedDob) updatePayload.dateOfBirth = parsedDob;

          if (statusStr && ["ACTIVE", "ONBOARDING", "OFFBOARDING", "INACTIVE", "ALUMNI"].includes(statusStr)) {
            updatePayload.status = statusStr as EmployeeStatus;
          }

          if (empTypeStr && ["FULL_TIME", "PART_TIME", "INTERN", "CONTRACT"].includes(empTypeStr)) {
            updatePayload.employmentType = empTypeStr as EmploymentType;
          }

          if (departmentId) {
            updatePayload.department = { connect: { id: departmentId } };
          }

          await prisma.employee.update({
            where: { id: existingEmp.id },
            data: updatePayload
          });

          const isActive = statusStr ? (statusStr !== "INACTIVE" && statusStr !== "ALUMNI") : existingEmp.user.isActive;
          await prisma.user.update({
            where: { id: existingEmp.userId },
            data: {
              isActive,
              ...(newPasswordHash ? { passwordHash: newPasswordHash } : {})
            }
          });

          updatedCount++;
        } else {
          // New employee creation
          const fn = firstName || "New";
          const ln = lastName || "Employee";
          const des = designation || "Associate";
          const deptId = departmentId || defaultDept.id;
          const statusVal: EmployeeStatus = ["ACTIVE", "ONBOARDING", "OFFBOARDING", "INACTIVE", "ALUMNI"].includes(statusStr) ? (statusStr as EmployeeStatus) : "ACTIVE";
          const empTypeVal: EmploymentType = ["FULL_TIME", "PART_TIME", "INTERN", "CONTRACT"].includes(empTypeStr) ? (empTypeStr as EmploymentType) : "FULL_TIME";

          const baseEmail = email ? email.toLowerCase() : `${fn.toLowerCase()}.${ln.toLowerCase()}@theantbox.com`;
          let finalEmail = baseEmail;
          const userExists = await prisma.user.findUnique({ where: { email: finalEmail } });
          if (userExists) {
            const emailCount = await prisma.user.count({ where: { email: { startsWith: finalEmail.split("@")[0] } } });
            finalEmail = `${finalEmail.split("@")[0]}${emailCount + 1}@theantbox.com`;
          }

          let finalEmpId = empId;
          if (!finalEmpId || finalEmpId === "—") {
            const empTotal = await prisma.employee.count();
            finalEmpId = String(empTotal + 1).padStart(2, "0");
          }

          const tempPassword = sheetPassword || "AntBox@2025";
          const passwordHash = newPasswordHash || await bcrypt.hash(tempPassword, 12);

          await prisma.user.create({
            data: {
              email: finalEmail,
              passwordHash,
              role: "EMPLOYEE",
              isActive: statusVal !== "INACTIVE" && statusVal !== "ALUMNI",
              employee: {
                create: {
                  firstName: fn,
                  lastName: ln,
                  designation: des,
                  jobRole: jobRole || undefined,
                  email: finalEmail,
                  employeeId: finalEmpId,
                  deployedCompany: deployedCompany || undefined,
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
                  joiningDate: parseSheetDate(joiningDateStr) || new Date(),
                  dateOfBirth: parseSheetDate(dobStr),
                  status: statusVal,
                  employmentType: empTypeVal,
                  departmentId: deptId,
                  ctc: cleanNumber(ctcVal) ?? 0,
                  basicSalary: cleanNumber(basicVal) ?? 0,
                  hra: cleanNumber(hraVal) ?? 0,
                  specialAllowance: cleanNumber(specialVal) ?? 0,
                  pf: cleanNumber(pfVal) ?? 0,
                  professionalTax: cleanNumber(ptVal) ?? 200,
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
    await ensureWorksheetExists(sheets, spreadsheetId, "Departments");
    await ensureWorksheetExists(sheets, spreadsheetId, "Clients");
    await ensureWorksheetExists(sheets, spreadsheetId, "Leave Requests");
    await ensureWorksheetExists(sheets, spreadsheetId, "Reimbursements");
    await ensureWorksheetExists(sheets, spreadsheetId, "Separations");

    // 1. Employees Tab Data
    const employeeRows: unknown[][] = [
      [
        "Employee ID", "First Name", "Last Name", "Official Email", "Personal Email", "Phone",
        "Date of Birth", "Gender", "Blood Group", "Permanent Address", "City", "State", "Pincode",
        "Emergency Contact Name", "Emergency Contact Phone", "Job Role", "Department", "Deployed Company",
        "Employment Type", "Status", "Joining Date", "CTC", "Basic Salary", "HRA",
        "Special Allowance", "PF", "Professional Tax", "Bank Name", "Bank Account Number",
        "IFSC Code", "PAN", "UAN", "Password (Bcrypt Hash)"
      ]
    ];

    const users = await prisma.user.findMany({ select: { email: true, passwordHash: true } });
    const userPasswordMap = new Map(users.map(u => [u.email.toLowerCase(), u.passwordHash]));

    const clientHeadcountMap = new Map<string, number>();

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
      const clientName = emp.deployedCompany || "AntBox";
      const jobRole = emp.jobRole || emp.designation;

      clientHeadcountMap.set(clientName, (clientHeadcountMap.get(clientName) || 0) + 1);

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
        jobRole,
        emp.department?.name ?? "—",
        clientName,
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

    // 1b. Departments Tab Data
    const allDepartments = await prisma.department.findMany({
      include: { _count: { select: { employees: true } } },
      orderBy: { name: "asc" }
    });
    const departmentRows: unknown[][] = [
      ["Department Code", "Department Name", "Active Headcount"]
    ];
    allDepartments.forEach((dept) => {
      departmentRows.push([
        dept.code,
        dept.name,
        dept._count.employees
      ]);
    });

    // 1c. Clients Tab Data
    const clientRows: unknown[][] = [
      ["Client / Deployed Company", "Active Headcount"]
    ];
    Array.from(clientHeadcountMap.entries()).forEach(([clientName, count]) => {
      clientRows.push([clientName, count]);
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

    // Departments
    await sheets.spreadsheets.values.clear({ spreadsheetId, range: "Departments!A:Z" });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Departments!A1",
      valueInputOption: "RAW",
      requestBody: { values: departmentRows }
    });

    // Clients
    await sheets.spreadsheets.values.clear({ spreadsheetId, range: "Clients!A:Z" });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Clients!A1",
      valueInputOption: "RAW",
      requestBody: { values: clientRows }
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

