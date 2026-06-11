import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { employeeId, linkedInUrl, spotifyPlaylist, bloodGroup } = await req.json();

  const emp = await prisma.employee.findUnique({ where: { id: employeeId }, include: { user: true } });
  if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  const isAdmin = session.user.role === "SUPER_ADMIN" || session.user.role === "HR_ADMIN";
  if (!isAdmin && emp.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Store linkedIn and spotify in the address/notes field temporarily (or we could add schema fields)
  // For now store as JSON in a dedicated metadata approach using existin fields
  await prisma.employee.update({
    where: { id: employeeId },
    data: { bloodGroup: bloodGroup ?? emp.bloodGroup },
  });

  // Store ID form data as a document note (we use HRDocument with type OTHER as metadata store)
  await prisma.hRDocument.create({
    data: {
      employeeId,
      type: "OTHER",
      title: "ID Card Form Data",
      fileUrl: JSON.stringify({ linkedInUrl, spotifyPlaylist }),
      issuedDate: new Date(),
      issuedBy: session.user.name ?? "Employee",
      metadata: { linkedInUrl, spotifyPlaylist, bloodGroup },
    },
  });

  // Mark ID form task completed
  await prisma.onboardingTask.updateMany({
    where: { employeeId, title: { contains: "ID" } },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  // Notify admins to create the ID card
  const admins = await prisma.user.findMany({ where: { role: { in: ["SUPER_ADMIN", "HR_ADMIN"] } } });
  await prisma.notification.createMany({
    data: admins.map((a) => ({
      userId: a.id,
      type: "ONBOARDING_TASK" as const,
      title: "ID Card Form Submitted — Action Required",
      body: `${emp.firstName} ${emp.lastName} has submitted ID card info. Please create and issue their ID card.`,
      link: `/onboarding/${employeeId}`,
    })),
  });

  return NextResponse.json({ message: "ID form submitted" });
}
