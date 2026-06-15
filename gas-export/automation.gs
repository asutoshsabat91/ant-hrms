/**
 * AntBox HRMS — Google Apps Script Automation
 * Daily triggers for separation checks and summary emails.
 * NOTE: onOpen() and sync functions live in webapp.gs and sync.gs respectively.
 */

// ── Daily separation check (trigger: daily at 9 AM, registered by setup.gs) ─

function onDailySeparationCheck() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Separations");
  if (!sheet || sheet.getLastRow() < 2) return;

  var data  = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues();
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  data.forEach(function(row) {
    var id              = row[0];
    var status          = row[2];
    var lastWorkingDate = row[7] ? new Date(row[7]) : null;

    if (status === "APPROVED" && lastWorkingDate && lastWorkingDate <= today) {
      Logger.log("Triggering offboarding for separation: " + id);
      _triggerOffboarding(id);
    }
  });
}

function _triggerOffboarding(separationId) {
  var baseUrl   = PropertiesService.getScriptProperties().getProperty("HRMS_BASE_URL") || "";
  var apiToken  = PropertiesService.getScriptProperties().getProperty("HRMS_API_TOKEN") || "";
  try {
    var res = UrlFetchApp.fetch(baseUrl + "/api/separation/" + separationId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiToken },
      payload: JSON.stringify({ action: "complete_offboarding" }),
      muteHttpExceptions: true,
    });
    Logger.log("Offboarding triggered: " + res.getResponseCode() + " — " + res.getContentText().slice(0, 200));
  } catch(e) {
    Logger.log("Offboarding trigger error: " + e);
  }
}

// ── Daily separation summary email ───────────────────────────────────────────

function sendDailySeparationSummary() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Separations");
  if (!sheet || sheet.getLastRow() < 2) return;

  var data    = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues();
  var pending = data.filter(function(r) { return r[2] === "PENDING"; });
  if (pending.length === 0) return;

  var hrEmail = PropertiesService.getScriptProperties().getProperty("HR_EMAIL") || "hr@theantbox.com";
  var body    = "Pending resignation / separation requests as of " + new Date().toDateString() + ":\n\n";
  pending.forEach(function(r) {
    body += "• Employee ID: " + r[1] + "\n  Reason: " + r[3] + "\n  Notice Days: " + r[4] + "\n  Initiated: " + r[5] + "\n\n";
  });
  body += "\nLog in to AntBox HRMS to review and approve/reject.\n";

  MailApp.sendEmail(hrEmail, "[AntBox HRMS] " + pending.length + " Pending Resignation(s) — Action Required", body);
  Logger.log("Daily separation summary sent to " + hrEmail);
}

// ── Onboarding document reminder (can be triggered manually or on schedule) ──

function sendOnboardingReminders() {
  var baseUrl  = PropertiesService.getScriptProperties().getProperty("HRMS_BASE_URL") || "";
  var apiToken = PropertiesService.getScriptProperties().getProperty("HRMS_API_TOKEN") || "";
  if (!baseUrl) { Logger.log("HRMS_BASE_URL not set."); return; }

  try {
    var res = UrlFetchApp.fetch(baseUrl + "/api/onboarding/remind-all", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiToken },
      muteHttpExceptions: true,
    });
    Logger.log("Onboarding reminders: " + res.getResponseCode() + " — " + res.getContentText().slice(0, 200));
  } catch(e) {
    Logger.log("Reminder error: " + e);
  }
}
