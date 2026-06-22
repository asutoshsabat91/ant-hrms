import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import Papa from "papaparse";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const csvPath = path.join(__dirname, "../scratch/companies.csv");
  if (!fs.existsSync(csvPath)) {
    console.error("CSV file not found at: " + csvPath);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, "utf8");
  const parsed = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  const records = parsed.data as any[];
  console.log(`Loaded ${records.length} records from CSV.`);

  // 1. Update deployedCompany for all employees
  let updatedCount = 0;
  for (const row of records) {
    const email = row["Official Email ID"]?.trim()?.toLowerCase();
    const client = row["Client"]?.trim();

    if (!email || !client) continue;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: { employee: true },
    });

    if (user && user.employee) {
      await prisma.employee.update({
        where: { id: user.employee.id },
        data: {
          deployedCompany: client,
        },
      });
      console.log(`Updated employee ${user.employee.firstName} ${user.employee.lastName} with deployed company: ${client}`);
      updatedCount++;
    } else {
      console.log(`No active DB employee found for email: ${email}`);
    }
  }
  console.log(`Successfully updated ${updatedCount} employees.`);

  // 2. Create the Qapita Admin
  const adminEmail = "sukhman@theantbox.com";
  const passwordHash = await bcrypt.hash("AntBox@2026", 12);
  
  // Find Ops department or fallback to any department
  let dept = await prisma.department.findUnique({ where: { code: "OPS" } });
  if (!dept) {
    dept = await prisma.department.findFirst();
  }
  if (!dept) {
    dept = await prisma.department.create({
      data: { name: "Operations", code: "OPS" },
    });
  }

  // Create or update Qapita admin user and employee
  const qapitaAdmin = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      passwordHash,
      role: "COMPANY_ADMIN",
      isActive: true,
      employee: {
        create: {
          firstName: "Sukhman",
          lastName: "Singh",
          email: adminEmail,
          employeeId: "ANT-QAPITA-ADMIN",
          designation: "Qapita Admin",
          departmentId: dept.id,
          employmentType: "FULL_TIME",
          status: "ACTIVE",
          joiningDate: new Date(),
          deployedCompany: "Qapita",
          managedCompany: "Qapita",
          city: "Bhubaneswar",
          state: "Odisha",
          ctc: 600000,
          basicSalary: 25000,
          hra: 10000,
          specialAllowance: 15000,
        },
      },
    },
    update: {
      role: "COMPANY_ADMIN",
      passwordHash,
      employee: {
        upsert: {
          create: {
            firstName: "Sukhman",
            lastName: "Singh",
            email: adminEmail,
            employeeId: "ANT-QAPITA-ADMIN",
            designation: "Qapita Admin",
            departmentId: dept.id,
            employmentType: "FULL_TIME",
            status: "ACTIVE",
            joiningDate: new Date(),
            deployedCompany: "Qapita",
            managedCompany: "Qapita",
            city: "Bhubaneswar",
            state: "Odisha",
            ctc: 600000,
            basicSalary: 25000,
            hra: 10000,
            specialAllowance: 15000,
          },
          update: {
            designation: "Qapita Admin",
            deployedCompany: "Qapita",
            managedCompany: "Qapita",
          },
        },
      },
    },
  });

  console.log(`Upserted Qapita admin account: ${adminEmail}`);

  // 3. Make sure the specified Qapita employees have their deployedCompany correctly set
  const qapitaEmails = [
    "harsh.singh@theantbox.com",
    "ishika.dubey@theantbox.com",
    "ishita.patnaik@theantbox.com",
    "ranita.tripathy@theantbox.com",
    "mayank.rajput@theantbox.com",
    "sankalp.rout@theantbox.com",
    "rajkumar.mallick@theantbox.com",
    "payoshni.karmakar@theantbox.com",
    "areen.thakur@theantbox.com",
    "aditya.hazra@theantbox.com",
    "souvik.sen@theantbox.com",
    "saina.samal@theantbox.com",
    "saswatt.satapathy@theantbox.com"
  ];

  for (const email of qapitaEmails) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { employee: true },
    });
    if (user && user.employee) {
      await prisma.employee.update({
        where: { id: user.employee.id },
        data: { deployedCompany: "Qapita" },
      });
      console.log(`Enforced deployedCompany = Qapita for: ${email}`);
    }
  }

  console.log("Seeding companies done!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
