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
        if (!email.endsWith("@theantbox.com")) {
          return false; // Strictly restrict to AntBox corporate email IDs
        }
        
        // Ensure the Google account email is verified
        if (profile && "email_verified" in profile && (profile as any).email_verified === false) {
          return false;
        }

        const existing = await prisma.user.findUnique({
          where: { email },
        });
        
        // Block logins for non-existent or inactive user records
        if (!existing || !existing.isActive) {
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { email: (user.email ?? token.email) as string },
          include: { employee: { select: { managedCompany: true } } },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.managedCompany = dbUser.employee?.managedCompany ?? null;
        }
      } else if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email as string },
          include: { employee: { select: { managedCompany: true } } },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
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
      }
      return session;
    },
  },
});
