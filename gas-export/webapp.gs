/**
 * AntBox HRMS — Google Apps Script Web App Controller
 * Serves index.html as the web app UI.
 *
 * DEPLOYMENT STEPS:
 *  1. Open Apps Script → Project Settings → Script Properties → Add:
 *       HRMS_BASE_URL  : https://your-deployed-hrms.com  (no trailing slash)
 *       HRMS_API_TOKEN : your API bearer token
 *       HR_EMAIL       : hr@theantbox.com
 *  2. Run onSetup() once from the editor.
 *  3. Deploy → New Deployment → Web App
 *       Execute as: Me
 *       Who has access: Anyone with Google Account  (or adjust as needed)
 *  4. Copy the Web App URL and share with the team.
 */

// ── Web App Entry Point ───────────────────────────────────────────────────────

function doGet() {
  return HtmlService.createHtmlOutputFromFile("index")
    .setTitle("AntBox HRMS — Sync Dashboard")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ── Dispatcher called from index.html client-side JS ─────────────────────────

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
    default:               throw new Error("Unknown module: " + module);
  }
}

/** Returns employee rows for the preview table in index.html */
function gasGetEmployeeRows() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Employees");
  if (!sheet || sheet.getLastRow() < 2) return [];
  // Read first 34 columns (headers match EMPLOYEE_HEADERS in setup.gs)
  var numCols = Math.min(34, sheet.getLastColumn());
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, numCols).getValues();
  // Return [employeeId, fullName, email, department, designation, type, status, joiningDate]
  return data.map(function(r) {
    return [r[0], r[3], r[4], r[16], r[17], r[18], r[19], r[20]];
  });
}

/** Returns onboarding milestone summary for the index.html stats */
function gasGetOnboardingStats() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Onboarding");
  if (!sheet || sheet.getLastRow() < 2) return { total: 0, complete: 0, rows: [] };
  var data  = sheet.getRange(2, 1, sheet.getLastRow() - 1, 13).getValues();
  var complete = data.filter(function(r) { return r[10] === "3/3"; }).length;
  return {
    total: data.length,
    complete: complete,
    rows: data.map(function(r) {
      return [r[0], r[1], r[3], r[6], r[7], r[8], r[9], r[10]];
      // [empId, name, dept, joinDate, docs, banking, idForm, progress]
    }),
  };
}

// ── Google Sheets Menu ────────────────────────────────────────────────────────

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("AntBox HRMS")
    .addItem("⚡ Full Sync",             "syncAll")
    .addSeparator()
    .addItem("👥 Sync Employees",        "syncEmployees")
    .addItem("🎯 Sync Onboarding",       "syncOnboarding")
    .addItem("🕐 Sync Attendance",       "syncAttendance")
    .addItem("🏖️  Sync Leave",           "syncLeave")
    .addItem("💸 Sync Reimbursements",   "syncReimbursements")
    .addItem("🚪 Sync Separations",      "syncSeparations")
    .addItem("📄 Sync Documents",        "syncDocuments")
    .addSeparator()
    .addItem("⚙️  Run Setup",            "onSetup")
    .addItem("📧 Separation Summary",    "sendDailySeparationSummary")
    .addItem("🔔 Send Onboarding Reminders", "sendOnboardingReminders")
    .addItem("🌐 Open Web App",          "openWebApp")
    .addToUi();
}

function openWebApp() {
  var url = ScriptApp.getService().getUrl();
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput('<script>window.open("' + url + '","_blank");google.script.host.close();</script>'),
    "Opening Web App…"
  );
}
