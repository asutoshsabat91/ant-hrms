import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { action, receiptUrl, rejectionReason } = body;

  const record = await prisma.reimbursement.findUnique({
    where: { id },
    include: { employee: { include: { user: true } } },
  });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAdmin = session.user.role === "ADMIN";
  const isOwner = record.employee.userId === session.user.id;

  let update: Record<string, unknown> = {};
  let notifyEmployee = false;
  let notifyTitle = "";
  let notifyBody = "";

  switch (action) {
    case "approve":
      if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (record.status !== "UNDER_REVIEW" && record.status !== "SUBMITTED" && record.status !== "DRAFT") {
        return NextResponse.json({ error: "Cannot approve at this stage" }, { status: 400 });
      }
      update = { status: "APPROVED", approvedAt: new Date(), approvedBy: session.user.name ?? session.user.email };
      notifyEmployee = true;
      notifyTitle = record.type === "PROCUREMENT" ? "Procurement Approved" : "Reimbursement Approved";
      notifyBody = `Your request "${record.title}" has been approved.`;
      break;

    case "submit":
      // Employee submits reimbursement or uploads receipt after procurement approval
      if (!isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      update = { status: "SUBMITTED", receiptUrl: receiptUrl ?? record.receiptUrl };
      break;

    case "pay":
      if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (record.status !== "APPROVED" && record.status !== "SUBMITTED") {
        return NextResponse.json({ error: "Cannot mark as paid at this stage" }, { status: 400 });
      }
      update = { status: "PAID", paidAt: new Date() };
      notifyEmployee = true;
      notifyTitle = record.type === "PROCUREMENT" ? "Procurement Reimbursed" : "Reimbursement Paid";
      notifyBody = `Your payment for "${record.title}" (₹${record.amount}) has been processed.`;
      break;

    case "reject":
      if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      update = { status: "REJECTED", rejectionReason: rejectionReason ?? "Request rejected" };
      notifyEmployee = true;
      notifyTitle = "Request Rejected";
      notifyBody = `Your request "${record.title}" was rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ""}`;
      break;

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const updated = await prisma.reimbursement.update({ where: { id }, data: update });

  if (notifyEmployee) {
    await prisma.notification.create({
      data: {
        userId: record.employee.userId,
        type: record.type === "PROCUREMENT" ? "PROCUREMENT_UPDATE" : "REIMBURSEMENT_UPDATE",
        title: notifyTitle,
        body: notifyBody,
        link: "/portal/reimbursements",
      },
    });
  }

  return NextResponse.json({ reimbursement: updated });
}
