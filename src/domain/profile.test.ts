import { describe, expect, it } from "vitest";
import {
  createProfile,
  ProfileError,
  type ProfileInput,
  profileToInput,
  validateProfile,
} from "./profile";

const TODAY = "2026-10-18";
const valid: ProfileInput = {
  firstName: " Erika ",
  lastName: "Musterfrau",
  street: "Musterweg 1",
  postalCode: "12345",
  city: "Musterstadt",
  phone: "+49 (30) 123-4567",
  email: "erika@example.org",
  birthDate: "",
  birthPlace: "",
  nationality: "",
  website: "",
};

describe("validateProfile", () => {
  it("accepts complete required data and empty optional fields", () => {
    expect(validateProfile(valid, TODAY)).toEqual([]);
  });

  it("reports every missing required field", () => {
    const empty = profileToInput(undefined);
    const fields = validateProfile(empty, TODAY).map((issue) => issue.field);
    expect(fields).toEqual([
      "firstName",
      "lastName",
      "street",
      "postalCode",
      "city",
      "phone",
      "email",
    ]);
  });

  it.each([
    ["firstName", "x".repeat(81), "too-long"],
    ["street", "x".repeat(121), "too-long"],
    ["postalCode", "123", "invalid-format"],
    ["postalCode", "12#45", "invalid-format"],
    ["phone", "12", "invalid-format"],
    ["phone", "030 abc", "invalid-format"],
    ["email", "erika@example", "invalid-format"],
    ["email", `${"x".repeat(250)}@a.de`, "too-long"],
    ["birthDate", "2026-02-30", "invalid-format"],
    ["birthDate", "2030-01-01", "invalid-format"],
    ["birthPlace", "x".repeat(81), "too-long"],
    ["website", "ftp://example.org", "invalid-format"],
  ] as const)("flags %s=%s as %s", (field, value, code) => {
    expect(validateProfile({ ...valid, [field]: value }, TODAY)).toEqual([
      { field, code },
    ]);
  });

  it("accepts valid optional values", () => {
    const input = {
      ...valid,
      birthDate: "2001-04-30",
      website: "https://example.org/erika",
    };
    expect(validateProfile(input, TODAY)).toEqual([]);
  });
});

describe("createProfile", () => {
  it("trims values and omits empty optional fields", () => {
    const profile = createProfile(valid, TODAY, "2026-10-18T10:00:00.000Z");
    expect(profile.firstName).toBe("Erika");
    expect("birthDate" in profile).toBe(false);
    expect(profileToInput(profile).firstName).toBe("Erika");
  });

  it("refuses invalid input", () => {
    expect(() => createProfile({ ...valid, email: "x" }, TODAY, "now")).toThrow(
      ProfileError,
    );
  });
});
