import { describe, expect, it } from "vitest";

import {
  normalizeContactPhone,
  normalizeEventNotificationEmails,
  normalizeProfileLinks,
  toWhatsAppDigits,
  validateHandleFormat,
} from "./profile-service";

describe("validateHandleFormat", () => {
  it("normalizes case and trims whitespace", () => {
    const result = validateHandleFormat("  GetteCar  ");
    expect(result).toEqual({ ok: true, handle: "gettecar" });
  });

  it("rejects handles that are too short or too long", () => {
    expect(validateHandleFormat("ab")).toMatchObject({ ok: false, code: "INVALID_HANDLE" });
    expect(validateHandleFormat("a".repeat(41))).toMatchObject({ ok: false, code: "INVALID_HANDLE" });
  });

  it("rejects characters outside lowercase letters, digits, underscore, and hyphen", () => {
    expect(validateHandleFormat("gette car")).toMatchObject({ ok: false, code: "INVALID_HANDLE" });
    expect(validateHandleFormat("gette@car")).toMatchObject({ ok: false, code: "INVALID_HANDLE" });
  });

  it("accepts underscores and hyphens", () => {
    expect(validateHandleFormat("gette_car-2021")).toEqual({ ok: true, handle: "gette_car-2021" });
  });

  it("rejects reserved platform handles regardless of case", () => {
    expect(validateHandleFormat("Admin")).toMatchObject({ ok: false, code: "HANDLE_RESERVED" });
    expect(validateHandleFormat("dashboard")).toMatchObject({ ok: false, code: "HANDLE_RESERVED" });
  });
});

describe("normalizeContactPhone", () => {
  it("strips separators and keeps a leading +", () => {
    expect(normalizeContactPhone("+91 85900 01090")).toBe("+918590001090");
    expect(normalizeContactPhone("085900-01090")).toBe("08590001090");
  });

  it("returns null for non-strings or implausible lengths", () => {
    expect(normalizeContactPhone(undefined)).toBeNull();
    expect(normalizeContactPhone("12345")).toBeNull();
    expect(normalizeContactPhone("1".repeat(16))).toBeNull();
  });
});

describe("toWhatsAppDigits", () => {
  it("prefixes 91 for a bare 10-digit number", () => {
    expect(toWhatsAppDigits("8590001090")).toBe("918590001090");
  });

  it("leaves an already-international number alone", () => {
    expect(toWhatsAppDigits("+918590001090")).toBe("918590001090");
  });
});

describe("normalizeEventNotificationEmails", () => {
  it("lowercases, trims, and drops invalid or duplicate entries", () => {
    expect(normalizeEventNotificationEmails([
      "  Sales@Gettecar.in ",
      "not-an-email",
      "SALES@gettecar.in",
      "leads@gettecar.in",
      42,
    ])).toEqual(["sales@gettecar.in", "leads@gettecar.in"]);
  });

  it("returns an empty array for non-array input", () => {
    expect(normalizeEventNotificationEmails(null)).toEqual([]);
    expect(normalizeEventNotificationEmails("x@y.z")).toEqual([]);
  });

  it("caps the list at 10 entries", () => {
    const many = Array.from({ length: 20 }, (_, i) => `person${i}@example.com`);
    expect(normalizeEventNotificationEmails(many)).toHaveLength(10);
  });
});

describe("normalizeProfileLinks", () => {
  it("keeps only well-formed http(s) URLs for known keys", () => {
    expect(normalizeProfileLinks({
      website: "https://gettecar.in",
      instagram: "  http://instagram.com/gettecar  ",
      facebook: "not a url",
      youtube: "ftp://example.com",
      twitter: "https://x.com/gettecar",
    })).toEqual({ website: "https://gettecar.in", instagram: "http://instagram.com/gettecar" });
  });

  it("returns an empty object for junk input", () => {
    expect(normalizeProfileLinks(null)).toEqual({});
    expect(normalizeProfileLinks("nope")).toEqual({});
  });
});
