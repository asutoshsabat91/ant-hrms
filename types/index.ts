import type { Role } from "@prisma/client";

export type { Role };

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: Role;
      managedCompany?: string | null;
    };
  }

  interface User {
    role: Role;
    managedCompany?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    id: string;
    managedCompany?: string | null;
  }
}

export interface StatCardData {
  label: string;
  value: number | string;
  subtext?: string;
  trend?: { value: number; direction: "up" | "down" };
}

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  roles?: Role[];
}
