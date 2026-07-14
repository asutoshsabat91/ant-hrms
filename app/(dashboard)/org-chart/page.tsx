import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { OrgChartClient } from "@/components/org-chart/OrgChartClient";
import { redirect } from "next/navigation";

export default async function OrgChartPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const email = session.user.email?.toLowerCase() || "";
  const isRitesh = email === "ritesh@theantbox.com";
  const isAdmin = session.user.role === "ADMIN" || isRitesh;

  return (
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
      <div className="flex-none">
        <PageHeader
          title="Organization Chart"
          description="Visualize and manage the reporting lines of AntBox employees"
        />
      </div>

      <div className="flex-1 min-h-0 bg-zinc-50/50 rounded-2xl border border-zinc-200 overflow-hidden relative shadow-sm">
        <OrgChartClient
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}
