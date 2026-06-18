import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Admin triggers a notification to the employee to complete a specific onboarding step
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !["ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { employeeId, step } = await req.json();
  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { user: true },
  });
  if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  const messages: Record<string, { title: string; body: string }> = {
    documents: {
      title: "Action Required: Upload Your Documents",
      body: "Please upload your ID proof (Aadhaar, PAN) and educational certificates to complete Task 1 of your onboarding.",
    },
    banking: {
      title: "Action Required: Submit Banking Details",
      body: "Your admin has requested your bank details for payroll setup. Please complete Task 2 in your onboarding checklist.",
    },
    idform: {
      title: "Action Required: Complete ID Card Form",
      body: "Please fill in your ID card details (LinkedIn, Spotify, Blood Group) to complete Task 3 of your onboarding.",
    },
  };

  const msg = messages[step];
  if (!msg) return NextResponse.json({ error: "Unknown step" }, { status: 400 });

  await prisma.notification.create({
    data: {
      userId: emp.userId,
      type: "ONBOARDING_TASK",
      title: msg.title,
      body: msg.body,
      link: `/onboarding/${employeeId}`,
    },
  });

  return NextResponse.json({ message: "Notification sent" });
}
