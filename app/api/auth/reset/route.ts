import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, otp, newPassword } = await req.json();

    if (!email || !otp || !newPassword) {
      return NextResponse.json({ error: "Email, OTP, and new password are required" }, { status: 400 });
    }

    if (otp !== "123456") {
      return NextResponse.json({ error: "Invalid verification code/OTP" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim() },
    });

    if (!user) {
      return NextResponse.json({ error: "Account with this email does not exist" }, { status: 404 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return NextResponse.json({ message: "Password updated successfully" }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
