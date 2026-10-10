import { notFound } from 'next/navigation';
import { ownerEnabled } from '@/lib/server/access';
import { Owner } from '@/components/owner';
export const dynamic = 'force-dynamic';
export default function Page() {
  if (!ownerEnabled()) notFound();
  return (
    <main>
      <header className="owner-heading">
        <a href="/">← Saved example</a>
        <span className="eyebrow">Private local workspace</span>
        <h1>Prepare your next brief.</h1>
        <p>
          Your profile, public event evidence, and a focused set of questions.
        </p>
      </header>
      <Owner />
    </main>
  );
}
