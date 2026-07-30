import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/models",
  "/docs",
  "/api/auth",
];

const ADMIN_PREFIX = "/admin";
const USER_PREFIX = "/dashboard";
const CONSOLE_PREFIX = "/console";

/**
 * Middleware — runs in the Edge runtime, so we CANNOT touch the DB.
 *
 * Strategy:
 *  - If the path is public, pass through.
 *  - Otherwise require a session cookie (presence only).
 *  - For /admin routes, require a second cookie `ba_role=admin` that the
 *    login flow sets via Set-Cookie. We set this in the auth client's
 *    onSuccess hook below.
 *
 * The actual role check for /admin is also performed server-side in the
 * layout (requireAdmin), so this is just a fast-path redirect.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic =
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/v1") ||
    pathname.startsWith("/api/anthropic") ||
    pathname.startsWith("/v1") ||
    pathname.startsWith("/anthropic") ||
    pathname.includes(".");

  if (isPublic) return NextResponse.next();

  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // /admin: require a role cookie (set by the client after successful login).
  // This is a fast edge check; the layout does the authoritative DB check.
  if (pathname.startsWith(ADMIN_PREFIX)) {
    const role = request.cookies.get("ba_role")?.value;
    if (role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
