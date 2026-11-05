import { z } from 'zod';
const sourceUrl = z
  .url()
  .max(2000)
  .refine((value) => {
    try {
      return new URL(value).protocol === 'https:';
    } catch {
      return false;
    }
  }, 'Use a public HTTPS URL');
const text = z.string().trim().min(1).max(2000);
export const profileSchema = z.object({
  roles: z.array(text).min(1).max(5),
  skills: z.array(text).min(1).max(20),
  experience: z.array(text).min(1).max(8),
  preferences: z.string().max(2000),
  constraints: z.string().max(2000),
});
export type Profile = z.infer<typeof profileSchema>;
export const inputSchema = z.object({
  profile: profileSchema,
  companyWebsites: z
    .array(
      z.object({ company: z.string().trim().min(2).max(120), url: sourceUrl }),
    )
    .max(5)
    .optional(),
  event: z.discriminatedUnion('kind', [
    z.object({
      kind: z.literal('text'),
      text: z.string().trim().min(20).max(20000),
      url: z.union([sourceUrl, z.literal('')]).optional(),
    }),
    z.object({ kind: z.literal('url'), url: sourceUrl }),
  ]),
});
export type AnalysisInput = z.infer<typeof inputSchema>;
export type Evidence = {
  id: string;
  kind:
    | 'public-page'
    | 'company-page'
    | 'user-text'
    | 'user-profile'
    | 'official-job';
  title: string;
  excerpt: string;
  url?: string;
  checkedAt: string;
  entity: string;
};
export type Opening = {
  title: string;
  url: string;
  checkedAt: string;
  requirements?: string;
  location?: string;
};
export type Recommendation = {
  id: string;
  name: string;
  company: string;
  relationship: string;
  relationshipKind:
    'speaker' | 'host' | 'presenting-company' | 'hiring-partner' | 'attendee';
  eventRole?: string;
  topics?: string[];
  research?: {
    status:
      | 'verified-opening'
      | 'search-unavailable'
      | 'site-not-found'
      | 'site-ambiguous'
      | 'site-unreadable'
      | 'research-limited'
      | 'no-matching-opening'
      | 'careers-unreadable'
      | 'constraints-unverified';
    message: string;
    website?: string;
    checkedAt: string;
  };
  modality: 'unknown' | 'remote' | 'in-person';
  opportunity:
    { kind: 'exploratory' } | { kind: 'verified-opening'; opening: Opening };
  fit: string;
  experience: string;
  uncertainties: string[];
  introduction: string;
  questions: [string, string, string];
  evidence: Evidence[];
};
export type Brief = {
  event: string;
  eventDate?: string;
  historical: boolean;
  saved: boolean;
  checkedAt: string;
  outcome: 'success' | 'partial' | 'insufficient-evidence';
  recommendations: Recommendation[];
  warnings: string[];
  evidence: Evidence[];
};
export type AnalysisResult =
  | { ok: true; brief: Brief; stages: string[]; chargedUsd: number }
  | {
      ok: false;
      code:
        | 'public-mode'
        | 'credentials'
        | 'invalid-input'
        | 'budget'
        | 'provider'
        | 'retrieval';
      message: string;
      stages: string[];
    };
