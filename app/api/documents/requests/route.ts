import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { DocumentType } from "@prisma/client";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = session.user.email?.toLowerCase() || "";
  const isRitesh = email === "ritesh@theantbox.com";
  const isAdmin = (session.user.role === "ADMIN" || session.user.role === "COMPANY_ADMIN") && !isRitesh;

  try {
    let requests;
    if (isAdmin) {
      requests = await prisma.documentRequest.findMany({
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, employeeId: true }
          }
        },
        orderBy: { createdAt: "desc" }
      });
    } else {
      const emp = await prisma.employee.findUnique({
        where: { userId: session.user.id }
      });
      if (!emp) {
        return NextResponse.json({ requests: [] });
      }

      requests = await prisma.documentRequest.findMany({
        where: { employeeId: emp.id },
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, employeeId: true }
          }
        },
        orderBy: { createdAt: "desc" }
      });
    }

    return NextResponse.json({ requests });
  } catch (error) {
    console.error("[DOCUMENT_REQUESTS_GET]", error);
    return NextResponse.json({ error: "Failed to fetch document requests" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { documentType, title, reason } = await req.json();

    if (!documentType || !title || !reason) {
      return NextResponse.json({ error: "Document type, title, and reason are required." }, { status: 400 });
    }

    const emp = await prisma.employee.findUnique({
      where: { userId: session.user.id }
    });

    if (!emp) {
      return NextResponse.json({ error: "Employee profile not found" }, { status: 404 });
    }

    const request = await prisma.documentRequest.create({
      data: {
        employeeId: emp.id,
        documentType: documentType as DocumentType,
        title,
        reason,
        status: "PENDING"
      },
      include: {
        employee: true
      }
    });

    // Create notifications for super admins and Chandrita
    const admins = await prisma.user.findMany({
      where: {
        OR: [
          { role: "ADMIN" },
          { email: "chandrita@theantbox.com" }
        ]
      }
    });

    const notifBody = `${emp.firstName} ${emp.lastName} has requested a document: "${title}" (${documentType}). Reason: ${reason}`;
    
    await prisma.notification.createMany({
      data: admins.map(adm => ({
        userId: adm.id,
        type: "DOCUMENT_REQUEST",
        title: "New Document Request",
        body: notifBody,
        link: "/documents"
      }))
    });

    return NextResponse.json({ request });
  } catch (error) {
    console.error("[DOCUMENT_REQUEST_POST]", error);
    return NextResponse.json({ error: "Failed to create document request" }, { status: 500 });
  }
}
