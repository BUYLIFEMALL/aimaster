export const APP_VERSION = 'v1.04';
export const MAX_AGE_MS = 150_000;

export function readWindows(result, now = Date.now()) {
  const bucket = result?.rateLimitsByLimitId?.codex ?? result?.rateLimits;
  if (!bucket || (bucket.limitId && bucket.limitId !== 'codex')) return null;
  const windows = [bucket.primary, bucket.secondary].filter(Boolean);
  const normalize = (minutes) => {
    const value = windows.find((window) => window.windowDurationMins === minutes);
    if (!value || !Number.isFinite(value.usedPercent)) return null;
    return {
      remaining: Math.max(0, Math.min(100, 100 - value.usedPercent)),
      resetsAt: Number.isFinite(value.resetsAt) && value.resetsAt > 0 ? value.resetsAt : null,
    };
  };
  return { fiveHour: normalize(300), weekly: normalize(10_080), updatedAt: now };
}

export function countdown(resetsAt, now = Date.now()) {
  if (!Number.isFinite(resetsAt) || resetsAt <= 0) return null;
  const seconds = Math.ceil(resetsAt - now / 1000);
  if (seconds <= 0) return 'resetting';
  const minutes = Math.ceil(seconds / 60);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const rest = minutes % 60;
  if (days) return `${days}d ${hours}h ${rest}m`;
  return `${hours}h ${rest}m`;
}

export function isFooter(line) {
  return /Context\s+\d+%\s+left/.test(line) && /(?:5h|weekly)\s+\d+%\s+left/.test(line);
}

export function width(text) {
  let result = 0;
  for (const char of text) {
    const cp = char.codePointAt(0);
    if (/\p{Mark}/u.test(char)) continue;
    result += (cp >= 0x1100 && (cp <= 0x115f || cp === 0x2329 || cp === 0x232a || (cp >= 0x2e80 && cp <= 0xa4cf) || (cp >= 0xac00 && cp <= 0xd7a3) || (cp >= 0xf900 && cp <= 0xfaff) || (cp >= 0xfe10 && cp <= 0xfe6f) || (cp >= 0xff00 && cp <= 0xff60) || cp >= 0x1f300)) ? 2 : 1;
  }
  return result;
}

export function fit(text, columns) {
  if (width(text) <= columns) return text;
  let value = '';
  for (const char of text) {
    if (width(value + char) > columns - 1) break;
    value += char;
  }
  return value + '…';
}

export function formatFooter(line, snapshot, columns, now = Date.now()) {
  if (!isFooter(line)) return null;
  const fresh = snapshot && now - snapshot.updatedAt <= MAX_AGE_MS && now >= snapshot.updatedAt;
  const firstQuota = line.search(/\b(?:5h|weekly)\s+\d+%\s+left/);
  const model = line.slice(0, firstQuota).trim().replace(/[·|]\s*$/, '').trim().split(/\s*[·|]\s*/).join(' ');
  const quotas = [...line.matchAll(/\b(5h|weekly)\s+(\d+)%\s+left/g)].map(([, label, remaining]) => {
    const text = `${label} ${remaining}%`;
    if (!fresh) return text;
    const window = label === '5h' ? snapshot.fiveHour : snapshot.weekly;
    // Keep the CLI's exact percentages; never attach another bucket's clock.
    if (!window || Math.abs(window.remaining - Number(remaining)) > 1) return text;
    const time = countdown(window.resetsAt, now);
    return time ? `${text} (${time})` : text;
  });
  const context = `context ${line.match(/Context\s+(\d+)%\s+left/)[1]}%`;
  const fields = [...quotas, context];
  let output = [model, ...fields].filter(Boolean).join(' | ');
  const max = Math.max(0, columns - 3); // Two left-padding cells, one wrap guard.
  // Preserve the requested time-unit and separator spaces at every width.
  // Shorten only the model when necessary to keep the quota fields visible.
  if (width(output) > max && model) {
    const suffix = output.slice(model.length);
    const budget = max - width(suffix);
    if (budget > 0) output = fit(model, budget) + suffix;
  }
  return '  ' + fit(output, max);
}
