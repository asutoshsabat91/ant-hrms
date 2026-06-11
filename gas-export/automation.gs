/**
 * AntBox HRMS — Google Apps Script Automation
 * Handles the daily separation check, offboarding trigger, and document generation stubs.
 * Triggered daily at 9 AM by setup.gs trigger.
 */

/**
 * Checks approved separations whose notice period has ended and auto-initiates offboarding.
 * Called by daily trigger.
 */
function onDailySeparationCheck() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Separations");
  if (!sheet || sheet.getLastRow() < 2) return;

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues();
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  data.forEach(function (row) {
    var id = row[0];
    var status = row[2];
    var lastWorkingDate = row[7] ? new Date(row[7]) : null;

    if (status === "APPROVED" && lastWorkingDate && lastWorkingDate <= today) {
      Logger.log("Initiating offboarding for separation: " + id);
      _triggerOffboarding(id);
    }
  });
}

function _triggerOffboarding(separationId) {
  try {
    var res = UrlFetchApp.fetch(
      PropertiesService.getScriptProperties().getProperty("HRMS_BASE_URL") + "/api/separation/" + separationId,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + PropertiesService.getScriptProperties().getProperty("HRMS_API_TOKEN"),
        },
        payload: JSON.stringify({ action: "complete_offboarding" }),
        muteHttpExceptions: true,
      }
    );
    Logger.log("Offboarding triggered: " + res.getResponseCode() + " — " + res.getContentText());
  } catch (e) {
    Logger.log("Error triggering offboarding: " + e);
  }
}

/**
 * Manual helper: Generate document record for an employee in the Documents sheet.
 * Pass employeeId and document type.
 */
function generateDocument(employeeId, docType, title) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Documents");
  if (!sheet) {
    Logger.log("Documents sheet not found");
    return;
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["ID", "Employee ID", "Type", "Title", "File URL", "Issued Date", "Issued By", "Created At"]);
  }
  sheet.appendRow([
    Utilities.getUuid(), employeeId, docType, title, "",
    new Date().toISOString(), "HR Admin", new Date().toISOString(),
  ]);
  Logger.log("Document record created: " + title + " for " + employeeId);
}

/**
 * Sends a summary email to HR with the day's separation status.
 */
function sendDailySeparationSummary() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Separations");
  if (!sheet || sheet.getLastRow() < 2) return;

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues();
  var pending = data.filter(function (r) { return r[2] === "PENDING"; });

  if (pending.length === 0) return;

  var hrEmail = PropertiesService.getScriptProperties().getProperty("HR_EMAIL") || "hr@theantbox.com";
  var body = "Pending resignation requests:\n\n";
  pending.forEach(function (r) {
    body += "• Employee ID: " + r[1] + " | Reason: " + r[3] + " | Initiated: " + r[5] + "\n";
  });

  MailApp.sendEmail(hrEmail, "[AntBox HRMS] " + pending.length + " Pending Resignation(s)", body);
  Logger.log("Daily summary sent to " + hrEmail);
}

/**
 * Menu item helper — add to Google Sheets UI.
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("AntBox HRMS")
    .addItem("🔄 Sync All", "syncAll")
    .addSeparator()
    .addItem("👥 Sync Employees", "syncEmployees")
    .addItem("🏖️ Sync Leave Data", "syncLeave")
    .addItem("📅 Sync Attendance", "syncAttendance")
    .addItem("💸 Sync Reimbursements", "syncReimbursements")
    .addItem("🚪 Sync Separations", "syncSeparations")
    .addSeparator()
    .addItem("⚙️ Run Setup", "onSetup")
    .addItem("📧 Send Separation Summary", "sendDailySeparationSummary")
    .addToUi();
}
