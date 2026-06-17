import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function getOfficeConfig() {
  let config = await prisma.officeConfig.findFirst();
  if (!config) {
    config = await prisma.officeConfig.create({
      data: {
        lat: parseFloat(process.env.OFFICE_LAT ?? "20.352346"),
        lon: parseFloat(process.env.OFFICE_LON ?? "85.816088"),
        radiusM: parseInt(process.env.OFFICE_RADIUS_M ?? "200"),
      },
    });
  }
  return config;
}

export async function GET() {
  try {
    const config = await getOfficeConfig();
    return NextResponse.json({
      lat: config.lat,
      lon: config.lon,
      radiusM: config.radiusM,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch config";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Super Admin only" }, { status: 403 });
  }

  try {
    const { lat, lon, radiusM } = await req.json();
    if (lat === undefined || lon === undefined) {
      return NextResponse.json({ error: "lat and lon required" }, { status: 400 });
    }

    const currentConfig = await getOfficeConfig();
    const updatedConfig = await prisma.officeConfig.update({
      where: { id: currentConfig.id },
      data: {
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        radiusM: radiusM !== undefined ? parseInt(radiusM) : currentConfig.radiusM,
      },
    });

    // Also update in-memory variables
    process.env.OFFICE_LAT = String(updatedConfig.lat);
    process.env.OFFICE_LON = String(updatedConfig.lon);
    process.env.OFFICE_RADIUS_M = String(updatedConfig.radiusM);

    return NextResponse.json({
      lat: updatedConfig.lat,
      lon: updatedConfig.lon,
      radiusM: updatedConfig.radiusM,
      message: "Office location updated successfully.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update config";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
