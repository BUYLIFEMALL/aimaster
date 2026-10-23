#!/usr/bin/env node
// 맥미니(또는 다른 PC) Claude Code 상태바에 「세션 시작 직후 5h·weekly 빈칸」 보완을 설치한다(2026-10-20 주인님 지시).
// - 보충 부품을 ~/.claude/statusline-limits-shim.cjs 로 복사(공유 폴더가 끊겨도 동작하도록 로컬에 둔다)
// - ~/.claude/statusline-extra.js 와 백업 .good 맨 앞에 그 부품을 불러오는 한 줄을 붙인다(이미 있으면 건너뜀)
//   원래 스크립트 내용은 바꾸지 않으며, 바꾸기 전 statusline-extra.js.before-limits-shim 백업
// 실행: node /Volumes/gt1_mega/Antigravity/AIMaster/scripts/mac-mini/install-statusline-limits.mjs
// 시험: node install-statusline-limits.mjs --home <가짜 홈 폴더>
// 되돌리기: cp ~/.claude/statusline-extra.js.before-limits-shim ~/.claude/statusline-extra.js (.good 도 같은 방법)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const argHome = process.argv.indexOf("--home");
const HOME = argHome > 0 ? path.resolve(process.argv[argHome + 1]) : os.homedir();
const here = path.dirname(fileURLToPath(import.meta.url));
const claudeDir = path.join(HOME, ".claude");
const shim = path.join(claudeDir, "statusline-limits-shim.cjs");
const posix = (p) => p.split(path.sep).join("/");
const MARK = "statusline-limits-shim.cjs";

const script = path.join(claudeDir, "statusline-extra.js");
if (!fs.existsSync(script)) {
  console.error(`상태바 스크립트가 없습니다: ${script}\n먼저 docs/CLAUDE_STATUSBAR.md 5절대로 상태바를 설치해 주세요.`);
  process.exit(1);
}

fs.copyFileSync(path.join(here, "statusline-limits-shim.cjs"), shim);
console.log(`보충 부품 복사: ${shim}`);

let changed = 0;
for (const file of [script, script + ".good"]) {
  if (!fs.existsSync(file)) { console.log(`건너뜀(파일 없음): ${file}`); continue; }
  const text = fs.readFileSync(file, "utf8");
  if (text.includes(MARK)) { console.log(`이미 적용됨: ${file}`); continue; }
  // 첫 줄이 #! 이면 그 다음 줄에 붙인다. ESM(import/export)이면 import, 아니면 require
  const esm = /^\s*(import\s|export\s)/m.test(text);
  const line = esm
    ? `import "${pathToFileURL(shim).href}"; // 세션 시작 직후 5h·weekly 보충(2026-10-20)\n`
    : `require("${posix(shim)}"); // 세션 시작 직후 5h·weekly 보충(2026-10-20)\n`;
  const shebang = text.startsWith("#!") ? text.slice(0, text.indexOf("\n") + 1) : "";
  if (file === script) fs.copyFileSync(file, file + ".before-limits-shim");
  fs.writeFileSync(file, shebang + line + text.slice(shebang.length));
  changed += 1;
  console.log(`적용: ${file} (${esm ? "ESM" : "CommonJS"})`);
}

console.log(changed ? "\n완료했습니다. Claude Code를 새로 시작하면 첫 화면부터 5h·weekly가 보입니다(마지막으로 받은 한도 값, 초기화 시각이 지난 값은 표시 안 함)." : "\n바꿀 것이 없습니다.");
