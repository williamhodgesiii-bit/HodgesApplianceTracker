-- Allow incomplete appliance entries.
--
-- The sent, delivery, and expected-return dates may now be left blank so a case
-- can be recorded before those are known (e.g. an appliance that needs entering
-- but has no delivery date yet, or one that's made but not yet paid for / sent).
-- Records missing these dates derive an INCOMPLETE status (see lib/status.ts).
--
-- This only relaxes the NOT NULL constraints; existing rows keep their values
-- and their derived statuses are unaffected.
ALTER TABLE "appliances" ALTER COLUMN "date_sent" DROP NOT NULL;
ALTER TABLE "appliances" ALTER COLUMN "delivery_date" DROP NOT NULL;
ALTER TABLE "appliances" ALTER COLUMN "expected_return_date" DROP NOT NULL;
