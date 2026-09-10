-- AlterTable
ALTER TABLE "participant_identities" ADD COLUMN     "display_name" VARCHAR(80);

-- AlterTable
ALTER TABLE "responses" ADD COLUMN     "contributor_name" VARCHAR(80);
