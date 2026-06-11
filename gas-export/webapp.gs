/**
 * AntBox HRMS — Google Apps Script Web App Controller
 * Serves index.html as the web app UI and exposes server-side functions
 * called by the HTML client via google.script.run.
 *
 * Deployment:
 *  1. In Apps Script editor → Deploy → New Deployment → Web App
 *  2. Execute as: Me | Who has access: Anyone with Google Account (or Anyone)
 *  3. Copy the web app URL and share with the team.
 */

// ─── WEB APP ENTRY POINT ──────────────────────────────────────────────────────

function doGet() {
  return HtmlService.createHtmlOutputFromFile("index")
    .setTitle("AntBox HRMS — Employee Tracker")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ─── CALLED BY index.html CLIENT ─────────────────────────────────────────────

/** Unified sync dispatcher called from client-side JS. */
function gasRunSync(module) {
  switch (module) {
    case "all":           return syncAll();
    case "employees":     return syncEmployees() || "Employees synced";
    case "attendance":    return syncAttendance() || "Attendance synced";
    case "reimbursements":return syncReimbursements() || "Reimbursements synced";
    case "separations":   return syncSeparations() || "Separations synced";
    default:              throw new Error("Unknown module: " + module);
  }
}

/** Returns employee rows for the preview table in index.html */
function gasGetEmployeeRows() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Employees");
  if (!sheet || sheet.getLastRow() < 2) return [];
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 21).getValues();
  // Return [employeeId, fullName, email, department, designation, employmentType, status, joiningDate]
  return data.map(function(r) {
    return [r[1], r[2] + " " + r[3], r[4], r[9], r[10], r[11], r[12], r[13]];
  });
}

// ─── SYNC FUNCTIONS (also callable from Sheet menu) ─────────────────────────

var HRMS_BASE_URL = PropertiesService.getScriptProperties().getProperty("HRMS_BASE_URL") || "";
var API_TOKEN     = PropertiesService.getScriptProperties().getProperty("HRMS_API_TOKEN") || "";

function _get(path) {
  var opts = {
    method: "GET",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + API_TOKEN },
    muteHttpExceptions: true,
  };
  var res = UrlFetchApp.fetch(HRMS_BASE_URL + path, opts);
  if (res.getResponseCode() !== 200) {
    throw new Error("API error " + res.getResponseCode() + ": " + res.getContentText().slice(0, 200));
  }
  return JSON.parse(res.getContentText());
}

function syncEmployees() {
  var data = _get("/api/gas/employees");
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Employees");
  if (!sheet) sheet = ss.insertSheet("Employees");

  // Write headers — AntBox policy: Basic=50%, HRA=20%, SA=30% of CTC; no PF; Variable is annual
  var headers = [
    "Employee ID","First Name","Last Name","Full Name","Email","Personal Email",
    "Phone (+91)","Gender","DOB","Blood Group","Current Address","City","State","Pincode",
    "Emergency Contact","Emergency Phone",
    "Department","Designation","Employment Type","Status","Joining Date","Last Working Date",
    "Annual CTC","Basic Salary (50%)","HRA (20%)","Special Allowance (30%)","Monthly Gross",
    "Bank Name","Account No","IFSC","PAN","UAN","Profile Photo"
  ];
  sheet.clearContents();
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#09090b").setFontColor("white");

  var rows = (data.employees || []).map(function(e) {
    var monthly = (e.basicSalary || 0) + (e.hra || 0) + (e.specialAllowance || 0);
    return [
      e.employeeId, e.firstName, e.lastName, e.fullName,
      e.email, e.personalEmail, e.phone, e.gender, e.dateOfBirth,
      e.bloodGroup, e.address, e.city, e.state, e.pincode,
      e.emergencyContact || "", e.emergencyPhone || "",
      e.department, e.designation, e.employmentType, e.status,
      e.joiningDate, e.lastWorkingDate,
      e.ctc, e.basicSalary, e.hra, e.specialAllowance, monthly,
      e.bankName, e.bankAccountNo, e.ifscCode, e.pan, e.uan,
      e.profilePhoto ? "YES" : "NO",
    ];
  });

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    // Colour-code status column (col 19)
    rows.forEach(function(row, i) {
      var cell = sheet.getRange(i + 2, 19);
      var status = row[18];
      if (status === "ACTIVE")       cell.setBackground("#dcfce7").setFontColor("#16a34a");
      else if (status === "ONBOARDING") cell.setBackground("#e0f2fe").setFontColor("#0284c7");
      else if (status === "OFFBOARDING") cell.setBackground("#fee2e2").setFontColor("#dc2626");
    });
  }

  sheet.autoResizeColumns(1, headers.length);
  Logger.log("Synced " + rows.length + " employees.");
  return "Synced " + rows.length + " employees";
}

function syncAttendance() {
  var data = _get("/api/attendance");
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Attendance") || ss.insertSheet("Attendance");
  sheet.clearContents();
  sheet.appendRow(["Employee ID","Work Date","Check In","Check Out","Total Hours","Status","Notes"]);
  sheet.getRange(1,1,1,7).setFontWeight("bold").setBackground("#09090b").setFontColor("white");

  var rows = (data.records || []).map(function(r) {
    return [r.employeeId, r.workDate, r.checkIn||"", r.checkOut||"", r.totalHours||"", r.status, r.notes||""];
  });
  if (rows.length > 0) sheet.getRange(2,1,rows.length,7).setValues(rows);
  Logger.log("Synced " + rows.length + " attendance records.");
  return "Synced attendance";
}

function syncReimbursements() {
  var data = _get("/api/reimbursements");
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var rSheet = ss.getSheetByName("Reimbursements") || ss.insertSheet("Reimbursements");
  var pSheet = ss.getSheetByName("Procurements")   || ss.insertSheet("Procurements");

  var rHeaders = ["ID","Employee ID","Type","Title","Category","Amount","Status","Approved By","Approved At","Paid At","Created At"];
  rSheet.clearContents(); pSheet.clearContents();
  rSheet.appendRow(rHeaders); pSheet.appendRow(rHeaders);
  [rSheet, pSheet].forEach(function(s) {
    s.getRange(1,1,1,rHeaders.length).setFontWeight("bold").setBackground("#09090b").setFontColor("white");
  });

  var reRows = [], prRows = [];
  (data.reimbursements || []).forEach(function(r) {
    var row = [r.id,r.employeeId,r.type,r.title,r.category,r.amount,r.status,r.approvedBy||"",r.approvedAt||"",r.paidAt||"",r.createdAt];
    if (r.type === "PROCUREMENT") prRows.push(row); else reRows.push(row);
  });
  if (reRows.length > 0) rSheet.getRange(2,1,reRows.length,rHeaders.length).setValues(reRows);
  if (prRows.length > 0) pSheet.getRange(2,1,prRows.length,rHeaders.length).setValues(prRows);
  return "Synced reimbursements + procurement";
}

function syncSeparations() {
  var data = _get("/api/separation");
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Separations") || ss.insertSheet("Separations");
  sheet.clearContents();
  sheet.appendRow(["ID","Employee ID","Status","Reason","Notice Days","Initiated At","Approved At","Last Working Date"]);
  sheet.getRange(1,1,1,8).setFontWeight("bold").setBackground("#09090b").setFontColor("white");
  var rows = (data.separations || []).map(function(s) {
    return [s.id,s.employeeId,s.status,s.reason,s.noticeDays,s.initiatedAt,s.approvedAt||"",s.lastWorkingDate||""];
  });
  if (rows.length > 0) sheet.getRange(2,1,rows.length,8).setValues(rows);
  return "Synced separations";
}

function syncAll() {
  var results = [];
  results.push(syncEmployees());
  try { results.push(syncAttendance()); } catch(e) { results.push("Attendance: " + e.message); }
  try { results.push(syncReimbursements()); } catch(e) { results.push("Reimbursements: " + e.message); }
  try { results.push(syncSeparations()); } catch(e) { results.push("Separations: " + e.message); }
  var summary = results.join(" | ");
  Logger.log("Full sync: " + summary);
  return summary;
}

// ─── DAILY TRIGGER ────────────────────────────────────────────────────────────

function onDailySeparationCheck() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Separations");
  if (!sheet || sheet.getLastRow() < 2) return;
  var data = sheet.getRange(2,1,sheet.getLastRow()-1,8).getValues();
  var today = new Date(); today.setHours(0,0,0,0);
  data.forEach(function(row) {
    var id = row[0], status = row[2], lwd = row[7] ? new Date(row[7]) : null;
    if (status === "APPROVED" && lwd && lwd <= today) {
      _triggerOffboarding(id);
    }
  });
}

function _triggerOffboarding(separationId) {
  try {
    UrlFetchApp.fetch(HRMS_BASE_URL + "/api/separation/" + separationId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + API_TOKEN },
      payload: JSON.stringify({ action: "complete_offboarding" }),
      muteHttpExceptions: true,
    });
  } catch(e) { Logger.log("Offboarding trigger error: " + e); }
}

// ─── SPREADSHEET MENU ────────────────────────────────────────────────────────

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("AntBox HRMS")
    .addItem("⚡ Full Sync",          "syncAll")
    .addSeparator()
    .addItem("👥 Sync Employees",     "syncEmployees")
    .addItem("🕐 Sync Attendance",    "syncAttendance")
    .addItem("💸 Sync Reimbursements","syncReimbursements")
    .addItem("🚪 Sync Separations",   "syncSeparations")
    .addSeparator()
    .addItem("⚙️  Run Setup",         "onSetup")
    .addItem("📧 Separation Summary", "sendDailySeparationSummary")
    .addItem("🌐 Open Web App",       "openWebApp")
    .addToUi();
}

function openWebApp() {
  var url = ScriptApp.getService().getUrl();
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput('<script>window.open("' + url + '","_blank");google.script.host.close();</script>'),
    "Opening Web App…"
  );
}
