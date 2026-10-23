// Supabase 서비스 키 일괄 교체 (2026-10-09 키 노출 대응). 사용법과 순서는 docs/ERROR_LESSONS.md "서비스 키 노출" 항목 참고.
//
//   node scripts/rotate-supabase-service-key.mjs --dry-run      # 무엇을 바꿀지 목록만 보여준다(아무것도 쓰지 않음)
//   node scripts/rotate-supabase-service-key.mjs                # Vercel 환경변수 + 로컬 .env.local 교체
//   node scripts/rotate-supabase-service-key.mjs --only tarot   # 한 프로젝트만 (시험용)
//   node scripts/rotate-supabase-service-key.mjs --no-local     # Vercel만, 로컬 .env.local은 건드리지 않음
//
// 새 키는 저장소 밖 파일(기본 C:\Users\Administrator\new-supabase-key.txt)에서 읽는다. 키 값은 화면에 출력하지 않고
// 명령줄 인자에도 넣지 않는다(표준 입력으로만 Vercel에 전달). 이 스크립트는 옛 키를 폐기하지 않는다.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const valueOf = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : null);

const DRY = flag("--dry-run");
const NO_LOCAL = flag("--no-local");
const ONLY = valueOf("--only");
const KEY_FILE = valueOf("--key-file") || path.join(os.homedir(), "new-supabase-key.txt");
const SCOPE = "buylife";
const VAR = "SUPABASE_SERVICE_ROLE_KEY";
const OLD_PREFIX = "sb_secret_uRX6U"; // 노출된 옛 키의 앞부분(로컬 파일 교체 대상 식별용, 전체 값 아님)
// 이 프로젝트들은 지금 환경변수가 없다. ai-image-studio만 새로 만들고 나머지는 건드리지 않는다.
const CREATE_IF_MISSING = new Set(["ai-image-studio"]);

function readKey() {
  if (!fs.existsSync(KEY_FILE)) throw new Error(`새 키 파일을 찾지 못했습니다: ${KEY_FILE}`);
  const lines = fs.readFileSync(KEY_FILE, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length !== 1) throw new Error("키 파일에는 키 한 줄만 있어야 합니다.");
  const key = lines[0];
  if (!/^sb_secret_[A-Za-z0-9_\-]{20,}$/.test(key)) throw new Error("키 형식이 올바르지 않습니다(sb_secret_ 로 시작해야 함).");
  if (key.startsWith(OLD_PREFIX)) throw new Error("이 파일의 키는 노출된 옛 키입니다. Supabase에서 새로 만든 키를 넣어 주세요.");
  return key;
}

function vercel(argv, cwd, input) {
  return spawnSync("vercel", argv, { cwd, input, shell: true, encoding: "utf8", windowsHide: true });
}

function targetsFor(dir) {
  const r = vercel(["env", "ls", "--scope", SCOPE], dir);
  const out = `${r.stdout || ""}`;
  // 같은 변수가 대상(Production/Preview/Development)별로 여러 줄일 수 있어 모든 줄을 합친다.
  const lines = out.split(/\r?\n/).filter((l) => l.trim().startsWith(VAR));
  return ["production", "preview", "development"].filter((t) => lines.some((l) => new RegExp(t, "i").test(l)));
}

// 프로젝트 목록: .vercel/project.json 이 있는 폴더(루트 포함)
const entries = [];
if (fs.existsSync(path.join(root, ".vercel", "project.json"))) entries.push({ name: "(root) aimaster", dir: root });
for (const d of fs.readdirSync(root, { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  const pj = path.join(root, d.name, ".vercel", "project.json");
  if (fs.existsSync(pj)) entries.push({ name: d.name, dir: path.join(root, d.name) });
}
const list = ONLY ? entries.filter((e) => e.name === ONLY || e.name.includes(ONLY)) : entries;
if (!list.length) throw new Error("대상 프로젝트가 없습니다.");

const key = readKey();
console.log(`${DRY ? "[미리보기]" : "[실행]"} 대상 프로젝트 ${list.length}개 · 키 파일 확인 완료(값은 출력하지 않습니다)\n`);

let ok = 0;
let skipped = 0;
let failed = 0;
const failures = [];
for (const e of list) {
  let targets = targetsFor(e.dir);
  if (targets.length === 0 && CREATE_IF_MISSING.has(e.name)) targets = ["production", "preview"];
  if (targets.length === 0) {
    console.log(`SKIP  ${e.name}  (이 프로젝트에는 ${VAR}가 없습니다)`);
    skipped++;
    continue;
  }
  if (DRY) {
    console.log(`PLAN  ${e.name}  → ${targets.join(", ")}`);
    continue;
  }
  const results = [];
  let projectOk = true;
  for (const t of targets) {
    const argv = ["env", "add", VAR, t, "--force", "--yes", "--scope", SCOPE];
    if (t !== "development") argv.push("--sensitive");
    const r = vercel(argv, e.dir, `${key}\n`);
    if (r.status === 0) results.push(`${t}:OK`);
    else {
      projectOk = false;
      results.push(`${t}:FAIL`);
      failures.push(`${e.name}/${t}: ${(r.stderr || r.stdout || "").split(/\r?\n/).filter(Boolean).slice(-1)[0] || "오류"}`);
    }
  }
  console.log(`${projectOk ? "OK   " : "FAIL "} ${e.name}  ${results.join("  ")}`);
  projectOk ? ok++ : failed++;
}

if (!DRY && !NO_LOCAL) {
  console.log("\n로컬 .env.local 파일 교체(옛 키가 들어 있는 것만):");
  const locals = [];
  const walk = (dir, depth) => {
    for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
      if (d.name === "node_modules" || d.name === ".next" || d.name === ".git") continue;
      const p = path.join(dir, d.name);
      if (d.isDirectory() && depth < 3) walk(p, depth + 1);
      else if (d.isFile() && /^\.env(\..+)?$/.test(d.name)) locals.push(p);
    }
  };
  walk(root, 0);
  let changed = 0;
  for (const f of locals) {
    const text = fs.readFileSync(f, "utf8");
    const next = text.replace(new RegExp(`^(${VAR}=)(["']?)${OLD_PREFIX}[A-Za-z0-9_\\-]*\\2$`, "gm"), `$1$2${key}$2`);
    if (next !== text) {
      fs.writeFileSync(f, next);
      console.log(`  교체: ${path.relative(root, f)}`);
      changed++;
    }
  }
  if (!changed) console.log("  (교체할 파일 없음)");
}

console.log(`\n${DRY ? "미리보기 끝" : "끝"} — 성공 ${ok} · 실패 ${failed} · 건너뜀 ${skipped}`);
if (failures.length) {
  console.log("\n실패 내역:");
  failures.forEach((f) => console.log(`  - ${f}`));
}
if (!DRY) console.log("\n다음: 환경변수는 '새 배포'부터 적용됩니다. 알려주시면 프로젝트별로 재배포하고 확인합니다. 옛 키는 모두 확인된 뒤에 폐기하세요.");
process.exit(failed ? 1 : 0);
