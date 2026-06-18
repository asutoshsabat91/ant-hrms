import { PrismaClient } from "@prisma/client";

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

async function main() {
  console.log("Seeding 2026 holidays...");
  for (const h of ANTBOX_HOLIDAYS_2026) {
    const date = new Date(h.date);
    const existing = await prisma.holiday.findFirst({
      where: { name: h.name, date },
    });
    if (!existing) {
      const created = await prisma.holiday.create({
        data: { name: h.name, date, type: h.type, description: h.description },
      });
      console.log(`- Created holiday: ${created.name} (${created.date.toISOString().split("T")[0]})`);
    } else {
      console.log(`- Holiday already exists: ${h.name}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
