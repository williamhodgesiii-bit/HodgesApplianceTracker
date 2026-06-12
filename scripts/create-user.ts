/**
 * CLI to create (or update) a login user.
 *
 *   npm run user:create -- --email you@office.com --password "secret" --name "Jane"
 *
 * Or via environment variables:
 *   USER_EMAIL=you@office.com USER_PASSWORD=secret npm run user:create
 *
 * There is no public sign-up; this is the only way to add users.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const prisma = new PrismaClient();

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return undefined;
}

async function prompt(question: string, hidden = false): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout });
  if (hidden) {
    // Best-effort masking for password entry.
    // @ts-expect-error - _writeToOutput is internal but widely used.
    rl._writeToOutput = () => {};
  }
  const answer = await rl.question(question);
  rl.close();
  if (hidden) stdout.write("\n");
  return answer.trim();
}

async function main() {
  const email =
    getArg("--email") ??
    process.env.USER_EMAIL ??
    (await prompt("Email: "));
  const name =
    getArg("--name") ?? process.env.USER_NAME ?? (await prompt("Name: "));
  const password =
    getArg("--password") ??
    process.env.USER_PASSWORD ??
    (await prompt("Password: ", true));

  if (!email || !password) {
    console.error("Email and password are required.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { passwordHash, name: name || undefined },
    create: { email: email.toLowerCase(), name: name || null, passwordHash },
  });

  console.log(`✓ User ready: ${user.email}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
