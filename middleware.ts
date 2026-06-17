import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import type { Role } from "@prisma/client";

const publicPaths = ["/login", "/register", "/api/auth"];

const roleRoutes: Record<string, Role[]> = {
  "/employees": ["SUPER_ADMIN"],
  "/payroll": ["HR_ADMIN", "SUPER_ADMIN"],
  "/it-ops": ["HR_ADMIN", "SUPER_ADMIN"],
  "/reports": ["HR_ADMIN", "SUPER_ADMIN", "MANAGER"],
  "/settings": ["SUPER_ADMIN"],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const isSecure = req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
  const cookieName = isSecure ? "__Secure-authjs.session-token" : "authjs.session-token";

  let token = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    secureCookie: isSecure,
    cookieName: cookieName,
  });

  if (!token) {
    token = await getToken({
      req,
      secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    });
  }

  if (!token) {
    const login = new URL("/login", req.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  const role = token.role as Role | undefined;

  for (const [route, allowed] of Object.entries(roleRoutes)) {
    if (pathname.startsWith(route) && role && !allowed.includes(role)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
