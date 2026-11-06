import { test } from 'node:test';
import assert from 'node:assert/strict';
import { locationVerdict } from '../lib/server/location';

test('with no wanted locations every job matches', () => {
  assert.equal(locationVerdict('London, UK', []), 'match');
  assert.equal(locationVerdict(undefined, []), 'match');
});

test('a job in a wanted city matches, ignoring case and extra words', () => {
  assert.equal(
    locationVerdict('San Francisco, CA', ['san francisco']),
    'match',
  );
  assert.equal(locationVerdict('London; Bangalore', ['Bangalore']), 'match');
  assert.equal(locationVerdict('Zürich', ['zürich']), 'match');
});

test('a job in another city is elsewhere', () => {
  assert.equal(locationVerdict('London, UK', ['Bangalore']), 'elsewhere');
});

test('a city name only matches as whole words', () => {
  assert.equal(locationVerdict('Berlingen', ['Berlin']), 'elsewhere');
  assert.equal(locationVerdict('New Yorkshire', ['New York']), 'elsewhere');
});

test('a missing or blank location is unknown, never a match', () => {
  assert.equal(locationVerdict(undefined, ['Bangalore']), 'unknown');
  assert.equal(locationVerdict('  ', ['Bangalore']), 'unknown');
});

test('well-known alternate city names match each other', () => {
  assert.equal(locationVerdict('Bengaluru, India', ['Bangalore']), 'match');
  assert.equal(locationVerdict('Bangalore', ['Bengaluru']), 'match');
  assert.equal(locationVerdict('NYC', ['New York']), 'match');
  assert.equal(locationVerdict('SF', ['San Francisco']), 'match');
  assert.equal(locationVerdict('Oakland, CA', ['San Francisco']), 'elsewhere');
});

test('remote counts only when the owner lists remote', () => {
  assert.equal(locationVerdict('Remote', ['remote']), 'match');
  assert.equal(
    locationVerdict('Fully Remote - Worldwide', ['remote']),
    'match',
  );
  assert.equal(locationVerdict('Remote', ['Bangalore']), 'elsewhere');
});

test('remote with a region limit is unknown, not a match', () => {
  assert.equal(locationVerdict('Remote - US', ['remote']), 'unknown');
  assert.equal(locationVerdict('Remote (Europe)', ['remote']), 'unknown');
});

test('remote in a wanted city matches even without listing remote', () => {
  assert.equal(
    locationVerdict('Remote, San Francisco', ['San Francisco']),
    'match',
  );
});
