#!/usr/bin/env node
// 서브프로그램 배포 도우미 — 2026-10-23 (Claude Code 윈도우)
// 사용: node scripts/deploy.mjs <폴더>          미배포 대기·작업 중 표만 보여 주고 끝(빌드 없음)
//       node scripts/deploy.mjs <폴더> --go     위 확인 뒤 그 폴더에서 `vercel deploy --prod --yes --scope buylife` 실행(빌드 1회 = 비용) → DB 버전 비교
//       node scripts/deploy.mjs <폴더> --version-only   배포 없이 화면 버전(APP_VERSION)과 DB programs.version 비교만
//       … --set-version   위 비교에서 다르면 운영 DB programs.version을 화면 버전으로 고침(이 옵션이 있을 때만 DB 쓰기)
//       node scripts/deploy.mjs --version-only --all   연결된 모든 프로그램 비교, 어긋난 곳만 보고(DB 안 고침) — 세션 시작 때 1회
//       … --all --fix-map   역량 지도 목록 표의 버전 칸만 DB 운영 버전으로 고침(카드 내용은 안 건드림)
// --go가 끝나면 pending-check --publish로 관리자 첫 화면 숫자(미배포 대기·정리 기록 진행률)도 갱신한다.
// 배포는 비용이므로 --go는 주인님 승인 범위 안에서만 쓴다(CLAUDE.md 비용 사전 보고). 루트(메인 사이트)는 GitHub 푸시 자동 빌드라 대상이 아니다.
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const folder = args.find((a) => !a.startsWith("--"));
const go = args.includes("--go");
const versionOnly = args.includes("--version-only");
const setVersion = args.includes("--set-version");

// --version-only --all: 연결된 모든 프로그램의 화면 버전 ↔ DB 버전 비교, 어긋난 곳만 보고(DB는 고치지 않음 — 고칠 때는 폴더 하나씩 --set-version)
if (versionOnly && args.includes("--all")) {
  const { readdirSync } = await import("node:fs");
  const { appVersion, programSlug, rest, slugFromPrograms } = await import("./program-info.mjs");
  const programs = await rest("programs?select=slug,version,app_url");
  const off = [], skipped = [];
  let checked = 0;
  for (const d of readdirSync(ROOT).sort()) {
    if (!existsSync(join(ROOT, d, ".vercel", "project.json"))) continue;
    const ver = appVersion(d);
    const slug = programSlug(d) ?? slugFromPrograms(d, programs);
    const row = programs.find((p) => p.slug === slug);
    if (!ver || !row) { skipped.push(`${d}(${!ver ? "버전 파일 없음" : `DB 프로그램 없음${slug ? ` — slug ${slug}` : ""}`})`); continue; }
    checked += 1;
    if (row.version !== ver) off.push(`  ⚠ ${d} (${slug}): 화면 ${ver} · DB ${row.version}`);
  }
  console.log(`[버전 전체 비교] 비교 ${checked}개 · 어긋남 ${off.length}개 · 건너뜀 ${skipped.length}개`);
  for (const l of off) console.log(l);
  if (off.length) console.log("  맞추기(폴더 하나씩, 그 폴더를 맡은 세션이 없을 때만): node scripts/deploy.mjs <폴더> --version-only --set-version");
  if (skipped.length) console.log(`  건너뜀: ${skipped.join(", ")}`);

  // 역량 지도(docs/PROGRAM_CAPABILITY_MAP.md) 목록 표의 버전 칸 ↔ DB 운영 버전(지도 갱신 누락 찾기)
  const map = readFileSync(join(ROOT, "docs", "PROGRAM_CAPABILITY_MAP.md"), "utf8").replace(/\r\n/g, "\n");
  const mapOff = [];
  let mapRows = 0;
  for (const m of map.matchAll(/^\| \d+ \| [^|]+\| `([^`]+)` \|[^|]+\| (v\d+\.\d{2}) \|/gm)) {
    mapRows += 1;
    const row = programs.find((p) => p.slug === m[1]);
    if (row && row.version && row.version !== m[2]) mapOff.push(`  ⚠ ${m[1]}: 지도 ${m[2]} · DB ${row.version}`);
  }
  console.log(`[역량 지도 버전 칸] 목록 ${mapRows}줄 · DB와 다름 ${mapOff.length}개`);
  for (const l of mapOff) console.log(l);
  // --fix-map: 목록 표의 버전 칸만 DB 운영 버전으로(카드·다른 칸은 그대로). 읽기 → 바꾸기 → 줄 수·길이 확인 → 쓰기
  if (args.includes("--fix-map") && mapOff.length) {
    const { writeFileSync } = await import("node:fs");
    const file = join(ROOT, "docs", "PROGRAM_CAPABILITY_MAP.md");
    const raw = readFileSync(file, "utf8");
    let fixed = 0;
    const out = raw.replace(/^(\| \d+ \| [^|]+\| `([^`]+)` \|[^|]+\| )(v\d+\.\d{2})( \|)/gm, (all, pre, slug, v, post) => {
      const row = programs.find((p) => p.slug === slug);
      if (!row?.version || row.version === v) return all;
      fixed += 1;
      return `${pre}${row.version}${post}`;
    });
    if (out.split("\n").length !== raw.split("\n").length || Math.abs(out.length - raw.length) > 200) {
      console.log("✖ 지도 고치기 중단 — 줄 수나 길이가 예상과 다릅니다(파일은 그대로).");
      process.exit(1);
    }
    writeFileSync(file, out);
    console.log(`✔ 역량 지도 버전 칸 ${fixed}개를 DB 운영 버전으로 고침(docs/PROGRAM_CAPABILITY_MAP.md — 커밋은 따로)`);
  }
  process.exit(0);
}

if (!folder || folder === "." || folder.includes("..")) {
  console.log("사용: node scripts/deploy.mjs <폴더> [--go]   (루트 메인 사이트는 푸시 자동 빌드라 대상 아님)");
  process.exit(1);
}
const dir = join(ROOT, folder);
const linkFile = join(dir, ".vercel", "project.json");
if (!existsSync(linkFile)) {
  console.log(`✖ ${folder}/.vercel/project.json 이 없습니다 — Vercel 프로젝트에 연결된 폴더가 아닙니다.`);
  process.exit(1);
}
const project = JSON.parse(readFileSync(linkFile, "utf8")).projectName;

/** 화면 버전(APP_VERSION) ↔ 운영 DB programs.version 비교, --set-version이면 맞춤 */
async function syncVersion() {
  const { appVersion, programSlug, rest, slugFromPrograms } = await import("./program-info.mjs");
  const ver = appVersion(folder);
  let slug = programSlug(folder);
  if (!slug) slug = slugFromPrograms(folder, await rest("programs?select=slug,app_url"));
  if (!ver || !slug) { console.log(`  버전 비교 못 함 — 화면 버전 ${ver ?? "없음"}, slug ${slug ?? "없음"}`); return; }
  const [row] = (await rest(`programs?slug=eq.${encodeURIComponent(slug)}&select=version`)) ?? [];
  const dbVer = row?.version ?? "(없음)";
  if (dbVer === ver) { console.log(`  ✔ 버전 일치 — ${slug}: ${ver}`); return; }
  console.log(`  ⚠ 버전 다름 — ${slug}: 화면 ${ver} · DB ${dbVer}`);
  if (!setVersion) { console.log(`    맞추려면: node scripts/deploy.mjs ${folder} --version-only --set-version`); return; }
  await rest(`programs?slug=eq.${encodeURIComponent(slug)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ version: ver }) });
  const [after] = (await rest(`programs?slug=eq.${encodeURIComponent(slug)}&select=version`)) ?? [];
  console.log(`  ✔ DB 버전 갱신 — ${slug}: ${dbVer} → ${after?.version}`);
}

if (versionOnly) {
  console.log(`\n[버전] ${folder}`);
  await syncVersion();
  process.exit(0);
}

// 1) 미배포 대기(이 배포에 함께 나갈 것)
console.log(`\n[1/3] 미배포 대기 — ${folder} (Vercel 프로젝트 ${project})`);
spawnSync(process.execPath, [join(ROOT, "scripts", "pending-check.mjs"), folder], { stdio: "inherit" });

// 2) 작업 중 표 — 다른 세션이 이 폴더를 맡고 있으면 경고
const active = readFileSync(join(ROOT, "docs", "ACTIVE_WORK.md"), "utf8").replace(/\r\n/g, "\n")
  .split("\n").filter((l) => l.startsWith("| ") && l.includes(`\`${folder}/\``));
console.log(`\n[2/3] 작업 중 표(docs/ACTIVE_WORK.md)에서 ${folder}`);
if (active.length) for (const l of active) console.log(`  ⚠ ${l.slice(0, 200)}`);
else console.log("  (줄 없음)");

// 3) 배포
const cmd = ["vercel", "deploy", "--prod", "--yes", "--scope", "buylife"];
if (!go) {
  console.log(`\n[3/3] 배포하지 않았습니다(확인만). 배포하려면: node scripts/deploy.mjs ${folder} --go`);
  console.log(`      실행할 명령: (cd ${folder} && npx ${cmd.join(" ")})`);
  process.exit(0);
}
if (active.some((l) => !/Claude Code\(윈도우\)/.test(l))) {
  console.log("\n✖ 다른 세션이 작업 중인 폴더라 배포하지 않습니다. 그 세션이 끝난 뒤 다시 실행하세요(공동작업 규칙).");
  process.exit(1);
}
console.log(`\n[3/3] 배포 실행: npx ${cmd.join(" ")}  (빌드 1회)`);
const r = spawnSync("npx", cmd, { cwd: dir, stdio: "inherit", shell: process.platform === "win32" });
if (r.status !== 0) { console.log(`✖ 배포 명령 실패(코드 ${r.status}). vercel inspect로 원인을 확인하세요.`); process.exit(r.status ?? 1); }
const ls = spawnSync("npx", ["vercel", "ls", project, "--scope", "buylife"], { cwd: dir, encoding: "utf8", shell: process.platform === "win32" });
const line = (ls.stdout || "").split("\n").find((l) => l.includes(`https://${project}-`)) ?? "";
console.log(`\n최근 배포: ${(line.match(/https:\/\/\S+/) || ["?"])[0]}  ${(line.match(/Ready|Error|Building|Queued|Canceled/) || ["?"])[0]}`);
console.log("\n[버전]");
await syncVersion();
// 관리자 첫 화면 숫자(미배포 대기·정리 기록 진행률) 갱신 — 운영 DB site_settings.ops_overview 한 줄(2026-10-23)
console.log("\n[관리자 화면 숫자 갱신]");
spawnSync(process.execPath, [join(ROOT, "scripts", "pending-check.mjs"), "--publish"], { stdio: "inherit" });
console.log("이어서 할 일: ① (버전이 다르면) --version-only --set-version ② 위 대기 줄을 docs/PENDING_DEPLOYS.md 「내보낸 기록」으로·폴더 대기 표시 정리 ③ 크롬 화면 확인 ④ 인수인계 문서·비용 리포트");
