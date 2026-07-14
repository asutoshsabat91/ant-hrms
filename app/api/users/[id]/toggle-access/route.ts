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

  // Super Admin check
  const email = session.user.email?.toLowerCase() || "";
  const isRitesh = email === "ritesh@theantbox.com";
  const isSuperAdmin = (session.user.role === "ADMIN") && !isRitesh;

  if (!isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden. Super Admin access only." }, { status: 403 });
  }

  try {
    const { isActive } = await req.json();

    if (typeof isActive !== "boolean") {
      return NextResponse.json({ error: "isActive parameter must be boolean." }, { status: 400 });
    }

    // Do not allow Super Admins to disable their own account to prevent lockout
    if (params.id === session.user.id) {
      return NextResponse.json({ error: "You cannot disable your own admin account." }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: { isActive }
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("[TOGGLE_ACCESS_PATCH]", error);
    return NextResponse.json({ error: "Failed to toggle user access." }, { status: 500 });
  }
}
