// Claude Code 하단 상태바 — 모델·남은 사용량·남은 대화 공간을 한 줄로 보여 줍니다.
// 예) Opus 5.5·medium | 5h 97% (3h 40m) | weekly 99% (6d 22h 40m) | context 53%
// 모든 % 는 「남은 양」입니다. 인터넷으로 아무것도 보내지 않습니다.
const fs = require('fs');
const os = require('os');
const path = require('path');

const C = {
  model: '\x1b[38;2;222;204;161m',
  quota: '\x1b[38;2;208;126;142m',
  credit: '\x1b[38;2;140;190;150m',
  ctx: '\x1b[38;2;216;158;123m',
  sep: '\x1b[38;2;120;120;120m',
  reset: '\x1b[0m',
};
const paint = (color, text) => color + text + C.reset;

function duration(sec) {
  if (typeof sec !== 'number' || !(sec > 0)) return null;
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
}

function leftPercent(w) {
  if (!w) return null;
  if (typeof w.remaining_percentage === 'number') return Math.round(w.remaining_percentage);
  if (typeof w.used_percentage === 'number') return Math.max(0, Math.min(100, Math.round(100 - w.used_percentage)));
  return null;
}

function secondsUntil(w) {
  if (!w || typeof w.resets_at !== 'number') return null;
  return w.resets_at - Math.floor(Date.now() / 1000);
}

function windowText(label, w) {
  const left = leftPercent(w);
  if (left === null) return null;
  const time = duration(secondsUntil(w));
  return `${label} ${left}%` + (time ? ` (${time})` : '');
}

// 새 세션의 첫 응답 전에는 한도 값이 오지 않으므로, 초기화 시각이 안 지난 마지막 값을 씁니다.
function limitsWithCache(fresh) {
  const file = path.join(os.tmpdir(), 'claude-statusbar-last-limits.json');
  try {
    if (fresh && Object.keys(fresh).length) {
      fs.writeFileSync(file, JSON.stringify(fresh));
      return fresh;
    }
    const cached = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const key of Object.keys(cached)) {
      if (!(secondsUntil(cached[key]) > 0)) delete cached[key];
    }
    return cached;
  } catch {
    return fresh || {};
  }
}

// 구독 한도를 다 쓴 뒤 추가 사용량(크레딧)으로 넘어갔을 때만 보여 줍니다.
// Claude Code가 설정 파일에 저장해 둔 값이라 버전에 따라 없을 수 있고, 없으면 표시하지 않습니다.
function creditText(fiveLeft, weekLeft) {
  try {
    const candidates = [process.env.CLAUDE_CONFIG_DIR, os.homedir()].filter(Boolean).map((dir) => path.join(dir, '.claude.json'));
    const file = candidates.find((p) => fs.existsSync(p));
    if (!file) return null;
    const u = JSON.parse(fs.readFileSync(file, 'utf8')).cachedUsageUtilization?.utilization;
    if (!u) return null;
    const limitHit = Array.isArray(u.limits) && u.limits.some((l) => l && l.is_active && Number(l.percent) >= 100 && !(Date.parse(l.resets_at) <= Date.now()));
    if (!(fiveLeft === 0 || weekLeft === 0 || limitHit)) return null;
    const pool = Object.values(u).find((v) => v && typeof v === 'object' && typeof v.limit_dollars === 'number');
    if (pool) return `credit $${Number(pool.used_dollars || 0).toFixed(2)}/$${pool.limit_dollars.toFixed(2)}`;
    const e = u.extra_usage;
    if (!e) return null;
    const places = typeof e.decimal_places === 'number' ? e.decimal_places : 2;
    const money = (v) => '$' + (Number(v || 0) / 10 ** places).toFixed(2);
    return `credit ${money(e.used_credits)}/${e.monthly_limit == null ? '∞' : money(e.monthly_limit)}`;
  } catch {
    return null;
  }
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { raw += chunk; });
process.stdin.on('end', () => {
  let d = {};
  try { d = JSON.parse(raw.replace(/^﻿/, '').trim() || '{}'); } catch {}

  const name = (typeof d.model === 'string' ? d.model : d.model?.display_name || d.model?.id) || 'Claude';
  const inName = name.match(/\(([^)]+)\)$/);
  const rawEffort = d.effort ?? d.reasoning_effort ?? d.model?.effort;
  const effort = (typeof rawEffort === 'string' ? rawEffort : rawEffort?.level || rawEffort?.name) || inName?.[1];
  const parts = [paint(C.model, name.replace(/\s*\([^)]*\)$/, '').trim()) + (effort ? paint(C.sep, '·') + paint(C.model, String(effort).toLowerCase()) : '')];

  const limits = limitsWithCache(d.rate_limits);
  const fiveText = windowText('5h', limits.five_hour);
  const weekText = windowText('weekly', limits.seven_day);
  if (fiveText) parts.push(paint(C.quota, fiveText));
  if (weekText) parts.push(paint(C.quota, weekText));

  const credit = creditText(leftPercent(limits.five_hour), leftPercent(limits.seven_day));
  if (credit) parts.push(paint(C.credit, credit));

  // 구독 한도 값이 없으면(API 키 사용 등) 이번 세션 예상 비용을 대신 보여 줍니다.
  const cost = d.cost?.total_cost_usd;
  if (!fiveText && !weekText && typeof cost === 'number') parts.push(paint(C.credit, `session $${cost.toFixed(2)}`));

  const ctx = d.context_window || {};
  const ctxLeft = typeof ctx.remaining_percentage === 'number' ? Math.round(ctx.remaining_percentage)
    : typeof ctx.used_percentage === 'number' ? Math.max(0, Math.round(100 - ctx.used_percentage)) : null;
  if (ctxLeft !== null) parts.push(paint(C.ctx, `context ${ctxLeft}%`));

  process.stdout.write(parts.join(` ${paint(C.sep, '|')} `));
});
