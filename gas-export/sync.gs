/**
 * AntBox HRMS — Google Apps Script Sync Controller
 * Pulls live data from the HRMS API and writes to Google Sheets.
 *
 * Script Properties required (set in Apps Script → Project Settings):
 *   HRMS_BASE_URL  — e.g. https://hrms.theantbox.com  (no trailing slash)
 *   HRMS_API_TOKEN — API bearer token (must match GAS_SECRET in Next.js .env)
 */

var BASE_URL  = PropertiesService.getScriptProperties().getProperty("HRMS_BASE_URL")  || "";
var API_TOKEN = PropertiesService.getScriptProperties().getProperty("HRMS_API_TOKEN") || "";

// ── Core fetch helper ────────────────────────────────────────────────────────

function _apiFetch(path) {
  if (!BASE_URL) throw new Error("HRMS_BASE_URL not set in Script Properties.");
  var opts = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + API_TOKEN,
    },
    muteHttpExceptions: true,
  };
  var res = UrlFetchApp.fetch(BASE_URL + path, opts);
  if (res.getResponseCode() !== 200) {
    throw new Error("API " + res.getResponseCode() + ": " + res.getContentText().slice(0, 300));
  }
  return JSON.parse(res.getContentText());
}

function _apiPatch(path, body) {
  var opts = {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + API_TOKEN },
    payload: JSON.stringify(body),
    muteHttpExceptions: true,
  };
  return UrlFetchApp.fetch(BASE_URL + path, opts);
}

function _bold(sheet, numCols) {
  sheet.getRange(1, 1, 1, numCols)
    .setFontWeight("bold")
    .setBackground("#09090b")
    .setFontColor("white");
}

// ── EMPLOYEES ────────────────────────────────────────────────────────────────
// Uses the dedicated /api/gas/employees endpoint which returns the full
// AntBox schema: salary breakdown, emergency contact, profile photo, etc.

function syncEmployees() {
  var data = _apiFetch("/api/gas/employees");
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Employees") || ss.insertSheet("Employees");

  var headers = [
    "Employee ID","First Name","Last Name","Full Name",
    "Company Email","Personal Email","Phone (+91)","Gender","Date of Birth",
    "Blood Group","Current Address","City","State","Pincode",
    "Emergency Contact","Emergency Phone",
    "Department","Designation","Employment Type","Status",
    "Joining Date","Last Working Date",
    "Annual CTC (₹)","Basic Salary/mo (50%)","HRA/mo (20%)","Special Allowance/mo (30%)","Monthly Gross (₹)",
    "Variable Pay (Annual ₹)",
    "Bank Name","Account No","IFSC","PAN","UAN",
    "Profile Photo",
  ];

  sheet.clearContents();
  sheet.appendRow(headers);
  _bold(sheet, headers.length);

  var rows = (data.employees || []).map(function(e) {
    var monthly = (e.basicSalary || 0) + (e.hra || 0) + (e.specialAllowance || 0);
    return [
      e.employeeId,
      e.firstName, e.lastName,
      (e.firstName || "") + " " + (e.lastName || ""),
      e.email, e.personalEmail || "",
      e.phone || "", e.gender || "", e.dateOfBirth || "",
      e.bloodGroup || "",
      e.address || "", e.city || "", e.state || "", e.pincode || "",
      e.emergencyContact || "", e.emergencyPhone || "",
      e.department || "", e.designation || "",
      e.employmentType || "", e.status || "",
      e.joiningDate || "", e.lastWorkingDate || "",
      e.ctc || "", e.basicSalary || "", e.hra || "", e.specialAllowance || "", monthly || "",
      e.variablePay || "",
      e.bankName || "", e.bankAccountNo || "", e.ifscCode || "", e.pan || "", e.uan || "",
      e.profilePhoto ? "YES" : "NO",
    ];
  });

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);

    // Colour-code Status column (col 20)
    rows.forEach(function(row, i) {
      var cell = sheet.getRange(i + 2, 20);
      switch (row[19]) {
        case "ACTIVE":      cell.setBackground("#dcfce7").setFontColor("#16a34a"); break;
        case "ONBOARDING":  cell.setBackground("#e0f2fe").setFontColor("#0284c7"); break;
        case "OFFBOARDING": cell.setBackground("#fee2e2").setFontColor("#dc2626"); break;
        case "INACTIVE":    cell.setBackground("#f4f4f5").setFontColor("#71717a"); break;
      }
    });
  }

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
  var msg = "✅ Synced " + rows.length + " employees.";
  Logger.log(msg);
  return msg;
}

// ── ONBOARDING ───────────────────────────────────────────────────────────────

function syncOnboarding() {
  var data = _apiFetch("/api/gas/employees");
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Onboarding") || ss.insertSheet("Onboarding");

  var headers = [
    "Employee ID","Name","Email","Department","Designation","Employment Type",
    "Joining Date","Docs Submitted","Banking Done","ID Form Done",
    "Tasks Completed","Status","Profile Photo",
  ];
  sheet.clearContents();
  sheet.appendRow(headers);
  sheet.getRange(1,1,1,headers.length).setFontWeight("bold").setBackground("#4c1d95").setFontColor("white");

  var onboarding = (data.employees || []).filter(function(e) { return e.status === "ONBOARDING"; });
  var rows = onboarding.map(function(e) {
    return [
      e.employeeId,
      (e.firstName || "") + " " + (e.lastName || ""),
      e.email || "", e.department || "", e.designation || "",
      e.employmentType || "", e.joiningDate || "",
      e.milestone1 ? "✓" : "✗",
      e.milestone2 ? "✓" : "✗",
      e.milestone3 ? "✓" : "✗",
      (e.milestone1 ? 1 : 0) + (e.milestone2 ? 1 : 0) + (e.milestone3 ? 1 : 0) + "/3",
      "ONBOARDING",
      e.profilePhoto ? "YES" : "NO",
    ];
  });
  if (rows.length > 0) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
  var msg = "✅ Synced " + rows.length + " onboarding employees.";
  Logger.log(msg);
  return msg;
}

// ── ATTENDANCE ───────────────────────────────────────────────────────────────

function syncAttendance() {
  var data = _apiFetch("/api/gas/attendance");
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Attendance") || ss.insertSheet("Attendance");
  sheet.clearContents();

  var headers = ["Employee ID","Work Date","Check In","Check Out","Total Hours","Status","Notes"];
  sheet.appendRow(headers);
  _bold(sheet, headers.length);

  var rows = (data.records || []).map(function(r) {
    return [r.employeeId, r.workDate, r.checkIn || "", r.checkOut || "", r.totalHours || "", r.status, r.notes || ""];
  });
  if (rows.length > 0) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.setFrozenRows(1);
  var msg = "✅ Synced " + rows.length + " attendance records.";
  Logger.log(msg);
  return msg;
}

// ── LEAVE ────────────────────────────────────────────────────────────────────

function syncLeave() {
  var data = _apiFetch("/api/gas/leave");
  var ss   = SpreadsheetApp.getActiveSpreadsheet();

  // Leave Requests
  var rSheet = ss.getSheetByName("LeaveRequests") || ss.insertSheet("LeaveRequests");
  rSheet.clearContents();
  var rH = ["ID","Employee ID","Leave Type","Start Date","End Date","Days","Reason","Status","Approved At","Rejection Reason","Created At"];
  rSheet.appendRow(rH);
  _bold(rSheet, rH.length);
  var requests = (data.requests || []).map(function(r) {
    return [r.id, r.employeeId, r.leaveType, r.startDate, r.endDate, r.days, r.reason, r.status, r.approvedAt || "", r.rejectionReason || "", r.createdAt];
  });
  if (requests.length > 0) rSheet.getRange(2,1,requests.length,rH.length).setValues(requests);

  // Leave Balances
  var bSheet = ss.getSheetByName("LeaveBalances") || ss.insertSheet("LeaveBalances");
  bSheet.clearContents();
  var bH = ["Employee ID","Leave Type","Year","Allocated","Used","Pending","Carryover","Remaining"];
  bSheet.appendRow(bH);
  _bold(bSheet, bH.length);
  var balances = (data.balances || []).map(function(b) {
    return [b.employeeId, b.leaveType, b.year, b.allocated, b.used, b.pending, b.carryover, b.allocated - b.used - b.pending + b.carryover];
  });
  if (balances.length > 0) bSheet.getRange(2,1,balances.length,bH.length).setValues(balances);

  var msg = "✅ Synced " + requests.length + " leave requests, " + balances.length + " balances.";
  Logger.log(msg);
  return msg;
}

// ── REIMBURSEMENTS & PROCUREMENT ─────────────────────────────────────────────

function syncReimbursements() {
  var data   = _apiFetch("/api/reimbursements");
  var ss     = SpreadsheetApp.getActiveSpreadsheet();
  var rSheet = ss.getSheetByName("Reimbursements") || ss.insertSheet("Reimbursements");
  var pSheet = ss.getSheetByName("Procurements")   || ss.insertSheet("Procurements");

  var rH = ["ID","Employee ID","Type","Title","Category","Amount (₹)","Currency","Date","Description","Receipt URL","Status","Approved By","Approved At","Paid At","Rejection Reason","Created At"];
  var pH = ["ID","Employee ID","Title","Category","Amount (₹)","Description","Status","Approved By","Approved At","Receipt URL","Paid At","Created At"];
  rSheet.clearContents(); pSheet.clearContents();
  rSheet.appendRow(rH); _bold(rSheet, rH.length);
  pSheet.appendRow(pH); _bold(pSheet, pH.length);

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

// ── SEPARATIONS ───────────────────────────────────────────────────────────────

function syncSeparations() {
  var data  = _apiFetch("/api/separation");
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Separations") || ss.insertSheet("Separations");
  sheet.clearContents();

  var headers = ["ID","Employee ID","Status","Reason","Notice Days","Initiated At","Approved At","Last Working Date","Rejection Reason"];
  sheet.appendRow(headers);
  _bold(sheet, headers.length);

  var rows = (data.separations || []).map(function(s) {
    return [s.id, s.employeeId, s.status, s.reason, s.noticeDays, s.initiatedAt, s.approvedAt || "", s.lastWorkingDate || "", s.rejectionReason || ""];
  });
  if (rows.length > 0) sheet.getRange(2,1,rows.length,headers.length).setValues(rows);
  sheet.setFrozenRows(1);
  var msg = "✅ Synced " + rows.length + " separations.";
  Logger.log(msg);
  return msg;
}

// ── DOCUMENTS ────────────────────────────────────────────────────────────────

function syncDocuments() {
  var data  = _apiFetch("/api/documents");
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Documents") || ss.insertSheet("Documents");
  sheet.clearContents();

  var headers = ["ID","Employee ID","Employee Name","Type","Title","Issued Date","Issued By","Created At"];
  sheet.appendRow(headers);
  _bold(sheet, headers.length);

  var rows = (data.documents || []).map(function(d) {
    return [d.id, d.employeeId, d.employeeName || "", d.type, d.title, d.issuedDate, d.issuedBy, d.createdAt];
  });
  if (rows.length > 0) sheet.getRange(2,1,rows.length,headers.length).setValues(rows);
  sheet.setFrozenRows(1);
  var msg = "✅ Synced " + rows.length + " documents.";
  Logger.log(msg);
  return msg;
}

// ── FULL SYNC ─────────────────────────────────────────────────────────────────

function syncAll() {
  var results = [];
  results.push(syncEmployees());
  results.push(syncOnboarding());
  try { results.push(syncAttendance()); }   catch(e) { results.push("⚠ Attendance: " + e.message); }
  try { results.push(syncLeave()); }        catch(e) { results.push("⚠ Leave: " + e.message); }
  try { results.push(syncReimbursements()); } catch(e) { results.push("⚠ Reimbursements: " + e.message); }
  try { results.push(syncSeparations()); }  catch(e) { results.push("⚠ Separations: " + e.message); }
  try { results.push(syncDocuments()); }    catch(e) { results.push("⚠ Documents: " + e.message); }
  var summary = results.join(" | ");
  Logger.log("Full sync: " + summary);
  return summary;
}
