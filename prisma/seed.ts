import "dotenv/config";
import { PrismaClient, TaskCategory } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();


const ANTBOX_HOLIDAYS_2026 = [
  { name: "New Year's Day", date: "2026-01-01", type: "MANDATORY", description: "Mandatory" },
  { name: "Makar Sankranti", date: "2026-01-14", type: "OPTIONAL", description: "Optional (Any 2)" },
  { name: "Republic Day", date: "2026-01-26", type: "MANDATORY", description: "Mandatory" },
  { name: "Holi", date: "2026-03-04", type: "MANDATORY", description: "Mandatory" },
  { name: "Ramzan Id/Eid-ul-Fitr", date: "2026-03-20", type: "MANDATORY", description: "Mandatory" },
  { name: "Uktal Diwas", date: "2026-04-01", type: "MANDATORY", description: "Mandatory" },
  { name: "Good Friday", date: "2026-04-03", type: "OPTIONAL", description: "Optional (Any 2)" },
  { name: "Bakri Eid", date: "2026-05-27", type: "OPTIONAL", description: "Optional (Any 2)" },
  { name: "Raja Sankranti", date: "2026-06-16", type: "OPTIONAL", description: "Optional (Any 2)" },
  { name: "Rath Yatra Day", date: "2026-07-16", type: "MANDATORY", description: "Mandatory" },
  { name: "Ganesh Chaturthi", date: "2026-09-14", type: "MANDATORY", description: "Mandatory" },
  { name: "Gandhi Jayanti", date: "2026-10-02", type: "MANDATORY", description: "Mandatory" },
  { name: "Durga Puja(Maha", date: "2026-10-19", type: "OPTIONAL", description: "Optional (Any 2)" },
  { name: "Dussehra", date: "2026-10-21", type: "MANDATORY", description: "Mandatory" },
  { name: "Christmas", date: "2026-12-25", type: "MANDATORY", description: "Mandatory" },
];


const DEFAULT_ONBOARDING_TASKS: {
  title: string;
  category: TaskCategory;
  assignedTo: string;
  dueDaysFrom: number;
  order: number;
}[] = [
  { title: "Submit Aadhaar / PAN Copy", category: "DOCUMENTATION", assignedTo: "Employee", dueDaysFrom: -3, order: 1 },
  { title: "Submit Bank Account Details", category: "DOCUMENTATION", assignedTo: "Employee", dueDaysFrom: -3, order: 2 },
  { title: "Submit Educational Certificates", category: "DOCUMENTATION", assignedTo: "Employee", dueDaysFrom: -3, order: 3 },
  { title: "Sign NDA & Internship Agreement", category: "DOCUMENTATION", assignedTo: "Employee", dueDaysFrom: 1, order: 4 },
  { title: "Create Company Email", category: "IT_SETUP", assignedTo: "IT Admin", dueDaysFrom: -1, order: 5 },
  { title: "Add to Slack & Notion", category: "IT_SETUP", assignedTo: "IT Admin", dueDaysFrom: 1, order: 6 },
  { title: "Set up GitHub access", category: "IT_SETUP", assignedTo: "IT Admin", dueDaysFrom: 1, order: 7 },
  { title: "Allocate Laptop/Device", category: "ASSET", assignedTo: "IT Admin", dueDaysFrom: 1, order: 8 },
  { title: "Schedule Day 1 Welcome Call", category: "ORIENTATION", assignedTo: "HR", dueDaysFrom: 1, order: 9 },
  { title: "Introduce to Team", category: "ORIENTATION", assignedTo: "HR", dueDaysFrom: 1, order: 10 },
  { title: "Company Culture & Values Session", category: "ORIENTATION", assignedTo: "HR", dueDaysFrom: 2, order: 11 },
  { title: "Complete POSH Training", category: "COMPLIANCE", assignedTo: "HR Admin", dueDaysFrom: 7, order: 12 },
];

async function main() {
  const departments = [
    { name: "Engineering", code: "ENG" },
    { name: "Marketing", code: "MKT" },
    { name: "Operations", code: "OPS" },
    { name: "GTM", code: "GTM" },
    { name: "Revenue Ops", code: "REV" },
    { name: "Data Analytics", code: "DATA" },
  ];

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { code: dept.code },
      create: dept,
      update: {},
    });
  }

  const ops = await prisma.department.findUniqueOrThrow({ where: { code: "OPS" } });
  const passwordHash = await bcrypt.hash("AntBox@2025", 12);

  // 1. Super Admin User
  await prisma.user.upsert({
    where: { email: "admin@theantbox.com" },
    create: {
      email: "admin@theantbox.com",
      passwordHash,
      role: "SUPER_ADMIN",
      employee: {
        create: {
          firstName: "Admin",
          lastName: "AntBox",
          email: "admin@theantbox.com",
          employeeId: "ANT-ADMIN",
          designation: "Super Admin",
          departmentId: ops.id,
          employmentType: "FULL_TIME",
          status: "ACTIVE",
          joiningDate: new Date("2024-01-01"),
          ctc: 1200000,
          basicSalary: 40000,
          hra: 20000,
          specialAllowance: 20000,
        },
      },
    },
    update: { passwordHash, role: "SUPER_ADMIN" },
  });

  const eng = await prisma.department.findUniqueOrThrow({ where: { code: "ENG" } });

  // Load real employees list
  const employeesPath = path.join(__dirname, "../scratch/employees.json");
  if (fs.existsSync(employeesPath)) {
    const employees = JSON.parse(fs.readFileSync(employeesPath, "utf-8"));
    console.log(`Seeding ${employees.length} real employees...`);
    
    let count = 0;
    for (const emp of employees) {
      count++;
      const isSuperAdmin = emp.officialEmail === "asutosh.sabat@theantbox.com";
      const isHrAdmin = emp.client === "Admin";
      
      const role = isSuperAdmin 
        ? "SUPER_ADMIN" 
        : isHrAdmin 
          ? "HR_ADMIN" 
          : emp.empType === "FULL_TIME" 
            ? "EMPLOYEE" 
            : "INTERN";
            
      const deptId = isHrAdmin ? ops.id : eng.id;
      const empStatus = emp.client === "Out of System" ? "INACTIVE" : "ACTIVE";
      
      console.log(`[${count}/${employees.length}] Upserting: ${emp.fullName} (${emp.officialEmail})`);
      
      await prisma.user.upsert({
        where: { email: emp.officialEmail },
        create: {
          email: emp.officialEmail,
          passwordHash,
          role,
          isActive: empStatus === "ACTIVE",
          employee: {
            create: {
              firstName: emp.firstName,
              lastName: emp.lastName,
              email: emp.officialEmail,
              personalEmail: emp.personalEmail,
              phone: emp.contactNumber || null,
              employeeId: emp.employeeId,
              designation: emp.designation,
              departmentId: deptId,
              employmentType: emp.empType,
              status: empStatus,
              joiningDate: new Date(emp.joiningDate),
              city: "Bhubaneswar",
              state: "Odisha",
              ctc: 480000,
              basicSalary: 20000,
              hra: 8000,
              specialAllowance: 12000,
            }
          }
        },
        update: {
          role,
          isActive: empStatus === "ACTIVE",
          employee: {
            update: {
              firstName: emp.firstName,
              lastName: emp.lastName,
              personalEmail: emp.personalEmail,
              phone: emp.contactNumber || null,
              employeeId: emp.employeeId,
              designation: emp.designation,
              departmentId: deptId,
              employmentType: emp.empType,
              status: empStatus,
              joiningDate: new Date(emp.joiningDate),
              city: "Bhubaneswar",
              state: "Odisha",
            }
          }
        }
      });
    }
  }


  const leaveTypes = [
    { name: "Paid/Quarter Leaves", code: "PAID_QUARTER", daysPerYear: 12, carryoverLimit: 0, isPaid: true, applicableTo: ["INTERN"] },
    { name: "Loss of Pay", code: "LOP", daysPerYear: 0, carryoverLimit: 0, isPaid: false, applicableTo: ["FULL_TIME", "INTERN", "PART_TIME", "CONTRACT"] },
    { name: "Academic Leaves", code: "ACADEMIC", daysPerYear: 0, carryoverLimit: 0, isPaid: true, applicableTo: ["INTERN"] },
    { name: "Privilege Leave", code: "PL", daysPerYear: 21, carryoverLimit: 15, isPaid: true, applicableTo: ["FULL_TIME"] },
    { name: "Sick Leave", code: "SL", daysPerYear: 7, carryoverLimit: 0, isPaid: true, applicableTo: ["FULL_TIME"] },
    { name: "Casual Leave", code: "CL", daysPerYear: 7, carryoverLimit: 0, isPaid: true, applicableTo: ["FULL_TIME"] },
    { name: "Floater", code: "FLOATER", daysPerYear: 1, carryoverLimit: 0, isPaid: true, applicableTo: ["FULL_TIME"] },
    { name: "Comp-off-Leave", code: "COMP_OFF", daysPerYear: 0, carryoverLimit: 0, isPaid: true, applicableTo: ["FULL_TIME"] },
    { name: "Optional Holiday", code: "OPTIONAL_HOLIDAY", daysPerYear: 2, carryoverLimit: 0, isPaid: true, applicableTo: ["FULL_TIME", "INTERN"] },
    { name: "Work From Home", code: "WFH", daysPerYear: 0, carryoverLimit: 0, isPaid: true, applicableTo: ["FULL_TIME", "INTERN", "PART_TIME", "CONTRACT"] },
  ];


  for (const lt of leaveTypes) {
    await prisma.leaveType.upsert({
      where: { code: lt.code },
      create: lt,
      update: {
        name: lt.name,
        daysPerYear: lt.daysPerYear,
        carryoverLimit: lt.carryoverLimit,
        isPaid: lt.isPaid,
        applicableTo: lt.applicableTo,
      },
    });
  }

  // Seed leave balances for all active employees for year 2026
  const dbLeaveTypes = await prisma.leaveType.findMany();
  const dbEmployees = await prisma.employee.findMany();
  console.log(`Seeding leave balances for ${dbEmployees.length} active employees...`);
  let lbCount = 0;
  for (const emp of dbEmployees) {
    lbCount++;
    if (lbCount % 10 === 0 || lbCount === dbEmployees.length) {
      console.log(`Seeding leave balances progress: [${lbCount}/${dbEmployees.length}]`);
    }
    for (const lt of dbLeaveTypes) {
      await prisma.leaveBalance.upsert({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: emp.id,
            leaveTypeId: lt.id,
            year: 2026,
          },
        },
        create: {
          employeeId: emp.id,
          leaveTypeId: lt.id,
          allocated: lt.daysPerYear,
          used: 2,
          year: 2026,
        },
        update: {},
      });
    }
  }

  for (const h of ANTBOX_HOLIDAYS_2026) {
    const date = new Date(h.date);
    const existing = await prisma.holiday.findFirst({
      where: { name: h.name, date },
    });
    if (!existing) {
      await prisma.holiday.create({
        data: { name: h.name, date, type: h.type, description: h.description },
      });
    }
  }


  const template = await prisma.onboardingTemplate.upsert({
    where: { id: "default-intern-template" },
    create: {
      id: "default-intern-template",
      name: "Default Intern Template",
      description: "Standard onboarding for AntBox interns",
      isDefault: true,
    },
    update: {},
  });

  const existingTasks = await prisma.onboardingTemplateTask.count({
    where: { templateId: template.id },
  });

  if (existingTasks === 0) {
    await prisma.onboardingTemplateTask.createMany({
      data: DEFAULT_ONBOARDING_TASKS.map((t) => ({
        templateId: template.id,
        ...t,
        isRequired: true,
      })),
    });
  }

  console.log("Seed completed: departments, admin, leave types, holidays, onboarding template");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
