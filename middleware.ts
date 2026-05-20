import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    if (req.nextUrl.pathname.startsWith("/admin") && !req.nextauth.token?.isAdmin) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    const emailVerified = req.nextauth.token?.isEmailVerified;
    const needsVerification =
      req.nextUrl.pathname === "/tasks/create" ||
      req.nextUrl.pathname.startsWith("/tasks/create");
    if (needsVerification && !emailVerified) {
      const url = new URL("/verify-email", req.url);
      url.searchParams.set("required", "1");
      if (req.nextauth.token?.email) {
        url.searchParams.set("email", req.nextauth.token.email as string);
      }
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/tasks/create",
    "/chat/:path*",
    "/profile/edit",
    "/admin/:path*",
  ],
};
