/**
 * AntBox HRMS — Google Apps Script Sync Controller
 * Handles pulling data from the HRMS API and writing to Sheets.
 * Set HRMS_BASE_URL to your deployed Next.js app URL.
 */

var HRMS_BASE_URL = PropertiesService.getScriptProperties().getProperty("HRMS_BASE_URL") || "https://your-hrms-domain.com";
var API_TOKEN = PropertiesService.getScriptProperties().getProperty("HRMS_API_TOKEN") || "";

function _apiFetch(path, method, body) {
  var options = {
    method: method || "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + API_TOKEN,
    },
    muteHttpExceptions: true,
  };
  if (body) options.payload = JSON.stringify(body);
  var res = UrlFetchApp.fetch(HRMS_BASE_URL + path, options);
  return JSON.parse(res.getContentText());
}

// ─── EMPLOYEES ────────────────────────────────────────────────────────────────

function syncEmployees() {
  var data = _apiFetch("/api/employees");
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Employees");
  // Clear data rows, keep header
  if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();

  (data.employees || []).forEach(function (e) {
    sheet.appendRow([
      e.id, e.employeeId, e.firstName, e.lastName, e.email, e.personalEmail || "",
      e.phone || "", e.gender || "", e.dateOfBirth || "", e.department?.name || "",
      e.designation, e.employmentType, e.status, e.joiningDate, e.lastWorkingDate || "",
      e.managerId || "", e.bankName || "", e.bankAccountNo || "", e.ifscCode || "", e.pan || "",
      new Date().toISOString(),
    ]);
  });
  Logger.log("Synced " + (data.employees || []).length + " employees.");
}

// ─── REIMBURSEMENTS & PROCUREMENT ─────────────────────────────────────────────

function syncReimbursements() {
  var data = _apiFetch("/api/reimbursements");
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var reSheet = ss.getSheetByName("Reimbursements");
  var proSheet = ss.getSheetByName("Procurements");

  if (reSheet.getLastRow() > 1) reSheet.getRange(2, 1, reSheet.getLastRow() - 1, reSheet.getLastColumn()).clearContent();
  if (proSheet && proSheet.getLastRow() > 1) proSheet.getRange(2, 1, proSheet.getLastRow() - 1, proSheet.getLastColumn()).clearContent();

  (data.reimbursements || []).forEach(function (r) {
    var row = [
      r.id, r.employeeId, r.type, r.title, r.category, r.amount, r.currency || "INR",
      r.date, r.description || "", r.receiptUrl || "", r.status, r.approvedBy || "",
      r.approvedAt || "", r.paidAt || "", r.rejectionReason || "", r.createdAt,
    ];
    if (r.type === "PROCUREMENT" && proSheet) {
      proSheet.appendRow([
        r.id, r.employeeId, r.title, r.category, r.amount, r.description || "",
        r.status, r.approvedBy || "", r.approvedAt || "", r.receiptUrl || "", r.paidAt || "", r.createdAt,
      ]);
    } else {
      reSheet.appendRow(row);
    }
  });
  Logger.log("Synced reimbursements & procurement.");
}

// ─── SEPARATIONS ──────────────────────────────────────────────────────────────

function syncSeparations() {
  var data = _apiFetch("/api/separation");
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Separations");
  if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();

  (data.separations || []).forEach(function (s) {
    sheet.appendRow([
      s.id, s.employeeId, s.status, s.reason, s.noticeDays,
      s.initiatedAt, s.approvedAt || "", s.lastWorkingDate || "", s.rejectionReason || "",
    ]);
  });
  Logger.log("Synced separations.");
}

// ─── POSH REPORTS ─────────────────────────────────────────────────────────────

function syncPOSHReports() {
  var data = _apiFetch("/api/posh");
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("POSHReports");
  if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();

  (data.reports || []).forEach(function (r) {
    sheet.appendRow([r.id, r.employeeId, r.subject, r.description, r.createdAt]);
  });
  Logger.log("Synced POSH reports.");
}

// ─── ATTENDANCE ───────────────────────────────────────────────────────────────

function syncAttendance() {
  var data = _apiFetch("/api/attendance");
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Attendance");
  if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();

  (data.records || []).forEach(function (r) {
    sheet.appendRow([
      r.id, r.employeeId, r.workDate, r.checkIn || "", r.checkOut || "",
      r.totalHours || "", r.status, r.notes || "",
    ]);
  });
  Logger.log("Synced attendance.");
}

// ─── FULL SYNC ─────────────────────────────────────────────────────────────────

function syncAll() {
  syncEmployees();
  syncReimbursements();
  syncSeparations();
  syncAttendance();
  // POSH sync only if user has admin token
  try { syncPOSHReports(); } catch (e) { Logger.log("POSH sync skipped: " + e); }
  Logger.log("Full sync complete: " + new Date().toISOString());
}
