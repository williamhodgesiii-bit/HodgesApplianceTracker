/**
 * Seed script: creates the initial login user, the starter labs, and ~10
 * sample appliances covering every status. Run with `npm run db:seed`.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, toUtcMidnight, utcDate } from "../lib/dates";
import { expectedReturnDate } from "../lib/expectedReturn";

const prisma = new PrismaClient();

const SEED_USER_EMAIL = process.env.SEED_USER_EMAIL ?? "assistant@office.test";
const SEED_USER_PASSWORD = process.env.SEED_USER_PASSWORD ?? "password123";
const SEED_USER_NAME = process.env.SEED_USER_NAME ?? "Lab Assistant";

const STARTER_LABS = ["Invisalign", "AOA", "Vivera", "Angel Aligners"];

/** Build a delivery date N days from today (rolled forward off weekends). */
function deliveryInDays(days: number): Date {
  return addDays(toUtcMidnight(new Date()), days);
}

async function main() {
  // --- User -------------------------------------------------------------
  const passwordHash = await bcrypt.hash(SEED_USER_PASSWORD, 10);
  await prisma.user.upsert({
    where: { email: SEED_USER_EMAIL.toLowerCase() },
    update: {},
    create: {
      email: SEED_USER_EMAIL.toLowerCase(),
      name: SEED_USER_NAME,
      passwordHash,
    },
  });
  console.log(`✓ User ready: ${SEED_USER_EMAIL} / ${SEED_USER_PASSWORD}`);

  // --- Labs -------------------------------------------------------------
  const labs: Record<string, string> = {};
  for (const name of STARTER_LABS) {
    const lab = await prisma.lab.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    labs[name] = lab.id;
  }
  console.log(`✓ Labs ready: ${STARTER_LABS.join(", ")}`);

  // --- Appliances -------------------------------------------------------
  // Clear out previous sample rows so re-seeding stays clean.
  await prisma.appliance.deleteMany({});

  const today = toUtcMidnight(new Date());

  type SampleInput = {
    first: string;
    last: string;
    lab: string;
    type: string;
    sentDaysAgo: number | null;
    deliveryInDays: number;
    receivedDaysAgo?: number | null;
    notes?: string;
    expectedOverride?: Date;
    /** Partial entry: no delivery date yet → derives as INCOMPLETE. */
    incomplete?: boolean;
  };

  const samples: SampleInput[] = [
    // INCOMPLETE (entered before all the info is known)
    {
      first: "Mia",
      last: "Anderson",
      lab: "AOA",
      type: "Expander",
      sentDaysAgo: 2,
      deliveryInDays: 0,
      notes: "Sent to lab; appointment not scheduled yet — no delivery date.",
      incomplete: true,
    },
    {
      first: "Ethan",
      last: "Thomas",
      lab: "Vivera",
      type: "Retainer",
      sentDaysAgo: null,
      deliveryInDays: 0,
      notes: "Ready to send off — waiting on patient payment.",
      incomplete: true,
    },
    // OVERDUE (expected in the past, not received)
    {
      first: "Olivia",
      last: "Martin",
      lab: "AOA",
      type: "Expander",
      sentDaysAgo: 21,
      deliveryInDays: 1,
      notes: "DD pulled forward; lab running behind.",
      expectedOverride: addDays(today, -6),
    },
    {
      first: "Liam",
      last: "Nguyen",
      lab: "Invisalign",
      type: "Aligners",
      sentDaysAgo: 18,
      deliveryInDays: 2,
      notes: "Rush case.",
      expectedOverride: addDays(today, -2),
    },
    // DUE SOON (expected within next 3 business days)
    {
      first: "Emma",
      last: "Johnson",
      lab: "Vivera",
      type: "Retainer",
      sentDaysAgo: 10,
      deliveryInDays: 5,
      notes: "DD set for appt.",
      expectedOverride: today,
    },
    {
      first: "Noah",
      last: "Garcia",
      lab: "Angel Aligners",
      type: "Aligners",
      sentDaysAgo: 9,
      deliveryInDays: 6,
      notes: "",
      expectedOverride: addDays(today, 1),
    },
    {
      first: "Ava",
      last: "Smith",
      lab: "AOA",
      type: "Herbst",
      sentDaysAgo: 8,
      deliveryInDays: 6,
      notes: "Confirm fit at delivery.",
      expectedOverride: addDays(today, 2),
    },
    // ON TRACK (expected further out)
    {
      first: "William",
      last: "Brown",
      lab: "Invisalign",
      type: "Aligners",
      sentDaysAgo: 4,
      deliveryInDays: 21,
      notes: "",
      expectedOverride: addDays(today, 16),
    },
    {
      first: "Sophia",
      last: "Davis",
      lab: "Vivera",
      type: "Retainer",
      sentDaysAgo: 3,
      deliveryInDays: 18,
      notes: "Replacement for lost retainer.",
      expectedOverride: addDays(today, 13),
    },
    {
      first: "James",
      last: "Wilson",
      lab: "AOA",
      type: "Expander",
      sentDaysAgo: 2,
      deliveryInDays: 25,
      notes: "",
      expectedOverride: addDays(today, 20),
    },
    // RECEIVED on time
    {
      first: "Isabella",
      last: "Moore",
      lab: "Angel Aligners",
      type: "Aligners",
      sentDaysAgo: 20,
      deliveryInDays: -2,
      receivedDaysAgo: 6,
      notes: "Arrived early.",
      expectedOverride: addDays(today, -5),
    },
    // RECEIVED late (received after expected — should flag red)
    {
      first: "Benjamin",
      last: "Taylor",
      lab: "Invisalign",
      type: "Retainer",
      sentDaysAgo: 24,
      deliveryInDays: -4,
      receivedDaysAgo: 2,
      notes: "Came in late — followed up twice.",
      expectedOverride: addDays(today, -8),
    },
  ];

  for (const s of samples) {
    const deliveryDate = s.incomplete ? null : deliveryInDays(s.deliveryInDays);
    const expected = s.incomplete
      ? null
      : s.expectedOverride ?? expectedReturnDate(deliveryDate!);
    await prisma.appliance.create({
      data: {
        patientFirstName: s.first,
        patientLastName: s.last,
        labId: labs[s.lab],
        applianceType: s.type,
        dateSent: s.sentDaysAgo != null ? addDays(today, -s.sentDaysAgo) : null,
        deliveryDate,
        expectedReturnDate: expected,
        receivedDate:
          s.receivedDaysAgo != null ? addDays(today, -s.receivedDaysAgo) : null,
        notes: s.notes ?? "",
      },
    });
  }
  console.log(`✓ Seeded ${samples.length} sample appliances.`);
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
