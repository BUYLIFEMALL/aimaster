#!/usr/bin/env node
// .env 파일 깨짐 점검 (2026-11-14 mall-builder/.env.local이 인수인계 메시지 한 줄로 덮어써진 사고 뒤 추가)
// 사용: node scripts/check-env-files.mjs [폴더...]   — 폴더를 안 주면 저장소 1~2단계 아래 모든 .env* 파일
// 값은 절대 출력하지 않는다. `이름=값`·주석(#)·빈 줄이 아닌 줄, 또는 내용이 비었거나 이름이 하나도 없는 파일만 알려 준다.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const SKIP = new Set(["node_modules", ".git", ".next", ".vercel", "dist", "build", "out"]);
const LINE_OK = /^\s*(#.*)?$|^\s*(export\s+)?[A-Za-z_][A-Za-z0-9_.-]*\s*=/;

function envFilesIn(dir, depth) {
  const out = [];
  let names = [];
  try { names = readdirSync(dir); } catch { return out; }
  for (const n of names) {
    if (SKIP.has(n)) continue;
    const p = join(dir, n);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) { if (depth > 0) out.push(...envFilesIn(p, depth - 1)); }
    else if (/^\.env(\..+)?$/.test(n) && !n.endsWith(".example")) out.push(p);
  }
  return out;
}

const targets = process.argv.slice(2);
const files = targets.length ? targets.flatMap((t) => envFilesIn(resolve(t), 0)) : envFilesIn(root, 2);
let bad = 0;
for (const f of files) {
  const lines = readFileSync(f, "utf8").split(/\r?\n/);
  const wrong = lines.map((l, i) => [i + 1, l]).filter(([, l]) => !LINE_OK.test(l));
  const keys = lines.filter((l) => /^\s*(export\s+)?[A-Za-z_][A-Za-z0-9_.-]*\s*=/.test(l)).length;
  if (wrong.length || keys === 0) {
    bad++;
    const where = wrong.slice(0, 3).map(([n, l]) => `${n}번 줄(${l.length}자${/[가-힣]/.test(l) ? ", 한글 문장 포함" : ""})`).join(", ");
    console.log(`✖ ${relative(root, f)} — ${keys === 0 ? "이름=값 줄이 하나도 없음" : ""}${wrong.length ? ` 형식이 아닌 줄: ${where}` : ""}`);
  }
}
console.log(bad ? `\n깨진 .env 파일 ${bad}개 — 다른 세션이 글을 써 넣었을 수 있습니다. 값을 추측해 채우지 말고 주인님께 알리세요.` : `✔ .env 파일 ${files.length}개 모두 정상 형식`);
process.exit(bad ? 1 : 0);
