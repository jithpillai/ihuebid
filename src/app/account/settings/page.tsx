import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AvatarUploader } from "@/components/avatar-uploader";
import { BannerUploader } from "@/components/banner-uploader";
import { CollaboratorsCard } from "@/components/collaborators-card";
import { DisplayNameForm } from "@/components/display-name-form";
import { EventNotificationEmailsForm } from "@/components/event-notification-emails-form";
import { HandleForm } from "@/components/handle-form";
import { ProfileDetailsForm } from "@/components/profile-details-form";
import { listAccountCollaborators } from "@/server/account/collaborator-service";
import { normalizeEventNotificationEmails, normalizeProfileLinks } from "@/server/account/profile-service";
import { cloudinaryImageUrl } from "@/server/media/cloudinary";
import { getCurrentSession } from "@/server/auth/session";

export const metadata: Metadata = { title: "Account settings", robots: { index: false, follow: false } };

export default async function AccountSettingsPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login?returnTo=/account/settings");

  const collaborators = await listAccountCollaborators(session.userId);

  const avatarUrl = session.user.profile?.avatarPublicId
    ? cloudinaryImageUrl({ publicId: session.user.profile.avatarPublicId, deliveryType: "authenticated" })
    : null;
  const bannerUrl = session.user.profile?.bannerPublicId
    ? cloudinaryImageUrl({ publicId: session.user.profile.bannerPublicId })
    : null;

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-black tracking-tight text-fg">Account settings</h1>
      <p className="mt-2 text-sm leading-6 text-muted-fg">
        Your handle is your permanent public identity — it appears in every listing URL you share.
      </p>

      <div className="mt-10 rounded-3xl border border-border bg-surface p-7 shadow-sm">
        <h2 className="text-lg font-black text-fg">Display name</h2>
        <p className="mt-1 text-sm text-muted-fg">
          The name shown on your public profile and next to every listing you publish. We start it from your
          sign-in email — change it to your name or your business name.
        </p>
        <div className="mt-4">
          <DisplayNameForm initialName={session.user.displayName} />
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-border bg-surface p-7 shadow-sm">
        <h2 className="text-lg font-black text-fg">Profile photo</h2>
        <div className="mt-4">
          <AvatarUploader initialImageUrl={avatarUrl} />
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-border bg-surface p-7 shadow-sm">
        <h2 className="text-lg font-black text-fg">Profile banner</h2>
        <p className="mt-1 text-sm text-muted-fg">The wide image across the top of your public profile page.</p>
        <div className="mt-4">
          <BannerUploader initialImageUrl={bannerUrl} />
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-border bg-surface p-7 shadow-sm">
        <h2 className="text-lg font-black text-fg">Public profile</h2>
        <p className="mt-1 text-sm text-muted-fg">
          All optional. These show on your public profile and pre-fill the shareable message on each published listing.
        </p>
        <div className="mt-4">
          <ProfileDetailsForm
            initialBio={session.user.profile?.bio ?? ""}
            initialLocation={session.user.profile?.location ?? ""}
            initialBrandName={session.user.profile?.brandName ?? ""}
            initialContactPhone={session.user.profile?.contactPhone ?? ""}
            initialLinks={normalizeProfileLinks(session.user.profile?.links)}
          />
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-border bg-surface p-7 shadow-sm">
        <h2 className="text-lg font-black text-fg">Event notification emails</h2>
        <p className="mt-1 text-sm text-muted-fg">
          Emailed whenever someone marks <span className="font-semibold text-fg">Interested to Buy</span> on any of
          your listings — with their name, phone, and estimate. Your sign-in email always gets these too.
        </p>
        <div className="mt-4">
          <EventNotificationEmailsForm
            initialEmails={normalizeEventNotificationEmails(session.user.profile?.eventNotificationEmails)}
          />
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-border bg-surface p-7 shadow-sm">
        <h2 className="text-lg font-black text-fg">Collaborators</h2>
        <p className="mt-1 text-sm text-muted-fg">
          Give one or two people access to co-manage your listings and interested buyers under your handle.
        </p>
        <div className="mt-4">
          <CollaboratorsCard initialCollaborators={collaborators} />
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-border bg-surface p-7 shadow-sm">
        <h2 className="text-lg font-black text-fg">Public handle</h2>
        <p className="mt-1 text-sm text-muted-fg">
          Your public profile will be at <span className="font-mono">bid.ihue.in/{"{"}handle{"}"}</span>.
        </p>
        <div className="mt-4">
          <HandleForm initialHandle={session.user.profile?.handle ?? ""} />
        </div>
      </div>
    </section>
  );
}
