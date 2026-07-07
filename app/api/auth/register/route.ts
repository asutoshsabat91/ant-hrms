import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { firstName, lastName, gender, phone, dateOfBirth, personalEmail, otp } = await req.json();

    if (!firstName || !lastName || !gender || !personalEmail || !otp || !dateOfBirth) {
      return NextResponse.json({ error: "All registration fields (First/Last Name, Gender, Date of Birth, Personal Gmail, and OTP Verification Code) are required." }, { status: 400 });
    }

    const emailLower = personalEmail.toLowerCase().trim();

    // Verify Gmail requirement
    if (!emailLower.endsWith("@gmail.com")) {
      return NextResponse.json({ error: "Only valid Gmail accounts (ending with @gmail.com) are allowed." }, { status: 400 });
    }

    // Verify OTP code
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: emailLower,
        token: otp.trim()
      }
    });

    if (!verificationToken) {
      return NextResponse.json({ error: "Invalid verification code." }, { status: 400 });
    }

    if (verificationToken.expires < new Date()) {
      return NextResponse.json({ error: "Verification code has expired. Please request a new one." }, { status: 400 });
    }

    // Verify Age (must be >= 18)
    const dob = new Date(dateOfBirth);
    const today = new Date();
    const ageLimit = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    if (isNaN(dob.getTime()) || dob > ageLimit) {
      return NextResponse.json({ error: "Employee must be at least 18 years old to register." }, { status: 400 });
    }

    // Delete token to prevent reuse
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: emailLower,
          token: otp.trim()
        }
      }
    });

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
        dateOfBirth: dob,
        status: "PENDING"
      },
      create: {
        firstName,
        lastName,
        gender,
        phone: phone ?? null,
        dateOfBirth: dob,
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
    console.error("[REGISTER SUBMIT ERROR]", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
