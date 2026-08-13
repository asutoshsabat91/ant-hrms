import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mail";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email or Name is required" }, { status: 400 });
    }

    let emailTrimmed = email.trim().toLowerCase();

    // Support name resolution if they enter a name instead of an email address
    if (!emailTrimmed.includes("@")) {
      const nameParts = emailTrimmed.split(/\s+/);
      let employee = null;

      if (nameParts.length >= 2) {
        employee = await prisma.employee.findFirst({
          where: {
            firstName: { equals: nameParts[0], mode: "insensitive" },
            lastName: { equals: nameParts[nameParts.length - 1], mode: "insensitive" },
          },
        });
      }

      if (!employee) {
        employee = await prisma.employee.findFirst({
          where: {
            OR: [
              { firstName: { equals: emailTrimmed, mode: "insensitive" } },
              { lastName: { equals: emailTrimmed, mode: "insensitive" } },
            ],
          },
        });
      }

      if (employee && employee.email) {
        emailTrimmed = employee.email.toLowerCase();
      } else {
        return NextResponse.json({ error: "Could not find a corporate account matching this name" }, { status: 404 });
      }
    }

    const user = await prisma.user.findUnique({
      where: { email: emailTrimmed },
    });

    if (!user) {
      return NextResponse.json({ error: `Account with email ${emailTrimmed} does not exist` }, { status: 404 });
    }

    // Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // Upsert OTP into VerificationToken model
    await prisma.verificationToken.upsert({
      where: {
        identifier_token: {
          identifier: emailTrimmed,
          token: otp,
        },
      },
      update: {
        expires,
      },
      create: {
        identifier: emailTrimmed,
        token: otp,
        expires,
      },
    });

    // Send email with recovery code
    const subject = "AntBox Reset Password Recovery Code";
    const bodyHtml = `
      <h2>Password Reset Requested</h2>
      <p>Hello,</p>
      <p>You requested a password reset for your AntBox HR account. Use the verification code (OTP) below to set a new password:</p>
      
      <div style="background-color: #f3f4f6; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; border: 1px solid #e5e7eb;">
        <span style="font-size: 28px; font-weight: 800; letter-spacing: 0.25em; color: #8e43ac; font-family: monospace;">${otp}</span>
      </div>
      
      <p>This code is valid for 15 minutes. If you did not request this, you can safely ignore this email.</p>
    `;

    const result = await sendEmail({
      to: emailTrimmed,
      subject,
      html: bodyHtml,
    });

    if (result.simulated) {
      return NextResponse.json({
        message: "Verification code generated in simulation mode.",
        otp: otp,
        email: emailTrimmed
      }, { status: 200 });
    }

    if (!result.success) {
      const errorMsg = result.error instanceof Error ? result.error.message : String(result.error);
      return NextResponse.json({
        error: `SMTP mail delivery failed to ${emailTrimmed}: ${errorMsg}`
      }, { status: 500 });
    }

    return NextResponse.json({ message: `Verification code sent to ${emailTrimmed} successfully` }, { status: 200 });
  } catch (err: unknown) {
    console.error("[FORGOT POST]", err);
    let msg = "An unexpected error occurred. Please try again.";
    if (err instanceof Error) {
      if (err.message.includes("Can't reach database server") || err.message.includes("data transfer quota") || err.message.includes("PrismaClient")) {
        msg = "Database connection limit reached. Please wait a moment or notify Admin.";
      } else {
        msg = err.message;
      }
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
