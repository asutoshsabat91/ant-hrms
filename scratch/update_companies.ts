import fs from "fs";
import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";

async function main() {
  const sql = fs.readFileSync("antbox_backup.sql", "utf-8");
  const lines = sql.split("\n");

  let inEmployeeCopy = false;
  const sqlStatements: string[] = [];

  for (const line of lines) {
    if (line.startsWith("COPY public.\"Employee\"")) {
      inEmployeeCopy = true;
      continue;
    }
    if (inEmployeeCopy && line.startsWith("\\.")) {
      inEmployeeCopy = false;
      break;
    }
    if (inEmployeeCopy && line.trim()) {
      const parts = line.split("\t");
      const email = parts[4];
      const deployedCompany = parts[44];
      if (email && deployedCompany && deployedCompany !== "\\N" && deployedCompany !== "—") {
        const cleanCompany = deployedCompany.replace(/'/g, "''");
        sqlStatements.push(`UPDATE "Employee" SET "deployedCompany" = '${cleanCompany}' WHERE "email" = '${email}';`);
      }
    }
  }

  // Ensure Rohit Singh is CEO & FULL_TIME
  sqlStatements.push(`UPDATE "Employee" SET "designation" = 'CEO', "jobRole" = 'CEO', "employmentType" = 'FULL_TIME', "deployedCompany" = 'AntBox' WHERE "email" = 'rohit@theantbox.com';`);
  sqlStatements.push(`UPDATE "User" SET "role" = 'ADMIN' WHERE "email" = 'rohit@theantbox.com';`);

  if (!fs.existsSync("scratch")) {
    fs.mkdirSync("scratch");
  }
  fs.writeFileSync("scratch/update_companies.sql", sqlStatements.join("\n"));
  console.log(`Generated scratch/update_companies.sql with ${sqlStatements.length} statements.`);

  const dbUrl = "postgresql://neondb_owner:npg_HOSM17YfpKqn@ep-sparkling-mud-awonsxio.c-12.us-east-1.aws.neon.tech/neondb?sslmode=require";
  const output = execSync(`psql "${dbUrl}" -f scratch/update_companies.sql`).toString();
  console.log("psql output:", output.substring(0, 300));

  const prisma = new PrismaClient();
  const emps = await prisma.employee.findMany({ select: { deployedCompany: true } });
  const counts: Record<string, number> = {};
  emps.forEach(e => {
    const c = e.deployedCompany || "Unassigned";
    counts[c] = (counts[c] || 0) + 1;
  });
  console.log("\nReal Deployed Company Breakdown in DB:", counts);
}

main().catch(console.error);
