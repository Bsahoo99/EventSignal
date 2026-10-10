import type { Brief, Evidence } from './contracts';
const checkedAt = '2026-10-09T21:30:00-07:00';
const event: Evidence = {
  id: 'event',
  kind: 'public-page',
  title: "AI Engineer World's Fair 2025",
  excerpt: 'The event page lists June 3–5, 2025, in San Francisco.',
  url: 'https://ai.engineer/worldsfair/2025',
  checkedAt,
  entity: "AI Engineer World's Fair",
};
const talk: Evidence = {
  id: 'talk',
  kind: 'public-page',
  title: 'Official talk archive',
  excerpt:
    'The archive attributes a talk about reliable enterprise agents to Harrison Chase at the 2025 World’s Fair.',
  url: 'https://ai.engineer/talks/kTnfJszFxCg-3-ingredients-building-reliable-enterprise-agents',
  checkedAt,
  entity: 'Harrison Chase',
};
const profile: Evidence = {
  id: 'profile',
  kind: 'user-profile',
  title: 'Selected professional background',
  excerpt:
    'User-provided experience includes agents, evaluation, RAG, backend systems, and customer deployments.',
  checkedAt,
  entity: 'Candidate',
};
export const savedBrief: Brief = {
  event: "AI Engineer World's Fair 2025",
  eventDate: 'June 3–5, 2025 · San Francisco',
  historical: true,
  saved: true,
  checkedAt,
  outcome: 'success',
  warnings: [
    'This past event illustrates preparation only. It is not an invitation or a current attendance list.',
    'No job research was performed for this example. An exploratory connection does not imply an opening.',
  ],
  evidence: [event, talk, profile],
  recommendations: [
    {
      id: 'harrison-chase',
      name: 'Harrison Chase',
      company: '',
      relationship: 'Recorded speaker on reliable enterprise agents',
      modality: 'unknown',
      opportunity: { kind: 'exploratory' },
      fit: 'Agent reliability is a useful conversation topic for the supplied experience in agents and evaluation. This is a relevance judgment, not a hiring assessment.',
      experience:
        'Your supplied experience with agents, evaluation, and customer deployments.',
      uncertainties: [
        'Availability for a conversation and attendance modality were not established.',
        'Hiring authority, openings, and referral willingness were not checked.',
      ],
      introduction:
        'Hi, I work in applied AI and backend engineering, with experience in agents and evaluation. I was interested in your talk on reliable enterprise agents. I’d enjoy comparing how teams evaluate readiness for customer deployments.',
      questions: [
        'What evidence helps you decide an agent is ready for a customer deployment?',
        'Where do you find human review most useful in an agent workflow?',
        'How do you choose evaluation cases that reflect production failures?',
      ],
      evidence: [talk, profile],
    },
  ],
};
