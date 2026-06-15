// ============================================================
// ANTBOX HRMS — Google Apps Script Full Application
// Version 4.0 | Google Sheets as Database
// ============================================================
// DEPLOYMENT STEPS:
//   1. Open Google Sheets → Extensions → Apps Script
//   2. Replace Code.gs content with this file
//   3. Create Index.html file and paste Index.html content
//   4. Click "Deploy" → "New Deployment" → Type: Web App
//   5. Execute as: Me | Access: Anyone with Google Account
//   6. Run setupSpreadsheet() once to initialize all sheets
// ============================================================

// ─── SECTION 1: CONFIGURATION ────────────────────────────────
var CONFIG = {
  APP_NAME:        "AntBox HRMS",
  APP_VERSION:     "v4.0",
  COMPANY_NAME:    "AntBox",
  COMPANY_CITY:    "Bhubaneswar, Odisha",
  COMPANY_EMAIL:   "people@theantbox.com",
  OFFICE_LAT:      20.352346,
  OFFICE_LON:      85.816088,
  OFFICE_RADIUS_M: 200,
  TIMEZONE:        "Asia/Kolkata",
};

var SHEETS = {
  CONFIG:            "Config",
  DEPARTMENTS:       "Departments",
  EMPLOYEES:         "Employees",
  USERS:             "Users",
  ATTENDANCE:        "Attendance",
  LEAVE_TYPES:       "LeaveTypes",
  LEAVE_BALANCES:    "LeaveBalances",
  LEAVE_REQUESTS:    "LeaveRequests",
  ONBOARDING:        "Onboarding",
  ONBOARDING_TASKS:  "OnboardingTasks",
  OFFBOARDING:       "Offboarding",
  SEPARATION:        "Separations",
  PAYROLL_RUNS:      "PayrollRuns",
  PAYROLL_LINES:     "PayrollLines",
  DOCUMENTS:         "Documents",
  HOLIDAYS:          "Holidays",
  NOTIFICATIONS:     "Notifications",
  EVENTS:            "Events",
  REIMBURSEMENTS:    "Reimbursements",
  AUDIT_LOG:         "AuditLog",
};

// ─── SECTION 2: WEB APP ENTRY POINT ──────────────────────────
function doGet(e) {
  return HtmlService.createTemplateFromFile("Index")
    .evaluate()
    .setTitle("AntBox HRMS")
    .addMetaTag("viewport", "width=device-width, initial-scale=1")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ─── SECTION 3: AUTH & SESSION ───────────────────────────────
function getCurrentUser() {
  var email = Session.getActiveUser().getEmail();
  if (!email) return null;
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEETS.USERS);
  if (!sheet) return null;
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] && data[i][1].toString().toLowerCase() === email.toLowerCase()) {
      return {
        id: data[i][0], email: data[i][1], role: data[i][2],
        isActive: data[i][3], employeeId: data[i][4],
        name: data[i][5] || email.split("@")[0], avatar: data[i][6] || "",
      };
    }
  }
  // Auto-create as INTERN
  var newId = "USR-" + Date.now();
  sheet.appendRow([newId, email, "INTERN", true, "", email.split("@")[0], ""]);
  return { id: newId, email: email, role: "INTERN", isActive: true, employeeId: "", name: email.split("@")[0], avatar: "" };
}

function canAdmin() { var u = getCurrentUser(); return u && (u.role==="SUPER_ADMIN"||u.role==="HR_ADMIN"); }
function canManage(){ var u = getCurrentUser(); return u && (u.role==="SUPER_ADMIN"||u.role==="HR_ADMIN"||u.role==="MANAGER"); }

// ─── SECTION 4: SETUP ────────────────────────────────────────
function setupSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  _createSheet(ss, SHEETS.CONFIG,           ["Key","Value"]);
  _createSheet(ss, SHEETS.DEPARTMENTS,      ["id","name","headId","headCount","createdAt"]);
  _createSheet(ss, SHEETS.EMPLOYEES,        ["id","employeeId","firstName","lastName","email","phone","personalEmail","departmentId","departmentName","designation","role","employmentType","status","joiningDate","dateOfBirth","gender","bloodGroup","address","city","state","pincode","emergencyContact","emergencyPhone","basicSalary","hra","specialAllowance","totalCTC","bankName","bankAccountNo","ifscCode","pan","profilePhoto","managerId","linkedinUrl","createdAt"]);
  _createSheet(ss, SHEETS.USERS,            ["id","email","role","isActive","employeeId","name","avatar"]);
  _createSheet(ss, SHEETS.ATTENDANCE,       ["id","employeeId","employeeName","date","firstIn","lastOut","totalHours","status","wfh","note","createdAt"]);
  _createSheet(ss, SHEETS.LEAVE_TYPES,      ["id","code","name","daysPerYear","isPaid","carryForward","maxCarryForward","description"]);
  _createSheet(ss, SHEETS.LEAVE_BALANCES,   ["id","employeeId","employeeName","leaveTypeId","leaveTypeName","allocated","used","pending","remaining","year"]);
  _createSheet(ss, SHEETS.LEAVE_REQUESTS,   ["id","employeeId","employeeName","leaveTypeId","leaveTypeName","fromDate","toDate","days","reason","status","approverId","approverName","approvedAt","createdAt"]);
  _createSheet(ss, SHEETS.ONBOARDING,       ["id","employeeId","employeeName","email","designation","department","joiningDate","status","completedTasks","totalTasks","createdAt"]);
  _createSheet(ss, SHEETS.ONBOARDING_TASKS, ["id","hireId","employeeId","title","category","description","status","assignedTo","dueDate","completedAt","notes"]);
  _createSheet(ss, SHEETS.OFFBOARDING,      ["id","employeeId","employeeName","lastDay","reason","exitInterview","assetReturn","accountRevoked","status","createdAt"]);
  _createSheet(ss, SHEETS.SEPARATION,       ["id","employeeId","employeeName","type","initiatedDate","lastWorkingDay","reason","status","noticePeriod","noticePeriodWaived","settledOn","createdAt"]);
  _createSheet(ss, SHEETS.PAYROLL_RUNS,     ["id","month","year","status","totalGross","totalDeductions","totalNet","processedBy","processedAt","paidAt","createdAt"]);
  _createSheet(ss, SHEETS.PAYROLL_LINES,    ["id","runId","employeeId","employeeName","basic","hra","specialAllowance","grossSalary","pf","professionalTax","tds","totalDeductions","netSalary","workingDays","paidDays","status","createdAt"]);
  _createSheet(ss, SHEETS.DOCUMENTS,        ["id","employeeId","employeeName","type","title","driveUrl","uploadedBy","verifiedBy","verifiedAt","status","createdAt"]);
  _createSheet(ss, SHEETS.HOLIDAYS,         ["id","date","name","type","description"]);
  _createSheet(ss, SHEETS.NOTIFICATIONS,    ["id","userId","employeeId","channelId","title","message","type","read","createdAt"]);
  _createSheet(ss, SHEETS.EVENTS,           ["id","title","date","endDate","type","description","allDay","createdAt"]);
  _createSheet(ss, SHEETS.REIMBURSEMENTS,   ["id","employeeId","employeeName","category","amount","date","description","receiptUrl","status","approverId","approvedAt","paidAt","createdAt"]);
  _createSheet(ss, SHEETS.AUDIT_LOG,        ["id","userId","action","entity","entityId","details","createdAt"]);
  _seedDefaultData(ss);
  return { success: true, message: "✅ Setup complete! All 20 sheets created." };
}

function _createSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) { sheet = ss.insertSheet(name); }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    var r = sheet.getRange(1, 1, 1, headers.length);
    r.setFontWeight("bold").setBackground("#0f0f0f").setFontColor("#ffffff").setFontSize(11);
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 150);
  }
  return sheet;
}

function _seedDefaultData(ss) {
  var deptSheet = ss.getSheetByName(SHEETS.DEPARTMENTS);
  if (deptSheet.getLastRow() <= 1) {
    [["DEPT-001","Engineering"],["DEPT-002","Product"],["DEPT-003","Design"],["DEPT-004","Marketing"],["DEPT-005","Operations"],["DEPT-006","Human Resources"],["DEPT-007","Finance"],["DEPT-008","Sales"]].forEach(function(d){ deptSheet.appendRow([d[0],d[1],"",0,new Date()]); });
  }
  var ltSheet = ss.getSheetByName(SHEETS.LEAVE_TYPES);
  if (ltSheet.getLastRow() <= 1) {
    [["LT-001","SL","Sick Leave",7,true,false,0,"For medical emergencies"],["LT-002","PL","Privilege Leave",21,true,true,10,"Annual earned leave"],["LT-003","WFH","Work From Home",21,true,false,0,"Remote work days"],["LT-004","LWP","Leave Without Pay",0,false,false,0,"Unpaid leave"],["LT-005","ML","Maternity Leave",180,true,false,0,"Maternity benefit"],["LT-006","BL","Bereavement Leave",5,true,false,0,"Loss of family member"],["LT-007","BV","Birthday Voucher",1,true,false,0,"Birthday off"]].forEach(function(t){ ltSheet.appendRow(t); });
  }
  var holSheet = ss.getSheetByName(SHEETS.HOLIDAYS);
  if (holSheet.getLastRow() <= 1) {
    var y = new Date().getFullYear();
    [[y+"-01-26","Republic Day","NATIONAL"],[y+"-08-15","Independence Day","NATIONAL"],[y+"-10-02","Gandhi Jayanti","NATIONAL"],[y+"-11-01","Diwali","FESTIVAL"],[y+"-12-25","Christmas","FESTIVAL"]].forEach(function(h,i){ holSheet.appendRow(["HOL-00"+(i+1),h[0],h[1],h[2],""]); });
  }
  var userSheet = ss.getSheetByName(SHEETS.USERS);
  if (userSheet.getLastRow() <= 1) {
    userSheet.appendRow(["USR-001","admin@theantbox.com","SUPER_ADMIN",true,"EMP-001","Admin AntBox",""]);
    userSheet.appendRow(["USR-002","hr@theantbox.com","HR_ADMIN",true,"EMP-002","HR AntBox",""]);
  }
  var cfgSheet = ss.getSheetByName(SHEETS.CONFIG);
  if (cfgSheet.getLastRow() <= 1) {
    [["COMPANY_NAME","AntBox"],["COMPANY_EMAIL","people@theantbox.com"],["COMPANY_CITY","Bhubaneswar, Odisha"],["OFFICE_LAT","20.352346"],["OFFICE_LON","85.816088"],["OFFICE_RADIUS_M","200"],["WORK_START","09:00"],["WORK_END","18:00"],["PAYROLL_CYCLE_DAY","25"],["PF_PERCENT","12"],["PROFESSIONAL_TAX","200"]].forEach(function(c){ cfgSheet.appendRow(c); });
  }
}

// ─── SECTION 5: DASHBOARD ────────────────────────────────────
function getDashboardData() {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var user = getCurrentUser();
  var now  = new Date();
  var today= Utilities.formatDate(now, CONFIG.TIMEZONE, "yyyy-MM-dd");

  var empSheet = ss.getSheetByName(SHEETS.EMPLOYEES);
  var empData  = empSheet ? empSheet.getDataRange().getValues() : [[]];
  var total=0, active=0, onboarding=0, offboarding=0;
  for (var i=1;i<empData.length;i++) {
    if (!empData[i][0]) continue; total++;
    if (empData[i][12]==="ACTIVE")      active++;
    if (empData[i][12]==="ONBOARDING")  onboarding++;
    if (empData[i][12]==="OFFBOARDING") offboarding++;
  }

  var attSheet = ss.getSheetByName(SHEETS.ATTENDANCE);
  var attData  = attSheet ? attSheet.getDataRange().getValues() : [[]];
  var todayPresent=0, myToday=null;
  for (var i=1;i<attData.length;i++) {
    if (!attData[i][0]) continue;
    var rd = attData[i][3] ? Utilities.formatDate(new Date(attData[i][3]),CONFIG.TIMEZONE,"yyyy-MM-dd") : "";
    if (rd===today) {
      if (attData[i][7]!=="ABSENT") todayPresent++;
      if (user && attData[i][1]===user.employeeId) myToday = { firstIn:attData[i][4], lastOut:attData[i][5], hours:attData[i][6], status:attData[i][7] };
    }
  }

  var lrSheet = ss.getSheetByName(SHEETS.LEAVE_REQUESTS);
  var lrData  = lrSheet ? lrSheet.getDataRange().getValues() : [[]];
  var pendingLeave=0;
  for (var i=1;i<lrData.length;i++) { if (lrData[i][9]==="PENDING") pendingLeave++; }

  var lbSheet = ss.getSheetByName(SHEETS.LEAVE_BALANCES);
  var lbData  = lbSheet ? lbSheet.getDataRange().getValues() : [[]];
  var myBalances=[]; var yr = now.getFullYear().toString();
  for (var i=1;i<lbData.length;i++) {
    if (user && lbData[i][1]===user.employeeId && lbData[i][9].toString()===yr)
      myBalances.push({ name:lbData[i][4], used:parseFloat(lbData[i][6])||0, remaining:parseFloat(lbData[i][8])||0, allocated:parseFloat(lbData[i][5])||0 });
  }
  if (!myBalances.length) myBalances=[{name:"Sick Leave",used:0,remaining:7,allocated:7},{name:"Privilege Leave",used:0,remaining:21,allocated:21},{name:"Work From Home",used:0,remaining:21,allocated:21}];

  var holSheet = ss.getSheetByName(SHEETS.HOLIDAYS);
  var holData  = holSheet ? holSheet.getDataRange().getValues() : [[]];
  var upcoming=[]; var todayD=new Date(today);
  for (var i=1;i<holData.length;i++) {
    if (!holData[i][0]) continue;
    try { var hd=new Date(holData[i][1]); if(hd>=todayD) upcoming.push({date:holData[i][1],name:holData[i][2],type:holData[i][3]}); } catch(e){}
  }
  upcoming=upcoming.slice(0,4);

  var notifSheet=ss.getSheetByName(SHEETS.NOTIFICATIONS);
  var notifData=notifSheet?notifSheet.getDataRange().getValues():[[]], myNotifs=[];
  for (var i=1;i<notifData.length;i++) {
    if (!notifData[i][0]) continue;
    if (user && (notifData[i][1]===user.id||notifData[i][2]===user.employeeId))
      myNotifs.push({id:notifData[i][0],title:notifData[i][4],message:notifData[i][5],type:notifData[i][6],read:notifData[i][7],createdAt:notifData[i][8]});
  }
  myNotifs=myNotifs.slice(-10).reverse();

  var rmb=ss.getSheetByName(SHEETS.REIMBURSEMENTS);
  var rmbPending=0;
  if(rmb&&rmb.getLastRow()>1){var rd2=rmb.getDataRange().getValues();for(var i=1;i<rd2.length;i++){if(rd2[i][8]==="PENDING")rmbPending++;}}

  return {
    user: user, today: Utilities.formatDate(now,CONFIG.TIMEZONE,"EEEE, dd MMM yyyy"),
    stats: { total:total, active:active, onboarding:onboarding, offboarding:offboarding,
             todayPresent:todayPresent, attendanceRate: active>0?Math.round(todayPresent/active*100):0,
             pendingLeave:pendingLeave, pendingReimbursements:rmbPending },
    myToday: myToday, myBalances: myBalances,
    upcomingHolidays: upcoming, notifications: myNotifs,
  };
}

// ─── SECTION 6: EMPLOYEES ────────────────────────────────────
function getEmployees(filters) {
  var ss=SpreadsheetApp.getActiveSpreadsheet();
  var sheet=ss.getSheetByName(SHEETS.EMPLOYEES);
  if(!sheet||sheet.getLastRow()<=1) return [];
  var data=sheet.getDataRange().getValues(), result=[];
  filters=filters||{};
  for(var i=1;i<data.length;i++){
    if(!data[i][0]) continue;
    var e=_rowToEmp(data[i]);
    if(filters.status&&e.status!==filters.status) continue;
    if(filters.departmentId&&e.departmentId!==filters.departmentId) continue;
    if(filters.search){var q=filters.search.toLowerCase();if(!(e.firstName+" "+e.lastName).toLowerCase().includes(q)&&!e.email.toLowerCase().includes(q)&&!e.employeeId.toLowerCase().includes(q)&&!e.designation.toLowerCase().includes(q)) continue;}
    result.push(e);
  }
  return result;
}

function getEmployee(id) {
  var ss=SpreadsheetApp.getActiveSpreadsheet(), sheet=ss.getSheetByName(SHEETS.EMPLOYEES);
  if(!sheet) return null;
  var data=sheet.getDataRange().getValues();
  for(var i=1;i<data.length;i++) { if(data[i][0]===id||data[i][1]===id) return _rowToEmp(data[i]); }
  return null;
}

function saveEmployee(emp) {
  if(!canAdmin()) return {success:false,error:"Unauthorized"};
  var ss=SpreadsheetApp.getActiveSpreadsheet(), sheet=ss.getSheetByName(SHEETS.EMPLOYEES);
  var now=new Date();
  if(emp.id) {
    var data=sheet.getDataRange().getValues();
    for(var i=1;i<data.length;i++){
      if(data[i][0]===emp.id){ sheet.getRange(i+1,1,1,35).setValues([_empToRow(emp,data[i])]); _audit("UPDATE","Employee",emp.id,"Updated: "+emp.firstName+" "+emp.lastName); return {success:true}; }
    }
    return {success:false,error:"Not found"};
  }
  var data=sheet.getDataRange().getValues();
  emp.id="EMP-"+Date.now(); emp.employeeId=_nextEmpId(data); emp.status=emp.status||"ACTIVE"; emp.createdAt=now;
  sheet.appendRow(_empToRow(emp,null));
  var us=ss.getSheetByName(SHEETS.USERS);
  us.appendRow(["USR-"+Date.now(),emp.email,emp.role||"EMPLOYEE",true,emp.id,emp.firstName+" "+emp.lastName,""]);
  _seedLeaveBalances(ss,emp.id,emp.firstName+" "+emp.lastName);
  _audit("CREATE","Employee",emp.id,"Created: "+emp.firstName+" "+emp.lastName);
  return {success:true,id:emp.id,employeeId:emp.employeeId};
}

function _rowToEmp(r){
  return {id:r[0],employeeId:r[1],firstName:r[2],lastName:r[3],email:r[4],phone:r[5],personalEmail:r[6],departmentId:r[7],departmentName:r[8],designation:r[9],role:r[10],employmentType:r[11],status:r[12],joiningDate:r[13]?_fmtDate(r[13]):"",dateOfBirth:r[14]?_fmtDate(r[14]):"",gender:r[15],bloodGroup:r[16],address:r[17],city:r[18],state:r[19],pincode:r[20],emergencyContact:r[21],emergencyPhone:r[22],basicSalary:r[23],hra:r[24],specialAllowance:r[25],totalCTC:r[26],bankName:r[27],bankAccountNo:r[28],ifscCode:r[29],pan:r[30],profilePhoto:r[31],managerId:r[32],linkedinUrl:r[33],createdAt:r[34]};
}
function _empToRow(e,x){
  x=x||new Array(35).fill("");
  return [e.id||x[0],e.employeeId||x[1],e.firstName||x[2],e.lastName||x[3],e.email||x[4],e.phone||x[5],e.personalEmail||x[6],e.departmentId||x[7],e.departmentName||x[8],e.designation||x[9],e.role||x[10],e.employmentType||x[11],e.status||x[12],e.joiningDate||x[13],e.dateOfBirth||x[14],e.gender||x[15],e.bloodGroup||x[16],e.address||x[17],e.city||x[18],e.state||x[19],e.pincode||x[20],e.emergencyContact||x[21],e.emergencyPhone||x[22],e.basicSalary||x[23],e.hra||x[24],e.specialAllowance||x[25],e.totalCTC||x[26],e.bankName||x[27],e.bankAccountNo||x[28],e.ifscCode||x[29],e.pan||x[30],e.profilePhoto||x[31],e.managerId||x[32],e.linkedinUrl||x[33],e.createdAt||x[34]];
}
function _nextEmpId(data){var mx=0;for(var i=1;i<data.length;i++){if(data[i][1]&&data[i][1].toString().startsWith("ANT-")){var n=parseInt(data[i][1].toString().replace("ANT-",""))||0;if(n>mx)mx=n;}}return "ANT-"+(mx+1<10?"00"+(mx+1):mx+1<100?"0"+(mx+1):mx+1);}
function _fmtDate(v){try{return Utilities.formatDate(new Date(v),CONFIG.TIMEZONE,"yyyy-MM-dd");}catch(e){return v||"";}}

function getDepartments(){
  var ss=SpreadsheetApp.getActiveSpreadsheet(),sheet=ss.getSheetByName(SHEETS.DEPARTMENTS);
  if(!sheet) return [];
  var data=sheet.getDataRange().getValues(),r=[];
  for(var i=1;i<data.length;i++){if(data[i][0]) r.push({id:data[i][0],name:data[i][1]});}
  return r;
}
function saveDepartment(dept){
  if(!canAdmin()) return {success:false,error:"Unauthorized"};
  var ss=SpreadsheetApp.getActiveSpreadsheet(),sheet=ss.getSheetByName(SHEETS.DEPARTMENTS);
  if(dept.id){var d=sheet.getDataRange().getValues();for(var i=1;i<d.length;i++){if(d[i][0]===dept.id){sheet.getRange(i+1,2).setValue(dept.name);return {success:true};}}}
  sheet.appendRow(["DEPT-"+Date.now(),dept.name,"",0,new Date()]);
  return {success:true};
}

// ─── SECTION 7: ATTENDANCE ───────────────────────────────────
function clockAction(lat, lon) {
  var user=getCurrentUser();
  if(!user||!user.employeeId) return {success:false,error:"No employee profile linked to your account"};
  var inRange=_inRange(lat,lon);
  var now=new Date(), today=_fmtDate(now), timeStr=Utilities.formatDate(now,CONFIG.TIMEZONE,"HH:mm:ss");
  var ss=SpreadsheetApp.getActiveSpreadsheet(), sheet=ss.getSheetByName(SHEETS.ATTENDANCE);
  var data=sheet.getDataRange().getValues();
  for(var i=1;i<data.length;i++){
    var rd=data[i][3]?_fmtDate(data[i][3]):"";
    if(rd===today&&data[i][1]===user.employeeId){
      sheet.getRange(i+1,6).setValue(timeStr);
      var hrs=((new Date(today+"T"+timeStr)-new Date(today+"T"+data[i][4]))/3600000).toFixed(2);
      sheet.getRange(i+1,7).setValue(hrs);
      return {success:true,action:"out",time:timeStr,hours:hrs,inRange:inRange};
    }
  }
  var emp=getEmployee(user.employeeId);
  sheet.appendRow(["ATT-"+Date.now(),user.employeeId,emp?emp.firstName+" "+emp.lastName:user.name,now,timeStr,"","0",inRange?"PRESENT":"PRESENT_REMOTE",false,"",now]);
  return {success:true,action:"in",time:timeStr,inRange:inRange};
}

function getAttendanceForEmployee(empId, month, year){
  var ss=SpreadsheetApp.getActiveSpreadsheet(), sheet=ss.getSheetByName(SHEETS.ATTENDANCE);
  if(!sheet||sheet.getLastRow()<=1) return [];
  var data=sheet.getDataRange().getValues(), now=new Date();
  var m=month||(now.getMonth()+1), y=year||now.getFullYear();
  var prefix=y+"-"+(m<10?"0":"")+m, result=[];
  for(var i=1;i<data.length;i++){
    if(!data[i][0]||data[i][1]!==empId) continue;
    var d=data[i][3]?_fmtDate(data[i][3]):"";
    if(d.startsWith(prefix)) result.push({id:data[i][0],date:d,firstIn:data[i][4],lastOut:data[i][5],hours:data[i][6],status:data[i][7],wfh:data[i][8]});
  }
  return result;
}

function getMyAttendance(month,year){var u=getCurrentUser();return u&&u.employeeId?getAttendanceForEmployee(u.employeeId,month,year):[];}

function getAllAttendanceToday(){
  if(!canManage()) return [];
  var ss=SpreadsheetApp.getActiveSpreadsheet(), sheet=ss.getSheetByName(SHEETS.ATTENDANCE);
  if(!sheet||sheet.getLastRow()<=1) return [];
  var data=sheet.getDataRange().getValues(), today=_fmtDate(new Date()), result=[];
  for(var i=1;i<data.length;i++){if(data[i][0]&&_fmtDate(data[i][3])===today) result.push({employeeId:data[i][1],name:data[i][2],firstIn:data[i][4],lastOut:data[i][5],hours:data[i][6],status:data[i][7]});}
  return result;
}

function _inRange(lat,lon){
  if(!lat||!lon) return false;
  var R=6371000,φ1=CONFIG.OFFICE_LAT*Math.PI/180,φ2=lat*Math.PI/180;
  var Δφ=(lat-CONFIG.OFFICE_LAT)*Math.PI/180,Δλ=(lon-CONFIG.OFFICE_LON)*Math.PI/180;
  var a=Math.sin(Δφ/2)*Math.sin(Δφ/2)+Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)*Math.sin(Δλ/2);
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))<=CONFIG.OFFICE_RADIUS_M;
}

// ─── SECTION 8: LEAVE ────────────────────────────────────────
function getLeaveTypes(){var ss=SpreadsheetApp.getActiveSpreadsheet(),sheet=ss.getSheetByName(SHEETS.LEAVE_TYPES);if(!sheet) return [];var data=sheet.getDataRange().getValues(),r=[];for(var i=1;i<data.length;i++){if(data[i][0]) r.push({id:data[i][0],code:data[i][1],name:data[i][2],daysPerYear:data[i][3],isPaid:data[i][4]});}return r;}

function getLeaveBalancesForEmployee(empId){
  var ss=SpreadsheetApp.getActiveSpreadsheet(),sheet=ss.getSheetByName(SHEETS.LEAVE_BALANCES);
  if(!sheet) return [];
  var data=sheet.getDataRange().getValues(),yr=new Date().getFullYear().toString(),r=[];
  for(var i=1;i<data.length;i++){if(data[i][1]===empId&&data[i][9].toString()===yr) r.push({id:data[i][0],leaveTypeId:data[i][3],leaveTypeName:data[i][4],allocated:+data[i][5]||0,used:+data[i][6]||0,pending:+data[i][7]||0,remaining:+data[i][8]||0});}
  return r;
}
function getMyLeaveBalances(){var u=getCurrentUser();return u&&u.employeeId?getLeaveBalancesForEmployee(u.employeeId):[];}

function _seedLeaveBalances(ss,empId,empName){
  var lt=ss.getSheetByName(SHEETS.LEAVE_TYPES).getDataRange().getValues();
  var lb=ss.getSheetByName(SHEETS.LEAVE_BALANCES),yr=new Date().getFullYear();
  for(var i=1;i<lt.length;i++){if(!lt[i][0]) continue;var a=parseFloat(lt[i][3])||0;lb.appendRow(["LB-"+Date.now()+i,empId,empName,lt[i][0],lt[i][2],a,0,0,a,yr]);}
}

function getLeaveRequests(filters){
  var user=getCurrentUser();
  var ss=SpreadsheetApp.getActiveSpreadsheet(),sheet=ss.getSheetByName(SHEETS.LEAVE_REQUESTS);
  if(!sheet||sheet.getLastRow()<=1) return [];
  var data=sheet.getDataRange().getValues(),r=[];
  filters=filters||{};
  for(var i=1;i<data.length;i++){
    if(!data[i][0]) continue;
    if(!canManage()&&data[i][1]!==(user?user.employeeId:"")) continue;
    if(filters.status&&data[i][9]!==filters.status) continue;
    r.push({id:data[i][0],employeeId:data[i][1],employeeName:data[i][2],leaveTypeId:data[i][3],leaveTypeName:data[i][4],fromDate:data[i][5]?_fmtDate(data[i][5]):"",toDate:data[i][6]?_fmtDate(data[i][6]):"",days:data[i][7],reason:data[i][8],status:data[i][9],createdAt:data[i][13]?_fmtDate(data[i][13]):""});
  }
  return r.reverse();
}

function applyLeave(req){
  var user=getCurrentUser();
  if(!user||!user.employeeId) return {success:false,error:"No employee profile"};
  var days=Math.ceil((new Date(req.toDate)-new Date(req.fromDate))/86400000)+1;
  var ss=SpreadsheetApp.getActiveSpreadsheet(),sheet=ss.getSheetByName(SHEETS.LEAVE_REQUESTS);
  var emp=getEmployee(user.employeeId), ltName=_ltName(ss,req.leaveTypeId);
  var id="LR-"+Date.now();
  sheet.appendRow([id,user.employeeId,emp?emp.firstName+" "+emp.lastName:user.name,req.leaveTypeId,ltName,req.fromDate,req.toDate,days,req.reason,"PENDING","","","",new Date()]);
  _updateLB(ss,user.employeeId,req.leaveTypeId,0,days);
  _notify("",user.employeeId,"Leave Applied","Your "+ltName+" for "+days+" day(s) is pending approval","INFO");
  _notifyAdmins(ss,"Leave Request",(emp?emp.firstName+" "+emp.lastName:user.name)+" applied for "+days+"d of "+ltName);
  return {success:true,id:id,days:days};
}

function approveLeave(id,approve){
  if(!canManage()) return {success:false,error:"Unauthorized"};
  var user=getCurrentUser(),ss=SpreadsheetApp.getActiveSpreadsheet();
  var sheet=ss.getSheetByName(SHEETS.LEAVE_REQUESTS), data=sheet.getDataRange().getValues();
  for(var i=1;i<data.length;i++){
    if(data[i][0]===id){
      var status=approve?"APPROVED":"REJECTED";
      sheet.getRange(i+1,10).setValue(status); sheet.getRange(i+1,11).setValue(user.employeeId); sheet.getRange(i+1,12).setValue(user.name); sheet.getRange(i+1,13).setValue(new Date());
      if(approve) _updateLB(ss,data[i][1],data[i][3],+data[i][7],-data[i][7]);
      else _updateLB(ss,data[i][1],data[i][3],0,-data[i][7]);
      _notify("",data[i][1],"Leave "+status,"Your leave request was "+status.toLowerCase(),approve?"SUCCESS":"ERROR");
      return {success:true};
    }
  }
  return {success:false};
}

function cancelLeave(id){
  var user=getCurrentUser(), ss=SpreadsheetApp.getActiveSpreadsheet();
  var sheet=ss.getSheetByName(SHEETS.LEAVE_REQUESTS), data=sheet.getDataRange().getValues();
  for(var i=1;i<data.length;i++){
    if(data[i][0]===id&&data[i][1]===user.employeeId&&data[i][9]==="PENDING"){
      sheet.getRange(i+1,10).setValue("CANCELLED");
      _updateLB(ss,data[i][1],data[i][3],0,-data[i][7]);
      return {success:true};
    }
  }
  return {success:false};
}

function _ltName(ss,ltId){var d=ss.getSheetByName(SHEETS.LEAVE_TYPES).getDataRange().getValues();for(var i=1;i<d.length;i++){if(d[i][0]===ltId) return d[i][2];}return ltId;}
function _updateLB(ss,empId,ltId,addUsed,addPending){
  var sheet=ss.getSheetByName(SHEETS.LEAVE_BALANCES),data=sheet.getDataRange().getValues(),yr=new Date().getFullYear().toString();
  for(var i=1;i<data.length;i++){
    if(data[i][1]===empId&&data[i][3]===ltId&&data[i][9].toString()===yr){
      var u=(+data[i][6]||0)+addUsed, p=(+data[i][7]||0)+addPending, a=+data[i][5]||0;
      sheet.getRange(i+1,7).setValue(Math.max(0,u)); sheet.getRange(i+1,8).setValue(Math.max(0,p)); sheet.getRange(i+1,9).setValue(Math.max(0,a-u-p));
      return;
    }
  }
}

// ─── SECTION 9: ONBOARDING ───────────────────────────────────
var DEFAULT_TASKS=[
  {title:"Offer Letter Signed",          category:"DOCUMENTATION", desc:"Send and collect signed offer letter"},
  {title:"ID Proof Submission",           category:"DOCUMENTATION", desc:"Collect Aadhaar, PAN card copies"},
  {title:"Educational Certificates",      category:"DOCUMENTATION", desc:"Collect degree and marksheet copies"},
  {title:"Bank Account Details",          category:"FINANCE",       desc:"Collect bank account and IFSC details"},
  {title:"Laptop & Equipment Allocation", category:"ASSET",         desc:"Assign laptop, peripherals, accessories"},
  {title:"Email Account Creation",        category:"IT_SETUP",      desc:"Create official company email account"},
  {title:"Slack & Tools Access",          category:"IT_SETUP",      desc:"Add to Slack, Notion, GitHub, Jira"},
  {title:"HR Policy Briefing",            category:"ORIENTATION",   desc:"Walk through leave, attendance, payroll policies"},
  {title:"Team Introduction",             category:"SOCIAL",        desc:"Introduce to team and key stakeholders"},
  {title:"Manager 1:1",                   category:"ORIENTATION",   desc:"First meeting with direct manager"},
  {title:"PF & ESI Enrollment",           category:"COMPLIANCE",    desc:"Submit PF nomination and ESI forms"},
  {title:"Background Verification",       category:"COMPLIANCE",    desc:"Initiate BGV process"},
];

function createOnboarding(hire){
  if(!canAdmin()) return {success:false,error:"Unauthorized"};
  var ss=SpreadsheetApp.getActiveSpreadsheet(), sheet=ss.getSheetByName(SHEETS.ONBOARDING);
  var id="OH-"+Date.now();
  sheet.appendRow([id,hire.employeeId||"",hire.firstName+" "+hire.lastName,hire.email,hire.designation,hire.department,hire.joiningDate,"IN_PROGRESS",0,DEFAULT_TASKS.length,new Date()]);
  var ts=ss.getSheetByName(SHEETS.ONBOARDING_TASKS);
  DEFAULT_TASKS.forEach(function(t,i){ ts.appendRow(["OT-"+Date.now()+"-"+i,id,hire.employeeId||"",t.title,t.category,t.desc,"PENDING","","","",""]); });
  _notifyAdmins(ss,"New Onboarding",hire.firstName+" "+hire.lastName+" joining on "+hire.joiningDate);
  return {success:true,id:id};
}

function getOnboardingList(){
  var ss=SpreadsheetApp.getActiveSpreadsheet(),sheet=ss.getSheetByName(SHEETS.ONBOARDING);
  if(!sheet||sheet.getLastRow()<=1) return [];
  var data=sheet.getDataRange().getValues(),r=[];
  for(var i=1;i<data.length;i++){if(data[i][0]) r.push({id:data[i][0],employeeId:data[i][1],name:data[i][2],email:data[i][3],designation:data[i][4],department:data[i][5],joiningDate:data[i][6]?_fmtDate(data[i][6]):"",status:data[i][7],completedTasks:+data[i][8]||0,totalTasks:+data[i][9]||0});}
  return r.reverse();
}

function getOnboardingTasks(hireId){
  var ss=SpreadsheetApp.getActiveSpreadsheet(),sheet=ss.getSheetByName(SHEETS.ONBOARDING_TASKS);
  if(!sheet) return [];
  var data=sheet.getDataRange().getValues(),r=[];
  for(var i=1;i<data.length;i++){if(data[i][1]===hireId) r.push({id:data[i][0],title:data[i][3],category:data[i][4],description:data[i][5],status:data[i][6],assignedTo:data[i][7],dueDate:data[i][8],completedAt:data[i][9],notes:data[i][10]});}
  return r;
}

function updateOnboardingTask(taskId,status,notes){
  var ss=SpreadsheetApp.getActiveSpreadsheet(),sheet=ss.getSheetByName(SHEETS.ONBOARDING_TASKS);
  var data=sheet.getDataRange().getValues();
  for(var i=1;i<data.length;i++){
    if(data[i][0]===taskId){
      sheet.getRange(i+1,7).setValue(status);
      if(notes) sheet.getRange(i+1,11).setValue(notes);
      if(status==="COMPLETED") sheet.getRange(i+1,10).setValue(new Date());
      _syncOnboardingProgress(ss,data[i][1]);
      return {success:true};
    }
  }
  return {success:false};
}

function _syncOnboardingProgress(ss,hireId){
  var ts=ss.getSheetByName(SHEETS.ONBOARDING_TASKS).getDataRange().getValues();
  var hs=ss.getSheetByName(SHEETS.ONBOARDING).getDataRange().getValues();
  var done=0,total=0;
  for(var i=1;i<ts.length;i++){if(ts[i][1]===hireId){total++;if(ts[i][6]==="COMPLETED") done++;}}
  for(var i=1;i<hs.length;i++){if(hs[i][0]===hireId){ss.getSheetByName(SHEETS.ONBOARDING).getRange(i+1,9).setValue(done);if(done===total&&total>0) ss.getSheetByName(SHEETS.ONBOARDING).getRange(i+1,8).setValue("COMPLETED");break;}}
}

// ─── SECTION 10: SEPARATION & OFFBOARDING ───────────────────
function getSeparations(){
  if(!canManage()) return [];
  var ss=SpreadsheetApp.getActiveSpreadsheet(),sheet=ss.getSheetByName(SHEETS.SEPARATION);
  if(!sheet||sheet.getLastRow()<=1) return [];
  var data=sheet.getDataRange().getValues(),r=[];
  for(var i=1;i<data.length;i++){if(data[i][0]) r.push({id:data[i][0],employeeId:data[i][1],employeeName:data[i][2],type:data[i][3],initiatedDate:data[i][4]?_fmtDate(data[i][4]):"",lastWorkingDay:data[i][5]?_fmtDate(data[i][5]):"",reason:data[i][6],status:data[i][7],noticePeriod:data[i][8]});}
  return r.reverse();
}

function initiateSeparation(d){
  if(!canAdmin()) return {success:false,error:"Unauthorized"};
  var ss=SpreadsheetApp.getActiveSpreadsheet(),id="SEP-"+Date.now();
  ss.getSheetByName(SHEETS.SEPARATION).appendRow([id,d.employeeId,d.employeeName,d.type,new Date(),d.lastWorkingDay,d.reason,"INITIATED",d.noticePeriod||30,false,"",new Date()]);
  var empSheet=ss.getSheetByName(SHEETS.EMPLOYEES),empData=empSheet.getDataRange().getValues();
  for(var i=1;i<empData.length;i++){if(empData[i][0]===d.employeeId){empSheet.getRange(i+1,13).setValue("OFFBOARDING");break;}}
  return {success:true,id:id};
}

// ─── SECTION 11: PAYROLL ─────────────────────────────────────
function getPayrollRuns(){
  if(!canAdmin()) return [];
  var ss=SpreadsheetApp.getActiveSpreadsheet(),sheet=ss.getSheetByName(SHEETS.PAYROLL_RUNS);
  if(!sheet||sheet.getLastRow()<=1) return [];
  var data=sheet.getDataRange().getValues(),r=[];
  for(var i=1;i<data.length;i++){if(data[i][0]) r.push({id:data[i][0],month:data[i][1],year:data[i][2],status:data[i][3],totalGross:data[i][4],totalNet:data[i][6],processedAt:data[i][8]?_fmtDate(data[i][8]):""});}
  return r.reverse();
}

function processPayroll(month,year){
  if(!canAdmin()) return {success:false,error:"Unauthorized"};
  var ss=SpreadsheetApp.getActiveSpreadsheet(),user=getCurrentUser();
  var empData=ss.getSheetByName(SHEETS.EMPLOYEES).getDataRange().getValues();
  var runSheet=ss.getSheetByName(SHEETS.PAYROLL_RUNS), lineSheet=ss.getSheetByName(SHEETS.PAYROLL_LINES);
  var runId="PR-"+Date.now(),tg=0,td=0,tn=0;
  for(var i=1;i<empData.length;i++){
    if(!empData[i][0]||empData[i][12]!=="ACTIVE") continue;
    var basic=+empData[i][23]||0, hra=+empData[i][24]||0, sp=+empData[i][25]||0;
    var gross=basic+hra+sp, pf=Math.round(basic*0.12), pt=200, tds=Math.max(0,Math.round((gross-50000/12)*0.1));
    var ded=pf+pt+tds, net=gross-ded;
    tg+=gross; td+=ded; tn+=net;
    lineSheet.appendRow(["PL-"+Date.now()+"-"+i,runId,empData[i][0],empData[i][2]+" "+empData[i][3],basic,hra,sp,gross,pf,pt,tds,ded,net,26,26,"PAID",new Date()]);
  }
  runSheet.appendRow([runId,month,year,"PAID",tg,td,tn,user.name,new Date(),new Date(),new Date()]);
  return {success:true,id:runId,totalNet:tn,headcount:empData.length-1};
}

function getMyPayslips(){
  var user=getCurrentUser(); if(!user||!user.employeeId) return [];
  var ss=SpreadsheetApp.getActiveSpreadsheet();
  var lines=ss.getSheetByName(SHEETS.PAYROLL_LINES); if(!lines||lines.getLastRow()<=1) return [];
  var ld=lines.getDataRange().getValues();
  var runs=ss.getSheetByName(SHEETS.PAYROLL_RUNS),rd=runs?runs.getDataRange().getValues():[[]];
  var runMap={};for(var i=1;i<rd.length;i++){if(rd[i][0]) runMap[rd[i][0]]={month:rd[i][1],year:rd[i][2]};}
  var r=[];
  for(var i=1;i<ld.length;i++){if(ld[i][2]!==user.employeeId) continue;var run=runMap[ld[i][1]]||{};r.push({id:ld[i][0],runId:ld[i][1],month:run.month,year:run.year,basic:ld[i][4],hra:ld[i][5],special:ld[i][6],gross:ld[i][7],pf:ld[i][8],pt:ld[i][9],tds:ld[i][10],deductions:ld[i][11],net:ld[i][12]});}
  return r.reverse();
}

// ─── SECTION 12: DOCUMENTS ───────────────────────────────────
function getDocuments(empId){
  var user=getCurrentUser();
  var targetId=empId||(user?user.employeeId:"");
  if(!canAdmin()&&targetId!==(user?user.employeeId:"")) return [];
  var ss=SpreadsheetApp.getActiveSpreadsheet(),sheet=ss.getSheetByName(SHEETS.DOCUMENTS);
  if(!sheet||sheet.getLastRow()<=1) return [];
  var data=sheet.getDataRange().getValues(),r=[];
  for(var i=1;i<data.length;i++){if(!data[i][0]) continue;if(!canAdmin()&&data[i][1]!==targetId) continue;if(canAdmin()&&empId&&data[i][1]!==empId) continue;r.push({id:data[i][0],employeeId:data[i][1],employeeName:data[i][2],type:data[i][3],title:data[i][4],driveUrl:data[i][5],uploadedBy:data[i][6],verifiedBy:data[i][7],status:data[i][9],createdAt:data[i][10]?_fmtDate(data[i][10]):""});}
  return r.reverse();
}

function saveDocument(doc){
  var user=getCurrentUser(); if(!user) return {success:false,error:"Not authenticated"};
  var ss=SpreadsheetApp.getActiveSpreadsheet(),sheet=ss.getSheetByName(SHEETS.DOCUMENTS);
  var emp=user.employeeId?getEmployee(user.employeeId):null;
  var id="DOC-"+Date.now();
  sheet.appendRow([id,doc.employeeId||user.employeeId,emp?emp.firstName+" "+emp.lastName:user.name,doc.type,doc.title,doc.driveUrl||"",user.name,"","","PENDING",new Date()]);
  return {success:true,id:id};
}

function verifyDocument(docId){
  if(!canAdmin()) return {success:false,error:"Unauthorized"};
  var user=getCurrentUser(),ss=SpreadsheetApp.getActiveSpreadsheet(),sheet=ss.getSheetByName(SHEETS.DOCUMENTS);
  var data=sheet.getDataRange().getValues();
  for(var i=1;i<data.length;i++){if(data[i][0]===docId){sheet.getRange(i+1,8).setValue(user.name);sheet.getRange(i+1,9).setValue(new Date());sheet.getRange(i+1,10).setValue("VERIFIED");return {success:true};}}
  return {success:false};
}

// ─── SECTION 13: REIMBURSEMENTS ──────────────────────────────
function getReimbursements(){
  var user=getCurrentUser(),ss=SpreadsheetApp.getActiveSpreadsheet(),sheet=ss.getSheetByName(SHEETS.REIMBURSEMENTS);
  if(!sheet||sheet.getLastRow()<=1) return [];
  var data=sheet.getDataRange().getValues(),r=[];
  for(var i=1;i<data.length;i++){if(!data[i][0]) continue;if(!canAdmin()&&data[i][1]!==(user?user.employeeId:"")) continue;r.push({id:data[i][0],employeeId:data[i][1],employeeName:data[i][2],category:data[i][3],amount:data[i][4],date:data[i][5]?_fmtDate(data[i][5]):"",description:data[i][6],receiptUrl:data[i][7],status:data[i][8]});}
  return r.reverse();
}

function submitReimbursement(req){
  var user=getCurrentUser(); if(!user) return {success:false,error:"Not authenticated"};
  var ss=SpreadsheetApp.getActiveSpreadsheet(),sheet=ss.getSheetByName(SHEETS.REIMBURSEMENTS);
  var emp=user.employeeId?getEmployee(user.employeeId):null;
  var id="RMB-"+Date.now();
  sheet.appendRow([id,user.employeeId,emp?emp.firstName+" "+emp.lastName:user.name,req.category,req.amount,req.date,req.description,req.receiptUrl||"","PENDING","","","",new Date()]);
  return {success:true,id:id};
}

function approveReimbursement(id,approve){
  if(!canManage()) return {success:false,error:"Unauthorized"};
  var user=getCurrentUser(),ss=SpreadsheetApp.getActiveSpreadsheet(),sheet=ss.getSheetByName(SHEETS.REIMBURSEMENTS);
  var data=sheet.getDataRange().getValues();
  for(var i=1;i<data.length;i++){if(data[i][0]===id){sheet.getRange(i+1,9).setValue(approve?"APPROVED":"REJECTED");sheet.getRange(i+1,10).setValue(user.name);sheet.getRange(i+1,11).setValue(new Date());return {success:true};}}
  return {success:false};
}

// ─── SECTION 14: CALENDAR ────────────────────────────────────
function getCalendarData(month,year){
  var ss=SpreadsheetApp.getActiveSpreadsheet(), now=new Date();
  var m=month||(now.getMonth()+1), y=year||now.getFullYear();
  var prefix=y+"-"+(m<10?"0":"")+m, items=[];
  var hd=ss.getSheetByName(SHEETS.HOLIDAYS);
  if(hd&&hd.getLastRow()>1){var dd=hd.getDataRange().getValues();for(var i=1;i<dd.length;i++){if(dd[i][1]&&dd[i][1].toString().startsWith(prefix)) items.push({date:dd[i][1],title:dd[i][2],type:"HOLIDAY",color:"#ef4444"});}}
  var ed=ss.getSheetByName(SHEETS.EVENTS);
  if(ed&&ed.getLastRow()>1){var dd=ed.getDataRange().getValues();for(var i=1;i<dd.length;i++){if(dd[i][2]&&dd[i][2].toString().startsWith(prefix)) items.push({date:dd[i][2],title:dd[i][1],type:"EVENT",color:"#8b5cf6"});}}
  var lr=ss.getSheetByName(SHEETS.LEAVE_REQUESTS);
  if(lr&&lr.getLastRow()>1){var dd=lr.getDataRange().getValues();for(var i=1;i<dd.length;i++){if(dd[i][9]==="APPROVED"&&dd[i][5]&&dd[i][5].toString().startsWith(prefix)) items.push({date:_fmtDate(dd[i][5]),title:dd[i][2]+" ("+dd[i][4]+")",type:"LEAVE",color:"#3b82f6"});}}
  return {items:items,month:m,year:y};
}

function saveEvent(evt){
  if(!canAdmin()) return {success:false,error:"Unauthorized"};
  var ss=SpreadsheetApp.getActiveSpreadsheet(),sheet=ss.getSheetByName(SHEETS.EVENTS);
  sheet.appendRow(["EVT-"+Date.now(),evt.title,evt.date,evt.endDate||"",evt.type||"EVENT",evt.description||"",evt.allDay||true,new Date()]);
  return {success:true};
}

// ─── SECTION 15: REPORTS ─────────────────────────────────────
function getReportData(type){
  if(!canManage()) return {success:false,error:"Unauthorized"};
  var ss=SpreadsheetApp.getActiveSpreadsheet();
  if(type==="headcount"){
    var d=ss.getSheetByName(SHEETS.EMPLOYEES).getDataRange().getValues(),byDept={},byType={},byStatus={},total=0;
    for(var i=1;i<d.length;i++){if(!d[i][0]) continue;total++;var dept=d[i][8]||"Unknown",typ=d[i][11]||"Unknown",st=d[i][12]||"Unknown";byDept[dept]=(byDept[dept]||0)+1;byType[typ]=(byType[typ]||0)+1;byStatus[st]=(byStatus[st]||0)+1;}
    return {byDept:byDept,byType:byType,byStatus:byStatus,total:total};
  }
  if(type==="leave"){
    var d=ss.getSheetByName(SHEETS.LEAVE_REQUESTS).getDataRange().getValues(),byType={},byStatus={};
    for(var i=1;i<d.length;i++){if(!d[i][0]) continue;byType[d[i][4]]=(byType[d[i][4]]||0)+1;byStatus[d[i][9]]=(byStatus[d[i][9]]||0)+1;}
    return {byType:byType,byStatus:byStatus,total:d.length-1};
  }
  if(type==="payroll"){
    var d=ss.getSheetByName(SHEETS.PAYROLL_RUNS).getDataRange().getValues(),runs=[];
    for(var i=1;i<d.length;i++){if(d[i][0]) runs.push({month:d[i][1],year:d[i][2],totalGross:d[i][4],totalNet:d[i][6]});}
    return {runs:runs.slice(-12)};
  }
  return {};
}

// ─── SECTION 16: SETTINGS ────────────────────────────────────
function getSettings(){
  var ss=SpreadsheetApp.getActiveSpreadsheet(),sheet=ss.getSheetByName(SHEETS.CONFIG);
  if(!sheet) return {};
  var data=sheet.getDataRange().getValues(),r={};
  for(var i=1;i<data.length;i++){if(data[i][0]) r[data[i][0]]=data[i][1];}
  return r;
}

function saveSettings(settings){
  if(!canAdmin()) return {success:false,error:"Unauthorized"};
  var ss=SpreadsheetApp.getActiveSpreadsheet(),sheet=ss.getSheetByName(SHEETS.CONFIG);
  var data=sheet.getDataRange().getValues();
  Object.keys(settings).forEach(function(k){
    var found=false;
    for(var i=1;i<data.length;i++){if(data[i][0]===k){sheet.getRange(i+1,2).setValue(settings[k]);found=true;break;}}
    if(!found) sheet.appendRow([k,settings[k]]);
  });
  return {success:true};
}

function getUsers(){
  if(!canAdmin()) return [];
  var ss=SpreadsheetApp.getActiveSpreadsheet(),sheet=ss.getSheetByName(SHEETS.USERS);
  if(!sheet||sheet.getLastRow()<=1) return [];
  var data=sheet.getDataRange().getValues(),r=[];
  for(var i=1;i<data.length;i++){if(data[i][0]) r.push({id:data[i][0],email:data[i][1],role:data[i][2],isActive:data[i][3],employeeId:data[i][4],name:data[i][5]});}
  return r;
}

function updateUserRole(userId,role){
  if(!canAdmin()) return {success:false,error:"Unauthorized"};
  var ss=SpreadsheetApp.getActiveSpreadsheet(),sheet=ss.getSheetByName(SHEETS.USERS),data=sheet.getDataRange().getValues();
  for(var i=1;i<data.length;i++){if(data[i][0]===userId){sheet.getRange(i+1,3).setValue(role);return {success:true};}}
  return {success:false};
}

// ─── SECTION 17: NOTIFICATIONS ───────────────────────────────
function _notify(userId,empId,title,msg,type){
  var ss=SpreadsheetApp.getActiveSpreadsheet(),sheet=ss.getSheetByName(SHEETS.NOTIFICATIONS);
  sheet.appendRow(["NTF-"+Date.now(),userId,empId,"",title,msg,type||"INFO",false,new Date()]);
}

function _notifyAdmins(ss,title,msg){
  var users=ss.getSheetByName(SHEETS.USERS).getDataRange().getValues();
  var ns=ss.getSheetByName(SHEETS.NOTIFICATIONS);
  for(var i=1;i<users.length;i++){if(users[i][2]==="SUPER_ADMIN"||users[i][2]==="HR_ADMIN") ns.appendRow(["NTF-"+Date.now()+"-"+i,users[i][0],users[i][4],"",title,msg,"INFO",false,new Date()]);}
}

function getMyNotifications(){
  var user=getCurrentUser(); if(!user) return [];
  var ss=SpreadsheetApp.getActiveSpreadsheet(),sheet=ss.getSheetByName(SHEETS.NOTIFICATIONS);
  if(!sheet||sheet.getLastRow()<=1) return [];
  var data=sheet.getDataRange().getValues(),r=[];
  for(var i=1;i<data.length;i++){if(!data[i][0]) continue;if(data[i][1]===user.id||data[i][2]===user.employeeId) r.push({id:data[i][0],title:data[i][4],message:data[i][5],type:data[i][6],read:data[i][7],createdAt:data[i][8]?_fmtDate(data[i][8]):""});}
  return r.slice(-20).reverse();
}

function markNotificationsRead(){
  var user=getCurrentUser(); if(!user) return;
  var ss=SpreadsheetApp.getActiveSpreadsheet(),sheet=ss.getSheetByName(SHEETS.NOTIFICATIONS),data=sheet.getDataRange().getValues();
  for(var i=1;i<data.length;i++){if((data[i][1]===user.id||data[i][2]===user.employeeId)&&!data[i][7]) sheet.getRange(i+1,8).setValue(true);}
}

// ─── SECTION 18: AUDIT LOG ────────────────────────────────────
function _audit(action,entity,entityId,details){
  var user=getCurrentUser(),ss=SpreadsheetApp.getActiveSpreadsheet();
  ss.getSheetByName(SHEETS.AUDIT_LOG).appendRow(["AL-"+Date.now(),user?user.id:"",action,entity,entityId,details,new Date()]);
}

// ─── SECTION 19: TRIGGERS ────────────────────────────────────
function createAllTriggers(){
  ScriptApp.getProjectTriggers().forEach(function(t){ScriptApp.deleteTrigger(t);});
  ScriptApp.newTrigger("dailyAttendanceCheck").timeBased().atHour(9).everyDays(1).create();
  ScriptApp.newTrigger("monthlyPayrollReminder").timeBased().onMonthDay(24).atHour(10).create();
  ScriptApp.newTrigger("weeklyReport").timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(9).create();
  return {success:true,message:"3 triggers created: daily attendance, monthly payroll reminder, weekly report"};
}

function dailyAttendanceCheck(){
  var ss=SpreadsheetApp.getActiveSpreadsheet();
  var empData=ss.getSheetByName(SHEETS.EMPLOYEES).getDataRange().getValues();
  var attSheet=ss.getSheetByName(SHEETS.ATTENDANCE), attData=attSheet.getDataRange().getValues();
  var today=_fmtDate(new Date()), present=[];
  for(var i=1;i<attData.length;i++){if(_fmtDate(attData[i][3])===today) present.push(attData[i][1]);}
  for(var i=1;i<empData.length;i++){
    if(!empData[i][0]||empData[i][12]!=="ACTIVE") continue;
    if(present.indexOf(empData[i][0])===-1){
      var onLeave=_isOnLeave(ss,empData[i][0],today);
      if(!onLeave) attSheet.appendRow(["ATT-"+Date.now()+"-"+i,empData[i][0],empData[i][2]+" "+empData[i][3],new Date(),"","","0","ABSENT",false,"Auto-marked",new Date()]);
    }
  }
}

function _isOnLeave(ss,empId,dateStr){
  var d=ss.getSheetByName(SHEETS.LEAVE_REQUESTS).getDataRange().getValues(),dt=new Date(dateStr);
  for(var i=1;i<d.length;i++){if(d[i][1]===empId&&d[i][9]==="APPROVED"){try{if(dt>=new Date(d[i][5])&&dt<=new Date(d[i][6])) return true;}catch(e){}}}
  return false;
}

function monthlyPayrollReminder(){_notifyAdmins(SpreadsheetApp.getActiveSpreadsheet(),"Payroll Reminder","Monthly payroll is due. Please run payroll from the Payroll section.");}
function weeklyReport(){var r=getLeaveRequests({status:"PENDING"});_notifyAdmins(SpreadsheetApp.getActiveSpreadsheet(),"Weekly Report","Pending leave requests: "+r.length);}

function onOpen(){
  SpreadsheetApp.getUi().createMenu("🏢 AntBox HRMS")
    .addItem("🚀 Setup All Sheets","setupSpreadsheet")
    .addItem("⚙️ Create Triggers","createAllTriggers")
    .addSeparator()
    .addItem("📋 Run Attendance Check","dailyAttendanceCheck")
    .addItem("🌐 Open Web App","openWebApp")
    .addToUi();
}

function openWebApp(){
  var url=ScriptApp.getService().getUrl();
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput('<script>window.open("'+url+'","_blank");google.script.host.close();</script>'),"Opening AntBox HRMS...");
}
