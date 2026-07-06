import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, otp, newPassword } = await req.json();

    if (!email || !otp || !newPassword) {
      return NextResponse.json({ error: "Email, OTP, and new password are required" }, { status: 400 });
    }

    const emailTrimmed = email.trim().toLowerCase();

    // Query VerificationToken matching identifier (email) and token (otp)
    const verification = await prisma.verificationToken.findFirst({
      where: {
        identifier: emailTrimmed,
        token: otp.trim(),
      },
    });

    if (!verification) {
      return NextResponse.json({ error: "Invalid verification code/OTP" }, { status: 400 });
    }

    if (new Date() > verification.expires) {
      // Clean up expired token
      await prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: emailTrimmed,
            token: verification.token,
          },
        },
      }).catch(() => {});
      return NextResponse.json({ error: "Verification code has expired. Please request a new one." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: emailTrimmed },
    });

    if (!user) {
      return NextResponse.json({ error: "Account with this email does not exist" }, { status: 404 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: emailTrimmed,
            token: verification.token,
          },
        },
      }),
    ]);

    return NextResponse.json({ message: "Password updated successfully" }, { status: 200 });
  } catch (err: unknown) {
    console.error("[RESET POST]", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
