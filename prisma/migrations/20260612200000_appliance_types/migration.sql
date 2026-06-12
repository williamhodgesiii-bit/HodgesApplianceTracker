-- CreateTable
CREATE TABLE "appliance_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appliance_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "appliance_types_name_key" ON "appliance_types"("name");

-- Seed a starter set of common orthodontic appliance types. These can be
-- renamed, removed, or added to from the Settings screen.
INSERT INTO "appliance_types" ("id", "name", "sort_order", "updated_at") VALUES
    (gen_random_uuid()::text, 'Aligners', 10, now()),
    (gen_random_uuid()::text, 'Retainer', 20, now()),
    (gen_random_uuid()::text, 'Hawley Retainer', 30, now()),
    (gen_random_uuid()::text, 'Essix Retainer', 40, now()),
    (gen_random_uuid()::text, 'Bonded Retainer', 50, now()),
    (gen_random_uuid()::text, 'Expander (RPE)', 60, now()),
    (gen_random_uuid()::text, 'Herbst', 70, now()),
    (gen_random_uuid()::text, 'Nightguard / Bite Splint', 80, now()),
    (gen_random_uuid()::text, 'Space Maintainer', 90, now()),
    (gen_random_uuid()::text, 'Lower Lingual Holding Arch (LLHA)', 100, now()),
    (gen_random_uuid()::text, 'Transpalatal Arch (TPA)', 110, now()),
    (gen_random_uuid()::text, 'Quad Helix', 120, now()),
    (gen_random_uuid()::text, 'Forsus', 130, now()),
    (gen_random_uuid()::text, 'Distalizer', 140, now())
ON CONFLICT ("name") DO NOTHING;
