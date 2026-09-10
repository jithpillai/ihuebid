export function renderBuyerInterestVerifyEmail({
  code,
  expiresInMinutes,
  listingTitle,
}: {
  code: string;
  expiresInMinutes: number;
  listingTitle: string;
}) {
  const subject = `Confirm your email to register interest in "${listingTitle}"`;
  const text = [
    `Confirm your email to tell the seller you're interested in buying "${listingTitle}"`,
    "",
    code,
    "",
    `This code expires in ${expiresInMinutes} minutes and can be used only once.`,
    "If you did not request this, you can safely ignore this email.",
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
          <h1 style="margin:30px 0 10px;font-size:23px;line-height:1.3;color:#ffffff">Confirm your email</h1>
          <p style="margin:0;color:#a1a1aa;font-size:15px;line-height:1.7">Enter this code to tell the seller you're interested in buying <strong style="color:#ffffff">${listingTitle}</strong>.</p>
          <div style="margin:28px 0;padding:20px;border:1px solid #3c4149;border-radius:16px;background:#0b0e12;text-align:center;color:#ffffff;font-size:34px;font-weight:900;letter-spacing:10px">${code}</div>
          <p style="margin:0;color:#a1a1aa;font-size:14px;line-height:1.7">This code expires in <strong style="color:#ffffff">${expiresInMinutes} minutes</strong> and can be used only once.</p>
          <p style="margin:18px 0 0;color:#71717a;font-size:13px;line-height:1.6">If you did not request this, you can safely ignore this email.</p>
        </div>
      </div>
    </div>
  </body>
</html>`;

  return { subject, text, html };
}
