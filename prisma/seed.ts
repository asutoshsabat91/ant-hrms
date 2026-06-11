import "dotenv/config";
import { PrismaClient, TaskCategory } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const INDIAN_HOLIDAYS_2025 = [
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
          employeeId: "ANT-001",
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

  // 2. HR Admin User
  await prisma.user.upsert({
    where: { email: "hr@theantbox.com" },
    create: {
      email: "hr@theantbox.com",
      passwordHash,
      role: "HR_ADMIN",
      employee: {
        create: {
          firstName: "Pooja",
          lastName: "Mishra",
          email: "hr@theantbox.com",
          employeeId: "ANT-012",
          designation: "HR Lead",
          departmentId: ops.id,
          employmentType: "FULL_TIME",
          status: "ACTIVE",
          joiningDate: new Date("2024-06-01"),
          ctc: 840000,
          basicSalary: 30000,
          hra: 15000,
          specialAllowance: 15000,
        },
      },
    },
    update: { passwordHash, role: "HR_ADMIN" },
  });

  // 3. Manager User
  const seededManager = await prisma.user.upsert({
    where: { email: "manager@theantbox.com" },
    create: {
      email: "manager@theantbox.com",
      passwordHash,
      role: "MANAGER",
      employee: {
        create: {
          firstName: "Rajesh",
          lastName: "Gupta",
          email: "manager@theantbox.com",
          employeeId: "ANT-013",
          designation: "Engineering Manager",
          departmentId: ops.id,
          employmentType: "FULL_TIME",
          status: "ACTIVE",
          joiningDate: new Date("2024-03-01"),
          ctc: 1800000,
          basicSalary: 60000,
          hra: 30000,
          specialAllowance: 40000,
        },
      },
    },
    update: { passwordHash, role: "MANAGER" },
    include: { employee: true },
  });

  // 4. Employee User
  await prisma.user.upsert({
    where: { email: "employee@theantbox.com" },
    create: {
      email: "employee@theantbox.com",
      passwordHash,
      role: "EMPLOYEE",
      employee: {
        create: {
          firstName: "Amit",
          lastName: "Sharma",
          email: "employee@theantbox.com",
          employeeId: "ANT-014",
          designation: "Software Engineer",
          departmentId: ops.id,
          managerId: seededManager.employee?.id,
          employmentType: "FULL_TIME",
          status: "ACTIVE",
          joiningDate: new Date("2025-01-01"),
          ctc: 720000,
          basicSalary: 25000,
          hra: 12500,
          specialAllowance: 12500,
          pan: "ABCDE1234F",
          uan: "100987654321",
          bankName: "State Bank of India",
          bankAccountNo: "30012345678",
          ifscCode: "SBIN0001234",
        },
      },
    },
    update: { passwordHash, role: "EMPLOYEE" },
  });

  const leaveTypes = [
    { name: "Sick Leave", code: "SL", daysPerYear: 7, carryoverLimit: 0, isPaid: true, applicableTo: ["FULL_TIME", "INTERN", "PART_TIME", "CONTRACT"] },
    { name: "Privilege Leave", code: "PL", daysPerYear: 21, carryoverLimit: 15, isPaid: true, applicableTo: ["FULL_TIME", "CONTRACT"] },
    { name: "Loss of Pay", code: "LOP", daysPerYear: 0, carryoverLimit: 0, isPaid: false, applicableTo: ["FULL_TIME", "INTERN", "PART_TIME", "CONTRACT"] },
    { name: "Paternity Leave", code: "PTL", daysPerYear: 15, carryoverLimit: 0, isPaid: true, applicableTo: ["FULL_TIME", "CONTRACT"] },
    { name: "Work From Home", code: "WFH", daysPerYear: 0, carryoverLimit: 0, isPaid: true, applicableTo: ["FULL_TIME", "INTERN", "PART_TIME", "CONTRACT"] },
  ];

  for (const lt of leaveTypes) {
    await prisma.leaveType.upsert({
      where: { code: lt.code },
      create: lt,
      update: {},
    });
  }

  // Seed leave balances for all active employees for year 2026
  const dbLeaveTypes = await prisma.leaveType.findMany();
  const dbEmployees = await prisma.employee.findMany();
  for (const emp of dbEmployees) {
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

  for (const h of INDIAN_HOLIDAYS_2025) {
    const date = new Date(h.date);
    const existing = await prisma.holiday.findFirst({
      where: { name: h.name, date },
    });
    if (!existing) {
      await prisma.holiday.create({
        data: { name: h.name, date, type: "NATIONAL" },
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
