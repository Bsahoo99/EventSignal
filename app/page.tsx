import Link from 'next/link';
import { Brief } from '@/components/brief';
import { savedBrief } from '@/lib/saved-brief';
export default function Page() {
  return (
    <>
      <header className="site-header">
        <a className="brand" href="/" aria-label="EventSignal home">
          <span aria-hidden="true" className="brand-mark">
            e↗
          </span>
          EventSignal
        </a>
        <span className="header-note">
          A little preparation. A better conversation.
        </span>
      </header>
      <main>
        <section className="hero">
          <div>
            <span className="eyebrow">The event opportunity brief</span>
            <h1>
              Your next conversation,
              <br />
              <em>with context.</em>
            </h1>
            <p>
              Find the overlap between an event and your experience. Inspect the
              evidence. Arrive with something useful to ask.
            </p>
          </div>
          <aside className="profile-note">
            <span className="eyebrow">Prepared through this lens</span>
            <strong>Applied AI engineering</strong>
            <p>
              Agents · evaluation · RAG
              <br />
              Backend systems · customer deployments
            </p>
            <small>
              Selected, user-provided experience.
              <br />
              Fit is an interpretation, not a promise.
            </small>
          </aside>
        </section>
        <div className="mode-strip">
          <span>
            <i aria-hidden="true" />
            Saved historical example
          </span>
          <span>No live research · No credentials required</span>
        </div>
        <Brief brief={savedBrief} />
        <footer>
          <p>
            EventSignal connects evidence to preparation.
            <br />
            You decide who to approach and what to say.
          </p>
          {process.env.EVENTSIGNAL_MODE === 'owner' && (
            <Link href="/owner">Open private analysis →</Link>
          )}
        </footer>
      </main>
    </>
  );
}
