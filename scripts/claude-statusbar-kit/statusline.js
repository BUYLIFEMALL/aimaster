// Claude Code 상태바 표시 스크립트 (AIMaster 윈도우 PC 현재 상태바와 같은 내용, 2026-11-08)
const fs = require('fs');
const path = require('path');
const TMP = process.env.TEMP || process.env.TMPDIR || require('os').tmpdir();

function formatDuration(sec) {
  if (typeof sec !== 'number' || isNaN(sec) || sec <= 0) return null;
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) {
    return `${d}d ${h}h ${m < 10 ? '0' : ''}${m}m`;
  }
  return `${h}h ${m < 10 ? '0' : ''}${m}m`;
}

function getDiffSec(isoTime) {
  try {
    const diff = Math.floor((new Date(isoTime).getTime() - Date.now()) / 1000);
    return diff > 0 ? diff : null;
  } catch (e) {
    return null;
  }
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { raw += chunk; });
process.stdin.on('end', () => {
  raw = (raw || '').replace(/^\uFEFF/, '').trim();

  try {
    if (raw) {
      fs.writeFileSync(path.join(TMP, 'last-agy-statusline.json'), raw);
    }
  } catch (e) {}

  let d = {};
  if (raw) {
    try {
      d = JSON.parse(raw);
    } catch (e) {}
  }

  // ANSI 24-bit TrueColor 테마 색상
  const cModel = '\x1b[38;2;222;204;161m'; // 웜 골드/베이지 (#DECCA1)
  const cQuota = '\x1b[38;2;208;126;142m'; // 로즈 핑크 (#D07E8E)
  const cCtx   = '\x1b[38;2;216;158;123m'; // 살구빛 오렌지 (#D89E7B)
  const cSep   = '\x1b[38;2;120;120;120m'; // 다크 그레이 (#787878)
  const reset  = '\x1b[0m';

  // 1. 모델명 및 추론 강도(effort) 추출 -> Gemini 3.8 Flash·high
  let modelLabel = '';
  let effortLabel = null;
  if (d.model) {
    if (typeof d.model === 'string') {
      const match = d.model.match(/\(([^)]+)\)$/);
      if (match) {
        effortLabel = match[1].toLowerCase();
        modelLabel = d.model.replace(/\s*\([^)]*\)$/, '').trim();
      } else {
        modelLabel = d.model;
      }
    } else {
      let rawName = d.model.display_name || d.model.id || '';
      const match = rawName.match(/\(([^)]+)\)$/);
      if (match) {
        effortLabel = match[1].toLowerCase();
        modelLabel = rawName.replace(/\s*\([^)]*\)$/, '').trim();
      } else {
        modelLabel = rawName.trim();
      }
      if (d.model.effort) {
        effortLabel = String(d.model.effort).toLowerCase();
      }
    }
  }

  // Claude Code는 추론 강도를 최상위 effort(또는 reasoning_effort)로 준다
  const topEffort = d.effort ?? d.reasoning_effort;
  if (!effortLabel && topEffort) {
    const v = typeof topEffort === 'string' ? topEffort : (topEffort.level || topEffort.name);
    if (v) effortLabel = String(v).toLowerCase();
  }

  let modelPart = cModel + modelLabel + reset;
  if (effortLabel) {
    modelPart += cSep + '\u00B7' + reset + cModel + effortLabel + reset;
  }

  const parts = [modelPart];

  // 2. Quota / Rate limits
  // 세션 시작 직후(첫 응답 전)에는 Claude Code가 rate_limits를 보내지 않아 5h·weekly가 비었다(2026-10-20).
  // 한도는 계정 전체 값이므로, 받을 때마다 저장해 두고 빠졌을 때는 초기화 시각이 안 지난 마지막 값을 쓴다.
  const LIMITS_CACHE = path.join(TMP, 'claude-statusline-last-limits.json');
  let q = d.quota || d.rate_limits || null;
  try {
    if (q && Object.keys(q).length) {
      // 5시간 창이 빠져 오면(2026-11-06 실측: seven_day만 옴) 초기화 전인 마지막 5시간 값을 이어 쓴다
      if (!q.five_hour) {
        try {
          const prev = JSON.parse(fs.readFileSync(LIMITS_CACHE, 'utf8')).five_hour;
          if (prev && typeof prev.resets_at === 'number' && prev.resets_at > Math.floor(Date.now() / 1000)) q = { ...q, five_hour: prev };
        } catch (e) {}
      }
      fs.writeFileSync(LIMITS_CACHE, JSON.stringify(q));
    } else {
      const cached = JSON.parse(fs.readFileSync(LIMITS_CACHE, 'utf8'));
      const nowSec = Math.floor(Date.now() / 1000);
      for (const k of Object.keys(cached)) {
        if (typeof cached[k]?.resets_at === 'number' && cached[k].resets_at <= nowSec) delete cached[k];
      }
      q = cached;
    }
  } catch (e) {}
  q = q || {};
  const lowerModel = modelLabel.toLowerCase();
  const is3p = lowerModel.includes('claude') || lowerModel.includes('sonnet') || lowerModel.includes('opus') || lowerModel.includes('codex') || lowerModel.includes('gpt');

  let five = null;
  let week = null;

  if (is3p) {
    five = q['3p-5h'] || q['3p_5h'] || q.five_hour || q.short_term || q['gemini-5h'];
    week = q['3p-weekly'] || q['3p_weekly'] || q.weekly || q.seven_day || q['gemini-weekly'];
  } else {
    five = q['gemini-5h'] || q['gemini_5h'] || q.five_hour || q.short_term || q['3p-5h'];
    week = q['gemini-weekly'] || q['gemini_weekly'] || q.weekly || q.seven_day || q['3p-weekly'];
  }

  let fiveLeft = null;
  if (five) {
    if (typeof five.remaining_fraction === 'number') {
      fiveLeft = Math.round(five.remaining_fraction * 100);
    } else if (typeof five.remaining_percentage === 'number') {
      fiveLeft = Math.round(five.remaining_percentage);
    } else if (typeof five.used_percentage === 'number') {
      fiveLeft = Math.max(0, Math.min(100, Math.round(100 - five.used_percentage)));
    }
  }

  let weekLeft = null;
  if (week) {
    if (typeof week.remaining_fraction === 'number') {
      weekLeft = Math.round(week.remaining_fraction * 100);
    } else if (typeof week.remaining_percentage === 'number') {
      weekLeft = Math.round(week.remaining_percentage);
    } else if (typeof week.used_percentage === 'number') {
      weekLeft = Math.max(0, Math.min(100, Math.round(100 - week.used_percentage)));
    }
  }

  // Claude Code는 resets_at(에포크 초), Antigravity는 reset_in_seconds/reset_time을 준다
  const secUntil = (w) => {
    if (!w) return null;
    if (typeof w.reset_in_seconds === 'number') return w.reset_in_seconds;
    if (typeof w.resets_at === 'number') {
      const diff = w.resets_at - Math.floor(Date.now() / 1000);
      return diff > 0 ? diff : null;
    }
    return w.reset_time ? getDiffSec(w.reset_time) : null;
  };
  const fiveSec = secUntil(five);
  const weekSec = secUntil(week);

  const fiveResetStr = formatDuration(fiveSec);
  const weekResetStr = formatDuration(weekSec);

  // 5h 17% (0h 34m)
  if (fiveLeft !== null) {
    let s = `5h ${fiveLeft}%`;
    if (fiveResetStr) s += ` (${fiveResetStr})`;
    parts.push(cQuota + s + reset);
  } else if (weekLeft !== null) {
    parts.push(cQuota + '5h 100%' + reset); // 서버가 5시간 창을 안 줌 = 5시간 한도 없음 → 남은 양 100%로 표시(2026-11-06 주인님 지시)
  }

  // weekly 5% (3d 4h 14m)
  if (weekLeft !== null) {
    let s = `weekly ${weekLeft}%`;
    if (weekResetStr) s += ` (${weekResetStr})`;
    parts.push(cQuota + s + reset);
  }

  // 2-1. 추가 사용량(API 크레딧) — 구독 한도를 다 쓰면 연결된 크레딧으로 넘어가는데 5h·weekly에는 안 보인다(2026-10-29 주인님 요청).
  // 상태바 입력값에는 없어서 Claude Code가 .claude.json에 저장해 둔 cachedUsageUtilization.extra_usage를 읽는다.
  // 표시: credit $사용액/$월한도
  try {
    const os = require('os');
    // 세션 자기 설정 파일에 저장값이 없을 수 있다(Orca 계정 폴더 등, 2026-10-29 실측).
    // 한도·크레딧은 계정 전체 값이므로 같은 계정(accountUuid)의 설정 파일 중 가장 최근에 받은 값을 쓴다.
    const read = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (err) { return null; } };
    const own = [process.env.CLAUDE_CONFIG_DIR, process.env.HOME, os.homedir()]
      .filter(Boolean).map((p) => path.join(p, '.claude.json')).find((p) => fs.existsSync(p));
    const ownCfg = own ? read(own) : null;
    const acct = ownCfg?.oauthAccount?.accountUuid || null;
    const others = [path.join(os.homedir(), '.claude.json')];
    for (const base of [process.env.APPDATA && path.join(process.env.APPDATA, 'orca/claude-profiles'),
      path.join(os.homedir(), 'Library/Application Support/orca/claude-profiles')].filter(Boolean)) {
      try { for (const id of fs.readdirSync(base)) others.push(path.join(base, id, 'home/.claude.json')); } catch (err) {}
    }
    let cfg = ownCfg;
    for (const p of others) {
      if (p === own) continue;
      const c = read(p);
      if (!c || !c.cachedUsageUtilization || (acct && c.oauthAccount?.accountUuid !== acct)) continue;
      if (!cfg?.cachedUsageUtilization || c.cachedUsageUtilization.fetchedAtMs > cfg.cachedUsageUtilization.fetchedAtMs) cfg = c;
    }
    if (cfg) {
      const u = cfg.cachedUsageUtilization || {};
      const e = (u.utilization || {}).extra_usage;
      // 구독 한도가 남아 있으면(구독으로 사용 중) 숨기고, 크레딧으로 넘어갔을 때만 표시.
      // 상태바 입력은 주간 99%로 반올림돼 와도 계정 저장값은 100%·is_active일 수 있어 둘 다 본다(2026-10-29 실측).
      const ut = u.utilization || {};
      const limitHit = Array.isArray(ut.limits) && ut.limits.some((l) => l && l.is_active && Number(l.percent) >= 100 && !(Date.parse(l.resets_at) <= Date.now()));
      const onCredit = fiveLeft === 0 || weekLeft === 0 || limitHit;
      // 실제 차감되는 크레딧은 limit_dollars가 있는 항목(예: 한도 $250)에 있다. 없으면 extra_usage로 대신한다.
      const pool = Object.values(ut).find((v) => v && typeof v === 'object' && typeof v.limit_dollars === 'number');
      let s = null;
      if (pool) {
        s = `credit $${Number(pool.used_dollars || 0).toFixed(2)}/$${pool.limit_dollars.toFixed(2)}`;
      } else if (e) {
        const dp = typeof e.decimal_places === 'number' ? e.decimal_places : 2;
        const money = (v) => '$' + (Number(v || 0) / Math.pow(10, dp)).toFixed(2);
        s = `credit ${money(e.used_credits)}/${e.monthly_limit == null ? '∞' : money(e.monthly_limit)}`;
      }
      if (s && onCredit) {
        parts.push('\x1b[38;2;140;190;150m' + s + reset); // 세이지 그린 (#8CBE96)
      }
    }
  } catch (e) {}

  // API 키 사용자: 한도 값이 없으면 이번 세션 예상 비용 표시
  if (fiveLeft === null && weekLeft === null && d.cost && typeof d.cost.total_cost_usd === 'number') {
    parts.push(cQuota + 'session $' + d.cost.total_cost_usd.toFixed(2) + reset);
  }

  // 3. Context 남은 잔여량% -> context 23%
  const ctx = d.context_window || d.context || {};
  let ctxLeft = null;
  if (typeof ctx.remaining_percentage === 'number') {
    ctxLeft = Math.round(ctx.remaining_percentage);
  } else if (typeof ctx.used_percentage === 'number') {
    ctxLeft = Math.max(0, Math.min(100, Math.round(100 - ctx.used_percentage)));
  } else if (typeof ctx.remaining_fraction === 'number') {
    ctxLeft = Math.round(ctx.remaining_fraction * 100);
  }

  if (ctxLeft !== null) {
    parts.push(cCtx + `context ${ctxLeft}%` + reset);
  }

  // 포맷 구분자: | (앞뒤 공백 1칸 포함)
  const sep = ' ' + cSep + '|' + reset + ' ';
  process.stdout.write(parts.join(sep));
});
