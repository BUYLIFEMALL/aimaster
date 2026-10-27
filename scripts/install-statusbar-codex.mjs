#!/usr/bin/env node
// Codex 하단 상태바 설치 — 이 파일 하나만 복사해서 실행하면 됩니다(저장소 불필요, 윈도우·맥 공용).
// 표시: [모델] [effort] | 5h [남은%] | weekly [남은%] | context [남은%]  (Codex 내장 상태바 기능)
// 사용: node install-statusbar-codex.mjs [--codex-dir <폴더>]   기본: CODEX_HOME, 없으면 ~/.codex
// config.toml의 [tui]에 두 줄만 넣거나 바꾸고, 다른 설정은 그대로 둡니다. 바꾸기 전에 .bak-<시각>으로 백업합니다.
import fs from 'fs';
import os from 'os';
import path from 'path';

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);

const dir = path.resolve(opt('--codex-dir') || process.env.CODEX_HOME || path.join(os.homedir(), '.codex'));
const file = path.join(dir, 'config.toml');
const want = {
  status_line: '["model", "reasoning", "five-hour-limit", "weekly-limit", "context-remaining"]',
  status_line_use_colors: 'true',
};

fs.mkdirSync(dir, { recursive: true });
const lines = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split(/\r?\n/) : [];
if (fs.existsSync(file)) fs.copyFileSync(file, `${file}.bak-${stamp}`);
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
console.log(`[codex] 완료: ${file}`);
console.log('Codex를 새로 실행하면 하단 상태바가 보입니다.');
