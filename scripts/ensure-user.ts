/**
 * Non-interactive login-user setup, intended to run during the Vercel build.
 *
 * Creates (or updates) the login user from environment variables so the app
 * can be deployed with zero terminal access — just set these in Vercel:
 *
 *   SETUP_USER_EMAIL     e.g. you@office.com
 *   SETUP_USER_PASSWORD  the password you want to log in with
 *   SETUP_USER_NAME      optional display name
 *
 * If the variables are not set, this is a no-op so the build still succeeds.
 * Keeping the password in an env var (not in code) keeps it out of git.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SETUP_USER_EMAIL;
  const password = process.env.SETUP_USER_PASSWORD;
  const name = process.env.SETUP_USER_NAME ?? null;

  if (!email || !password) {
    console.log(
      "ensure-user: SETUP_USER_EMAIL / SETUP_USER_PASSWORD not set — skipping.",
    );
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { passwordHash, name: name || undefined },
    create: { email: email.toLowerCase(), name, passwordHash },
  });

  console.log(`ensure-user: login ready for ${user.email}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    // Don't fail the whole build if the DB is briefly unreachable here.
    console.error("ensure-user: skipped due to error:", e);
    await prisma.$disconnect();
    process.exit(0);
  });
