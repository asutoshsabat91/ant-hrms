import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import type { Role } from "@prisma/client";

const publicPaths = ["/login", "/register", "/api/auth"];

const adminOnlyRoutes = [
  "/employees", "/onboarding", "/offboarding", "/payroll",
  "/settings",
  "/api/employees", "/api/payroll", "/api/onboarding", "/api/offboarding",
];

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
    const redirectRes = NextResponse.redirect(login);
    redirectRes.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return redirectRes;
  }

  const role = token.role as Role | undefined;

  if (role === "EMPLOYEE" && adminOnlyRoutes.some((r) => pathname.startsWith(r))) {
    if (
      pathname === "/api/onboarding/personal" ||
      pathname === "/api/onboarding/banking" ||
      pathname === "/api/onboarding/idform" ||
      /^\/onboarding\/[^\/]+$/.test(pathname)
    ) {
      const response = NextResponse.next();
      response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      return response;
    }
    const redirectRes = NextResponse.redirect(new URL("/", req.url));
    redirectRes.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return redirectRes;
  }

  const response = NextResponse.next();
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
