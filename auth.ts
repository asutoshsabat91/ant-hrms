import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const providers: any[] = [
  Credentials({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const parsed = credentialsSchema.safeParse(credentials);
      if (!parsed.success) return null;

      const user = await prisma.user.findUnique({
        where: { email: parsed.data.email.toLowerCase() },
        include: { employee: true },
      });

      if (!user?.passwordHash || !user.isActive) return null;

      const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
      if (!valid) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.employee
          ? `${user.employee.firstName} ${user.employee.lastName}`
          : user.email,
        role: user.role,
        managedCompany: user.employee?.managedCompany ?? null,
      };
    },
  }),
];

const googleClientId =
  process.env.GOOGLE_CLIENT_ID ||
  process.env.AUTH_GOOGLE_ID ||
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  "";

const googleClientSecret =
  process.env.GOOGLE_CLIENT_SECRET ||
  process.env.AUTH_GOOGLE_SECRET ||
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET ||
  "";

providers.push(
  Google({
    clientId: googleClientId || "placeholder-google-client-id",
    clientSecret: googleClientSecret || "placeholder-google-client-secret",
    allowDangerousEmailAccountLinking: true,
  })
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  trustHost: true,
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && user.email) {
        const email = user.email.toLowerCase();
        
        // Ensure the Google account email is verified
        if (profile && "email_verified" in profile && (profile as any).email_verified === false) {
          return false;
        }

        // Find if user/employee exists in DB with this email (either official or personal)
        const employee = await prisma.employee.findFirst({
          where: {
            OR: [
              { email },
              { personalEmail: email }
            ],
            status: { notIn: ["INACTIVE", "ALUMNI"] }
          },
          include: { user: true }
        });
        
        // Block logins for non-existent or inactive user records
        if (!employee || !employee.user || !employee.user.isActive) {
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        if (user.id) token.id = user.id;
        token.role = (user as any).role;
        token.managedCompany = (user as any).managedCompany ?? null;
      }
      if (!token.role && token.email) {
        const email = (token.email as string).toLowerCase();
        const dbUser = await prisma.user.findFirst({
          where: {
            OR: [
              { email },
              { employee: { personalEmail: email } }
            ]
          },
          select: { id: true, role: true, email: true, employee: { select: { managedCompany: true } } },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.email = dbUser.email;
          token.managedCompany = dbUser.employee?.managedCompany ?? null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as import("@prisma/client").Role;
        session.user.managedCompany = token.managedCompany as string | null;
        if (token.email) {
          session.user.email = token.email as string;
        }
      }
      return session;
    },
  },
});
