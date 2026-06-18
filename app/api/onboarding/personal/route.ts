import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    firstName,
    lastName,
    personalEmail,
    phone,
    dateOfBirth,
    gender,
    bloodGroup,
    currentAddress,
    permanentAddress,
    city,
    state,
    pincode,
    emergencyContact,
    emergencyPhone,
    profilePhoto,
  } = body;

  try {
    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee record not found" }, { status: 404 });
    }

    const updated = await prisma.employee.update({
      where: { id: employee.id },
      data: {
        firstName: firstName || employee.firstName,
        lastName: lastName || employee.lastName,
        personalEmail: personalEmail || employee.personalEmail,
        phone: phone || employee.phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : employee.dateOfBirth,
        gender: gender || employee.gender,
        bloodGroup: bloodGroup || employee.bloodGroup,
        address: currentAddress || employee.address,
        permanentAddress: permanentAddress || employee.permanentAddress,
        city: city || employee.city,
        state: state || employee.state,
        pincode: pincode || employee.pincode,
        emergencyContact: emergencyContact || employee.emergencyContact,
        emergencyPhone: emergencyPhone || employee.emergencyPhone,
        profilePhoto: profilePhoto || employee.profilePhoto,
        personalDetailsFilled: true,
      },
    });

    // Notify all admins
    const admins = await prisma.user.findMany({
      where: { role: { in: ["ADMIN"] } },
    });

    await prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        type: "ONBOARDING_TASK" as const,
        title: "Personal Details Submitted",
        body: `${updated.firstName} ${updated.lastName} has filled in their personal details.`,
        link: `/onboarding/${updated.id}`,
      })),
    });

    return NextResponse.json({ employee: updated }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
