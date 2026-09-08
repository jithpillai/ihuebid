-- Redundant with still_interested_at: clicking "I'm still interested" on a
-- listing's page IS the explicit consent to share the email with that
-- listing's creator, not a separate choice layered on top.
ALTER TABLE "notification_opt_ins" DROP COLUMN "shared_contact_with_creator";
