import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = session.user.email?.toLowerCase() || "";
  const isRitesh = email === "ritesh@theantbox.com";
  const isAdmin = (session.user.role === "ADMIN" || session.user.role === "COMPANY_ADMIN") && !isRitesh;

  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { action, rejectionReason } = await req.json();

    if (!action || (action !== "APPROVE" && action !== "REJECT")) {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    const docReq = await prisma.documentRequest.findUnique({
      where: { id: params.id },
      include: { employee: true }
    });

    if (!docReq) {
      return NextResponse.json({ error: "Document request not found" }, { status: 404 });
    }

    if (action === "REJECT" && (!rejectionReason || !rejectionReason.trim())) {
      return NextResponse.json({ error: "Rejection reason is required." }, { status: 400 });
    }

    const updated = await prisma.documentRequest.update({
      where: { id: params.id },
      data: {
        status: action === "APPROVE" ? "APPROVED" : "REJECTED",
        rejectionReason: action === "REJECT" ? rejectionReason : null
      }
    });

    // Notify employee
    const notifBody = action === "APPROVE"
      ? `Your document request for "${docReq.title}" has been approved. You can view the document in your list.`
      : `Your document request for "${docReq.title}" was declined. Reason: ${rejectionReason}`;

    await prisma.notification.create({
      data: {
        userId: docReq.employee.userId,
        type: action === "APPROVE" ? "DOCUMENT_READY" : "SYSTEM",
        title: action === "APPROVE" ? "Document Request Approved" : "Document Request Declined",
        body: notifBody,
        link: "/documents"
      }
    });

    return NextResponse.json({ request: updated });
  } catch (error) {
    console.error("[DOCUMENT_REQUEST_PATCH]", error);
    return NextResponse.json({ error: "Failed to update document request" }, { status: 500 });
  }
}
