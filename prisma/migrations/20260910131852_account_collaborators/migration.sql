-- CreateTable
CREATE TABLE "account_collaborators" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "member_id" UUID,
    "linked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "account_collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "account_collaborators_member_id_idx" ON "account_collaborators"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "account_collaborators_owner_id_email_key" ON "account_collaborators"("owner_id", "email");

-- AddForeignKey
ALTER TABLE "account_collaborators" ADD CONSTRAINT "account_collaborators_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_collaborators" ADD CONSTRAINT "account_collaborators_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
