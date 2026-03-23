import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: [
    // Protect everything except login, register, password reset, api/auth, api/register, api password routes, static files
    "/((?!login|register|forgot-password|reset-password|api/auth|api/register|api/forgot-password|api/reset-password|_next/static|_next/image|favicon.ico).*)",
  ],
};
