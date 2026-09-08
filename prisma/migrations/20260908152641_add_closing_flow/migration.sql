-- CreateEnum
CREATE TYPE "ClosureOutcome" AS ENUM ('SOLD', 'NOT_SOLD', 'REMOVED');

-- CreateEnum
CREATE TYPE "ClosureVisibility" AS ENUM ('SHOW_OUTCOME', 'CLOSED_ONLY');

-- AlterEnum
ALTER TYPE "OtpPurpose" ADD VALUE 'CONTACT_VERIFY';

-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "closure_final_price" DECIMAL(14,2),
ADD COLUMN     "closure_note" TEXT,
ADD COLUMN     "closure_outcome" "ClosureOutcome",
ADD COLUMN     "closure_visibility" "ClosureVisibility" NOT NULL DEFAULT 'SHOW_OUTCOME';

-- CreateTable
CREATE TABLE "notification_opt_ins" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "listing_id" UUID NOT NULL,
    "participant_identity_id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "verified_at" TIMESTAMPTZ(3),
    "interest_token_hash" VARCHAR(128) NOT NULL,
    "still_interested_at" TIMESTAMPTZ(3),
    "shared_contact_with_creator" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "notification_opt_ins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_opt_ins_interest_token_hash_key" ON "notification_opt_ins"("interest_token_hash");

-- CreateIndex
CREATE INDEX "notification_opt_ins_listing_id_verified_at_idx" ON "notification_opt_ins"("listing_id", "verified_at");

-- CreateIndex
CREATE UNIQUE INDEX "notification_opt_ins_listing_id_participant_identity_id_key" ON "notification_opt_ins"("listing_id", "participant_identity_id");

-- AddForeignKey
ALTER TABLE "notification_opt_ins" ADD CONSTRAINT "notification_opt_ins_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_opt_ins" ADD CONSTRAINT "notification_opt_ins_participant_identity_id_fkey" FOREIGN KEY ("participant_identity_id") REFERENCES "participant_identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
