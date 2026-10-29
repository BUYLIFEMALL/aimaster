#!/usr/bin/env node
// Claude Code · agy(Antigravity CLI) · Codex 하단 상태바 한 번에 설치 (윈도우·맥 공용)
// 표시: [모델]·[effort] | 5h [남은%] (남은 시간) | weekly [남은%] (남은 시간) | context [남은%]
//
// 사용: node scripts/install-statusbars.mjs [--only claude,agy,codex] [--claude-dir <폴더>] [--agy-dir <폴더>] [--codex-dir <폴더>]
//   --claude-dir 기본: CLAUDE_CONFIG_DIR, 없으면 ~/.claude
//   --agy-dir    기본: ~/.gemini/antigravity-cli
//   --codex-dir  기본: CODEX_HOME, 없으면 ~/.codex (config.toml의 [tui] status_line 설정)
// 설치 전에 바뀌는 파일은 모두 .bak-<시각>으로 백업한다. 여러 번 실행해도 결과는 같다.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const only = (opt('--only') || 'claude,agy,codex').split(',').map((s) => s.trim());
const home = os.homedir();
const isWin = process.platform === 'win32';
const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const slash = (p) => p.split(path.sep).join('/');

// Claude Code와 agy가 함께 쓰는 표시 스크립트(입력 JSON 형식을 둘 다 읽는다)
const SCRIPT = "const fs = require('fs');\nconst path = require('path');\nconst TMP = process.env.TEMP || process.env.TMPDIR || require('os').tmpdir();\n\nfunction formatDuration(sec) {\n  if (typeof sec !== 'number' || isNaN(sec) || sec <= 0) return null;\n  const d = Math.floor(sec / 86400);\n  const h = Math.floor((sec % 86400) / 3600);\n  const m = Math.floor((sec % 3600) / 60);\n  if (d > 0) {\n    return `${d}d ${h}h ${m < 10 ? '0' : ''}${m}m`;\n  }\n  return `${h}h ${m < 10 ? '0' : ''}${m}m`;\n}\n\nfunction getDiffSec(isoTime) {\n  try {\n    const diff = Math.floor((new Date(isoTime).getTime() - Date.now()) / 1000);\n    return diff > 0 ? diff : null;\n  } catch (e) {\n    return null;\n  }\n}\n\nlet raw = '';\nprocess.stdin.setEncoding('utf8');\nprocess.stdin.on('data', chunk => { raw += chunk; });\nprocess.stdin.on('end', () => {\n  raw = (raw || '').replace(/^\\uFEFF/, '').trim();\n\n  try {\n    if (raw) {\n      fs.writeFileSync(path.join(TMP, 'last-agy-statusline.json'), raw);\n    }\n  } catch (e) {}\n\n  let d = {};\n  if (raw) {\n    try {\n      d = JSON.parse(raw);\n    } catch (e) {}\n  }\n\n  // ANSI 24-bit TrueColor 테마 색상\n  const cModel = '\\x1b[38;2;222;204;161m'; // 웜 골드/베이지 (#DECCA1)\n  const cQuota = '\\x1b[38;2;208;126;142m'; // 로즈 핑크 (#D07E8E)\n  const cCtx   = '\\x1b[38;2;216;158;123m'; // 살구빛 오렌지 (#D89E7B)\n  const cSep   = '\\x1b[38;2;120;120;120m'; // 다크 그레이 (#787878)\n  const reset  = '\\x1b[0m';\n\n  // 1. 모델명 및 추론 강도(effort) 추출 -> Gemini 3.8 Flash·high\n  let modelLabel = 'Gemini 3.8 Flash';\n  let effortLabel = null;\n  if (d.model) {\n    if (typeof d.model === 'string') {\n      const match = d.model.match(/\\(([^)]+)\\)$/);\n      if (match) {\n        effortLabel = match[1].toLowerCase();\n        modelLabel = d.model.replace(/\\s*\\([^)]*\\)$/, '').trim();\n      } else {\n        modelLabel = d.model;\n      }\n    } else {\n      let rawName = d.model.display_name || d.model.id || '';\n      const match = rawName.match(/\\(([^)]+)\\)$/);\n      if (match) {\n        effortLabel = match[1].toLowerCase();\n        modelLabel = rawName.replace(/\\s*\\([^)]*\\)$/, '').trim();\n      } else {\n        modelLabel = rawName.trim() || 'Gemini 3.8 Flash';\n      }\n      if (d.model.effort) {\n        effortLabel = String(d.model.effort).toLowerCase();\n      }\n    }\n  }\n\n  // Claude Code는 추론 강도를 최상위 effort(또는 reasoning_effort)로 준다\n  const topEffort = d.effort ?? d.reasoning_effort;\n  if (!effortLabel && topEffort) {\n    const v = typeof topEffort === 'string' ? topEffort : (topEffort.level || topEffort.name);\n    if (v) effortLabel = String(v).toLowerCase();\n  }\n\n  let modelPart = cModel + modelLabel + reset;\n  if (effortLabel) {\n    modelPart += cSep + '\\u00B7' + reset + cModel + effortLabel + reset;\n  }\n\n  const parts = [modelPart];\n\n  // 2. Quota / Rate limits\n  // 세션 시작 직후(첫 응답 전)에는 Claude Code가 rate_limits를 보내지 않아 5h·weekly가 비었다(2026-10-20).\n  // 한도는 계정 전체 값이므로, 받을 때마다 저장해 두고 빠졌을 때는 초기화 시각이 안 지난 마지막 값을 쓴다.\n  const LIMITS_CACHE = path.join(TMP, 'claude-statusline-last-limits.json');\n  let q = d.quota || d.rate_limits || null;\n  try {\n    if (q && Object.keys(q).length) {\n      fs.writeFileSync(LIMITS_CACHE, JSON.stringify(q));\n    } else {\n      const cached = JSON.parse(fs.readFileSync(LIMITS_CACHE, 'utf8'));\n      const nowSec = Math.floor(Date.now() / 1000);\n      for (const k of Object.keys(cached)) {\n        if (typeof cached[k]?.resets_at === 'number' && cached[k].resets_at <= nowSec) delete cached[k];\n      }\n      q = cached;\n    }\n  } catch (e) {}\n  q = q || {};\n  const lowerModel = modelLabel.toLowerCase();\n  const is3p = lowerModel.includes('claude') || lowerModel.includes('sonnet') || lowerModel.includes('opus') || lowerModel.includes('codex') || lowerModel.includes('gpt');\n\n  let five = null;\n  let week = null;\n\n  if (is3p) {\n    five = q['3p-5h'] || q['3p_5h'] || q.five_hour || q.short_term || q['gemini-5h'];\n    week = q['3p-weekly'] || q['3p_weekly'] || q.weekly || q.seven_day || q['gemini-weekly'];\n  } else {\n    five = q['gemini-5h'] || q['gemini_5h'] || q.five_hour || q.short_term || q['3p-5h'];\n    week = q['gemini-weekly'] || q['gemini_weekly'] || q.weekly || q.seven_day || q['3p-weekly'];\n  }\n\n  let fiveLeft = null;\n  if (five) {\n    if (typeof five.remaining_fraction === 'number') {\n      fiveLeft = Math.round(five.remaining_fraction * 100);\n    } else if (typeof five.remaining_percentage === 'number') {\n      fiveLeft = Math.round(five.remaining_percentage);\n    } else if (typeof five.used_percentage === 'number') {\n      fiveLeft = Math.max(0, Math.min(100, Math.round(100 - five.used_percentage)));\n    }\n  }\n\n  let weekLeft = null;\n  if (week) {\n    if (typeof week.remaining_fraction === 'number') {\n      weekLeft = Math.round(week.remaining_fraction * 100);\n    } else if (typeof week.remaining_percentage === 'number') {\n      weekLeft = Math.round(week.remaining_percentage);\n    } else if (typeof week.used_percentage === 'number') {\n      weekLeft = Math.max(0, Math.min(100, Math.round(100 - week.used_percentage)));\n    }\n  }\n\n  // Claude Code는 resets_at(에포크 초), Antigravity는 reset_in_seconds/reset_time을 준다\n  const secUntil = (w) => {\n    if (!w) return null;\n    if (typeof w.reset_in_seconds === 'number') return w.reset_in_seconds;\n    if (typeof w.resets_at === 'number') {\n      const diff = w.resets_at - Math.floor(Date.now() / 1000);\n      return diff > 0 ? diff : null;\n    }\n    return w.reset_time ? getDiffSec(w.reset_time) : null;\n  };\n  const fiveSec = secUntil(five);\n  const weekSec = secUntil(week);\n\n  const fiveResetStr = formatDuration(fiveSec);\n  const weekResetStr = formatDuration(weekSec);\n\n  // 5h 17% (0h 34m)\n  if (fiveLeft !== null) {\n    let s = `5h ${fiveLeft}%`;\n    if (fiveResetStr) s += ` (${fiveResetStr})`;\n    parts.push(cQuota + s + reset);\n  }\n\n  // weekly 5% (3d 4h 14m)\n  if (weekLeft !== null) {\n    let s = `weekly ${weekLeft}%`;\n    if (weekResetStr) s += ` (${weekResetStr})`;\n    parts.push(cQuota + s + reset);\n  }\n\n  // 2-1. 추가 사용량(API 크레딧) — 구독 한도를 다 쓰면 연결된 크레딧으로 넘어가는데 5h·weekly에는 안 보인다(2026-10-29 주인님 요청).\n  // 상태바 입력값에는 없어서 Claude Code가 .claude.json에 저장해 둔 cachedUsageUtilization.extra_usage를 읽는다.\n  // 표시: credit $사용액/$월한도\n  try {\n    const os = require('os');\n    // 세션 자기 설정 파일에 저장값이 없을 수 있다(Orca 계정 폴더 등, 2026-10-29 실측).\n    // 한도·크레딧은 계정 전체 값이므로 같은 계정(accountUuid)의 설정 파일 중 가장 최근에 받은 값을 쓴다.\n    const read = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (err) { return null; } };\n    const own = [process.env.CLAUDE_CONFIG_DIR, process.env.HOME, os.homedir()]\n      .filter(Boolean).map((p) => path.join(p, '.claude.json')).find((p) => fs.existsSync(p));\n    const ownCfg = own ? read(own) : null;\n    const acct = ownCfg?.oauthAccount?.accountUuid || null;\n    const others = [path.join(os.homedir(), '.claude.json')];\n    for (const base of [process.env.APPDATA && path.join(process.env.APPDATA, 'orca/claude-profiles'),\n      path.join(os.homedir(), 'Library/Application Support/orca/claude-profiles')].filter(Boolean)) {\n      try { for (const id of fs.readdirSync(base)) others.push(path.join(base, id, 'home/.claude.json')); } catch (err) {}\n    }\n    let cfg = ownCfg;\n    for (const p of others) {\n      if (p === own) continue;\n      const c = read(p);\n      if (!c || !c.cachedUsageUtilization || (acct && c.oauthAccount?.accountUuid !== acct)) continue;\n      if (!cfg?.cachedUsageUtilization || c.cachedUsageUtilization.fetchedAtMs > cfg.cachedUsageUtilization.fetchedAtMs) cfg = c;\n    }\n    if (cfg) {\n      const u = cfg.cachedUsageUtilization || {};\n      const e = (u.utilization || {}).extra_usage;\n      // 구독 한도가 남아 있으면(구독으로 사용 중) 숨기고, 크레딧으로 넘어갔을 때만 표시.\n      // 상태바 입력은 주간 99%로 반올림돼 와도 계정 저장값은 100%·is_active일 수 있어 둘 다 본다(2026-10-29 실측).\n      const ut = u.utilization || {};\n      const limitHit = Array.isArray(ut.limits) && ut.limits.some((l) => l && l.is_active && Number(l.percent) >= 100 && !(Date.parse(l.resets_at) <= Date.now()));\n      const onCredit = fiveLeft === 0 || weekLeft === 0 || limitHit;\n      // 실제 차감되는 크레딧은 limit_dollars가 있는 항목(예: 한도 $250)에 있다. 없으면 extra_usage로 대신한다.\n      const pool = Object.values(ut).find((v) => v && typeof v === 'object' && typeof v.limit_dollars === 'number');\n      let s = null;\n      if (pool) {\n        s = `credit $${Number(pool.used_dollars || 0).toFixed(2)}/$${pool.limit_dollars.toFixed(2)}`;\n      } else if (e) {\n        const dp = typeof e.decimal_places === 'number' ? e.decimal_places : 2;\n        const money = (v) => '$' + (Number(v || 0) / Math.pow(10, dp)).toFixed(2);\n        s = `credit ${money(e.used_credits)}/${e.monthly_limit == null ? '∞' : money(e.monthly_limit)}`;\n      }\n      if (s && onCredit) {\n        parts.push('\\x1b[38;2;140;190;150m' + s + reset); // 세이지 그린 (#8CBE96)\n      }\n    }\n  } catch (e) {}\n\n  // 3. Context 남은 잔여량% -> context 23%\n  const ctx = d.context_window || d.context || {};\n  let ctxLeft = null;\n  if (typeof ctx.remaining_percentage === 'number') {\n    ctxLeft = Math.round(ctx.remaining_percentage);\n  } else if (typeof ctx.used_percentage === 'number') {\n    ctxLeft = Math.max(0, Math.min(100, Math.round(100 - ctx.used_percentage)));\n  } else if (typeof ctx.remaining_fraction === 'number') {\n    ctxLeft = Math.round(ctx.remaining_fraction * 100);\n  }\n\n  if (ctxLeft !== null) {\n    parts.push(cCtx + `context ${ctxLeft}%` + reset);\n  }\n\n  // 포맷 구분자: | (앞뒤 공백 1칸 포함)\n  const sep = ' ' + cSep + '|' + reset + ' ';\n  process.stdout.write(parts.join(sep));\n});\n";

const backup = (f) => { if (fs.existsSync(f)) fs.copyFileSync(f, `${f}.bak-${stamp}`); };
const readJson = (f) => {
  if (!fs.existsSync(f)) return {};
  const text = fs.readFileSync(f, 'utf8').replace(/^﻿/, '');
  if (!text.trim()) return {};
  try { return JSON.parse(text); } catch (e) { throw new Error(`올바른 JSON이 아니라 건너뜁니다: ${f}`); }
};
const writeScript = (file) => {
  backup(file);
  fs.writeFileSync(file, SCRIPT);
};
const sampleOut = (file) => {
  const now = Math.floor(Date.now() / 1000);
  const input = JSON.stringify({
    model: { display_name: 'Opus 5.5' }, effort: { level: 'medium' },
    rate_limits: { five_hour: { used_percentage: 6, resets_at: now + 6000 }, seven_day: { used_percentage: 71, resets_at: now + 340000 } },
    context_window: { remaining_percentage: 75 },
  });
  return execSync(`node "${file}"`, { input }).toString().replace(/\x1b\[[0-9;]*m/g, '');
};

const results = [];
const step = (name, fn) => {
  if (!only.includes(name)) return;
  try { results.push([name, '완료', fn()]); } catch (e) { results.push([name, '건너뜀', e.message.split('\n')[0]]); }
};

// 1) Claude Code
step('claude', () => {
  const dir = path.resolve(opt('--claude-dir') || process.env.CLAUDE_CONFIG_DIR || path.join(home, '.claude'));
  const settingsPath = path.join(dir, 'settings.json');
  const scriptPath = path.join(dir, 'statusline-extra.js');
  const settings = readJson(settingsPath);
  fs.mkdirSync(dir, { recursive: true });
  writeScript(scriptPath);
  const nodeCmd = `node "${slash(scriptPath)}"`;
  // Orca가 연결한 상태바 호출이 있으면 입력만 넘겨 주고 화면 출력은 이 스크립트 것을 쓴다
  const orca = (settings.statusLine?.command || '').match(/[^\s"'{;|]*\.orca.agent-hooks.claude-statusline\.(?:cmd|sh)/)?.[0];
  const command = orca
    ? `__sl_in=$(cat); printf '%s' "$__sl_in" | { ${orca}; } >/dev/null 2>&1; printf '%s' "$__sl_in" | ${nodeCmd}`
    : nodeCmd;
  backup(settingsPath);
  settings.statusLine = { ...(settings.statusLine || {}), type: 'command', command };
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
  return `${settingsPath}${orca ? ' (Orca 호출 유지)' : ''} → ${sampleOut(scriptPath)}`;
});

// 2) agy (Antigravity CLI)
step('agy', () => {
  const dir = path.resolve(opt('--agy-dir') || path.join(home, '.gemini', 'antigravity-cli'));
  if (!fs.existsSync(dir)) throw new Error(`agy 설정 폴더가 없습니다: ${dir}`);
  const settingsPath = path.join(dir, 'settings.json');
  const scriptPath = path.join(dir, 'statusline.js');
  const settings = readJson(settingsPath);
  writeScript(scriptPath);
  let command = `node "${slash(scriptPath)}"`;
  if (isWin) {
    const cmdPath = path.join(dir, 'statusline.cmd');
    backup(cmdPath);
    fs.writeFileSync(cmdPath, '@echo off\r\nnode "%~dp0statusline.js"\r\n');
    command = cmdPath;
  }
  backup(settingsPath);
  settings.statusLine = { ...(settings.statusLine || {}), type: 'command', command, enabled: true };
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
  return `${settingsPath} → ${sampleOut(scriptPath)}`;
});

// 3) Codex: 내장 상태바 설정([tui] status_line)을 config.toml에 넣는다(다른 설정은 그대로)
step('codex', () => {
  const dir = path.resolve(opt('--codex-dir') || process.env.CODEX_HOME || path.join(home, '.codex'));
  const file = path.join(dir, 'config.toml');
  const want = {
    status_line: '["model", "reasoning", "five-hour-limit", "weekly-limit", "context-remaining"]',
    status_line_use_colors: 'true',
  };
  fs.mkdirSync(dir, { recursive: true });
  const lines = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split(/\r?\n/) : [];
  backup(file);
  let start = lines.findIndex((l) => l.trim() === '[tui]');
  if (start < 0) {
    if (lines.length && lines[lines.length - 1].trim() !== '') lines.push('');
    lines.push('[tui]');
    start = lines.length - 1;
  }
  let end = lines.findIndex((l, i) => i > start && /^\s*\[/.test(l));
  if (end < 0) end = lines.length;
  for (const [key, value] of Object.entries(want)) {
    const i = lines.findIndex((l, j) => j > start && j < end && new RegExp(`^\\s*${key}\\s*=`).test(l));
    if (i >= 0) lines[i] = `${key} = ${value}`;
    else { lines.splice(end, 0, `${key} = ${value}`); end++; }
  }
  fs.writeFileSync(file, lines.join('\n').replace(/\n*$/, '\n'));
  return `${file} (다음 Codex 실행부터 적용)`;
});

for (const [name, status, detail] of results) console.log(`[${name}] ${status}: ${detail}`);
console.log('Claude Code·agy는 다음 질문부터, Codex는 새로 실행할 때부터 보입니다. 안 보이면 해당 CLI를 다시 시작해 주세요.');
