/**
 * AntBox HRMS — Google Apps Script Setup
 * Run onSetup() ONCE after deploying to a new Google Spreadsheet.
 *
 * BEFORE RUNNING:
 *   1. Open Apps Script → Project Settings → Script Properties → Add:
 *      - HRMS_BASE_URL  : your deployed Next.js URL (e.g. https://hrms.theantbox.com)
 *      - HRMS_API_TOKEN : your API bearer token (set in Next.js env as GAS_SECRET)
 *      - HR_EMAIL       : hr@theantbox.com  (receives daily separation summary)
 *   2. Run onSetup() from the Apps Script editor.
 *   3. Deploy as Web App: Execute as Me, Access: Anyone with Google Account.
 */

var SHEETS_TO_CREATE = [
  "Employees",
  "Departments",
  "Attendance",
  "AttendancePunches",
  "LeaveTypes",
  "LeaveRequests",
  "LeaveBalances",
  "Holidays",
  "Payroll",
  "PayrollLines",
  "Documents",
  "Reimbursements",
  "Procurements",
  "Notifications",
  "POSHReports",
  "Separations",
  "Onboarding",
  "OnboardingTasks",
  "OffboardingTasks",
  "AuditLog",
];

// ── Leave types (no Paternity Leave per company policy) ─────────────────────
var LEAVE_TYPES = [
  { name: "Sick Leave",      code: "SL",  daysPerYear: 7,  carryoverLimit: 0,  isPaid: true  },
  { name: "Privilege Leave", code: "PL",  daysPerYear: 21, carryoverLimit: 15, isPaid: true  },
  { name: "Loss of Pay",     code: "LOP", daysPerYear: 0,  carryoverLimit: 0,  isPaid: false },
  { name: "Work From Home",  code: "WFH", daysPerYear: 0,  carryoverLimit: 0,  isPaid: true  },
];

var INDIAN_HOLIDAYS_2025 = [
  { name: "Republic Day",        date: "2025-01-26" },
  { name: "Holi",                date: "2025-03-14" },
  { name: "Good Friday",         date: "2025-04-18" },
  { name: "Eid ul-Fitr",         date: "2025-03-30" },
  { name: "Ambedkar Jayanti",    date: "2025-04-14" },
  { name: "Independence Day",    date: "2025-08-15" },
  { name: "Gandhi Jayanti",      date: "2025-10-02" },
  { name: "Dussehra",            date: "2025-10-02" },
  { name: "Diwali",              date: "2025-10-20" },
  { name: "Christmas",           date: "2025-12-25" },
];

// ── Employee sheet columns (must match syncEmployees in sync.gs) ─────────────
var EMPLOYEE_HEADERS = [
  "Employee ID", "First Name", "Last Name", "Full Name",
  "Company Email", "Personal Email", "Phone (+91)", "Gender", "Date of Birth",
  "Blood Group", "Current Address", "City", "State", "Pincode",
  "Emergency Contact", "Emergency Phone",
  "Department", "Designation", "Employment Type", "Status",
  "Joining Date", "Last Working Date",
  "Annual CTC (₹)", "Basic Salary/mo (50%)", "HRA/mo (20%)", "Special Allowance/mo (30%)", "Monthly Gross (₹)",
  "Variable Pay (Annual ₹)",
  "Bank Name", "Account No", "IFSC", "PAN", "UAN",
  "Profile Photo",
];

// ── Main setup ───────────────────────────────────────────────────────────────

function onSetup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Create all sheets
  SHEETS_TO_CREATE.forEach(function(name) {
    if (!ss.getSheetByName(name)) {
      ss.insertSheet(name);
      Logger.log("Created sheet: " + name);
    }
  });

  // 2. Setup individual sheets
  _setupEmployeesSheet(ss);
  _setupLeaveTypesSheet(ss);
  _setupHolidaysSheet(ss);
  _setupDocumentsSheet(ss);
  _setupReimbursementsSheet(ss);
  _setupPOSHSheet(ss);
  _setupSeparationsSheet(ss);
  _setupOnboardingSheet(ss);

  // 3. Register daily trigger (idempotent — removes old before creating)
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === "onDailySeparationCheck" ||
        t.getHandlerFunction() === "sendDailySeparationSummary") {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger("onDailySeparationCheck")
    .timeBased().everyDays(1).atHour(9).create();
  ScriptApp.newTrigger("sendDailySeparationSummary")
    .timeBased().everyDays(1).atHour(9).create();

  Logger.log("✅ AntBox HRMS setup complete. Sheets created and triggers registered.");
  SpreadsheetApp.getUi().alert("Setup complete! All sheets created and daily triggers registered.");
}

// ── Sheet setup helpers ──────────────────────────────────────────────────────

function _header(sheet, headers, color) {
  var bg = color || "#09090b";
  sheet.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight("bold")
    .setBackground(bg)
    .setFontColor("white");
}

function _setupEmployeesSheet(ss) {
  var sheet = ss.getSheetByName("Employees");
  sheet.clearContents();
  _header(sheet, EMPLOYEE_HEADERS);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, EMPLOYEE_HEADERS.length);
}

function _setupLeaveTypesSheet(ss) {
  var sheet = ss.getSheetByName("LeaveTypes");
  sheet.clearContents();
  _header(sheet, ["ID", "Name", "Code", "Days Per Year", "Carryover Limit", "Is Paid"]);
  LEAVE_TYPES.forEach(function(lt) {
    sheet.appendRow([Utilities.getUuid(), lt.name, lt.code, lt.daysPerYear, lt.carryoverLimit, lt.isPaid]);
  });
  sheet.autoResizeColumns(1, 6);
}

function _setupHolidaysSheet(ss) {
  var sheet = ss.getSheetByName("Holidays");
  if (sheet.getLastRow() > 0) return; // don't overwrite if already populated
  _header(sheet, ["ID", "Name", "Date", "Type"]);
  INDIAN_HOLIDAYS_2025.forEach(function(h) {
    sheet.appendRow([Utilities.getUuid(), h.name, h.date, "NATIONAL"]);
  });
  sheet.autoResizeColumns(1, 4);
}

function _setupDocumentsSheet(ss) {
  var sheet = ss.getSheetByName("Documents");
  if (sheet.getLastRow() > 0) return;
  _header(sheet, ["ID", "Employee ID", "Type", "Title", "File URL", "Issued Date", "Issued By", "Created At"]);
}

function _setupReimbursementsSheet(ss) {
  var rSheet = ss.getSheetByName("Reimbursements");
  var pSheet = ss.getSheetByName("Procurements");
  var rH = ["ID","Employee ID","Type","Title","Category","Amount (₹)","Currency","Date","Description","Receipt URL","Status","Approved By","Approved At","Paid At","Rejection Reason","Created At"];
  var pH = ["ID","Employee ID","Title","Category","Amount (₹)","Description","Status","Approved By","Approved At","Receipt URL","Paid At","Created At"];
  if (rSheet.getLastRow() === 0) { _header(rSheet, rH); }
  if (pSheet && pSheet.getLastRow() === 0) { _header(pSheet, pH); }
}

function _setupPOSHSheet(ss) {
  var sheet = ss.getSheetByName("POSHReports");
  if (sheet.getLastRow() > 0) return;
  _header(sheet, ["ID", "Employee ID", "Subject", "Description", "Created At"], "#6b21a8");
  var protection = sheet.protect().setDescription("POSH reports — HR Admin only");
  protection.setWarningOnly(true);
}

function _setupSeparationsSheet(ss) {
  var sheet = ss.getSheetByName("Separations");
  if (sheet.getLastRow() > 0) return;
  _header(sheet, ["ID","Employee ID","Status","Reason","Notice Days","Initiated At","Approved At","Last Working Date","Rejection Reason"]);
}

function _setupOnboardingSheet(ss) {
  var sheet = ss.getSheetByName("Onboarding");
  if (sheet.getLastRow() > 0) return;
  _header(sheet, [
    "Employee ID","Name","Email","Department","Designation","Employment Type",
    "Joining Date","Milestone 1: Docs","Milestone 2: Banking","Milestone 3: ID Form",
    "Completed Tasks","Status","Profile Photo"
  ], "#4c1d95");
}
