import type { Brief as BriefData, Evidence } from '@/lib/contracts';
function EvidenceList({ items }: { items: Evidence[] }) {
  return (
    <ul className="evidence-list">
      {items.map((item) => (
        <li key={item.id}>
          <span className="eyebrow">
            {item.kind === 'user-profile'
              ? 'User-provided profile'
              : item.kind === 'user-text'
                ? 'User-supplied text'
                : item.kind === 'official-job'
                  ? 'Official job source'
                  : 'Public source'}
          </span>
          <strong>{item.title}</strong>
          <p>{item.excerpt}</p>
          <small>
            {item.kind.startsWith('user-') ? 'Recorded' : 'Checked'}{' '}
            {new Date(item.checkedAt).toLocaleDateString('en-US', {
              timeZone: 'America/Los_Angeles',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </small>
          {item.url && (
            <a href={item.url} target="_blank" rel="noreferrer">
              {item.kind === 'official-job'
                ? 'Read job evidence'
                : item.kind === 'company-page'
                  ? 'Read company evidence'
                  : 'Read event evidence'}{' '}
              <span aria-hidden="true">↗</span>
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
export function Brief({ brief }: { brief: BriefData }) {
  return (
    <section aria-label="Opportunity brief" className="brief">
      <div className="brief-heading">
        <div>
          <span className="eyebrow">
            {brief.saved ? 'Saved historical example' : 'Your analysis'} ·{' '}
            {brief.outcome.replaceAll('-', ' ')}
          </span>
          <h2>{brief.event}</h2>
          {brief.eventDate && <p>{brief.eventDate}</p>}
        </div>
        <div className="result-count">
          <strong>{brief.recommendations.length}</strong>
          <span>
            supported{' '}
            {brief.recommendations.length === 1 ? 'connection' : 'connections'}
          </span>
        </div>
      </div>
      {brief.warnings.length > 0 && (
        <aside className="notice" aria-label="Research limitations">
          {brief.warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </aside>
      )}
      {brief.historical && !brief.saved && (
        <p className="notice">
          Historical event: these relationships do not establish current
          participation.
        </p>
      )}
      {brief.recommendations.length === 0 && (
        <div className="empty">
          <h3>Not enough evidence for a useful connection.</h3>
          <p>
            Try a public event page naming speakers, presenting companies, or
            hiring partners, or paste its program. Keep your profile specific.
          </p>
        </div>
      )}
      {brief.recommendations.map((rec) => (
        <article key={rec.id} className="recommendation">
          <div className="recommendation-main">
            <span className={`badge ${rec.opportunity.kind}`}>
              {rec.opportunity.kind === 'verified-opening'
                ? 'Verified opening snapshot'
                : 'Exploratory connection'}
            </span>
            <h3>{rec.name}</h3>
            {rec.company && <p className="company">{rec.company}</p>}
            <p>{rec.relationship}</p>
            {rec.research && (
              <section
                aria-label={`Company research for ${rec.name}`}
                className="notice"
              >
                <h4>Company &amp; job research</h4>
                <p>{rec.research.message}</p>
                {rec.research.website && (
                  <a
                    href={rec.research.website}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open company website ↗
                  </a>
                )}
              </section>
            )}
            {rec.eventRole && (
              <p>
                <strong>Event-listed role:</strong> {rec.eventRole}. Current
                opening not established by the event listing.
              </p>
            )}
            <p className="muted">
              Attendance:{' '}
              {rec.modality === 'unknown' ? 'not established' : rec.modality}.{' '}
              {rec.modality === 'remote'
                ? 'Do not plan an in-person approach.'
                : ''}
            </p>
            <h4>Why this may be relevant</h4>
            <p>{rec.fit}</p>
            {rec.opportunity.kind === 'verified-opening' && (
              <div className="opening">
                <strong>{rec.opportunity.opening.title}</strong>
                <p>
                  {rec.opportunity.opening.location ??
                    'Location not established'}
                </p>
                <small>
                  Listed when checked{' '}
                  {new Date(
                    rec.opportunity.opening.checkedAt,
                  ).toLocaleDateString('en-US', {
                    timeZone: 'America/Los_Angeles',
                  })}
                  . Availability may have changed.
                </small>
              </div>
            )}
            <h4>Experience to bring</h4>
            <p>{rec.experience}</p>
          </div>
          <aside className="uncertainty">
            <span className="eyebrow">Keep in view</span>
            <ul>
              {rec.uncertainties.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
            <span className="evidence-count">
              {rec.evidence.length} evidence records
            </span>
          </aside>
          <details>
            <summary aria-label="Prepare a conversation">
              Prepare a conversation <span aria-hidden="true">＋</span>
            </summary>
            <div className="conversation">
              <div>
                <span className="eyebrow">
                  Suggested wording · interpretation
                </span>
                <h4>A starting point</h4>
                <blockquote>{rec.introduction}</blockquote>
                <h4>Three questions worth asking</h4>
                <ol>
                  {rec.questions.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ol>
              </div>
              <div>
                <h4>Check the evidence</h4>
                <EvidenceList items={rec.evidence} />
              </div>
            </div>
          </details>
        </article>
      ))}
      <details className="all-evidence">
        <summary>All consulted evidence ({brief.evidence.length})</summary>
        <EvidenceList items={brief.evidence} />
      </details>
    </section>
  );
}
