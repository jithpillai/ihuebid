-- CreateEnum
CREATE TYPE "ResultVisibility" AS ENUM ('PUBLIC', 'CREATOR_ONLY');

-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "result_visibility" "ResultVisibility" NOT NULL DEFAULT 'PUBLIC';
