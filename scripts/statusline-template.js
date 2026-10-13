const fs = require('fs');
const path = require('path');

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
      fs.writeFileSync(path.join(process.env.TEMP, 'last-agy-statusline.json'), raw);
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
  let modelLabel = 'Gemini 3.8 Flash';
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
        modelLabel = rawName.trim() || 'Gemini 3.8 Flash';
      }
      if (d.model.effort) {
        effortLabel = String(d.model.effort).toLowerCase();
      }
    }
  }

  let modelPart = cModel + modelLabel + reset;
  if (effortLabel) {
    modelPart += cSep + '\u00B7' + reset + cModel + effortLabel + reset;
  }

  const parts = [modelPart];

  // 2. Quota / Rate limits
  const q = d.quota || d.rate_limits || {};
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

  const fiveSec = five ? (typeof five.reset_in_seconds === 'number' ? five.reset_in_seconds : (five.reset_time ? getDiffSec(five.reset_time) : null)) : null;
  const weekSec = week ? (typeof week.reset_in_seconds === 'number' ? week.reset_in_seconds : (week.reset_time ? getDiffSec(week.reset_time) : null)) : null;

  const fiveResetStr = formatDuration(fiveSec);
  const weekResetStr = formatDuration(weekSec);

  // 5h 17% (0h 34m)
  if (fiveLeft !== null) {
    let s = `5h ${fiveLeft}%`;
    if (fiveResetStr) s += ` (${fiveResetStr})`;
    parts.push(cQuota + s + reset);
  }

  // weekly 5% (3d 4h 14m)
  if (weekLeft !== null) {
    let s = `weekly ${weekLeft}%`;
    if (weekResetStr) s += ` (${weekResetStr})`;
    parts.push(cQuota + s + reset);
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
