import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Protect every page except the login route and Next.js internals.
export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const isLoginPage = nextUrl.pathname === "/login";

  if (!isLoggedIn && !isLoginPage) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname + nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/", nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  // Run on everything except static assets and the auth API route.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
