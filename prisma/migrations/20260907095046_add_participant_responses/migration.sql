-- CreateEnum
CREATE TYPE "ResponseMode" AS ENUM ('ANONYMOUS_VALUATION', 'INTEREST_OPT_IN', 'VERIFIED_OFFER');

-- CreateTable
CREATE TABLE "participant_identities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "token_hash" VARCHAR(128) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participant_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "listing_id" UUID NOT NULL,
    "participant_identity_id" UUID NOT NULL,
    "mode" "ResponseMode" NOT NULL DEFAULT 'ANONYMOUS_VALUATION',
    "value" DECIMAL(14,2) NOT NULL,
    "revision_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "participant_identities_token_hash_key" ON "participant_identities"("token_hash");

-- CreateIndex
CREATE INDEX "responses_listing_id_idx" ON "responses"("listing_id");

-- CreateIndex
CREATE UNIQUE INDEX "responses_listing_id_participant_identity_id_key" ON "responses"("listing_id", "participant_identity_id");

-- AddForeignKey
ALTER TABLE "responses" ADD CONSTRAINT "responses_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responses" ADD CONSTRAINT "responses_participant_identity_id_fkey" FOREIGN KEY ("participant_identity_id") REFERENCES "participant_identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
