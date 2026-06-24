import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

/**
 * Simple shared-account auth for the office. There are a handful of fixed
 * usernames that all share one password, so credentials live in config (env
 * with sensible defaults) rather than the database — no per-user records to
 * provision. Rotate the password in production by setting APP_PASSWORD.
 */
const ALLOWED_USERNAMES = (
  process.env.APP_USERNAMES ?? "hodges1,hodges2,hodges3"
)
  .split(",")
  .map((u) => u.trim().toLowerCase())
  .filter(Boolean);

const APP_PASSWORD = process.env.APP_PASSWORD ?? "appliance1";

const credentialsSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

/** Length-aware constant-time string compare. */
function safeEqual(a: string, b: string): boolean {
  let mismatch = a.length ^ b.length;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    mismatch |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return mismatch === 0;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const username = parsed.data.username.trim().toLowerCase();
        if (!ALLOWED_USERNAMES.includes(username)) return null;
        if (!safeEqual(parsed.data.password, APP_PASSWORD)) return null;

        return { id: username, name: username };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
