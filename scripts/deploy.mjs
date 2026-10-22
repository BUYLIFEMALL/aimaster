#!/usr/bin/env node
// 서브프로그램 배포 도우미 — 2026-10-23 (Claude Code 윈도우)
// 사용: node scripts/deploy.mjs <폴더>          미배포 대기·작업 중 표만 보여 주고 끝(빌드 없음)
//       node scripts/deploy.mjs <폴더> --go     위 확인 뒤 그 폴더에서 `vercel deploy --prod --yes --scope buylife` 실행(빌드 1회 = 비용) → DB 버전 비교
//       node scripts/deploy.mjs <폴더> --version-only   배포 없이 화면 버전(APP_VERSION)과 DB programs.version 비교만
//       … --set-version   위 비교에서 다르면 운영 DB programs.version을 화면 버전으로 고침(이 옵션이 있을 때만 DB 쓰기)
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
console.log("이어서 할 일: ① (버전이 다르면) --version-only --set-version ② 위 대기 줄을 docs/PENDING_DEPLOYS.md 「내보낸 기록」으로·폴더 대기 표시 정리 ③ 크롬 화면 확인 ④ 인수인계 문서·비용 리포트");
