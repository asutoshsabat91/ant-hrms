/**
 * AntBox HRMS — Google Apps Script Setup
 * Registers all sheets, seeds default data, and configures triggers.
 * Run onSetup() once after deploying to a new Google Spreadsheet.
 */

var SHEETS = [
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
  "Notifications",
  "POSHReports",
  "Separations",
  "Procurements",
  "OnboardingTasks",
  "OffboardingTasks",
  "PerformanceGoals",
  "AuditLog",
];

var LEAVE_TYPES = [
  { name: "Sick Leave", code: "SL", daysPerYear: 7, carryoverLimit: 0, isPaid: true },
  { name: "Privilege Leave", code: "PL", daysPerYear: 21, carryoverLimit: 15, isPaid: true },
  { name: "Loss of Pay", code: "LOP", daysPerYear: 0, carryoverLimit: 0, isPaid: false },
  { name: "Paternity Leave", code: "PTL", daysPerYear: 15, carryoverLimit: 0, isPaid: true },
  { name: "Work From Home", code: "WFH", daysPerYear: 0, carryoverLimit: 0, isPaid: true },
];

var INDIAN_HOLIDAYS_2025 = [
  { name: "Republic Day", date: "2025-01-26" },
  { name: "Holi", date: "2025-03-14" },
  { name: "Good Friday", date: "2025-04-18" },
  { name: "Eid ul-Fitr", date: "2025-03-30" },
  { name: "Ambedkar Jayanti", date: "2025-04-14" },
  { name: "Independence Day", date: "2025-08-15" },
  { name: "Gandhi Jayanti", date: "2025-10-02" },
  { name: "Dussehra", date: "2025-10-02" },
  { name: "Diwali", date: "2025-10-20" },
  { name: "Christmas", date: "2025-12-25" },
];

function onSetup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Create missing sheets
  SHEETS.forEach(function (name) {
    if (!ss.getSheetByName(name)) {
      ss.insertSheet(name);
      Logger.log("Created sheet: " + name);
    }
  });

  _setupEmployeesSheet(ss);
  _setupLeaveTypesSheet(ss);
  _setupHolidaysSheet(ss);
  _setupReimbursementsSheet(ss);
  _setupPOSHSheet(ss);
  _setupSeparationsSheet(ss);

  // Delete trigger if already exists, then re-create
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "onDailySeparationCheck") {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger("onDailySeparationCheck")
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();

  Logger.log("Setup complete.");
}

function _setupEmployeesSheet(ss) {
  var sheet = ss.getSheetByName("Employees");
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "ID", "Employee ID", "First Name", "Last Name", "Email", "Personal Email",
      "Phone", "Gender", "DOB", "Department", "Designation", "Employment Type",
      "Status", "Joining Date", "Last Working Date", "Manager ID",
      "Bank Name", "Account No", "IFSC", "PAN", "Created At",
    ]);
    sheet.getRange(1, 1, 1, sheet.getLastColumn()).setFontWeight("bold").setBackground("#1a1a2e").setFontColor("white");
  }
}

function _setupLeaveTypesSheet(ss) {
  var sheet = ss.getSheetByName("LeaveTypes");
  sheet.clearContents();
  sheet.appendRow(["ID", "Name", "Code", "Days Per Year", "Carryover Limit", "Is Paid"]);
  sheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#1a1a2e").setFontColor("white");
  LEAVE_TYPES.forEach(function (lt) {
    sheet.appendRow([
      Utilities.getUuid(), lt.name, lt.code, lt.daysPerYear, lt.carryoverLimit, lt.isPaid,
    ]);
  });
}

function _setupHolidaysSheet(ss) {
  var sheet = ss.getSheetByName("Holidays");
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["ID", "Name", "Date", "Type"]);
    sheet.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#1a1a2e").setFontColor("white");
    INDIAN_HOLIDAYS_2025.forEach(function (h) {
      sheet.appendRow([Utilities.getUuid(), h.name, h.date, "NATIONAL"]);
    });
  }
}

function _setupOnboardingSheet(ss) {
  var sheet = ss.getSheetByName("Onboarding") || ss.insertSheet("Onboarding");
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Employee ID","Name","Email","Department","Designation","Employment Type",
      "Joining Date","Milestone 1: Docs","Milestone 2: Banking","Milestone 3: ID Form",
      "Status","Profile Photo URL"
    ]);
    sheet.getRange(1,1,1,12).setFontWeight("bold").setBackground("#1a1a2e").setFontColor("white");
  }
}

function _setupReimbursementsSheet(ss) {
  var sheet = ss.getSheetByName("Reimbursements");
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "ID", "Employee ID", "Type", "Title", "Category", "Amount", "Currency",
      "Date", "Description", "Receipt URL", "Status", "Approved By", "Approved At", "Paid At",
      "Rejection Reason", "Created At",
    ]);
    sheet.getRange(1, 1, 1, sheet.getLastColumn()).setFontWeight("bold").setBackground("#1a1a2e").setFontColor("white");
  }
  // Separate procurement tab
  var procSheet = ss.getSheetByName("Procurements");
  if (procSheet && procSheet.getLastRow() === 0) {
    procSheet.appendRow([
      "ID", "Employee ID", "Title", "Category", "Amount", "Description",
      "Status", "Approved By", "Approved At", "Receipt URL", "Paid At", "Created At",
    ]);
    procSheet.getRange(1, 1, 1, procSheet.getLastColumn()).setFontWeight("bold").setBackground("#1a1a2e").setFontColor("white");
  }
}

function _setupPOSHSheet(ss) {
  var sheet = ss.getSheetByName("POSHReports");
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["ID", "Employee ID", "Subject", "Description", "Created At"]);
    sheet.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground("#6b21a8").setFontColor("white");
    // Lock this sheet — only admins can view
    var protection = sheet.protect().setDescription("POSH reports — admin only");
    protection.setWarningOnly(false);
  }
}

function _setupSeparationsSheet(ss) {
  var sheet = ss.getSheetByName("Separations");
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "ID", "Employee ID", "Status", "Reason", "Notice Days",
      "Initiated At", "Approved At", "Last Working Date", "Rejection Reason",
    ]);
    sheet.getRange(1, 1, 1, sheet.getLastColumn()).setFontWeight("bold").setBackground("#1a1a2e").setFontColor("white");
  }
}
