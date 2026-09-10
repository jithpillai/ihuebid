-- AlterEnum
ALTER TYPE "OtpPurpose" ADD VALUE 'BUYER_INTEREST_VERIFY';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RateLimitAction" ADD VALUE 'BUYER_INTEREST_REQUEST';
ALTER TYPE "RateLimitAction" ADD VALUE 'BUYER_INTEREST_VERIFY';

-- AlterTable
ALTER TABLE "notification_opt_ins" ADD COLUMN     "buyer_name" VARCHAR(120),
ADD COLUMN     "buyer_phone" VARCHAR(32),
ADD COLUMN     "ready_to_buy_at" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "event_notification_emails" JSONB;
