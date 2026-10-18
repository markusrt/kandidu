export interface Profile {
  readonly firstName: string;
  readonly lastName: string;
  readonly street: string;
  readonly postalCode: string;
  readonly city: string;
  readonly phone: string;
  readonly email: string;
  readonly birthDate?: string;
  readonly birthPlace?: string;
  readonly nationality?: string;
  readonly website?: string;
  readonly updatedAt: string;
}

export type ProfileField = Exclude<keyof Profile, "updatedAt">;

export type ProfileIssueCode = "required" | "too-long" | "invalid-format";

export interface ProfileIssue {
  readonly field: ProfileField;
  readonly code: ProfileIssueCode;
}

export type ProfileInput = Readonly<Record<ProfileField, string>>;

export const PROFILE_FIELDS: readonly ProfileField[] = [
  "firstName",
  "lastName",
  "street",
  "postalCode",
  "city",
  "phone",
  "email",
  "birthDate",
  "birthPlace",
  "nationality",
  "website",
];

export const REQUIRED_PROFILE_FIELDS: ReadonlySet<ProfileField> = new Set([
  "firstName",
  "lastName",
  "street",
  "postalCode",
  "city",
  "phone",
  "email",
]);

interface FieldRule {
  readonly min?: number;
  readonly max: number;
  readonly valid?: (value: string, today: string) => boolean;
}

const POSTAL_CODE = /^[0-9A-Za-z -]+$/;
const PHONE = /^[0-9 +()/-]+$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

const RULES: Readonly<Record<ProfileField, FieldRule>> = {
  firstName: { min: 1, max: 80 },
  lastName: { min: 1, max: 80 },
  street: { min: 1, max: 120 },
  postalCode: { min: 4, max: 10, valid: (v) => POSTAL_CODE.test(v) },
  city: { min: 1, max: 80 },
  phone: { min: 3, max: 40, valid: (v) => PHONE.test(v) },
  email: { max: 254, valid: (v) => EMAIL.test(v) },
  birthDate: { max: 10, valid: (v, today) => isIsoDate(v) && v < today },
  birthPlace: { max: 80 },
  nationality: { max: 80 },
  website: { max: 2000, valid: isHttpUrl },
};

/** Validates trimmed input; `today` is `YYYY-MM-DD`. */
export function validateProfile(
  input: ProfileInput,
  today: string,
): ProfileIssue[] {
  const issues: ProfileIssue[] = [];
  for (const field of PROFILE_FIELDS) {
    const value = input[field].trim();
    const rule = RULES[field];
    if (!value) {
      if (REQUIRED_PROFILE_FIELDS.has(field)) {
        issues.push({ field, code: "required" });
      }
      continue;
    }
    if (value.length > rule.max) {
      issues.push({ field, code: "too-long" });
    } else if (
      (rule.min !== undefined && value.length < rule.min) ||
      (rule.valid && !rule.valid(value, today))
    ) {
      issues.push({ field, code: "invalid-format" });
    }
  }
  return issues;
}

export type ProfileErrorCode = "profile-invalid";

export class ProfileError extends Error {
  readonly code: ProfileErrorCode;

  constructor(code: ProfileErrorCode) {
    super(code);
    this.name = "ProfileError";
    this.code = code;
  }
}

/** Builds a profile from valid input; throws when validation fails. */
export function createProfile(
  input: ProfileInput,
  today: string,
  now: string,
): Profile {
  if (validateProfile(input, today).length > 0) {
    throw new ProfileError("profile-invalid");
  }
  const optional = (value: string) => value.trim() || undefined;
  const profile: Record<string, string | undefined> = {
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    street: input.street.trim(),
    postalCode: input.postalCode.trim(),
    city: input.city.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    birthDate: optional(input.birthDate),
    birthPlace: optional(input.birthPlace),
    nationality: optional(input.nationality),
    website: optional(input.website),
    updatedAt: now,
  };
  for (const key of Object.keys(profile)) {
    if (profile[key] === undefined) delete profile[key];
  }
  return profile as unknown as Profile;
}

export function profileToInput(profile: Profile | undefined): ProfileInput {
  const entries = PROFILE_FIELDS.map((field) => [
    field,
    profile?.[field] ?? "",
  ]);
  return Object.fromEntries(entries) as ProfileInput;
}
