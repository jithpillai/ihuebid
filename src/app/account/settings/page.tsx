import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AvatarUploader } from "@/components/avatar-uploader";
import { HandleForm } from "@/components/handle-form";
import { cloudinaryImageUrl } from "@/server/media/cloudinary";
import { getCurrentSession } from "@/server/auth/session";

export const metadata: Metadata = { title: "Account settings", robots: { index: false, follow: false } };

export default async function AccountSettingsPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login?returnTo=/account/settings");

  const avatarUrl = session.user.profile?.avatarPublicId
    ? cloudinaryImageUrl({ publicId: session.user.profile.avatarPublicId, deliveryType: "authenticated" })
    : null;

  return (
    <section className="mx-auto max-w-2xl px-5 py-16 lg:px-8">
      <h1 className="text-3xl font-black tracking-tight text-zinc-900">Account settings</h1>
      <p className="mt-2 text-sm leading-6 text-zinc-500">
        Your handle is your permanent public identity — it appears in every listing URL you share.
      </p>

      <div className="mt-10 rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm">
        <h2 className="text-lg font-black text-zinc-900">Profile photo</h2>
        <div className="mt-4">
          <AvatarUploader initialImageUrl={avatarUrl} />
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm">
        <h2 className="text-lg font-black text-zinc-900">Public handle</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Your public profile will be at <span className="font-mono">bid.ihue.in/{"{"}handle{"}"}</span>.
        </p>
        <div className="mt-4">
          <HandleForm initialHandle={session.user.profile?.handle ?? ""} />
        </div>
      </div>
    </section>
  );
}
