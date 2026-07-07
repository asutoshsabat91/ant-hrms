import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mail";

export async function POST(req: Request) {
  try {
    const { personalEmail } = await req.json();

    if (!personalEmail) {
      return NextResponse.json({ error: "Personal email is required." }, { status: 400 });
    }

    const emailLower = personalEmail.toLowerCase().trim();

    // Verify it is a valid Gmail address
    if (!emailLower.endsWith("@gmail.com")) {
      return NextResponse.json({ error: "Only valid Gmail accounts (ending with @gmail.com) are allowed." }, { status: 400 });
    }

    // Check if an employee is already active with this personal email
    const existingEmployee = await prisma.employee.findFirst({
      where: { personalEmail: emailLower }
    });
    if (existingEmployee) {
      return NextResponse.json({ error: "An employee with this personal email already exists." }, { status: 400 });
    }

    // Check if there is already an approved onboarding request matching this email
    const existingRequest = await prisma.onboardingRequest.findFirst({
      where: { personalEmail: emailLower }
    });
    if (existingRequest && existingRequest.status === "APPROVED") {
      return NextResponse.json({ error: "A registration request for this email has already been approved." }, { status: 400 });
    }

    // Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // Save token in VerificationToken table
    await prisma.verificationToken.upsert({
      where: {
        identifier_token: {
          identifier: emailLower,
          token: otp,
        },
      },
      update: {
        expires,
      },
      create: {
        identifier: emailLower,
        token: otp,
        expires,
      },
    });

    const subject = "AntBox Registration Verification Code";
    const bodyHtml = `
      <h2>Email Verification Required</h2>
      <p>Hello,</p>
      <p>Thank you for initiating your onboarding registration at AntBox. To verify that this email address is valid, please enter the registration code (OTP) below:</p>
      
      <div style="background-color: #f3f4f6; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; border: 1px solid #e5e7eb;">
        <span style="font-size: 28px; font-weight: 800; letter-spacing: 0.25em; color: #8e43ac; font-family: monospace;">${otp}</span>
      </div>
      
      <p>This code is valid for 15 minutes. If you did not request this, you can ignore this email.</p>
    `;

    const result = await sendEmail({
      to: emailLower,
      subject,
      html: bodyHtml,
    });

    if (result.simulated) {
      return NextResponse.json({
        message: "Verification code generated in simulation mode.",
        otp: otp,
        email: emailLower,
        simulated: true
      }, { status: 200 });
    }

    if (!result.success) {
      const errorMsg = result.error instanceof Error ? result.error.message : String(result.error);
      return NextResponse.json({
        error: `SMTP mail delivery failed: ${errorMsg}`
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Verification code successfully sent to ${emailLower}`
    }, { status: 200 });

  } catch (err: unknown) {
    console.error("[REGISTER SEND OTP ERROR]", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
