/**
 * Clear the seeded sample appliances so you can start entering real data.
 *
 *   npm run db:clear-samples
 *
 * This deletes ALL appliance rows. Labs and managed appliance types are kept
 * (those are reusable for real data). It does NOT touch users.
 *
 * Run it once, against the database you want to clean (set DATABASE_URL),
 * after you're done evaluating the sample data. There is no automatic seeding
 * on deploy, so real data you enter afterwards is safe.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const { count } = await prisma.appliance.deleteMany({});
  console.log(`✓ Deleted ${count} appliance${count === 1 ? "" : "s"}.`);
  console.log("Labs and appliance types were kept. You're ready for real data.");
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
