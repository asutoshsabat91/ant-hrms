import { NextResponse } from "next/server";
import { auth } from "@/auth";
import fs from "fs";
import path from "path";

function getOfficeConfig() {
  return {
    lat: parseFloat(process.env.OFFICE_LAT ?? "20.2961"),
    lon: parseFloat(process.env.OFFICE_LON ?? "85.8245"),
    radiusM: parseInt(process.env.OFFICE_RADIUS_M ?? "200"),
  };
}

export async function GET() {
  return NextResponse.json(getOfficeConfig());
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Super Admin only" }, { status: 403 });
  }

  const { lat, lon, radiusM } = await req.json();
  if (!lat || !lon) return NextResponse.json({ error: "lat and lon required" }, { status: 400 });

  // Update .env file in-place
  const envPath = path.join(process.cwd(), ".env");
  let envContent = fs.readFileSync(envPath, "utf-8");

  const update = (key: string, value: string) => {
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}="${value}"`);
    } else {
      envContent += `\n${key}="${value}"`;
    }
  };

  update("OFFICE_LAT", String(lat));
  update("OFFICE_LON", String(lon));
  update("OFFICE_RADIUS_M", String(radiusM ?? 200));

  fs.writeFileSync(envPath, envContent);

  // Also set in process.env for immediate effect without restart
  process.env.OFFICE_LAT = String(lat);
  process.env.OFFICE_LON = String(lon);
  process.env.OFFICE_RADIUS_M = String(radiusM ?? 200);

  return NextResponse.json({ lat, lon, radiusM: radiusM ?? 200, message: "Office location updated." });
}
