import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'EventSignal — Conversation briefs',
  description: 'Evidence-backed event preparation, with uncertainty in view.',
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
