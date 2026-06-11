/**
 * GAS-facing employee export endpoint.
 * Returns a flat, ordered array matching the Employee Master Tracker columns.
 * Auth: Bearer token from GAS (set HRMS_API_TOKEN in Script Properties).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = process.env.HRMS_API_TOKEN;
  if (token && auth !== `Bearer ${token}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const employees = await prisma.employee.findMany({
    include: { department: true },
    orderBy: { createdAt: "asc" },
  });

  const rows = employees.map((e) => ({
    employeeId: e.employeeId,
    firstName: e.firstName,
    lastName: e.lastName,
    fullName: `${e.firstName} ${e.lastName}`,
    email: e.email,
    personalEmail: e.personalEmail ?? "",
    phone: e.phone ?? "",
    gender: e.gender ?? "",
    dateOfBirth: e.dateOfBirth ? e.dateOfBirth.toISOString().slice(0, 10) : "",
    bloodGroup: e.bloodGroup ?? "",
    address: e.address ?? "",
    city: e.city ?? "",
    state: e.state ?? "",
    pincode: e.pincode ?? "",
    department: e.department.name,
    designation: e.designation,
    employmentType: e.employmentType,
    status: e.status,
    joiningDate: e.joiningDate.toISOString().slice(0, 10),
    lastWorkingDate: e.lastWorkingDate ? e.lastWorkingDate.toISOString().slice(0, 10) : "",
    ctc: e.ctc ?? "",
    basicSalary: e.basicSalary ?? "",
    hra: e.hra ?? "",
    bankName: e.bankName ?? "",
    bankAccountNo: e.bankAccountNo ?? "",
    ifscCode: e.ifscCode ?? "",
    pan: e.pan ?? "",
    uan: e.uan ?? "",
  }));

  return NextResponse.json({ employees: rows, count: rows.length, exportedAt: new Date().toISOString() });
}
