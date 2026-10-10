'use client';
import { useState } from 'react';
import type { AnalysisResult } from '@/lib/contracts';
import { initialProfile } from '@/lib/profile';
import { Brief } from './brief';
export function Owner() {
  const [profile, setProfile] = useState({
    roles: initialProfile.roles.join('\n'),
    skills: initialProfile.skills.join('\n'),
    experience: initialProfile.experience.join('\n'),
    preferences: initialProfile.preferences,
    constraints: initialProfile.constraints,
  });
  const [token, setToken] = useState('');
  const [kind, setKind] = useState<'text' | 'url'>('text');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [companyWebsites, setCompanyWebsites] = useState('');
  const [pending, setPending] = useState(false);
  const [stage, setStage] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setStage('');
    setError('');
    setResult(null);
    try {
      const websites = companyWebsites
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const separator = line.indexOf('|');
          if (separator < 1)
            throw new Error(
              'Use Company name | https://official-website.com for each company website.',
            );
          return {
            company: line.slice(0, separator).trim(),
            url: line.slice(separator + 1).trim(),
          };
        });
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          profile: {
            ...profile,
            roles: profile.roles.split('\n').filter(Boolean),
            skills: profile.skills.split('\n').filter(Boolean),
            experience: profile.experience.split('\n').filter(Boolean),
          },
          event: kind === 'text' ? { kind, text, url } : { kind, url },
          companyWebsites: websites,
        }),
        signal: AbortSignal.timeout(180_000),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          data.message ?? 'Request failed. Check your local server.',
        );
      }
      if (
        response.headers.get('content-type')?.includes('application/x-ndjson')
      ) {
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response received.');
        const decoder = new TextDecoder();
        let buffer = '';
        let completed = false;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let end;
          while ((end = buffer.indexOf('\n')) >= 0) {
            const message = JSON.parse(buffer.slice(0, end));
            buffer = buffer.slice(end + 1);
            if (message.stage) setStage(message.stage);
            if (message.result) {
              setResult(message.result);
              completed = true;
            }
          }
        }
        if (!completed)
          throw new Error(
            'Analysis connection ended before a result arrived. Your inputs are preserved.',
          );
      } else {
        setResult(await response.json());
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Analysis failed. Retry from your saved inputs.',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <form className="editor" onSubmit={submit}>
        <label>
          Owner access token
          <input
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
            minLength={32}
          />
        </label>
        <small>
          Use the token configured on your local server. It stays in this page’s
          memory.
        </small>
        <h2>Your professional context</h2>
        <p className="muted">
          Your own supplied claims. One role, skill, or experience item per
          line.
        </p>
        <div className="editor-grid">
          {(
            [
              'roles',
              'skills',
              'experience',
              'preferences',
              'constraints',
            ] as const
          ).map((field) => (
            <label key={field}>
              {
                {
                  roles: 'Target roles',
                  skills: 'Skills',
                  experience: 'Experience and project evidence',
                  preferences: 'Preferences (not requirements)',
                  constraints: 'Hard constraints (optional)',
                }[field]
              }
              <textarea
                maxLength={
                  field === 'preferences' || field === 'constraints'
                    ? 2000
                    : 10000
                }
                required={
                  field === 'roles' ||
                  field === 'skills' ||
                  field === 'experience'
                }
                value={profile[field]}
                onChange={(e) =>
                  setProfile({ ...profile, [field]: e.target.value })
                }
              />
            </label>
          ))}
        </div>
        <p className="muted">
          Unspecified relocation, employment type, company stage, and
          sponsorship remain unknown. Hard constraints require explicit
          evidence; an unknown match is never treated as eligible.
        </p>
        <h2>The event</h2>
        <label>
          Event input
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as 'text' | 'url')}
          >
            <option value="text">Paste public text</option>
            <option value="url">Read public URL</option>
          </select>
        </label>
        <label>
          {kind === 'text'
            ? 'Source URL (optional; pasted text stays user-supplied)'
            : 'Public event URL'}
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required={kind === 'url'}
            maxLength={2000}
          />
        </label>
        {kind === 'text' && (
          <label>
            Public event text
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
              minLength={20}
              maxLength={20000}
              rows={7}
            />
          </label>
        )}
        <label>
          Company websites (optional)
          <textarea
            value={companyWebsites}
            onChange={(e) => setCompanyWebsites(e.target.value)}
            maxLength={11000}
            rows={3}
            placeholder={'Company name | https://official-website.com'}
          />
        </label>
        <small>
          Use the company name shown in the result, one website per line (up to
          five). Supplied websites are checked before job research.
        </small>
        <p className="notice">
          This application stops at $8, preserving $2 for separate validation.
          The local ledger counts model usage conservatively; it cannot limit
          spending elsewhere on your provider accounts. Website discovery uses
          up to five Tavily searches per analysis; search results are reused for
          24 hours. Official pages are checked again for current openings.
        </p>
        <button disabled={pending}>
          {pending ? 'Analyzing…' : 'Analyze event'}
        </button>
        <div role="status" className="progress">
          {pending
            ? stage
              ? `Completed: ${stage}. Analysis continues…`
              : 'Analysis is starting. No research is complete yet.'
            : ''}
        </div>
      </form>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {result && !result.ok && (
        <div className="error" role="alert">
          <p>{result.message}</p>
          {result.code === 'retrieval' && (
            <button onClick={() => setKind('text')}>
              Continue with pasted text
            </button>
          )}
        </div>
      )}
      {result?.ok && (
        <>
          <p className="completed">
            Completed: {result.stages.join(' → ')}. Recorded cost: $
            {result.chargedUsd.toFixed(4)}.
          </p>
          <Brief brief={result.brief} />
        </>
      )}
    </>
  );
}
