import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Simulating saving personal details for Adweya Padhi...");

  const employee = await prisma.employee.findFirst({
    where: { email: "adweya.padhi@theantbox.com" }
  });

  if (!employee) {
    console.error("Employee not found!");
    return;
  }

  // Exact payload values from the user's screenshot
  const payload = {
    firstName: "Adweya",
    lastName: "Padhi",
    personalEmail: "asutoshsabat91@gmail.com",
    phone: "+919437393551",
    dateOfBirth: "2004-06-08", // assuming YYYY-MM-DD
    gender: "MALE",
    bloodGroup: "O+",
    currentAddress: "NIRVANA LUXE, Dhami Kalan, Bagru, near Manipal University Jaipur,",
    permanentAddress: "NIRVANA LUXE, Dhami Kalan, Bagru, near Manipal University Jaipur,",
    city: "Bagru",
    state: "Rajasthan",
    pincode: "303007",
    emergencyContact: "Asutosh Sabat",
    emergencyPhone: "09437393551",
    profilePhoto: ""
  };

  try {
    const updated = await prisma.employee.update({
      where: { id: employee.id },
      data: {
        firstName: payload.firstName || employee.firstName,
        lastName: payload.lastName || employee.lastName,
        personalEmail: payload.personalEmail || employee.personalEmail,
        phone: payload.phone || employee.phone,
        dateOfBirth: payload.dateOfBirth ? new Date(payload.dateOfBirth) : employee.dateOfBirth,
        gender: payload.gender || employee.gender,
        bloodGroup: payload.bloodGroup || employee.bloodGroup,
        address: payload.currentAddress || employee.address,
        permanentAddress: payload.permanentAddress || employee.permanentAddress,
        city: payload.city || employee.city,
        state: payload.state || employee.state,
        pincode: payload.pincode || employee.pincode,
        emergencyContact: payload.emergencyContact || employee.emergencyContact,
        emergencyPhone: payload.emergencyPhone || employee.emergencyPhone,
        profilePhoto: payload.profilePhoto || employee.profilePhoto,
        personalDetailsFilled: true,
      },
    });

    console.log("SUCCESS! Updated employee:", updated.id);

    // Notify all admins
    const admins = await prisma.user.findMany({
      where: { role: { in: ["ADMIN"] } },
    });

    const notifs = await prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        type: "ONBOARDING_TASK" as const,
        title: "Personal Details Submitted",
        body: `${updated.firstName} ${updated.lastName} has filled in their personal details.`,
        link: `/onboarding/${updated.id}`,
      })),
    });

    console.log(`SUCCESS! Created ${notifs.count} admin notifications.`);
  } catch (err: any) {
    console.error("PRISMA UPDATE FAILED!");
    console.error("Error Name:", err.name);
    console.error("Error Message:", err.message);
    console.error("Error Code:", err.code);
    console.error(err);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
