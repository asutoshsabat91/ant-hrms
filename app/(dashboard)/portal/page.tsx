import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PortalClient } from "@/components/portal/PortalClient";
import { redirect } from "next/navigation";

export default async function PortalPage({ searchParams }: { searchParams?: { gcal?: string } }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const isAdmin = session.user.role === "ADMIN";
  const gcalStatus = searchParams?.gcal;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      employee: {
        include: {
          department: true,
        },
      },
    },
  });

  if (!user || !user.employee) {
    return (
      <div className="flex h-[50vh] items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white p-8 text-center text-zinc-500 shadow-sm">
        <div>
          <p className="text-sm font-bold text-zinc-800">No Employee Record Found</p>
          <p className="text-xs text-zinc-400 mt-1">Your user account is not linked to any employee record. Please contact HR.</p>
        </div>
      </div>
    );
  }

  return (
    <PortalClient
      employee={user.employee}
      isAdmin={isAdmin}
    />
  );
}
