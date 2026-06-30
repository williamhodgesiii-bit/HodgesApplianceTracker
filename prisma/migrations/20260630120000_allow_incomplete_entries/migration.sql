-- Allow incomplete appliance entries: the sent, delivery, and expected-return
-- dates become optional so a record can be created before all the info is
-- known (e.g. an appliance with no delivery date yet, or one that is ready to
-- send but the patient hasn't paid). Such entries derive as INCOMPLETE.
ALTER TABLE "appliances" ALTER COLUMN "date_sent" DROP NOT NULL;
ALTER TABLE "appliances" ALTER COLUMN "delivery_date" DROP NOT NULL;
ALTER TABLE "appliances" ALTER COLUMN "expected_return_date" DROP NOT NULL;
