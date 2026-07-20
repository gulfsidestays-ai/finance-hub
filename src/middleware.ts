import { NextRequest, NextResponse } from "next/server";

// Password gate has been removed — the app is now open access.
// The only behavior kept is redirecting the old /login page to the dashboard
// so the (now unused) login form is never shown.
export const config = {
  matcher: [
    /*
     * Match all paths except Next.js internals and static files.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  return NextResponse.next();
}
