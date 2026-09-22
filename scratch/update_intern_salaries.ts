import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const interns = await prisma.employee.findMany({
    where: { employmentType: "INTERN" }
  });

  let updatedCount = 0;
  for (const emp of interns) {
    const hasSalary = (emp.ctc && emp.ctc > 0) || (emp.basicSalary && emp.basicSalary > 0);
    if (hasSalary) {
      const rawMonthly = emp.basicSalary && emp.basicSalary > 0 
        ? emp.basicSalary 
        : (emp.ctc && emp.ctc >= 50000 ? Math.round(emp.ctc / 12) : (emp.ctc ?? 0));
      const minMonthly = Math.max(25000, rawMonthly);
      const minCtc = Math.max(300000, emp.ctc && emp.ctc >= 50000 ? emp.ctc : minMonthly * 12);
      
      await prisma.employee.update({
        where: { id: emp.id },
        data: {
          ctc: minCtc,
          basicSalary: minMonthly,
          hra: 0,
          specialAllowance: 0,
          pf: 0
        }
      });
      console.log(`[Paid Intern Salary Update] ${emp.firstName} ${emp.lastName}: Basic=₹${minMonthly}, CTC=₹${minCtc}`);
      updatedCount++;
    } else {
      console.log(`[Unpaid Intern] ${emp.firstName} ${emp.lastName}: basic=0, ctc=0`);
    }
  }
  console.log(`Updated ${updatedCount} paid interns to minimum ₹25,000/month pay.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
