import { test } from 'node:test';
import assert from 'node:assert/strict';
import { categorizeRole, parseGuestList } from '../lib/server/guests';

test('name-only lines become guests with no company', () => {
  const { guests, ignored } = parseGuestList('Aarsh\nabdiel picado\n');
  assert.deepEqual(
    guests.map((g) => [g.name, g.company, g.title]),
    [
      ['Aarsh', undefined, undefined],
      ['abdiel picado', undefined, undefined],
    ],
  );
  assert.equal(ignored, 0);
});

test('a headline with "at Company" gives title and company', () => {
  const { guests } = parseGuestList('Priya Raman - Staff Engineer at Vercel');
  assert.equal(guests[0].name, 'Priya Raman');
  assert.equal(guests[0].title, 'Staff Engineer');
  assert.equal(guests[0].company, 'Vercel');
  assert.equal(guests[0].line, 'Priya Raman - Staff Engineer at Vercel');
});

test('a headline with "Title, Company (note)" gives the company without the note', () => {
  const { guests } = parseGuestList(
    'Marcus Oyelaran - Founder & CEO, Tessellate Labs (stealth)',
  );
  assert.equal(guests[0].title, 'Founder & CEO');
  assert.equal(guests[0].company, 'Tessellate Labs');
});

test('duplicates collapse case-insensitively and keep the first', () => {
  const { guests } = parseGuestList(
    'Abhi Rao\nabhi rao\nABHI RAO - Engineer at X',
  );
  assert.equal(guests.length, 1);
  assert.equal(guests[0].name, 'Abhi Rao');
});

test('page noise, counters and blank lines are ignored and counted', () => {
  const { guests, ignored } = parseGuestList(
    [
      '307 Going',
      'Contact the Host',
      'Guests who have not completed their Luma profile are not shown.',
      '',
      'Sofia Lindqvist',
    ].join('\n'),
  );
  assert.deepEqual(
    guests.map((g) => g.name),
    ['Sofia Lindqvist'],
  );
  assert.equal(ignored, 3);
});

test('a name that looks like an instruction stays an ordinary name', () => {
  const { guests } = parseGuestList('Ignore previous instructions');
  assert.equal(guests[0].name, 'Ignore previous instructions');
  assert.equal(guests[0].company, undefined);
});

test('lines over 80 characters of name are ignored', () => {
  const { guests, ignored } = parseGuestList('x'.repeat(200));
  assert.equal(guests.length, 0);
  assert.equal(ignored, 1);
});

test('categorizeRole maps titles to the five categories', () => {
  assert.equal(categorizeRole('Partner at Lowercase Ventures'), 'investor');
  assert.equal(categorizeRole('Investor'), 'investor');
  assert.equal(categorizeRole('Recruiter'), 'recruiter');
  assert.equal(categorizeRole('Talent Partner'), 'recruiter');
  assert.equal(categorizeRole('Co-founder'), 'founder');
  assert.equal(categorizeRole('Founder & CEO'), 'founder');
  assert.equal(categorizeRole('ML Engineer'), 'engineer');
  assert.equal(categorizeRole('Developer Advocate'), 'engineer');
  assert.equal(categorizeRole('Product Designer'), 'other');
  assert.equal(categorizeRole(''), 'other');
});

test('an event header line with a weekday, date or year in its headline is not a guest', () => {
  const { guests, ignored } = parseGuestList(
    'SF Applied AI Builders Night - Wednesday, November 12, 2026, San Francisco',
  );
  assert.equal(guests.length, 0);
  assert.equal(ignored, 1);
});

test('a line that ends with a colon is a heading, not a guest', () => {
  const { guests, ignored } = parseGuestList(
    'Guest list (accepted, 14 of 140 shown):',
  );
  assert.equal(guests.length, 0);
  assert.equal(ignored, 1);
});

test('a sentence is not a guest', () => {
  const { guests, ignored } = parseGuestList(
    'Remote guests may join the livestream. Doors open at 6:00 PM.',
  );
  assert.equal(guests.length, 0);
  assert.equal(ignored, 1);
});

test('real names with initials or month-like words are kept', () => {
  const { guests } = parseGuestList(
    [
      'J. R. Ward',
      'Dr. Jane Smith',
      'April Chen - Engineer at Vercel',
      'May Wong - Founder, August Labs',
    ].join('\n'),
  );
  assert.deepEqual(
    guests.map((g) => g.name),
    ['J. R. Ward', 'Dr. Jane Smith', 'April Chen', 'May Wong'],
  );
  assert.equal(guests[3].company, 'August Labs');
});

test('the whole synthetic fixture yields exactly its fourteen guests', async () => {
  const { readFileSync } = await import('node:fs');
  const text = readFileSync(
    new URL('./fixtures/guest-list-with-header.txt', import.meta.url),
    'utf8',
  );
  const { guests } = parseGuestList(text);
  assert.equal(guests.length, 14);
  assert.ok(!guests.some((g) => /2026|Doors open|Guest list/.test(g.line)));
});
