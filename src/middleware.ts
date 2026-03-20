import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: [
    // Protect everything except login, register, api/auth, api/register, static files
    "/((?!login|register|api/auth|api/register|_next/static|_next/image|favicon.ico).*)",
  ],
};
