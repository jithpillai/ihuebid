import { describe, expect, it } from "vitest";

import { validateHandleFormat } from "./profile-service";

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
