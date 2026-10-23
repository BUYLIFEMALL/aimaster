#!/usr/bin/env node
// 맥미니(또는 다른 PC) Claude Code에 「한국어 진행 표시 상기」 훅을 설치한다(2026-10-19 주인님 지시).
// - 상기 스크립트를 ~/.claude/korean-reminder.js 로 복사(공유 폴더가 끊겨도 동작하도록 로컬에 둔다)
// - ~/.claude, CLAUDE_CONFIG_DIR, Orca 계정 폴더(~/Library/Application Support/orca/claude-profiles/*/home)의
//   settings.json 마다 UserPromptSubmit 훅을 하나 추가(이미 있으면 건너뜀, 다른 훅은 그대로, 바꾸기 전 백업)
// 실행: node /Volumes/gt1_mega/Antigravity/AIMaster/scripts/mac-mini/install-korean-reminder.mjs
// 시험: node install-korean-reminder.mjs --home <가짜 홈 폴더>
// 되돌리기: 각 settings.json 옆 settings.json.before-korean-hook 로 되돌리거나 그 훅 한 줄 삭제
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const argHome = process.argv.indexOf("--home");
const HOME = argHome > 0 ? path.resolve(process.argv[argHome + 1]) : os.homedir();
const here = path.dirname(fileURLToPath(import.meta.url));
// 3단 장치(2026-10-19): ① 출력 스타일 Korean(기본 지침에 한국어 규칙) ② 질문마다 상기(UserPromptSubmit) ③ 도구 사용마다 상기(PostToolUse)
const posix = (p) => p.split(path.sep).join("/");
const target = path.join(HOME, ".claude", "korean-reminder.js");
const targetPost = path.join(HOME, ".claude", "korean-reminder-posttool.js");
const command = `node "${posix(target)}"`;
const commandPost = `node "${posix(targetPost)}"`;

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.copyFileSync(path.join(here, "korean-reminder.js"), target);
fs.copyFileSync(path.join(here, "korean-reminder-posttool.js"), targetPost);
console.log(`상기 스크립트 복사: ${target}, ${targetPost}`);

const dirs = new Set([path.join(HOME, ".claude")]);
if (argHome < 0 && process.env.CLAUDE_CONFIG_DIR) dirs.add(process.env.CLAUDE_CONFIG_DIR);
const orca = path.join(HOME, "Library", "Application Support", "orca", "claude-profiles");
if (fs.existsSync(orca)) {
  for (const id of fs.readdirSync(orca)) {
    const home = path.join(orca, id, "home");
    if (fs.existsSync(home)) dirs.add(home);
  }
}

let added = 0;
for (const dir of dirs) {
  const file = path.join(dir, "settings.json");
  if (!fs.existsSync(file)) {
    console.log(`건너뜀(설정 파일 없음): ${file}`);
    continue;
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    console.log(`건너뜀(설정 파일 형식 오류 — 손대지 않음): ${file}`);
    continue;
  }
  // 출력 스타일 파일은 설정 폴더마다 output-styles/ 에 둔다(Orca 계정은 계정 폴더가 사용자 폴더 역할)
  const styleDir = path.join(dir, "output-styles");
  fs.mkdirSync(styleDir, { recursive: true });
  fs.copyFileSync(path.join(here, "korean-output-style.md"), path.join(styleDir, "korean.md"));
  data.hooks ??= {};
  data.hooks.UserPromptSubmit ??= [];
  data.hooks.PostToolUse ??= [];
  const has = (list, name) => list.some((e) => (e.hooks ?? []).some((h) => String(h.command ?? "").includes(name)));
  const changes = [];
  if (!has(data.hooks.UserPromptSubmit, "korean-reminder.js")) {
    data.hooks.UserPromptSubmit.push({ hooks: [{ type: "command", command, timeout: 5 }] });
    changes.push("질문마다 상기");
  }
  if (!has(data.hooks.PostToolUse, "korean-reminder-posttool.js")) {
    data.hooks.PostToolUse.push({ matcher: "*", hooks: [{ type: "command", command: commandPost, timeout: 5 }] });
    changes.push("도구마다 상기");
  }
  if (data.outputStyle !== "Korean") {
    data.outputStyle = "Korean";
    changes.push("출력 스타일 Korean");
  }
  if (!changes.length) {
    console.log(`이미 설치됨: ${file}`);
    continue;
  }
  const backup = `${file}.before-korean-hook`;
  if (!fs.existsSync(backup)) fs.copyFileSync(file, backup);
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
  added++;
  console.log(`추가(${changes.join("·")}): ${file} (백업 ${path.basename(backup)})`);
}
console.log(`완료 — 새로 추가 ${added}곳. 새 Orca 계정을 연결했다면 이 명령을 한 번 더 실행하세요. 출력 스타일은 Claude Code를 다시 시작해야 적용됩니다.`);
