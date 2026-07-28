export const ALLOWED_JOB_ROLES = [
  "CEO",
  "Chief Of Staff (COS)",
  "Founder's Office HR",
  "Founder'S Office",
  "GTM Growth Executive",
  "GTM Marketing and Operations",
  "Strategies and Operations Associate",
  "Implementation Consultant",
  "Integration Consultant",
  "Customer Support",
  "L&D Knowledge Base",
  "SDE",
] as const;

export type JobRole = typeof ALLOWED_JOB_ROLES[number];
