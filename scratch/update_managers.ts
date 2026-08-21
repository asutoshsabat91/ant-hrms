import fs from "fs";
import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";

async function main() {
  const sql = fs.readFileSync("antbox_backup.sql", "utf-8");
  const lines = sql.split("\n");

  let inEmployeeCopy = false;

  const oldIdToEmail: Record<string, string> = {};
  const emailToOldManagerId: Record<string, string> = {};

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
      const id = parts[0];
      const email = parts[4];
      const managerId = parts[23];

      if (id && email) {
        oldIdToEmail[id] = email;
      }
      if (email && managerId && managerId !== "\\N") {
        emailToOldManagerId[email] = managerId;
      }
    }
  }

  const prisma = new PrismaClient();
  const dbEmps = await prisma.employee.findMany({ select: { id: true, email: true } });
  const emailToDbId: Record<string, string> = {};
  dbEmps.forEach(e => {
    if (e.email) emailToDbId[e.email.toLowerCase()] = e.id;
  });

  const sqlStatements: string[] = [
    // Clear old manager references
    `UPDATE "Employee" SET "managerId" = NULL;`
  ];

  for (const [empEmail, oldManagerId] of Object.entries(emailToOldManagerId)) {
    const managerEmail = oldIdToEmail[oldManagerId];
    if (!managerEmail) continue;

    const managerDbId = emailToDbId[managerEmail.toLowerCase()];
    const empDbId = emailToDbId[empEmail.toLowerCase()];

    if (empDbId && managerDbId && empDbId !== managerDbId) {
      sqlStatements.push(`UPDATE "Employee" SET "managerId" = '${managerDbId}' WHERE "id" = '${empDbId}';`);
    }
  }

  // Ensure Rohit Singh is top CEO without manager
  const rohitId = emailToDbId["rohit@theantbox.com"];
  if (rohitId) {
    sqlStatements.push(`UPDATE "Employee" SET "managerId" = NULL WHERE "id" = '${rohitId}';`);
  }

  fs.writeFileSync("scratch/update_managers.sql", sqlStatements.join("\n"));
  console.log(`Generated scratch/update_managers.sql with ${sqlStatements.length} statements.`);

  const dbUrl = "postgresql://neondb_owner:npg_HOSM17YfpKqn@ep-sparkling-mud-awonsxio.c-12.us-east-1.aws.neon.tech/neondb?sslmode=require";
  const output = execSync(`psql "${dbUrl}" -f scratch/update_managers.sql`).toString();
  console.log("psql output:", output.substring(0, 300));

  const withManagerCount = await prisma.employee.count({ where: { managerId: { not: null } } });
  console.log(`Total employees with restored reporting managers: ${withManagerCount} / ${dbEmps.length}`);
}

main().catch(console.error);
