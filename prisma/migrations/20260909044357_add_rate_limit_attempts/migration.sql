-- CreateEnum
CREATE TYPE "RateLimitAction" AS ENUM ('SUBMIT_RESPONSE', 'NOTIFY_OPT_IN_REQUEST', 'NOTIFY_OPT_IN_VERIFY', 'CONFIRM_INTERESTED', 'EMAIL_OTP_REQUEST', 'EMAIL_OTP_VERIFY');

-- CreateTable
CREATE TABLE "rate_limit_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "action" "RateLimitAction" NOT NULL,
    "ip_hash" VARCHAR(128) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limit_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rate_limit_attempts_action_ip_hash_created_at_idx" ON "rate_limit_attempts"("action", "ip_hash", "created_at");
