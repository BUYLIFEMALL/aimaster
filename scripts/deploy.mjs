#!/usr/bin/env node
// 서브프로그램 배포 도우미 — 2026-10-23 (Claude Code 윈도우)
// 사용: node scripts/deploy.mjs <폴더>          미배포 대기·작업 중 표만 보여 주고 끝(빌드 없음)
//       node scripts/deploy.mjs <폴더> --go [--owner "<작업 중 표 내 줄 일부>"]     위 확인 뒤 그 폴더에서 `vercel deploy --prod --yes --scope buylife` 실행(빌드 1회 = 비용) → DB 버전 비교
//       node scripts/deploy.mjs <폴더> --version-only   배포 없이 화면 버전(APP_VERSION)과 DB programs.version 비교만
//       … --set-version   위 비교에서 다르면 운영 DB programs.version을 화면 버전으로 고침(이 옵션이 있을 때만 DB 쓰기)
//       node scripts/deploy.mjs --version-only --all   연결된 모든 프로그램 비교, 어긋난 곳만 보고(DB 안 고침) — 세션 시작 때 1회
//       … --all --fix-map   역량 지도 목록 표의 버전 칸만 DB 운영 버전으로 고침(카드 내용은 안 건드림)
// --go가 끝나면 pending-check --publish로 관리자 첫 화면 숫자(미배포 대기·정리 기록 진행률)도 갱신한다.
// 배포는 비용이므로 --go는 주인님 승인 범위 안에서만 쓴다(CLAUDE.md 비용 사전 보고). 루트(메인 사이트)는 GitHub 푸시 자동 빌드라 대상이 아니다.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
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
  const programs = await rest("programs?select=slug,version,app_url,is_active");
  const off = [], skipped = [];
  let checked = 0;
  for (const d of readdirSync(ROOT).sort()) {
    if (!existsSync(join(ROOT, d, ".vercel", "project.json"))) continue;
    const ver = appVersion(d);
    const slug = programSlug(d) ?? slugFromPrograms(d, programs);
    const row = programs.find((p) => p.slug === slug);
    // 비공개 + 버전 파일 없음 = 병합으로 은퇴하고 「옛 주소 전달」 앱만 남은 폴더(지우면 안 됨 — AIMaster_backup/retired-programs/README.md)
    if (!ver && row && row.is_active === false) { skipped.push(`${d}(은퇴·옛 주소 전달)`); continue; }
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

  // 지도 카드(#### 이름 (`slug`)) 「주소·폴더:」의 첫 주소 ↔ DB programs.app_url (옛 vercel.app 주소 찾기, 2026-10-23)
  const addrOff = [];
  for (const m of map.matchAll(/^#### [^\n]*\(`([^`]+)`\)\n- 주소·폴더: (https?:\/\/[^\s·]+)/gm)) {
    const row = programs.find((p) => p.slug === m[1]);
    const dbUrl = (row?.app_url ?? "").replace(/\/+$/, "");
    if (dbUrl && m[2].replace(/\/+$/, "") !== dbUrl) addrOff.push({ slug: m[1], card: m[2], db: dbUrl });
  }
  console.log(`[역량 지도 카드 주소] DB app_url과 다름 ${addrOff.length}개`);
  for (const a of addrOff) console.log(`  ⚠ ${a.slug}: 카드 ${a.card} · DB ${a.db}`);
  // --fix-map: 목록 표의 버전 칸만 DB 운영 버전으로(카드·다른 칸은 그대로). 읽기 → 바꾸기 → 줄 수·길이 확인 → 쓰기
  if (args.includes("--fix-map") && (mapOff.length || addrOff.length)) {
    const { writeFileSync } = await import("node:fs");
    const file = join(ROOT, "docs", "PROGRAM_CAPABILITY_MAP.md");
    let raw = readFileSync(file, "utf8");
    // 카드 주소도 DB app_url로(같은 카드의 「주소·폴더:」 첫 주소만)
    for (const a of addrOff) {
      const head = raw.match(new RegExp("^#### [^\\n]*\\(`" + a.slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "`\\)\\r?\\n- 주소·폴더: ", "m"));
      if (!head) continue;
      const at = head.index + head[0].length;
      if (raw.startsWith(a.card, at)) raw = raw.slice(0, at) + a.db + raw.slice(at + a.card.length);
    }
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

  // 지도 카드 본문 버전(「주소·폴더: … · `폴더/` · vX.YY」) ↔ 그 폴더 화면 버전 — 5단계 이상 뒤처진 카드는 내용 갱신 필요(보고만, 글은 안 고침, 2026-10-23)
  const num = (v) => { const m = /^v(\d+)\.(\d{2})$/.exec(v ?? ""); return m ? Number(m[1]) * 100 + Number(m[2]) : null; };
  const stale = [];
  for (const m of map.matchAll(/^#### [^\n]*\(`([^`]+)`\)\n- 주소·폴더: [^\n]*?`([^`]+?)\/?` · (v\d+\.\d{2})/gm)) {
    const now = appVersion(m[2]);
    if (num(now) !== null && num(m[3]) !== null && num(now) - num(m[3]) >= 5) stale.push(`  • ${m[1]}: 카드 ${m[3]} · 지금 ${now} (${m[2]}/AGENTS.md 버전 기록 보고 카드의 장점·단점·최근 추가 갱신)`);
  }
  console.log(`[역량 지도 카드 내용] 5단계 이상 뒤처진 카드 ${stale.length}개`);
  for (const l of stale) console.log(l);

  // 30일 정리 기록 확인(2026-10-23): 코드로 기록을 남기는 프로그램 → 최근 7일 기록 있음 / 배포 대기(PENDING_DEPLOYS에 정리 기록 줄) / 배포됐는데 기록 없음
  try {
    const { cleanupPrograms, slugFromPrograms } = await import("./program-info.mjs");
    const logging = cleanupPrograms().filter((c) => c.logs).map((c) => ({ ...c, slug: c.slug ?? slugFromPrograms(c.folder, programs) }));
    const pendingText = readFileSync(join(ROOT, "docs", "PENDING_DEPLOYS.md"), "utf8").split(/\r?\n/).filter((l) => l.startsWith("| `") && /cleanup_expired|정리 기록/.test(l));
    const pendingFolders = new Set(pendingText.map((l) => (l.match(/^\| `([^`]+)`/) || [])[1]));
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const recent = await rest(`usage_logs?select=program_id&action=eq.cleanup_expired&created_at=gte.${since}&limit=5000`);
    const allProgs = await rest("programs?select=id,slug");
    const seen = new Set((recent ?? []).map((r) => allProgs.find((p) => p.id === r.program_id)?.slug).filter(Boolean));
    const has = logging.filter((c) => seen.has(c.slug));
    const waiting = logging.filter((c) => !seen.has(c.slug) && pendingFolders.has(c.folder));
    const silent = logging.filter((c) => !seen.has(c.slug) && !pendingFolders.has(c.folder));
    console.log(`[30일 정리 기록] 코드로 기록 ${logging.length}곳 · 최근 7일 기록 있음 ${has.length} · 배포 대기 ${waiting.length} · 배포됐는데 7일간 기록 없음 ${silent.length}`);
    if (silent.length) console.log(`  ⚠ ${silent.map((c) => c.folder).join(", ")} — 지울 것이 없었을 수도 있음. 그 프로그램 정리 작업 응답의 loggedOwners·Vercel 로그 「[cleanup]」로 확인`);
  } catch (e) { console.log(`[30일 정리 기록] 확인 실패 — ${e.message}`); }

  // 최근 24시간 공용 문서 되돌림 감사(check-shared-doc-reverts --audit) — 지금 HEAD에서 사라진 줄이 있을 때만 자세히(2026-10-23)
  const au = spawnSync(process.execPath, [join(ROOT, "scripts", "check-shared-doc-reverts.mjs"), "--audit", "24", "--json"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  try {
    const a = JSON.parse(au.stdout.trim().split("\n").pop());
    console.log(`[공용 문서 되돌림] 최근 ${a.hours}시간 커밋 ${a.commits}개 · 의심 ${a.suspect}건 · 지금 사라진 줄 있는 것 ${a.lost.length}건`);
    for (const l of a.lost) console.log(`  ⚠ ${l.sha} ${l.file} −${l.lines}줄 | ${l.msg}\n      예: ${l.sample}`);
    if (a.lost.length) console.log("  원문: node scripts/check-shared-doc-reverts.mjs --audit 24 --lost  (의도한 정리인지 확인 후 필요하면 다음 커밋으로 되살림)");
  } catch { console.log("[공용 문서 되돌림] 감사 실패 — node scripts/check-shared-doc-reverts.mjs --audit 24 로 직접 확인"); }
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
  if (!ver || !slug) { console.log(`  버전 비교 못 함 — 화면 버전 ${ver ?? "없음"}, slug ${slug ?? "없음"}`); return null; }
  const [row] = (await rest(`programs?slug=eq.${encodeURIComponent(slug)}&select=version`)) ?? [];
  const dbVer = row?.version ?? "(없음)";
  if (dbVer === ver) { console.log(`  ✔ 버전 일치 — ${slug}: ${ver}`); return { slug, ver, db: dbVer }; }
  console.log(`  ⚠ 버전 다름 — ${slug}: 화면 ${ver} · DB ${dbVer}`);
  if (!setVersion) { console.log(`    맞추려면: node scripts/deploy.mjs ${folder} --version-only --set-version`); return { slug, ver, db: dbVer }; }
  await rest(`programs?slug=eq.${encodeURIComponent(slug)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ version: ver }) });
  const [after] = (await rest(`programs?slug=eq.${encodeURIComponent(slug)}&select=version`)) ?? [];
  console.log(`  ✔ DB 버전 갱신 — ${slug}: ${dbVer} → ${after?.version}`);
  return { slug, ver, db: after?.version ?? dbVer };
}

/** 역량 지도에서 이 프로그램 한 줄만 새 버전으로: 목록 표 버전 칸 + 카드 「주소·폴더: … · vX.YY」(DB가 화면 버전과 같을 때만, 2026-10-23) */
function fixMapRow(slug, ver) {
  const file = join(ROOT, "docs", "PROGRAM_CAPABILITY_MAP.md");
  const raw = readFileSync(file, "utf8");
  const esc = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let n = 0;
  let out = raw.replace(new RegExp("^(\\| \\d+ \\| [^|]+\\| `" + esc + "` \\|[^|]+\\| )(v\\d+\\.\\d{2})( \\|)", "m"), (all, a, v, b) => (v === ver ? all : (n++, a + ver + b)));
  out = out.replace(new RegExp("^(#### [^\\n]*\\(`" + esc + "`\\)\\r?\\n- 주소·폴더: [^\\n]*?` · )(v\\d+\\.\\d{2})", "m"), (all, a, v) => (v === ver ? all : (n++, a + ver)));
  if (!n) { console.log(`  역량 지도 ${slug}: 이미 ${ver}(또는 줄 없음) — 고칠 것 없음`); return; }
  if (out.split("\n").length !== raw.split("\n").length) { console.log("  ✖ 역량 지도 고치기 중단 — 줄 수가 달라짐(파일 그대로)"); return; }
  writeFileSync(file, out);
  console.log(`  ✔ 역량 지도 ${slug}: ${n}곳을 ${ver}로(목록 표 버전 칸·카드 버전) — 아래 도우미 커밋에 함께`);
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
// 작업 중 표에 이 폴더 줄이 있으면 배포하지 않는다. 내 줄이면 --owner "<내 줄의 작업 설명 일부>"로 표시(같은 장비의 다른 세션과 구별, 2026-10-23)
const ownerArg = args.includes("--owner") ? args[args.indexOf("--owner") + 1] : null;
if (active.some((l) => !(ownerArg && l.includes(ownerArg)))) {
  console.log("\n✖ 다른 세션이 작업 중인 폴더라 배포하지 않습니다. 그 세션이 끝난 뒤 다시 실행하세요(공동작업 규칙).");
  console.log("  내 줄이라면: --owner \"<작업 중 표의 내 줄 작업 설명 일부>\"를 붙여 다시 실행");
  process.exit(1);
}
// 배포 뒤 대기 줄 정리·인수인계를 안전 커밋 도우미로 하도록, 고치기 전 기준 사본을 지금 떠 둠(2026-10-23 — 배포 기록 커밋의 되돌림 방지)
const docAs = `deploy-${folder.replace(/[^\w.-]/g, "_")}`;
spawnSync(process.execPath, [join(ROOT, "scripts", "safe-commit.mjs"), "--begin", "docs/PENDING_DEPLOYS.md", "docs/HANDOFF.md", "docs/PROGRAM_CAPABILITY_MAP.md", "--as", docAs], { stdio: "inherit" });
console.log(`\n[3/3] 배포 실행: npx ${cmd.join(" ")}  (빌드 1회)`);
const r = spawnSync("npx", cmd, { cwd: dir, stdio: "inherit", shell: process.platform === "win32" });
if (r.status !== 0) { console.log(`✖ 배포 명령 실패(코드 ${r.status}). vercel inspect로 원인을 확인하세요.`); process.exit(r.status ?? 1); }
const ls = spawnSync("npx", ["vercel", "ls", project, "--scope", "buylife"], { cwd: dir, encoding: "utf8", shell: process.platform === "win32" });
const line = (ls.stdout || "").split("\n").find((l) => l.includes(`https://${project}-`)) ?? "";
console.log(`\n최근 배포: ${(line.match(/https:\/\/\S+/) || ["?"])[0]}  ${(line.match(/Ready|Error|Building|Queued|Canceled/) || ["?"])[0]}`);
console.log("\n[버전]");
const vr = await syncVersion();
// 역량 지도 이 프로그램 한 줄(목록 표·카드 버전) — DB가 화면 버전과 같을 때만(다른 세션이 배포 뒤 지도를 안 고쳐 어긋나던 문제, 2026-10-23)
if (vr && vr.db === vr.ver) fixMapRow(vr.slug, vr.ver);
// 관리자 첫 화면 숫자(미배포 대기·정리 기록 진행률) 갱신 — 운영 DB site_settings.ops_overview 한 줄(2026-10-23)
console.log("\n[관리자 화면 숫자 갱신]");
spawnSync(process.execPath, [join(ROOT, "scripts", "pending-check.mjs"), "--publish"], { stdio: "inherit" });
console.log("이어서 할 일: ① (버전이 다르면) --version-only --set-version ② 위 대기 줄을 docs/PENDING_DEPLOYS.md 「내보낸 기록」으로·폴더 대기 표시 정리 ③ 크롬 화면 확인 ④ 인수인계 문서·비용 리포트");
console.log(`②·④ 문서 커밋은 일반 git commit 말고 (기준 사본은 이미 떠 둠):\n  node scripts/safe-commit.mjs "<메시지>" docs/PENDING_DEPLOYS.md docs/HANDOFF.md docs/PROGRAM_CAPABILITY_MAP.md --as ${docAs} --push`);
