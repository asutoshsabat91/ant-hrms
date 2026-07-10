import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { google } from "googleapis";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  const baseUrl = process.env.NEXTAUTH_URL || "https://antbox-hrms-one.vercel.app";

  if (error || !code) {
    console.error("[Google Calendar OAuth] Error from Google:", error);
    return NextResponse.redirect(`${baseUrl}/portal?gcal=error`);
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${baseUrl}/portal?gcal=error`);
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      `${baseUrl}/api/auth/google-calendar/callback`
    );

    const { tokens } = await oauth2Client.getToken(code);
    const refreshToken = tokens.refresh_token;

    if (!refreshToken) {
      console.error("[Google Calendar OAuth] No refresh token received. User may need to revoke and reconnect.");
      return NextResponse.redirect(`${baseUrl}/portal?gcal=no_refresh_token`);
    }

    // Save the refresh token to the employee's record
    const employee = await prisma.employee.findFirst({
      where: { user: { email: session.user.email ?? "" } },
    });

    if (!employee) {
      return NextResponse.redirect(`${baseUrl}/portal?gcal=no_employee`);
    }

    await prisma.employee.update({
      where: { id: employee.id },
      data: { googleRefreshToken: refreshToken },
    });

    console.log(`[Google Calendar OAuth] Saved refresh token for employee: ${employee.firstName} ${employee.lastName}`);
    return NextResponse.redirect(`${baseUrl}/portal?gcal=connected`);
  } catch (err) {
    console.error("[Google Calendar OAuth] Failed to exchange code for tokens:", err);
    return NextResponse.redirect(`${baseUrl}/portal?gcal=error`);
  }
}
