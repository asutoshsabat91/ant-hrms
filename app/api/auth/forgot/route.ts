import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mail";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const emailTrimmed = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: emailTrimmed },
    });

    if (!user) {
      return NextResponse.json({ error: "Account with this email does not exist" }, { status: 404 });
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

    await sendEmail({
      to: emailTrimmed,
      subject,
      html: bodyHtml,
    });

    return NextResponse.json({ message: "Verification code sent successfully" }, { status: 200 });
  } catch (err: unknown) {
    console.error("[FORGOT POST]", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
