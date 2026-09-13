export const LEGAL_VERSIONS = {
  privacy: "2026-09-13-v1",
  terms: "2026-09-13-v1",
  researchSafety: "2026-09-13-v1",
  contentRights: "2026-09-13-v1",
} as const;

export type LegalConsent = {
  privacyVersion: typeof LEGAL_VERSIONS.privacy;
  termsVersion: typeof LEGAL_VERSIONS.terms;
  researchSafetyVersion: typeof LEGAL_VERSIONS.researchSafety;
  contentRightsVersion: typeof LEGAL_VERSIONS.contentRights;
};
