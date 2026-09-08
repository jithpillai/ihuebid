import type { ClosureOutcome } from "@/generated/prisma/client";

const OUTCOME_LINE: Record<ClosureOutcome, (finalPriceFormatted?: string) => string> = {
  SOLD: (finalPriceFormatted) => finalPriceFormatted ? `It sold for ${finalPriceFormatted}.` : "It sold.",
  NOT_SOLD: () => "It did not sell.",
  REMOVED: () => "The listing was removed by the creator.",
};

export function renderClosureNotificationEmail({
  listingTitle,
  creatorDisplayName,
  outcome,
  finalPriceFormatted,
  interestedUrl,
}: {
  listingTitle: string;
  creatorDisplayName: string;
  outcome: ClosureOutcome;
  finalPriceFormatted?: string;
  interestedUrl: string;
}) {
  const outcomeLine = OUTCOME_LINE[outcome](finalPriceFormatted);
  const subject = `"${listingTitle}" has closed`;
  const text = [
    `"${listingTitle}" by ${creatorDisplayName} has closed.`,
    outcomeLine,
    "",
    `Still interested? Let ${creatorDisplayName} know: ${interestedUrl}`,
    "",
    "ihue Bid",
  ].join("\n");
  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#0b0e12;color:#f7f7f6;font-family:Arial,Helvetica,sans-serif">
    <div style="padding:32px 16px">
      <div style="max-width:520px;margin:0 auto;border:1px solid #2b3038;border-radius:24px;overflow:hidden;background:#14181f">
        <div style="height:6px;background:linear-gradient(90deg,#3B82F6,#2563EB)"></div>
        <div style="padding:34px">
          <div style="font-size:22px;font-weight:900;color:#ffffff">ihue <span style="color:#3B82F6">Bid</span></div>
          <h1 style="margin:30px 0 10px;font-size:23px;line-height:1.3;color:#ffffff">"${listingTitle}" has closed</h1>
          <p style="margin:0;color:#a1a1aa;font-size:15px;line-height:1.7">${outcomeLine}</p>
          <a href="${interestedUrl}" style="display:inline-block;margin:28px 0 0;padding:14px 24px;border-radius:14px;background:#3B82F6;color:#ffffff;font-size:15px;font-weight:900;text-decoration:none">I'm still interested</a>
          <p style="margin:18px 0 0;color:#71717a;font-size:13px;line-height:1.6">Posted by ${creatorDisplayName} on ihue Bid.</p>
        </div>
      </div>
    </div>
  </body>
</html>`;

  return { subject, text, html };
}
