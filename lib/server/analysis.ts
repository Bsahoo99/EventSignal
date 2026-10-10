import {
  inputSchema,
  type AnalysisResult,
  type Evidence,
  type Recommendation,
} from '../contracts';
import { extractionSchema, type Extractor } from './model';
import { Budget } from './budget';
import { researchOpenings } from './opportunities';
import { readPublicPage, type PageReader, type SourcePage } from './sources';
export type Dependencies = {
  mode: 'public' | 'owner';
  credentials: boolean;
  extract: Extractor;
  budget: Budget;
  now: () => string;
  readPage?: PageReader;
  onStage?: (stage: string) => void;
};
export async function analyze(
  raw: unknown,
  deps: Dependencies,
): Promise<AnalysisResult> {
  const stages: string[] = [];
  const stage = (value: string) => {
    stages.push(value);
    deps.onStage?.(value);
  };
  const fail = (
    code: Extract<AnalysisResult, { ok: false }>['code'],
    message: string,
  ): AnalysisResult => ({ ok: false, code, message, stages });
  if (deps.mode !== 'owner')
    return fail(
      'public-mode',
      'Live research is disabled in the public example.',
    );
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success)
    return fail(
      'invalid-input',
      'Provide target roles, skills, experience, and 20–20,000 characters of public event text.',
    );
  if (!deps.credentials)
    return fail(
      'credentials',
      'Configure GEMINI_API_KEY on the local server, then retry. No paid request was made.',
    );
  const { profile, event } = parsed.data;
  let page: SourcePage | undefined;
  if (event.kind === 'url') {
    try {
      page = await (deps.readPage ?? readPublicPage)(event.url);
    } catch {
      return fail(
        'retrieval',
        'This page could not be read safely. Paste its public program text to continue; your profile is preserved.',
      );
    }
  }
  const source = page?.text ?? (event.kind === 'text' ? event.text : '');
  stage(page ? 'Public event page read' : 'Event text received');
  let reservation: string;
  try {
    reservation = deps.budget.reserve();
  } catch {
    return fail(
      'budget',
      'Budget unavailable or $8 application threshold reached. Check the local ledger; do not reset it.',
    );
  }
  let chargedUsd = 0;
  let extraction;
  try {
    const response = await deps.extract(source);
    chargedUsd = deps.budget.settle(reservation, response.usage);
    extraction = extractionSchema.parse(response.data);
  } catch {
    try {
      deps.budget.settle(reservation);
    } catch {}
    return fail(
      'provider',
      'The model did not return usable evidence. Check model access or retry with shorter text. Unknown request cost remains reserved.',
    );
  }
  stage('Event evidence extracted');
  const checkedAt = deps.now();
  const evidence: Evidence[] = [];
  const warnings: string[] = [];
  const recommendations: Recommendation[] = [];
  const seen = new Set<string>();
  for (const [index, entity] of extraction.entities.entries()) {
    const identity = entity.name.toLowerCase().trim();
    if (seen.has(identity)) continue;
    seen.add(identity);
    const quote = entity.quote.toLowerCase();
    const relationshipSupported =
      entity.relationship === 'speaker'
        ? /\b(speaker|speaking|talk|keynote|presenter)\b/i.test(quote)
        : entity.relationship === 'host'
          ? /\b(host|hosting|hosted|organizer|organiser)\b/i.test(quote)
          : /\b(presenting|presentation|demo)\b/i.test(quote);
    if (
      !source.includes(entity.quote) ||
      !quote.includes(entity.name.toLowerCase()) ||
      (entity.company && !quote.includes(entity.company.toLowerCase())) ||
      !relationshipSupported ||
      entity.ambiguous ||
      entity.historical ||
      /\b(previous|last year|past attendee|historical attendee)\b/i.test(quote)
    ) {
      warnings.push(
        `Excluded ${entity.name}: relationship or identity was not established unambiguously.`,
      );
      continue;
    }
    const topics = entity.topics.filter((topic) =>
      quote.includes(topic.toLowerCase()),
    );
    const matched = profile.skills.filter((skill) =>
      topics.some(
        (topic) =>
          topic.toLowerCase().includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(topic.toLowerCase()),
      ),
    );
    if (!matched.length) continue;
    const experience =
      profile.experience.find((item) =>
        matched.some((skill) =>
          item.toLowerCase().includes(skill.toLowerCase()),
        ),
      ) ?? profile.experience[0];
    const eventEvidence: Evidence = {
      id: `event-${index}`,
      kind: page ? 'public-page' : 'user-text',
      title: page ? 'Retrieved event page' : 'Pasted event text',
      excerpt: entity.quote,
      url: page?.url || event.url || undefined,
      checkedAt,
      entity: entity.name,
    };
    const profileEvidence: Evidence = {
      id: `profile-${index}`,
      kind: 'user-profile',
      title: 'Submitted professional experience',
      excerpt: [
        experience,
        `Target roles: ${profile.roles.join(', ')}`,
        `Skills: ${profile.skills.join(', ')}`,
        `Preferences: ${profile.preferences || 'Unknown'}`,
      ].join(' '),
      checkedAt,
      entity: 'Candidate',
    };
    evidence.push(eventEvidence, profileEvidence);
    const modality =
      entity.modality === 'remote' ||
      /\b(remote|virtual|livestream|online)\b/i.test(quote)
        ? 'remote'
        : /\bin.person\b/i.test(quote)
          ? 'in-person'
          : 'unknown';
    recommendations.push({
      id: `recommendation-${index}`,
      name: entity.name,
      company: entity.company,
      relationship: `Listed ${entity.relationship.replaceAll('-', ' ')}`,
      modality,
      opportunity: { kind: 'exploratory' },
      fit: `The event evidence mentions ${matched.join(', ')}. These overlap with your submitted skills and may support your interest in ${profile.roles.join(', ')}. Relevance is an interpretation.${profile.preferences ? ` Your preferences: ${profile.preferences} These have not been verified against an opening.` : ''}`,
      experience,
      uncertainties: [
        'No current opening, hiring authority, or referral willingness established.',
        modality === 'remote'
          ? 'Remote participation: do not plan an in-person approach.'
          : 'Availability for a conversation is unknown.',
        ...(profile.constraints
          ? [`Hard constraints not verified: ${profile.constraints}`]
          : []),
      ],
      introduction: `Hi, I’m interested in ${profile.roles[0]}. My background: ${experience} I noticed ${matched[0]} in the event program; I’d enjoy comparing notes.`,
      questions: [
        `What challenges have you encountered with ${matched[0]}?`,
        `How do you assess whether work involving ${matched[0]} is ready for real users?`,
        `What experience would be useful for someone contributing to this area?`,
      ],
      evidence: [eventEvidence, profileEvidence],
    });
  }
  const links =
    page?.links ??
    Array.from(source.matchAll(/https:\/\/[^\s<>"']+/g))
      .slice(0, 30)
      .map((match) => ({
        url: match[0].replace(/[.,;)]$/, ''),
        label: source.slice(Math.max(0, (match.index ?? 0) - 120), match.index),
      }));
  const discoveryPage: SourcePage = page ?? {
    url: '',
    text: source,
    links,
    jobs: [],
  };
  let reads = 0;
  const researchDeadline = Date.now() + 110_000;
  const boundedRead: PageReader = async (url) => {
    if (reads++ >= 7 || Date.now() > researchDeadline)
      throw new Error('Research limit reached');
    return (deps.readPage ?? readPublicPage)(url);
  };
  for (let i = 0; i < Math.min(recommendations.length, 5); i++) {
    const researched = await researchOpenings(
      recommendations[i],
      discoveryPage,
      profile,
      boundedRead,
      checkedAt,
    );
    recommendations[i] = researched.recommendation;
    evidence.push(...researched.evidence);
    if (researched.warning) warnings.push(researched.warning);
  }
  recommendations.sort(
    (a, b) =>
      Number(b.opportunity.kind === 'verified-opening') -
      Number(a.opportunity.kind === 'verified-opening'),
  );
  warnings.push(
    'Research is bounded to explicit company links and readable job data. Search grounding is disabled; missing openings do not establish that a company is not hiring.',
  );
  stage('Official source checks completed');
  stage('Brief prepared');
  return {
    ok: true,
    chargedUsd,
    stages,
    brief: {
      event: source.includes(extraction.eventName)
        ? extraction.eventName
        : 'Event from supplied text',
      eventDate:
        extraction.eventDate && source.includes(extraction.eventDate)
          ? extraction.eventDate
          : undefined,
      historical:
        extraction.historical ||
        Boolean(
          extraction.eventDate &&
          source.includes(extraction.eventDate) &&
          Date.parse(extraction.eventDate) < Date.parse(checkedAt),
        ),
      saved: false,
      checkedAt,
      outcome: recommendations.length
        ? warnings.length > 1
          ? 'partial'
          : 'success'
        : 'insufficient-evidence',
      recommendations: recommendations.slice(0, 5),
      warnings,
      evidence,
    },
  };
}
