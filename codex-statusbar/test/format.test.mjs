import test from 'node:test';
import assert from 'node:assert/strict';
import { countdown, readWindows, formatFooter, isFooter, width } from '../src/format.mjs';

const now = 1_790_000_000_000;
const result = { rateLimits: { limitId: 'codex', primary: { windowDurationMins: 300, usedPercent: 15, resetsAt: now / 1000 + 5040 }, secondary: { windowDurationMins: 10080, usedPercent: 18, resetsAt: now / 1000 + 200000 } } };
const line = '  GPT-6.1-Sol · high · 5h 85% left · weekly 82% left · Context 49% left';

test('classifies windows by actual duration, including reversed slot order', () => {
  const swapped = { rateLimits: { ...result.rateLimits, primary: result.rateLimits.secondary, secondary: result.rateLimits.primary } };
  assert.deepEqual(readWindows(swapped, now), readWindows(result, now));
  assert.equal(readWindows(swapped, now).fiveHour.remaining, 85);
});
test('uses the Codex bucket instead of unrelated model limits', () => {
  assert.equal(readWindows({ rateLimits: { ...result.rateLimits, limitId: 'other' } }), null);
  assert.equal(readWindows({ rateLimitsByLimitId: { codex: result.rateLimits }, rateLimits: { limitId: 'other' } }, now).weekly.remaining, 82);
});
test('does not fabricate a five-hour quota out of a short window', () => {
  assert.equal(readWindows({ rateLimits: { primary: { windowDurationMins: 15, usedPercent: 10, resetsAt: 1 } } }, now).fiveHour, null);
});
test('rejects missing and nonnumeric percentages and unknown reset times', () => {
  assert.equal(readWindows({}, now), null);
  assert.equal(readWindows({ rateLimits: { primary: { windowDurationMins: 300, usedPercent: '15' } } }, now).fiveHour, null);
  assert.equal(readWindows({ rateLimits: { primary: { windowDurationMins: 300, usedPercent: 15 } } }, now).fiveHour.resetsAt, null);
});
test('countdown supports hours, days, remaining minute and expiration', () => {
  assert.equal(countdown(now / 1000 + 5040, now), '1h 24m');
  assert.equal(countdown(now / 1000 + 2 * 86400 + 3 * 3600 + 60, now), '2d 3h 1m');
  assert.equal(countdown(now / 1000 + 1, now), '1m');
  assert.equal(countdown(now / 1000, now), 'resetting');
  assert.equal(countdown(null, now), null);
});
test('countdown changes as wall-clock time advances', () => {
  assert.equal(countdown(now / 1000 + 5040, now + 60_000), '1h 23m');
});
test('adds both reset countdowns while keeping the original remaining values', () => {
  const rendered = formatFooter(line, readWindows(result, now), 150, now);
  assert.match(rendered, /5h 85% left \(1h 24m\)/);
  assert.match(rendered, /weekly 82% left \(2d 7h 34m\)/);
  assert.match(rendered, /Context 49% left/);
});
test('does not attach clocks to a mismatched percentage', () => {
  assert.equal(formatFooter(line.replace('85%', '20%').replace('82%', '21%'), readWindows(result, now), 150, now), null);
});
test('hides old or missing account data instead of keeping an old countdown', () => {
  assert.equal(formatFooter(line, null, 150, now), null);
  assert.equal(formatFooter(line, readWindows(result, now), 150, now + 150001), null);
  assert.equal(formatFooter(line, readWindows(result, now + 1), 150, now), null);
});
test('supports a single quota window without inventing another', () => {
  const snapshot = readWindows({ rateLimits: { primary: result.rateLimits.primary } }, now);
  const rendered = formatFooter(line, snapshot, 150, now);
  assert.match(rendered, /5h 85% left \(/);
  assert.match(rendered, /weekly 82% left ·/);
});
test('never matches the help text, transcript or status details as a footer', () => {
  for (const text of ['Context 49% left', '5h limit: 85% left', 'weekly limit: 82% left', '? for shortcuts']) assert.equal(isFooter(text), false);
});
test('compact form keeps both quota clocks and context within 80 columns', () => {
  const rendered = formatFooter(line, readWindows(result, now), 80, now);
  assert.ok(width(rendered) < 80);
  assert.match(rendered, /5h 85%left\(1h24m\)/);
  assert.match(rendered, /wk 82%left\(2d7h34m\)/);
  assert.match(rendered, /ctx 49%left/);
});
test('all narrow widths avoid writing into the last terminal column', () => {
  for (const columns of [20, 40, 60, 80, 100, 140]) assert.ok(width(formatFooter(line, readWindows(result, now), columns, now)) < columns);
});
