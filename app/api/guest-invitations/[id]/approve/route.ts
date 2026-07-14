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
  const isChandrita = email === "chandrita@theantbox.com";

  if (!isAdmin && !isChandrita) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { action } = await req.json();

    if (!action || (action !== "APPROVE" && action !== "REJECT")) {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    const invitation = await prisma.guestInvitation.findUnique({
      where: { id: params.id },
      include: { employee: true }
    });

    if (!invitation) {
      return NextResponse.json({ error: "Guest invitation request not found" }, { status: 404 });
    }

    const updated = await prisma.guestInvitation.update({
      where: { id: params.id },
      data: {
        status: action === "APPROVE" ? "APPROVED" : "REJECTED"
      }
    });

    // Notify employee of invitation decision
    const notifBody = action === "APPROVE"
      ? `Your guest invitation request for "${invitation.guestName}" on ${invitation.visitDate.toISOString().slice(0, 10)} has been APPROVED.`
      : `Your guest invitation request for "${invitation.guestName}" on ${invitation.visitDate.toISOString().slice(0, 10)} was DECLINED.`;

    await prisma.notification.create({
      data: {
        userId: invitation.employee.userId,
        type: "SYSTEM",
        title: action === "APPROVE" ? "Guest Invitation Approved" : "Guest Invitation Declined",
        body: notifBody,
        link: "/policy"
      }
    });

    return NextResponse.json({ invitation: updated });
  } catch (error) {
    console.error("[GUEST_INVITATION_PATCH]", error);
    return NextResponse.json({ error: "Failed to update guest invitation request" }, { status: 500 });
  }
}
