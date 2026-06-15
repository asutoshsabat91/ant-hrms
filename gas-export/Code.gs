/**
 * AntBox HRMS — Google Apps Script (Single File)
 * Version: 3.0
 *
 * ════════════════════════════════════════════════════════════
 *  DEPLOYMENT STEPS
 * ════════════════════════════════════════════════════════════
 *  1. Open your Google Spreadsheet
 *     → Extensions → Apps Script
 *     → Paste this entire file into Code.gs (replace default content)
 *     → Also paste index.html into a new HTML file named "index"
 *
 *  2. Set Script Properties
 *     → Project Settings → Script Properties → Add property:
 *        HRMS_BASE_URL  : https://your-deployed-domain.com   (no trailing slash)
 *        HRMS_API_TOKEN : your API bearer token
 *        HR_EMAIL       : hr@theantbox.com
 *
 *  3. Run onSetup() once from the editor (creates all sheets + daily triggers)
 *
 *  4. Deploy as Web App
 *     → Deploy → New Deployment → Web App
 *        Execute as : Me
 *        Who has access : Anyone with Google Account
 *     → Copy the Web App URL and share with the team
 * ════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

var BASE_URL  = PropertiesService.getScriptProperties().getProperty("HRMS_BASE_URL")  || "";
var API_TOKEN = PropertiesService.getScriptProperties().getProperty("HRMS_API_TOKEN") || "";

var SHEETS_TO_CREATE = [
  "Employees", "Departments",
  "Attendance", "AttendancePunches",
  "LeaveTypes", "LeaveRequests", "LeaveBalances",
  "Holidays",
  "Payroll", "PayrollLines",
  "Documents",
  "Reimbursements", "Procurements",
  "Notifications",
  "POSHReports",
  "Separations",
  "Onboarding", "OnboardingTasks", "OffboardingTasks",
  "AuditLog",
];

// Leave types — no Paternity Leave per company policy
var LEAVE_TYPES = [
  { name: "Sick Leave",      code: "SL",  daysPerYear: 7,  carryoverLimit: 0,  isPaid: true  },
  { name: "Privilege Leave", code: "PL",  daysPerYear: 21, carryoverLimit: 15, isPaid: true  },
  { name: "Loss of Pay",     code: "LOP", daysPerYear: 0,  carryoverLimit: 0,  isPaid: false },
  { name: "Work From Home",  code: "WFH", daysPerYear: 0,  carryoverLimit: 0,  isPaid: true  },
];

var INDIAN_HOLIDAYS_2025 = [
  { name: "Republic Day",     date: "2025-01-26" },
  { name: "Holi",             date: "2025-03-14" },
  { name: "Good Friday",      date: "2025-04-18" },
  { name: "Eid ul-Fitr",      date: "2025-03-30" },
  { name: "Ambedkar Jayanti", date: "2025-04-14" },
  { name: "Independence Day", date: "2025-08-15" },
  { name: "Gandhi Jayanti",   date: "2025-10-02" },
  { name: "Dussehra",         date: "2025-10-02" },
  { name: "Diwali",           date: "2025-10-20" },
  { name: "Christmas",        date: "2025-12-25" },
];

// Employee sheet column headers — matches the DB schema exactly
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


// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — WEB APP ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════

function doGet() {
  return HtmlService.createHtmlOutputFromFile("index")
    .setTitle("AntBox HRMS — Sync Dashboard")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Dispatcher called from index.html client-side JS */
function gasRunSync(module) {
  switch (module) {
    case "all":            return syncAll();
    case "employees":      return syncEmployees();
    case "onboarding":     return syncOnboarding();
    case "attendance":     return syncAttendance();
    case "leave":          return syncLeave();
    case "reimbursements": return syncReimbursements();
    case "separations":    return syncSeparations();
    case "documents":      return syncDocuments();
    default: throw new Error("Unknown module: " + module);
  }
}

/** Returns employee rows for the preview table in index.html */
function gasGetEmployeeRows() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Employees");
  if (!sheet || sheet.getLastRow() < 2) return [];
  var numCols = Math.min(34, sheet.getLastColumn());
  var data    = sheet.getRange(2, 1, sheet.getLastRow() - 1, numCols).getValues();
  // [employeeId, fullName, email, department, designation, type, status, joiningDate]
  return data.map(function(r) { return [r[0], r[3], r[4], r[16], r[17], r[18], r[19], r[20]]; });
}

/** Returns onboarding milestone summary for index.html stats */
function gasGetOnboardingStats() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Onboarding");
  if (!sheet || sheet.getLastRow() < 2) return { total: 0, complete: 0, rows: [] };
  var data     = sheet.getRange(2, 1, sheet.getLastRow() - 1, 13).getValues();
  var complete = data.filter(function(r) { return r[10] === "3/3"; }).length;
  return {
    total: data.length,
    complete: complete,
    rows: data.map(function(r) {
      return [r[0], r[1], r[3], r[6], r[7], r[8], r[9], r[10]];
    }),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — SPREADSHEET MENU
// ═══════════════════════════════════════════════════════════════════════════════

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("AntBox HRMS")
    .addItem("⚡ Full Sync",                 "syncAll")
    .addSeparator()
    .addItem("👥 Sync Employees",            "syncEmployees")
    .addItem("🎯 Sync Onboarding",           "syncOnboarding")
    .addItem("🕐 Sync Attendance",           "syncAttendance")
    .addItem("🏖️  Sync Leave",               "syncLeave")
    .addItem("💸 Sync Reimbursements",       "syncReimbursements")
    .addItem("🚪 Sync Separations",          "syncSeparations")
    .addItem("📄 Sync Documents",            "syncDocuments")
    .addSeparator()
    .addItem("⚙️  Run Setup",                "onSetup")
    .addItem("📧 Separation Summary Email",  "sendDailySeparationSummary")
    .addItem("🔔 Send Onboarding Reminders", "sendOnboardingReminders")
    .addItem("🌐 Open Web App",              "openWebApp")
    .addToUi();
}

function openWebApp() {
  var url = ScriptApp.getService().getUrl();
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput('<script>window.open("' + url + '","_blank");google.script.host.close();</script>'),
    "Opening Web App…"
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — SETUP
// ═══════════════════════════════════════════════════════════════════════════════

function onSetup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Create any missing sheets
  SHEETS_TO_CREATE.forEach(function(name) {
    if (!ss.getSheetByName(name)) {
      ss.insertSheet(name);
      Logger.log("Created sheet: " + name);
    }
  });

  _setupEmployeesSheet(ss);
  _setupLeaveTypesSheet(ss);
  _setupHolidaysSheet(ss);
  _setupDocumentsSheet(ss);
  _setupReimbursementsSheet(ss);
  _setupPOSHSheet(ss);
  _setupSeparationsSheet(ss);
  _setupOnboardingSheet(ss);

  // Idempotent triggers — remove old, re-create
  ScriptApp.getProjectTriggers().forEach(function(t) {
    var fn = t.getHandlerFunction();
    if (fn === "onDailySeparationCheck" || fn === "sendDailySeparationSummary") {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger("onDailySeparationCheck").timeBased().everyDays(1).atHour(9).create();
  ScriptApp.newTrigger("sendDailySeparationSummary").timeBased().everyDays(1).atHour(9).create();

  Logger.log("✅ Setup complete.");
  SpreadsheetApp.getUi().alert("✅ AntBox HRMS setup complete!\nAll sheets created and daily triggers registered.");
}

function _header(sheet, headers, bgColor) {
  sheet.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight("bold")
    .setBackground(bgColor || "#09090b")
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
  if (sheet.getLastRow() > 0) return;
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
  if (rSheet.getLastRow() === 0) _header(rSheet, ["ID","Employee ID","Type","Title","Category","Amount (₹)","Currency","Date","Description","Receipt URL","Status","Approved By","Approved At","Paid At","Rejection Reason","Created At"]);
  if (pSheet && pSheet.getLastRow() === 0) _header(pSheet, ["ID","Employee ID","Title","Category","Amount (₹)","Description","Status","Approved By","Approved At","Receipt URL","Paid At","Created At"]);
}

function _setupPOSHSheet(ss) {
  var sheet = ss.getSheetByName("POSHReports");
  if (sheet.getLastRow() > 0) return;
  _header(sheet, ["ID", "Employee ID", "Subject", "Description", "Created At"], "#6b21a8");
  sheet.protect().setDescription("POSH reports — HR Admin only").setWarningOnly(true);
}

function _setupSeparationsSheet(ss) {
  var sheet = ss.getSheetByName("Separations");
  if (sheet.getLastRow() > 0) return;
  _header(sheet, ["ID","Employee ID","Status","Reason","Notice Days","Initiated At","Approved At","Last Working Date","Rejection Reason"]);
}

function _setupOnboardingSheet(ss) {
  var sheet = ss.getSheetByName("Onboarding");
  if (sheet.getLastRow() > 0) return;
  _header(sheet, ["Employee ID","Name","Email","Department","Designation","Employment Type","Joining Date","Docs","Banking","ID Form","Progress","Status","Profile Photo"], "#4c1d95");
}


// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — SYNC FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function _apiFetch(path) {
  if (!BASE_URL) throw new Error("HRMS_BASE_URL not set in Script Properties.");
  var res = UrlFetchApp.fetch(BASE_URL + path, {
    method: "GET",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + API_TOKEN },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) {
    throw new Error("API " + res.getResponseCode() + ": " + res.getContentText().slice(0, 300));
  }
  return JSON.parse(res.getContentText());
}

function syncEmployees() {
  var data  = _apiFetch("/api/gas/employees");
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Employees") || ss.insertSheet("Employees");
  sheet.clearContents();
  sheet.appendRow(EMPLOYEE_HEADERS);
  _header(sheet, EMPLOYEE_HEADERS);

  var rows = (data.employees || []).map(function(e) {
    var monthly = (e.basicSalary || 0) + (e.hra || 0) + (e.specialAllowance || 0);
    return [
      e.employeeId,
      e.firstName, e.lastName, (e.firstName || "") + " " + (e.lastName || ""),
      e.email, e.personalEmail || "",
      e.phone || "", e.gender || "", e.dateOfBirth || "",
      e.bloodGroup || "",
      e.address || "", e.city || "", e.state || "", e.pincode || "",
      e.emergencyContact || "", e.emergencyPhone || "",
      e.department || "", e.designation || "", e.employmentType || "", e.status || "",
      e.joiningDate || "", e.lastWorkingDate || "",
      e.ctc || "", e.basicSalary || "", e.hra || "", e.specialAllowance || "", monthly || "",
      e.variablePay || "",
      e.bankName || "", e.bankAccountNo || "", e.ifscCode || "", e.pan || "", e.uan || "",
      e.profilePhoto ? "YES" : "NO",
    ];
  });

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, EMPLOYEE_HEADERS.length).setValues(rows);
    rows.forEach(function(row, i) {
      var cell = sheet.getRange(i + 2, 20);
      if      (row[19] === "ACTIVE")      cell.setBackground("#dcfce7").setFontColor("#16a34a");
      else if (row[19] === "ONBOARDING")  cell.setBackground("#e0f2fe").setFontColor("#0284c7");
      else if (row[19] === "OFFBOARDING") cell.setBackground("#fee2e2").setFontColor("#dc2626");
      else if (row[19] === "INACTIVE")    cell.setBackground("#f4f4f5").setFontColor("#71717a");
    });
  }
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, EMPLOYEE_HEADERS.length);
  var msg = "✅ Synced " + rows.length + " employees.";
  Logger.log(msg);
  return msg;
}

function syncOnboarding() {
  var data  = _apiFetch("/api/gas/employees");
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Onboarding") || ss.insertSheet("Onboarding");
  var headers = ["Employee ID","Name","Email","Department","Designation","Employment Type","Joining Date","Docs","Banking","ID Form","Progress","Status","Profile Photo"];
  sheet.clearContents();
  sheet.appendRow(headers);
  sheet.getRange(1,1,1,headers.length).setFontWeight("bold").setBackground("#4c1d95").setFontColor("white");

  var onboarding = (data.employees || []).filter(function(e) { return e.status === "ONBOARDING"; });
  var rows = onboarding.map(function(e) {
    var done = (e.milestone1 ? 1 : 0) + (e.milestone2 ? 1 : 0) + (e.milestone3 ? 1 : 0);
    return [
      e.employeeId,
      (e.firstName || "") + " " + (e.lastName || ""),
      e.email || "", e.department || "", e.designation || "", e.employmentType || "", e.joiningDate || "",
      e.milestone1 ? "✓" : "✗",
      e.milestone2 ? "✓" : "✗",
      e.milestone3 ? "✓" : "✗",
      done + "/3", "ONBOARDING",
      e.profilePhoto ? "YES" : "NO",
    ];
  });
  if (rows.length > 0) sheet.getRange(2,1,rows.length,headers.length).setValues(rows);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
  var msg = "✅ Synced " + rows.length + " onboarding employees.";
  Logger.log(msg);
  return msg;
}

function syncAttendance() {
  var data  = _apiFetch("/api/gas/attendance");
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Attendance") || ss.insertSheet("Attendance");
  var headers = ["Employee ID","Work Date","Check In","Check Out","Total Hours","Status","Notes"];
  sheet.clearContents();
  sheet.appendRow(headers);
  _header(sheet, headers);
  var rows = (data.records || []).map(function(r) {
    return [r.employeeId, r.workDate, r.checkIn || "", r.checkOut || "", r.totalHours || "", r.status, r.notes || ""];
  });
  if (rows.length > 0) sheet.getRange(2,1,rows.length,headers.length).setValues(rows);
  sheet.setFrozenRows(1);
  var msg = "✅ Synced " + rows.length + " attendance records.";
  Logger.log(msg);
  return msg;
}

function syncLeave() {
  var data = _apiFetch("/api/gas/leave");
  var ss   = SpreadsheetApp.getActiveSpreadsheet();

  var rSheet  = ss.getSheetByName("LeaveRequests") || ss.insertSheet("LeaveRequests");
  var rH = ["ID","Employee ID","Leave Type","Start Date","End Date","Days","Reason","Status","Approved At","Rejection Reason","Created At"];
  rSheet.clearContents(); rSheet.appendRow(rH); _header(rSheet, rH);
  var requests = (data.requests || []).map(function(r) {
    return [r.id, r.employeeId, r.leaveType, r.startDate, r.endDate, r.days, r.reason, r.status, r.approvedAt || "", r.rejectionReason || "", r.createdAt];
  });
  if (requests.length > 0) rSheet.getRange(2,1,requests.length,rH.length).setValues(requests);

  var bSheet = ss.getSheetByName("LeaveBalances") || ss.insertSheet("LeaveBalances");
  var bH = ["Employee ID","Leave Type","Year","Allocated","Used","Pending","Carryover","Remaining"];
  bSheet.clearContents(); bSheet.appendRow(bH); _header(bSheet, bH);
  var balances = (data.balances || []).map(function(b) {
    return [b.employeeId, b.leaveType, b.year, b.allocated, b.used, b.pending, b.carryover, b.allocated - b.used - b.pending + b.carryover];
  });
  if (balances.length > 0) bSheet.getRange(2,1,balances.length,bH.length).setValues(balances);

  var msg = "✅ Synced " + requests.length + " leave requests, " + balances.length + " balances.";
  Logger.log(msg);
  return msg;
}

function syncReimbursements() {
  var data   = _apiFetch("/api/reimbursements");
  var ss     = SpreadsheetApp.getActiveSpreadsheet();
  var rSheet = ss.getSheetByName("Reimbursements") || ss.insertSheet("Reimbursements");
  var pSheet = ss.getSheetByName("Procurements")   || ss.insertSheet("Procurements");
  var rH = ["ID","Employee ID","Type","Title","Category","Amount (₹)","Currency","Date","Description","Receipt URL","Status","Approved By","Approved At","Paid At","Rejection Reason","Created At"];
  var pH = ["ID","Employee ID","Title","Category","Amount (₹)","Description","Status","Approved By","Approved At","Receipt URL","Paid At","Created At"];
  rSheet.clearContents(); rSheet.appendRow(rH); _header(rSheet, rH);
  pSheet.clearContents(); pSheet.appendRow(pH); _header(pSheet, pH);

  var reRows = [], prRows = [];
  (data.reimbursements || []).forEach(function(r) {
    if (r.type === "PROCUREMENT") {
      prRows.push([r.id, r.employeeId, r.title, r.category, r.amount, r.description || "", r.status, r.approvedBy || "", r.approvedAt || "", r.receiptUrl || "", r.paidAt || "", r.createdAt]);
    } else {
      reRows.push([r.id, r.employeeId, r.type, r.title, r.category, r.amount, r.currency || "INR", r.date, r.description || "", r.receiptUrl || "", r.status, r.approvedBy || "", r.approvedAt || "", r.paidAt || "", r.rejectionReason || "", r.createdAt]);
    }
  });
  if (reRows.length > 0) rSheet.getRange(2,1,reRows.length,rH.length).setValues(reRows);
  if (prRows.length > 0) pSheet.getRange(2,1,prRows.length,pH.length).setValues(prRows);
  var msg = "✅ Synced " + reRows.length + " reimbursements, " + prRows.length + " procurements.";
  Logger.log(msg);
  return msg;
}

function syncSeparations() {
  var data  = _apiFetch("/api/separation");
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Separations") || ss.insertSheet("Separations");
  var headers = ["ID","Employee ID","Status","Reason","Notice Days","Initiated At","Approved At","Last Working Date","Rejection Reason"];
  sheet.clearContents(); sheet.appendRow(headers); _header(sheet, headers);
  var rows = (data.separations || []).map(function(s) {
    return [s.id, s.employeeId, s.status, s.reason, s.noticeDays, s.initiatedAt, s.approvedAt || "", s.lastWorkingDate || "", s.rejectionReason || ""];
  });
  if (rows.length > 0) sheet.getRange(2,1,rows.length,headers.length).setValues(rows);
  sheet.setFrozenRows(1);
  var msg = "✅ Synced " + rows.length + " separations.";
  Logger.log(msg);
  return msg;
}

function syncDocuments() {
  var data  = _apiFetch("/api/documents");
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Documents") || ss.insertSheet("Documents");
  var headers = ["ID","Employee ID","Employee Name","Type","Title","Issued Date","Issued By","Created At"];
  sheet.clearContents(); sheet.appendRow(headers); _header(sheet, headers);
  var rows = (data.documents || []).map(function(d) {
    return [d.id, d.employeeId, d.employeeName || "", d.type, d.title, d.issuedDate, d.issuedBy, d.createdAt];
  });
  if (rows.length > 0) sheet.getRange(2,1,rows.length,headers.length).setValues(rows);
  sheet.setFrozenRows(1);
  var msg = "✅ Synced " + rows.length + " documents.";
  Logger.log(msg);
  return msg;
}

function syncAll() {
  var results = [syncEmployees(), syncOnboarding()];
  ["syncAttendance","syncLeave","syncReimbursements","syncSeparations","syncDocuments"].forEach(function(fn) {
    try { results.push(eval(fn + "()")); } catch(e) { results.push("⚠ " + fn + ": " + e.message); }
  });
  var summary = results.join(" | ");
  Logger.log("Full sync: " + summary);
  return summary;
}


// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6 — AUTOMATION (Daily Triggers)
// ═══════════════════════════════════════════════════════════════════════════════

/** Daily trigger at 9 AM — auto-initiates offboarding when LWD is reached */
function onDailySeparationCheck() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Separations");
  if (!sheet || sheet.getLastRow() < 2) return;

  var data  = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues();
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  data.forEach(function(row) {
    var id  = row[0], status = row[2];
    var lwd = row[7] ? new Date(row[7]) : null;
    if (status === "APPROVED" && lwd && lwd <= today) {
      _triggerOffboarding(id);
    }
  });
}

function _triggerOffboarding(separationId) {
  try {
    var res = UrlFetchApp.fetch(BASE_URL + "/api/separation/" + separationId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + API_TOKEN },
      payload: JSON.stringify({ action: "complete_offboarding" }),
      muteHttpExceptions: true,
    });
    Logger.log("Offboarding triggered: " + res.getResponseCode());
  } catch(e) {
    Logger.log("Offboarding trigger error: " + e);
  }
}

/** Daily trigger at 9 AM — emails HR with pending resignation count */
function sendDailySeparationSummary() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Separations");
  if (!sheet || sheet.getLastRow() < 2) return;

  var data    = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues();
  var pending = data.filter(function(r) { return r[2] === "PENDING"; });
  if (pending.length === 0) return;

  var hrEmail = PropertiesService.getScriptProperties().getProperty("HR_EMAIL") || "hr@theantbox.com";
  var body    = "Pending resignation requests as of " + new Date().toDateString() + ":\n\n";
  pending.forEach(function(r) {
    body += "• Employee: " + r[1] + "\n  Reason: " + r[3] + "\n  Notice Days: " + r[4] + "\n  Initiated: " + r[5] + "\n\n";
  });
  body += "Log in to AntBox HRMS to approve or reject.\n";
  MailApp.sendEmail(hrEmail, "[AntBox HRMS] " + pending.length + " Pending Resignation(s)", body);
  Logger.log("Separation summary sent to " + hrEmail);
}

/** Manual or scheduled — sends 24hr onboarding document reminders via HRMS API */
function sendOnboardingReminders() {
  if (!BASE_URL) { Logger.log("HRMS_BASE_URL not set."); return; }
  try {
    var res = UrlFetchApp.fetch(BASE_URL + "/api/onboarding/remind-all", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + API_TOKEN },
      muteHttpExceptions: true,
    });
    Logger.log("Onboarding reminders: " + res.getResponseCode());
  } catch(e) {
    Logger.log("Reminder error: " + e);
  }
}
