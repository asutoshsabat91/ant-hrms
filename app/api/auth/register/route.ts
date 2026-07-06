import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { firstName, lastName, gender, phone, dateOfBirth, personalEmail } = await req.json();

    if (!firstName || !lastName || !gender || !personalEmail) {
      return NextResponse.json({ error: "firstName, lastName, gender and personalEmail are required" }, { status: 400 });
    }

    const emailLower = personalEmail.toLowerCase().trim();

    // Check if there is already an active user or employee with this personal email
    const existingEmployee = await prisma.employee.findFirst({
      where: { personalEmail: emailLower }
    });
    if (existingEmployee) {
      return NextResponse.json({ error: "An employee with this personal email already exists." }, { status: 400 });
    }

    // Check if there is already an onboarding request
    const existingRequest = await prisma.onboardingRequest.findUnique({
      where: { personalEmail: emailLower }
    });
    if (existingRequest) {
      if (existingRequest.status === "PENDING") {
        return NextResponse.json({ error: "Your registration is already submitted and pending administrator approval." }, { status: 400 });
      }
      if (existingRequest.status === "APPROVED") {
        return NextResponse.json({ error: "This registration has already been approved." }, { status: 400 });
      }
    }

    // Create the onboarding request
    await prisma.onboardingRequest.upsert({
      where: { personalEmail: emailLower },
      update: {
        firstName,
        lastName,
        gender,
        phone: phone ?? null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        status: "PENDING"
      },
      create: {
        firstName,
        lastName,
        gender,
        phone: phone ?? null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        personalEmail: emailLower,
        status: "PENDING"
      }
    });

    // Notify Superadmins
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" }
    });

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: "SYSTEM",
          title: "New Onboarding Request Pending",
          body: `New joinee ${firstName} ${lastName} has submitted registration details and is waiting for approval.`,
          link: "/onboarding",
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: "Registration submitted successfully. Pending administrator approval."
    }, { status: 201 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
