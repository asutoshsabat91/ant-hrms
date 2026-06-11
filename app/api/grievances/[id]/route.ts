import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { GrievanceStatus } from "@prisma/client";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  const grievance = await prisma.grievance.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true } },
      employee: { select: { id: true, firstName: true, lastName: true } },
      comments: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!grievance) {
    return NextResponse.json({ error: "Grievance ticket not found." }, { status: 404 });
  }

  const isHrOrAdmin = ["HR_ADMIN", "SUPER_ADMIN"].includes(session.user.role);
  if (!isHrOrAdmin && grievance.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch comment authors manually since there is no direct relation in schema
  const authorIds = Array.from(new Set(grievance.comments.map((c) => c.authorId)));
  const authors = await prisma.user.findMany({
    where: { id: { in: authorIds } },
    select: {
      id: true,
      email: true,
      role: true,
      employee: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  const authorMap = new Map(authors.map((a) => [a.id, a]));

  const commentsWithAuthor = grievance.comments.map((c) => {
    const author = authorMap.get(c.authorId);
    const authorName = author?.employee
      ? `${author.employee.firstName} ${author.employee.lastName}`
      : author?.email || "System User";
    return {
      id: c.id,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      authorName,
      authorRole: author?.role || "EMPLOYEE",
      isInternal: c.isInternal,
    };
  });

  return NextResponse.json({
    grievance: {
      id: grievance.id,
      ticketNo: grievance.ticketNo,
      subject: grievance.subject,
      description: grievance.description,
      category: grievance.category,
      priority: grievance.priority,
      status: grievance.status,
      isAnonymous: grievance.isAnonymous,
      resolution: grievance.resolution,
      resolvedAt: grievance.resolvedAt?.toISOString() || null,
      createdAt: grievance.createdAt.toISOString(),
      comments: commentsWithAuthor,
      employeeName: grievance.isAnonymous
        ? "Anonymous"
        : grievance.employee
        ? `${grievance.employee.firstName} ${grievance.employee.lastName}`
        : grievance.user.email,
    },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  const grievance = await prisma.grievance.findUnique({
    where: { id },
  });

  if (!grievance) {
    return NextResponse.json({ error: "Grievance ticket not found." }, { status: 404 });
  }

  const isHrOrAdmin = ["HR_ADMIN", "SUPER_ADMIN"].includes(session.user.role);
  if (!isHrOrAdmin && grievance.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { status, resolution, comment } = body;

  const updateData: {
    status?: GrievanceStatus;
    resolution?: string;
    resolvedAt?: Date | null;
  } = {};

  // Only HR/Admin can update status (except employee can change to CLOSED if it is already open)
  if (status) {
    if (isHrOrAdmin) {
      updateData.status = status as GrievanceStatus;
      if (status === "RESOLVED") {
        updateData.resolvedAt = new Date();
      }
    } else if (status === "CLOSED" && grievance.userId === session.user.id) {
      updateData.status = "CLOSED";
    } else {
      return NextResponse.json({ error: "Forbidden: Only HR can update status." }, { status: 403 });
    }
  }

  if (resolution !== undefined) {
    if (isHrOrAdmin) {
      updateData.resolution = resolution;
    } else {
      return NextResponse.json({ error: "Forbidden: Only HR can set resolutions." }, { status: 403 });
    }
  }

  // Perform updates
  if (Object.keys(updateData).length > 0) {
    await prisma.grievance.update({
      where: { id },
      data: updateData,
    });
  }

  // Create comment if provided
  if (comment && comment.trim().length > 0) {
    await prisma.grievanceComment.create({
      data: {
        grievanceId: id,
        authorId: session.user.id,
        content: comment.trim(),
      },
    });
  }

  // Send Notifications
  if (isHrOrAdmin) {
    // Notify the employee about the update
    await prisma.notification.create({
      data: {
        userId: grievance.userId,
        type: "GRIEVANCE_UPDATE",
        title: `Grievance Update: ${grievance.ticketNo}`,
        body: comment
          ? `HR added a comment on your ticket ${grievance.ticketNo}.`
          : `HR updated your ticket status to ${status || grievance.status}.`,
        link: `/grievances`,
      },
    });
  } else {
    // Notify HR users that the employee replied/commented or closed the ticket
    const hrUsers = await prisma.user.findMany({
      where: { role: { in: ["HR_ADMIN", "SUPER_ADMIN"] } },
    });

    const bodyText = status === "CLOSED"
      ? `Employee closed the grievance ticket ${grievance.ticketNo}.`
      : `Employee added a comment on ticket ${grievance.ticketNo}.`;

    for (const hr of hrUsers) {
      await prisma.notification.create({
        data: {
          userId: hr.id,
          type: "GRIEVANCE_UPDATE",
          title: `Grievance Ticket Update: ${grievance.ticketNo}`,
          body: bodyText,
          link: `/grievances`,
        },
      });
    }
  }

  return NextResponse.json({ success: true });
}
