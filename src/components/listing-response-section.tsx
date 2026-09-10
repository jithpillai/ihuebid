"use client";

import { useState } from "react";

import { BuyerInterestForm } from "@/components/buyer-interest-form";
import { NotifyOptInForm } from "@/components/notify-optin-form";
import { ValuationForm } from "@/components/valuation-form";
import type { ListingStatus } from "@/generated/prisma/client";

// Wraps the three public response affordances so the "I am interested to Buy"
// form can hide the plain estimate slider while it's open — the estimate is
// captured inside that form, so a second slider would be redundant.
export function ListingResponseSection({
  listingId,
  status,
  currency,
  min,
  max,
  increment,
  initialValue,
  initialName,
  initialAnonymous,
  showBuyerInterest,
  brandLabel,
  initiallyReadyToBuy,
  showNotifyOptIn,
  notifyInitiallyOptedIn,
}: {
  listingId: string;
  status: ListingStatus;
  currency: string;
  min: number;
  max: number;
  increment: number;
  initialValue: number | null;
  initialName: string | null;
  initialAnonymous: boolean;
  showBuyerInterest: boolean;
  brandLabel: string;
  initiallyReadyToBuy: boolean;
  showNotifyOptIn: boolean;
  notifyInitiallyOptedIn: boolean;
}) {
  const [buyerFormOpen, setBuyerFormOpen] = useState(false);

  return (
    <>
      {showBuyerInterest && (
        <div className="mt-6">
          <BuyerInterestForm
            listingId={listingId}
            status={status}
            currency={currency}
            min={min}
            max={max}
            increment={increment}
            initialValue={initialValue}
            initialName={initialName}
            brandLabel={brandLabel}
            initiallyReadyToBuy={initiallyReadyToBuy}
            onOpenChange={setBuyerFormOpen}
          />
        </div>
      )}

      {!buyerFormOpen && (
        <div className="mt-6">
          <ValuationForm
            // Remount once the buy-interest estimate is on record so the form
            // re-initialises to "Update your estimate" with the saved name.
            key={initiallyReadyToBuy ? "recorded" : "open"}
            listingId={listingId}
            status={status}
            currency={currency}
            min={min}
            max={max}
            increment={increment}
            initialValue={initialValue}
            initialName={initialName}
            initialAnonymous={initialAnonymous}
          />
        </div>
      )}

      {showNotifyOptIn && !buyerFormOpen && (
        <div className="mt-4">
          <NotifyOptInForm listingId={listingId} initiallyOptedIn={notifyInitiallyOptedIn} />
        </div>
      )}
    </>
  );
}
