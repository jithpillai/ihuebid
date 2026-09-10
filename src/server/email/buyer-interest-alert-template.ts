export function renderBuyerInterestAlertEmail({
  listingTitle,
  listingUrl,
  buyerName,
  buyerEmail,
  buyerPhone,
  estimateFormatted,
  creatorDisplayName,
}: {
  listingTitle: string;
  listingUrl: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  estimateFormatted: string;
  creatorDisplayName: string;
}) {
  const subject = `Interested buyer for "${listingTitle}" — ${buyerName}`;
  const text = [
    `${buyerName} marked "Interested to Buy" on "${listingTitle}".`,
    "",
    `Name:      ${buyerName}`,
    `Email:     ${buyerEmail}`,
    `Phone:     ${buyerPhone}`,
    `Estimate:  ${estimateFormatted}`,
    "",
    `Listing:   ${listingUrl}`,
    "",
    `Posted by ${creatorDisplayName} on ihue Bid.`,
  ].join("\n");
  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#0b0e12;color:#f7f7f6;font-family:Arial,Helvetica,sans-serif">
    <div style="padding:32px 16px">
      <div style="max-width:520px;margin:0 auto;border:1px solid #2b3038;border-radius:24px;overflow:hidden;background:#14181f">
        <div style="height:6px;background:linear-gradient(90deg,#3B82F6,#2563EB)"></div>
        <div style="padding:34px">
          <div style="font-size:22px;font-weight:900;color:#ffffff">ihue <span style="color:#3B82F6">Bid</span></div>
          <h1 style="margin:30px 0 6px;font-size:23px;line-height:1.3;color:#ffffff">New interested buyer</h1>
          <p style="margin:0 0 22px;color:#a1a1aa;font-size:15px;line-height:1.7"><strong style="color:#ffffff">${buyerName}</strong> is interested in buying <strong style="color:#ffffff">${listingTitle}</strong>.</p>
          <table style="width:100%;border-collapse:collapse;font-size:15px;color:#f7f7f6">
            <tr><td style="padding:6px 0;color:#a1a1aa;width:90px">Name</td><td style="padding:6px 0">${buyerName}</td></tr>
            <tr><td style="padding:6px 0;color:#a1a1aa">Email</td><td style="padding:6px 0"><a href="mailto:${buyerEmail}" style="color:#3B82F6;text-decoration:none">${buyerEmail}</a></td></tr>
            <tr><td style="padding:6px 0;color:#a1a1aa">Phone</td><td style="padding:6px 0"><a href="tel:${buyerPhone}" style="color:#3B82F6;text-decoration:none">${buyerPhone}</a></td></tr>
            <tr><td style="padding:6px 0;color:#a1a1aa">Estimate</td><td style="padding:6px 0">${estimateFormatted}</td></tr>
          </table>
          <a href="${listingUrl}" style="display:inline-block;margin:26px 0 0;padding:14px 24px;border-radius:14px;background:#3B82F6;color:#ffffff;font-size:15px;font-weight:900;text-decoration:none">Open the listing</a>
          <p style="margin:18px 0 0;color:#71717a;font-size:13px;line-height:1.6">Posted by ${creatorDisplayName} on ihue Bid.</p>
        </div>
      </div>
    </div>
  </body>
</html>`;

  return { subject, text, html };
}
