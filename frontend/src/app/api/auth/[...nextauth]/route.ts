import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const allowedEmail = process.env.ADMIN_EMAIL;
      if (user.email && allowedEmail && user.email.toLowerCase() === allowedEmail.toLowerCase()) {
        return true;
      }
      return false;
    },
  },
  pages: {
    signIn: "/admin/login",
    error: "/admin/error",
  },
  secret: process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === "development" ? "dev-secret-portfolio-bot-stable-secret" : undefined),
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
