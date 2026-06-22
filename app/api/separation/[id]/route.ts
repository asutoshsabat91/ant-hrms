import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { addDays } from "date-fns";
import { sendSeparationApprovalEmail } from "@/lib/mail";

const OFFBOARDING_TASKS = [
  { title: "Access Card Deletion", category: "IT_SETUP" as const, order: 1 },
  { title: "Company Email ID Closing", category: "IT_SETUP" as const, order: 2 },
  { title: "Device / Asset Return", category: "ASSET" as const, order: 3 },
  { title: "Exit Interview", category: "COMPLIANCE" as const, order: 4 },
  { title: "Full & Final Settlement", category: "FINANCE" as const, order: 5 },
  { title: "Settle FNF", category: "FINANCE" as const, order: 6 },
];

const OFFBOARDING_DOCUMENTS = [
  { type: "INTERNSHIP_CERTIFICATE" as const, title: "Internship Certificate" },
  { type: "RELIEVING_LETTER" as const, title: "Relieving Letter" },
  { type: "EXPERIENCE_LETTER" as const, title: "Experience Letter" },
  { type: "LOR" as const, title: "Letter of Recommendation" },
];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { action, rejectionReason } = body;

  const isAdmin = session.user.role === "ADMIN";
  const separation = await prisma.separation.findUnique({
    where: { id },
    include: { employee: { include: { user: true } } },
  });
  if (!separation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = separation.employee.userId === session.user.id;

  switch (action) {
    case "approve": {
      if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      // Admin can pass a custom last working date (for full-time employees)
      const customLwd = body.customLastWorkingDate ? new Date(body.customLastWorkingDate) : null;
      const lastWorkingDate = customLwd ?? addDays(new Date(), separation.noticeDays);
      const updated = await prisma.separation.update({
        where: { id },
        data: { status: "APPROVED", approvedAt: new Date(), lastWorkingDate },
      });

      // Notify employee
      const noticePeriodLabel = separation.noticeDays <= 10 ? "10-day notice period" : "60-day notice period";
      await prisma.notification.create({
        data: {
          userId: separation.employee.userId,
          type: "SEPARATION_UPDATE",
          title: "Resignation Approved",
          body: `Your resignation has been approved. ${noticePeriodLabel} applies. Your last working day is ${lastWorkingDate.toDateString()}.`,
          link: "/separation",
        },
      });

      try {
        const employeeName = `${separation.employee.firstName} ${separation.employee.lastName}`;
        await sendSeparationApprovalEmail(
          separation.employee.email,
          employeeName,
          "APPROVED",
          lastWorkingDate,
          null
        );
      } catch (mailErr) {
        console.error("Failed to send separation approval email", mailErr);
      }

      return NextResponse.json({ separation: updated });
    }

    case "reject": {
      if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const updated = await prisma.separation.update({
        where: { id },
        data: { status: "REJECTED", rejectionReason: rejectionReason ?? "Rejected by admin" },
      });
      await prisma.notification.create({
        data: {
          userId: separation.employee.userId,
          type: "SEPARATION_UPDATE",
          title: "Resignation Not Approved",
          body: `Your resignation request was not approved.${rejectionReason ? ` Reason: ${rejectionReason}` : ""}`,
          link: "/separation",
        },
      });

      try {
        const employeeName = `${separation.employee.firstName} ${separation.employee.lastName}`;
        await sendSeparationApprovalEmail(
          separation.employee.email,
          employeeName,
          "REJECTED",
          null,
          rejectionReason ?? "Rejected by admin"
        );
      } catch (mailErr) {
        console.error("Failed to send separation rejection email", mailErr);
      }

      return NextResponse.json({ separation: updated });
    }

    case "cancel": {
      if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const updated = await prisma.separation.update({
        where: { id },
        data: { status: "CANCELLED", lastWorkingDate: null },
      });
      return NextResponse.json({ separation: updated });
    }

    case "complete_offboarding": {
      // Called automatically or by admin once notice period is over
      if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const emp = separation.employee;

      // Set employee status to OFFBOARDING
      await prisma.employee.update({
        where: { id: emp.id },
        data: { status: "OFFBOARDING", lastWorkingDate: separation.lastWorkingDate },
      });

      // Create offboarding tasks
      await prisma.offboardingTask.createMany({
        data: OFFBOARDING_TASKS.map((t) => ({
          employeeId: emp.id,
          title: t.title,
          category: t.category,
          order: t.order,
          status: "PENDING" as const,
          dueDate: t.title === "Settle FNF" ? addDays(separation.lastWorkingDate ?? new Date(), 45) : null,
        })),
        skipDuplicates: true,
      });

      // Create document stubs
      await prisma.hRDocument.createMany({
        data: OFFBOARDING_DOCUMENTS.map((d) => ({
          employeeId: emp.id,
          type: d.type,
          title: d.title,
          fileUrl: "",
          issuedDate: separation.lastWorkingDate ?? new Date(),
          issuedBy: session.user!.name ?? "HR Admin",
        })),
        skipDuplicates: true,
      });

      // Notify employee
      await prisma.notification.create({
        data: {
          userId: emp.userId,
          type: "SEPARATION_UPDATE",
          title: "Offboarding Initiated",
          body: "Your offboarding process has been initiated. Please complete the checklist and collect your documents.",
          link: "/offboarding",
        },
      });

      return NextResponse.json({ message: "Offboarding initiated" });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
