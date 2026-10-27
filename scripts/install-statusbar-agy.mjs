#!/usr/bin/env node
// agy(Antigravity CLI) 하단 상태바 설치 — 이 파일 하나만 복사해서 실행하면 됩니다(저장소 불필요, 윈도우·맥 공용).
// 표시: [모델]·[effort] | 5h [남은%] (남은 시간) | weekly [남은%] (남은 시간) | context [남은%]
// 사용: node install-statusbar-agy.mjs [--agy-dir <폴더>]   기본: ~/.gemini/antigravity-cli
// 표시 스크립트 statusline.js(윈도우는 statusline.cmd도)를 만들고 settings.json의 statusLine만 바꿉니다.
// 바꾸기 전에 .bak-<시각>으로 백업합니다. 여러 번 실행해도 결과는 같습니다.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const backup = (f) => { if (fs.existsSync(f)) fs.copyFileSync(f, `${f}.bak-${stamp}`); };
const slash = (p) => p.split(path.sep).join('/');

// 표시 스크립트 본문(Claude Code 상태바와 같은 코드)
const SCRIPT = "const fs = require('fs');\nconst path = require('path');\nconst TMP = process.env.TEMP || process.env.TMPDIR || require('os').tmpdir();\n\nfunction formatDuration(sec) {\n  if (typeof sec !== 'number' || isNaN(sec) || sec <= 0) return null;\n  const d = Math.floor(sec / 86400);\n  const h = Math.floor((sec % 86400) / 3600);\n  const m = Math.floor((sec % 3600) / 60);\n  if (d > 0) {\n    return `${d}d ${h}h ${m < 10 ? '0' : ''}${m}m`;\n  }\n  return `${h}h ${m < 10 ? '0' : ''}${m}m`;\n}\n\nfunction getDiffSec(isoTime) {\n  try {\n    const diff = Math.floor((new Date(isoTime).getTime() - Date.now()) / 1000);\n    return diff > 0 ? diff : null;\n  } catch (e) {\n    return null;\n  }\n}\n\nlet raw = '';\nprocess.stdin.setEncoding('utf8');\nprocess.stdin.on('data', chunk => { raw += chunk; });\nprocess.stdin.on('end', () => {\n  raw = (raw || '').replace(/^\\uFEFF/, '').trim();\n\n  try {\n    if (raw) {\n      fs.writeFileSync(path.join(TMP, 'last-agy-statusline.json'), raw);\n    }\n  } catch (e) {}\n\n  let d = {};\n  if (raw) {\n    try {\n      d = JSON.parse(raw);\n    } catch (e) {}\n  }\n\n  // ANSI 24-bit TrueColor 테마 색상\n  const cModel = '\\x1b[38;2;222;204;161m'; // 웜 골드/베이지 (#DECCA1)\n  const cQuota = '\\x1b[38;2;208;126;142m'; // 로즈 핑크 (#D07E8E)\n  const cCtx   = '\\x1b[38;2;216;158;123m'; // 살구빛 오렌지 (#D89E7B)\n  const cSep   = '\\x1b[38;2;120;120;120m'; // 다크 그레이 (#787878)\n  const reset  = '\\x1b[0m';\n\n  // 1. 모델명 및 추론 강도(effort) 추출 -> Gemini 3.8 Flash·high\n  let modelLabel = 'Gemini 3.8 Flash';\n  let effortLabel = null;\n  if (d.model) {\n    if (typeof d.model === 'string') {\n      const match = d.model.match(/\\(([^)]+)\\)$/);\n      if (match) {\n        effortLabel = match[1].toLowerCase();\n        modelLabel = d.model.replace(/\\s*\\([^)]*\\)$/, '').trim();\n      } else {\n        modelLabel = d.model;\n      }\n    } else {\n      let rawName = d.model.display_name || d.model.id || '';\n      const match = rawName.match(/\\(([^)]+)\\)$/);\n      if (match) {\n        effortLabel = match[1].toLowerCase();\n        modelLabel = rawName.replace(/\\s*\\([^)]*\\)$/, '').trim();\n      } else {\n        modelLabel = rawName.trim() || 'Gemini 3.8 Flash';\n      }\n      if (d.model.effort) {\n        effortLabel = String(d.model.effort).toLowerCase();\n      }\n    }\n  }\n\n  // Claude Code는 추론 강도를 최상위 effort(또는 reasoning_effort)로 준다\n  const topEffort = d.effort ?? d.reasoning_effort;\n  if (!effortLabel && topEffort) {\n    const v = typeof topEffort === 'string' ? topEffort : (topEffort.level || topEffort.name);\n    if (v) effortLabel = String(v).toLowerCase();\n  }\n\n  let modelPart = cModel + modelLabel + reset;\n  if (effortLabel) {\n    modelPart += cSep + '\\u00B7' + reset + cModel + effortLabel + reset;\n  }\n\n  const parts = [modelPart];\n\n  // 2. Quota / Rate limits\n  // 세션 시작 직후(첫 응답 전)에는 Claude Code가 rate_limits를 보내지 않아 5h·weekly가 비었다(2026-10-20).\n  // 한도는 계정 전체 값이므로, 받을 때마다 저장해 두고 빠졌을 때는 초기화 시각이 안 지난 마지막 값을 쓴다.\n  const LIMITS_CACHE = path.join(TMP, 'claude-statusline-last-limits.json');\n  let q = d.quota || d.rate_limits || null;\n  try {\n    if (q && Object.keys(q).length) {\n      fs.writeFileSync(LIMITS_CACHE, JSON.stringify(q));\n    } else {\n      const cached = JSON.parse(fs.readFileSync(LIMITS_CACHE, 'utf8'));\n      const nowSec = Math.floor(Date.now() / 1000);\n      for (const k of Object.keys(cached)) {\n        if (typeof cached[k]?.resets_at === 'number' && cached[k].resets_at <= nowSec) delete cached[k];\n      }\n      q = cached;\n    }\n  } catch (e) {}\n  q = q || {};\n  const lowerModel = modelLabel.toLowerCase();\n  const is3p = lowerModel.includes('claude') || lowerModel.includes('sonnet') || lowerModel.includes('opus') || lowerModel.includes('codex') || lowerModel.includes('gpt');\n\n  let five = null;\n  let week = null;\n\n  if (is3p) {\n    five = q['3p-5h'] || q['3p_5h'] || q.five_hour || q.short_term || q['gemini-5h'];\n    week = q['3p-weekly'] || q['3p_weekly'] || q.weekly || q.seven_day || q['gemini-weekly'];\n  } else {\n    five = q['gemini-5h'] || q['gemini_5h'] || q.five_hour || q.short_term || q['3p-5h'];\n    week = q['gemini-weekly'] || q['gemini_weekly'] || q.weekly || q.seven_day || q['3p-weekly'];\n  }\n\n  let fiveLeft = null;\n  if (five) {\n    if (typeof five.remaining_fraction === 'number') {\n      fiveLeft = Math.round(five.remaining_fraction * 100);\n    } else if (typeof five.remaining_percentage === 'number') {\n      fiveLeft = Math.round(five.remaining_percentage);\n    } else if (typeof five.used_percentage === 'number') {\n      fiveLeft = Math.max(0, Math.min(100, Math.round(100 - five.used_percentage)));\n    }\n  }\n\n  let weekLeft = null;\n  if (week) {\n    if (typeof week.remaining_fraction === 'number') {\n      weekLeft = Math.round(week.remaining_fraction * 100);\n    } else if (typeof week.remaining_percentage === 'number') {\n      weekLeft = Math.round(week.remaining_percentage);\n    } else if (typeof week.used_percentage === 'number') {\n      weekLeft = Math.max(0, Math.min(100, Math.round(100 - week.used_percentage)));\n    }\n  }\n\n  // Claude Code는 resets_at(에포크 초), Antigravity는 reset_in_seconds/reset_time을 준다\n  const secUntil = (w) => {\n    if (!w) return null;\n    if (typeof w.reset_in_seconds === 'number') return w.reset_in_seconds;\n    if (typeof w.resets_at === 'number') {\n      const diff = w.resets_at - Math.floor(Date.now() / 1000);\n      return diff > 0 ? diff : null;\n    }\n    return w.reset_time ? getDiffSec(w.reset_time) : null;\n  };\n  const fiveSec = secUntil(five);\n  const weekSec = secUntil(week);\n\n  const fiveResetStr = formatDuration(fiveSec);\n  const weekResetStr = formatDuration(weekSec);\n\n  // 5h 17% (0h 34m)\n  if (fiveLeft !== null) {\n    let s = `5h ${fiveLeft}%`;\n    if (fiveResetStr) s += ` (${fiveResetStr})`;\n    parts.push(cQuota + s + reset);\n  }\n\n  // weekly 5% (3d 4h 14m)\n  if (weekLeft !== null) {\n    let s = `weekly ${weekLeft}%`;\n    if (weekResetStr) s += ` (${weekResetStr})`;\n    parts.push(cQuota + s + reset);\n  }\n\n  // 3. Context 남은 잔여량% -> context 23%\n  const ctx = d.context_window || d.context || {};\n  let ctxLeft = null;\n  if (typeof ctx.remaining_percentage === 'number') {\n    ctxLeft = Math.round(ctx.remaining_percentage);\n  } else if (typeof ctx.used_percentage === 'number') {\n    ctxLeft = Math.max(0, Math.min(100, Math.round(100 - ctx.used_percentage)));\n  } else if (typeof ctx.remaining_fraction === 'number') {\n    ctxLeft = Math.round(ctx.remaining_fraction * 100);\n  }\n\n  if (ctxLeft !== null) {\n    parts.push(cCtx + `context ${ctxLeft}%` + reset);\n  }\n\n  // 포맷 구분자: | (앞뒤 공백 1칸 포함)\n  const sep = ' ' + cSep + '|' + reset + ' ';\n  process.stdout.write(parts.join(sep));\n});\n";

const dir = path.resolve(opt('--agy-dir') || path.join(os.homedir(), '.gemini', 'antigravity-cli'));
if (!fs.existsSync(dir)) {
  console.error(`agy 설정 폴더가 없습니다: ${dir}  (agy를 한 번 실행한 뒤 다시 하거나 --agy-dir로 지정해 주세요)`);
  process.exit(1);
}
const settingsPath = path.join(dir, 'settings.json');
const scriptPath = path.join(dir, 'statusline.js');
let settings = {};
if (fs.existsSync(settingsPath)) {
  const text = fs.readFileSync(settingsPath, 'utf8').replace(/^﻿/, '');
  if (text.trim()) {
    try { settings = JSON.parse(text); } catch (e) {
      console.error(`settings.json이 올바른 JSON이 아닙니다: ${settingsPath}`);
      process.exit(1);
    }
  }
}

backup(scriptPath);
fs.writeFileSync(scriptPath, SCRIPT);
let command = `node "${slash(scriptPath)}"`;
if (process.platform === 'win32') {
  const cmdPath = path.join(dir, 'statusline.cmd');
  backup(cmdPath);
  fs.writeFileSync(cmdPath, '@echo off\r\nnode "%~dp0statusline.js"\r\n');
  command = cmdPath;
}
backup(settingsPath);
settings.statusLine = { ...(settings.statusLine || {}), type: 'command', command, enabled: true };
fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');

const sample = JSON.stringify({
  model: 'Gemini 3.8 Flash (high)',
  quota: { 'gemini-5h': { remaining_fraction: 0.82, reset_in_seconds: 9000 }, 'gemini-weekly': { remaining_fraction: 0.4, reset_in_seconds: 300000 } },
  context: { remaining_percentage: 77 },
});
const out = execSync(`node "${scriptPath}"`, { input: sample }).toString().replace(/\x1b\[[0-9;]*m/g, '');
console.log(`[agy] 완료: ${settingsPath}`);
console.log(`견본 표시: ${out}`);
console.log('agy에서 다음 질문부터 하단 상태바가 보입니다. 안 보이면 agy를 다시 시작해 주세요.');
