import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { guestName, relation, visitDate, purpose } = await req.json();

    if (!guestName || !relation || !visitDate || !purpose) {
      return NextResponse.json({ error: "All fields (guestName, relation, visitDate, purpose) are required." }, { status: 400 });
    }

    const emp = await prisma.employee.findUnique({
      where: { userId: session.user.id }
    });

    if (!emp) {
      return NextResponse.json({ error: "Employee profile not found" }, { status: 404 });
    }

    const parsedDate = new Date(visitDate);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "Invalid visit date format." }, { status: 400 });
    }

    const invitation = await prisma.guestInvitation.create({
      data: {
        employeeId: emp.id,
        guestName,
        relation,
        visitDate: parsedDate,
        purpose,
        status: "PENDING"
      }
    });

    // Notify Super Admins and Chandrita
    const admins = await prisma.user.findMany({
      where: {
        OR: [
          { role: "ADMIN" },
          { email: "chandrita@theantbox.com" }
        ]
      }
    });

    const notifBody = `${emp.firstName} ${emp.lastName} has invited guest ${guestName} (${relation}) to visit the office on ${visitDate.slice(0, 10)}. Purpose: ${purpose}`;

    await prisma.notification.createMany({
      data: admins.map(adm => ({
        userId: adm.id,
        type: "GUEST_INVITE",
        title: "Guest Invitation Request",
        body: notifBody,
        link: "/notifications",
        actionableId: invitation.id
      }))
    });

    return NextResponse.json({ invitation });
  } catch (error) {
    console.error("[GUEST_INVITATION_POST]", error);
    return NextResponse.json({ error: "Failed to submit guest invitation request" }, { status: 500 });
  }
}
