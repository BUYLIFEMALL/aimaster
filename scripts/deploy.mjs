#!/usr/bin/env node
// 서브프로그램 배포 도우미 — 2026-10-23 (Claude Code 윈도우)
// 사용: node scripts/deploy.mjs <폴더>          미배포 대기·작업 중 표만 보여 주고 끝(빌드 없음)
//       node scripts/deploy.mjs <폴더> --go [--owner "<작업 중 표 내 줄 일부>"]     위 확인 뒤 그 폴더에서 `vercel deploy --prod --yes --scope buylife` 실행(빌드 1회 = 비용) → DB 버전 비교
//       node scripts/deploy.mjs <폴더> --version-only   배포 없이 화면 버전(APP_VERSION)과 DB programs.version 비교만
//       … --set-version   위 비교에서 다르면 운영 DB programs.version을 화면 버전으로 고침(이 옵션이 있을 때만 DB 쓰기)
//       node scripts/deploy.mjs --version-only --all   연결된 모든 프로그램 비교, 어긋난 곳만 보고(DB 안 고침) — 세션 시작 때 1회
//       … --all --fix-map   프로그램 비교표 목록 표의 버전 칸만 DB 운영 버전으로 고침(카드 내용은 안 건드림)
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
  // 점검 출력을 모았다가 끝에 「⚠」 줄만 항목 이름과 함께 맨 위에 요약하고, 그 아래 전체를 그대로 보인다(2026-10-23)
  const logBuf = [], realLog = console.log;
  console.log = (...a) => logBuf.push(a.join(" "));
  const flushLog = () => {
    console.log = realLog;
    const all = logBuf.join("\n").split("\n");
    const warns = [];
    let section = "";
    for (const l of all) {
      if (l.startsWith("[")) section = l.slice(0, l.indexOf("]") + 1);
      else if (l.trimStart().startsWith("⚠") || l.includes("• ⚠")) warns.push(`  ${section} ${l.trim().replace(/^•\s*/, "")}`);
    }
    // 저장소 안전(공용 스테이징·축소·안전장치·되돌림)은 다른 ⚠에 묻히지 않게 맨 위에 따로(2026-10-23)
    const SAFETY = /공용 스테이징|축소|안전장치|되돌림/;
    const safety = warns.filter((w) => SAFETY.test(w)), rest = warns.filter((w) => !SAFETY.test(w));
    const cut = (w) => (w.length > 220 ? `${w.slice(0, 220)}…` : w);
    realLog(safety.length ? `[🚨 저장소 안전] ${safety.length}건 — 커밋·푸시 전에 먼저 확인(루트 CLAUDE.md 최상단)` : "[저장소 안전] 이상 없음");
    for (const w of safety) realLog(cut(w));
    realLog(`[⚠ 요약] 그 밖에 확인할 것 ${rest.length}건${rest.length ? "" : " — 모두 정상"}`);
    for (const w of rest) realLog(cut(w));
    realLog("─".repeat(40));
    for (const l of all) realLog(l);
    // 긴 출력 뒤에도 판단이 바로 보이게 맨 끝에 한 줄 결론(2026-10-23)
    realLog("─".repeat(40));
    // 「지금」 위험(스테이징이 지금 줄어 있음·안전장치 고장)만 보류 — 지난 축소 이력·되돌림 의심은 확인 필요일 뿐 모든 세션을 멈추지 않는다
    const blocking = safety.filter((w) => /축소 감지|고장/.test(w));
    realLog(blocking.length
      ? `🚨 결론: 저장소 지금 위험 ${blocking.length}건 — 커밋·푸시 보류하고 주인님께(루트 CLAUDE.md 최상단)`
      : safety.length
        ? `✅ 결론: 커밋·푸시 진행 가능 — 저장소 안전 「확인 필요」 ${safety.length}건(지난 축소 이력·되돌림 의심, 자기 세션 커밋이면 확인)${rest.length ? ` · 그 밖 ${rest.length}건은 각 담당` : ""}`
        : `✅ 결론: 저장소 안전 이상 없음 — 커밋·푸시 진행 가능${rest.length ? ` (그 밖 ${rest.length}건은 각 담당 확인)` : ""}`);
  };
  process.on("exit", () => { if (console.log !== realLog) flushLog(); }); // 중간 오류·조기 종료 때도 모은 출력을 보인다
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

  // 프로그램 비교표(docs/PROGRAM_CAPABILITY_MAP.md) 목록 표의 버전 칸 ↔ DB 운영 버전(지도 갱신 누락 찾기)
  const map = readFileSync(join(ROOT, "docs", "PROGRAM_CAPABILITY_MAP.md"), "utf8").replace(/\r\n/g, "\n");
  const mapOff = [];
  let mapRows = 0;
  for (const m of map.matchAll(/^\| \d+ \| [^|]+\| `([^`]+)` \|[^|]+\| (v\d+\.\d{2}) \|/gm)) {
    mapRows += 1;
    const row = programs.find((p) => p.slug === m[1]);
    if (row && row.version && row.version !== m[2]) mapOff.push(`  ⚠ ${m[1]}: 지도 ${m[2]} · DB ${row.version}`);
  }
  console.log(`[프로그램 비교표 버전 칸] 목록 ${mapRows}줄 · DB와 다름 ${mapOff.length}개`);
  for (const l of mapOff) console.log(l);

  // 지도 카드(#### 이름 (`slug`)) 「주소·폴더:」의 첫 주소 ↔ DB programs.app_url (옛 vercel.app 주소 찾기, 2026-10-23)
  const addrOff = [];
  for (const m of map.matchAll(/^#### [^\n]*\(`([^`]+)`\)\r?\n(?:(?!#### )[^\n]*\r?\n)*?- 주소·폴더: (https?:\/\/[^\s·]+)/gm)) {
    const row = programs.find((p) => p.slug === m[1]);
    const dbUrl = (row?.app_url ?? "").replace(/\/+$/, "");
    if (dbUrl && m[2].replace(/\/+$/, "") !== dbUrl) addrOff.push({ slug: m[1], card: m[2], db: dbUrl });
  }
  console.log(`[프로그램 비교표 카드 주소] DB app_url과 다름 ${addrOff.length}개`);
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
    console.log(`✔ 프로그램 비교표 버전 칸 ${fixed}개를 DB 운영 버전으로 고침(docs/PROGRAM_CAPABILITY_MAP.md — 커밋은 따로)`);
  }

  // 지도 카드 본문 버전(「주소·폴더: … · `폴더/` · vX.YY」) ↔ 그 폴더 화면 버전 — 5단계 이상 뒤처진 카드는 내용 갱신 필요, 10단계 이상은 ⚠로 맨 위 요약에도(보고만, 글은 안 고침, 2026-10-23)
  const num = (v) => { const m = /^v(\d+)\.(\d{2})$/.exec(v ?? ""); return m ? Number(m[1]) * 100 + Number(m[2]) : null; };
  const stale = [];
  for (const m of map.matchAll(/^#### [^\n]*\(`([^`]+)`\)\r?\n(?:(?!#### )[^\n]*\r?\n)*?- 주소·폴더: [^\n]*?`([^`]+?)\/?` · (v\d+\.\d{2})/gm)) {
    const now = appVersion(m[2]);
    if (num(now) !== null && num(m[3]) !== null && num(now) - num(m[3]) >= 5) stale.push(`  ${num(now) - num(m[3]) >= 10 ? "⚠" : "•"} ${m[1]}: 카드 ${m[3]} · 지금 ${now} (${m[2]}/AGENTS.md 버전 기록 보고 카드의 장점·단점·최근 추가 갱신)`);
  }
  console.log(`[프로그램 비교표 카드 내용] 5단계 이상 뒤처진 카드 ${stale.length}개 (10단계 이상 ⚠ ${stale.filter((l) => l.startsWith("  ⚠")).length}개)`);
  for (const l of stale) console.log(l);

  // 메인 사이트 — 다음 메인 빌드 때 할 일(docs/PENDING_DEPLOYS.md, 코드 미작성) — 메인 빌드 때 한곳에서 보고 묶기(2026-10-23)
  try {
    const pd = readFileSync(join(ROOT, "docs", "PENDING_DEPLOYS.md"), "utf8").replace(/\r\n/g, "\n");
    const a = pd.indexOf("## 메인 사이트 — 다음 메인 빌드 때 할 일");
    const sec = a < 0 ? "" : pd.slice(a, pd.indexOf("\n## ", a + 5) > 0 ? pd.indexOf("\n## ", a + 5) : undefined);
    const todos = sec.split("\n").filter((l) => l.startsWith("| ") && !l.startsWith("| 할 일") && !l.startsWith("|---")).map((l) => { const c = l.split("|").map((x) => x.trim()); return c[2] === "급함" ? `⚠ 급함 — ${c[1]}` : c[1]; });
    console.log(`[메인 사이트 할 일] ${todos.length}개${todos.some((t) => t.startsWith("⚠ 급함")) ? " (급함 있음 — 승인 뒤 바로 빌드)" : ""} — 메인 빌드 1회(사전 승인)로 묶어 내보내기`);
    for (const t of todos) console.log(`  • ${t}`);
  } catch (e) { console.log(`[메인 사이트 할 일] 확인 실패 — ${e.message}`); }

  // 휴대폰 폭 계정 표시 점검(scripts/check-mobile-account.mjs, 코드 읽기) — 요약 한 줄과 후보만(2026-10-23)
  {
    const mc = spawnSync(process.execPath, [join(ROOT, "scripts", "check-mobile-account.mjs")], { encoding: "utf8" });
    const lines = (mc.stdout || "").split(/\r?\n/).filter((l) => l.startsWith("[") || l.startsWith("  ⚠"));
    for (const l of lines) console.log(l);
  }

  // 안전 커밋 도우미 기준 사본 중 12시간 넘게 남은 것(--begin 뒤 커밋 없이 끝났거나 인계가 필요한 작업, 2026-10-23)
  try {
    const { readdirSync, statSync } = await import("node:fs");
    const base = join(ROOT, ".git", "safe-commit");
    const old = [];
    for (const as of existsSync(base) ? readdirSync(base) : []) {
      if (as.startsWith(".")) continue;
      for (const f of readdirSync(join(base, as))) {
        const h = (Date.now() - statSync(join(base, as, f)).mtimeMs) / 3_600_000;
        if (h > 12) old.push(`${as}: ${f.replace(/__/g, "/").replace(/\.base$/, "")} (${Math.round(h)}시간)`);
      }
    }
    console.log(`[안전 커밋 기준 사본] 12시간 넘게 남은 것 ${old.length}개`);
    for (const l of old) console.log(`  ⚠ ${l} — 그 세션(이름)이 끝났다면 작업 파일을 확인해 커밋하거나 .git/safe-commit/<이름>/ 사본을 지우기`);
  } catch (e) { console.log(`[안전 커밋 기준 사본] 확인 실패 — ${e.message}`); }

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
    // 아직 기록 안 하는 곳: 정리 코드가 지우는 표와 그 표의 user_id 유무(운영 DB 칸 목록) — 다음 묶음 대상 고르기용(2026-10-23)
    const { tableColumns } = await import("./program-info.mjs");
    const notYet = cleanupPrograms().filter((c) => !c.logs);
    if (notYet.length) console.log(`  아직 기록 안 하는 ${notYet.length}곳 — 지우는 표와 user_id:`);
    for (const c of notYet) {
      const tables = [...new Set(c.routes.flatMap((f) => [...readFileSync(f, "utf8").matchAll(/\.from\(\s*["'`]([a-z0-9_]+)["'`]\s*\)/g)].map((m) => m[1])))].filter((t) => t !== "programs" && t !== "usage_logs");
      const parts = [];
      for (const t of tables) {
        const { columns } = await tableColumns(t);
        parts.push(`${t}(${columns ? (columns.some((x) => x.name === "user_id") ? "user_id 있음" : "user_id 없음") : "DB에 없음·저장소 버킷일 수 있음"})`);
      }
      console.log(`    • ${c.folder}: ${parts.join(", ") || "정리 코드 안에 표 이름 없음(다른 파일 함수에서 지움)"}`);
    }
  } catch (e) { console.log(`[30일 정리 기록] 확인 실패 — ${e.message}`); }

  // 공용 스테이징 블랙박스 기록(2026-10-23) — 세션 시작마다 index 크기·항목 수 한 줄, 축소면 ⚠와 직전 기록(scripts/index-watch.mjs)
  {
    const iw = spawnSync(process.execPath, [join(ROOT, "scripts", "index-watch.mjs"), "session-check"], { cwd: ROOT, encoding: "utf8" });
    for (const l of `${iw.stdout || ""}${iw.stderr || ""}`.trim().split("\n").filter(Boolean)) console.log(l.startsWith("⚠") || l.startsWith("[") ? l : `  ${l.trim()}`);
  }

  // 커밋·푸시 안전장치 자기 시험(2026-10-23) — pre-commit이 줄 뒤섞임으로 아무 검사 없이 통과하던 고장(04b887892)을 반나절 몰랐던 일 재발 방지.
  // 막혀야 하는 경우를 실제 훅 파일로 흉내 낸다: pre-commit = 빈 임시 스테이징(공용 .git/index는 안 건드림), pre-push = 알려진 대량 삭제 커밋 c2e7c4db2.
  {
    const { tmpdir } = await import("node:os");
    const { rmSync } = await import("node:fs");
    const hookDir = join(ROOT, ".git", "hooks");
    const execPath = (spawnSync("git", ["--exec-path"], { encoding: "utf8" }).stdout || "").trim();
    const shCandidates = ["sh", execPath && join(execPath, "..", "..", "..", "usr", "bin", "sh.exe")].filter(Boolean);
    const sh = shCandidates.find((c) => spawnSync(c, ["-c", "exit 0"]).status === 0);
    const out = [];
    if (!sh) out.push("  확인 불가 — sh를 찾지 못함");
    else {
      const pc = join(hookDir, "pre-commit");
      if (!existsSync(pc)) out.push("  ⚠ pre-commit 훅 없음 — node scripts/git-hooks/install.mjs");
      else {
        const idx = join(tmpdir(), `aimaster-hooktest-${process.pid}`);
        const env = { ...process.env, GIT_INDEX_FILE: idx };
        delete env.AIMASTER_ALLOW_MASS_DELETE;
        spawnSync("git", ["read-tree", "--empty"], { cwd: ROOT, env });
        const r = spawnSync(sh, [pc], { cwd: ROOT, env, encoding: "utf8" });
        try { rmSync(idx, { force: true }); } catch { /* 임시 파일 */ }
        if (r.status === 0) out.push("  ⚠ pre-commit 고장 — 빈 스테이징(파일 전부 삭제)을 통과시킴. `sh -x .git/hooks/pre-commit`으로 확인, 원본 scripts/git-hooks/pre-commit");
      }
      const pp = join(hookDir, "pre-push");
      const bad = (spawnSync("git", ["rev-parse", "--verify", "-q", "c2e7c4db2^{commit}"], { cwd: ROOT, encoding: "utf8" }).stdout || "").trim();
      if (!existsSync(pp)) out.push("  ⚠ pre-push 훅 없음 — node scripts/git-hooks/install.mjs");
      else if (bad) {
        const parent = (spawnSync("git", ["rev-parse", `${bad}^`], { cwd: ROOT, encoding: "utf8" }).stdout || "").trim();
        const env = { ...process.env }; delete env.AIMASTER_ALLOW_MASS_DELETE;
        const r = spawnSync(sh, [pp, "origin", "x"], { cwd: ROOT, env, encoding: "utf8", input: `refs/heads/master ${bad} refs/heads/master ${parent}\n` });
        if (r.status === 0) out.push("  ⚠ pre-push 고장 — 알려진 대량 삭제 커밋 c2e7c4db2를 통과시킴. `sh -x .git/hooks/pre-push`로 확인");
      }
    }
    console.log(`[커밋·푸시 안전장치 자기 시험] ${out.length ? "문제 있음" : "pre-commit·pre-push 모두 대량 삭제를 막음"}`);
    for (const l of out) console.log(l);
  }

  // 최근 24시간 공용 문서 되돌림 감사(check-shared-doc-reverts --audit) — 지금 HEAD에서 사라진 줄이 있을 때만 자세히(2026-10-23)
  const au = spawnSync(process.execPath, [join(ROOT, "scripts", "check-shared-doc-reverts.mjs"), "--audit", "24", "--json"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  try {
    const a = JSON.parse(au.stdout.trim().split("\n").pop());
    console.log(`[공용 문서 되돌림] 최근 ${a.hours}시간 커밋 ${a.commits}개 · 의심 ${a.suspect}건 · 지금 사라진 줄 있는 것 ${a.lost.length}건`);
    for (const l of a.lost) console.log(`  ⚠ ${l.sha} (세션 ${l.session || "미상 — 커밋 메시지·HANDOFF로 확인"}) ${l.file} −${l.lines}줄 | ${l.msg}\n      예: ${l.sample}`);
    if (a.lost.length) console.log("  원문: node scripts/check-shared-doc-reverts.mjs --audit 24 --lost  (의도한 정리인지 확인 후 필요하면 다음 커밋으로 되살림)");
  } catch { console.log("[공용 문서 되돌림] 감사 실패 — node scripts/check-shared-doc-reverts.mjs --audit 24 로 직접 확인"); }

  // 문서 속 프로그램 주소 점검(check-app-urls --json) — 연결 안 되는 *.buylife.xyz 주소가 있으면 요약에 한 줄만(2026-10-23)
  const cu = spawnSync(process.execPath, [join(ROOT, "scripts", "check-app-urls.mjs"), "--json"], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024, timeout: 90000 });
  try {
    const u = JSON.parse(cu.stdout.trim().split("\n").pop());
    if (!u.broken.length) console.log(`[문서 속 프로그램 주소] 호스트 ${u.hosts}개 · 연결 안 되는 주소 없음`);
    else {
      console.log(`[문서 속 프로그램 주소] 호스트 ${u.hosts}개`);
      console.log(`  ⚠ 연결 안 되는 주소 ${u.broken.length}개 — 보고 링크는 node scripts/check-app-urls.mjs <slug>로 실제 주소 확인, 자세히는 인자 없이 실행`);
      for (const b of u.broken.slice(0, 5)) console.log(`    · https://${b.host} (${b.count}곳, 예: ${b.first})`);
    }
  } catch { console.log("[문서 속 프로그램 주소] 확인 실패 — node scripts/check-app-urls.mjs 로 직접 확인"); }
  flushLog();
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

/** 프로그램 비교표에서 이 프로그램 한 줄만 새 버전으로: 목록 표 버전 칸 + 카드 「주소·폴더: … · vX.YY」(DB가 화면 버전과 같을 때만, 2026-10-23) */
function fixMapRow(slug, ver) {
  const file = join(ROOT, "docs", "PROGRAM_CAPABILITY_MAP.md");
  const raw = readFileSync(file, "utf8");
  const esc = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let n = 0;
  let out = raw.replace(new RegExp("^(\\| \\d+ \\| [^|]+\\| `" + esc + "` \\|[^|]+\\| )(v\\d+\\.\\d{2})( \\|)", "m"), (all, a, v, b) => (v === ver ? all : (n++, a + ver + b)));
  // 제목과 「주소·폴더」 줄 사이에 메모 줄이 끼어 있어도 찾는다(music 카드에서 놓치던 문제, 2026-10-23)
  out = out.replace(new RegExp("^(#### [^\\n]*\\(`" + esc + "`\\)\\r?\\n(?:(?!#### )[^\\n]*\\r?\\n)*?- 주소·폴더: [^\\n]*?` · )(v\\d+\\.\\d{2})", "m"), (all, a, v) => (v === ver ? all : (n++, a + ver)));
  if (!n) { console.log(`  프로그램 비교표 ${slug}: 이미 ${ver}(또는 줄 없음) — 고칠 것 없음`); return; }
  if (out.split("\n").length !== raw.split("\n").length) { console.log("  ✖ 프로그램 비교표 고치기 중단 — 줄 수가 달라짐(파일 그대로)"); return; }
  writeFileSync(file, out);
  console.log(`  ✔ 프로그램 비교표 ${slug}: ${n}곳을 ${ver}로(목록 표 버전 칸·카드 버전) — 아래 도우미 커밋에 함께`);
}

if (versionOnly) {
  console.log(`\n[버전] ${folder}`);
  const vr = await syncVersion();
  // 배포 뒤 --set-version으로 DB를 맞춘 경우에도 프로그램 비교표 한 줄을 함께 고친다(배포 때는 DB가 아직 옛 버전이라 건너뛰던 빈틈, 2026-10-23)
  if (setVersion && vr && vr.db === vr.ver) fixMapRow(vr.slug, vr.ver);
  process.exit(0);
}

// 1) 미배포 대기(이 배포에 함께 나갈 것)
console.log(`\n[1/3] 미배포 대기 — ${folder} (Vercel 프로젝트 ${project})`);
spawnSync(process.execPath, [join(ROOT, "scripts", "pending-check.mjs"), folder], { stdio: "inherit" });

// 2) 작업 중 표 — 다른 세션이 이 폴더를 맡고 있으면 경고
const active = readFileSync(join(ROOT, "docs", "ACTIVE_WORK.md"), "utf8").replace(/\r\n/g, "\n")
  .split("\n").filter((l) => l.startsWith("| ") && l.includes(`\`${folder}/\``));
console.log(`\n[2/3] 작업 중 표(docs/ACTIVE_WORK.md)에서 ${folder}`);
// 세션 이름은 「에이전트(장비)」 칸에서만 뽑는다(작업 설명 칸에 다른 세션 이름이 적힌 줄이 있음). 폴더가 많은 줄은 이름이 200자 뒤에 있어 잘려 안 보였음(2026-10-23)
const rowInfo = (l) => { const c = l.split("|").map((x) => x.trim()); const folders = (c[1].match(/`[^`]+`/g) ?? []).length; return { name: (c[2]?.match(/((?:claude|codex|agy)-[\w.-]+)/) ?? [])[1] ?? c[2]?.match(/세션 `([^`]+)`/)?.[1] ?? "", agent: (c[2] ?? "").slice(0, 80), task: (c[4] ?? "").slice(0, 100), folders }; };
if (active.length) for (const l of active) { const r = rowInfo(l); console.log(`  ⚠ 세션 ${r.name || "(이름 없음)"} · ${r.agent}${r.folders > 1 ? ` · 폴더 ${r.folders}개를 함께 맡음` : ""} · 작업: ${r.task}`); }
else console.log("  (줄 없음)");
// 휴대폰 폭 메뉴(check-mobile-account.mjs, 코드 읽기) — 이 폴더가 확인 필요 후보면 경고만(배포는 막지 않음, 2026-10-23)
{
  const mc = spawnSync(process.execPath, [join(ROOT, "scripts", "check-mobile-account.mjs"), folder], { encoding: "utf8" });
  const warn = (mc.stdout || "").split(/\r?\n/).filter((l) => l.startsWith("  ⚠"));
  if (warn.length) console.log(`  ⚠ 휴대폰 메뉴 확인 필요:${warn[0].slice(3)}\n    → 배포 뒤 크롬 390px에서 ☰ 펼침 메뉴·계정 확인(docs/SIDEBAR_LAYOUT_STANDARD.md 「모바일 레이아웃」)`);
  else console.log("  휴대폰 메뉴: 확인 필요 후보 아님");
}

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
  const names = [...new Set(active.map((l) => rowInfo(l).name).filter(Boolean))];
  if (names.length) console.log(`  물어볼 세션: ${names.join(", ")} — Claude Code는 ListAgents에서 이 이름을 찾아 SendMessage로(그 세션이 그 폴더를 마쳤는지·표에서 빼 줄지)`);
  console.log("  내 줄이라면: --owner \"<내 세션 이름 또는 내 줄 작업 설명 일부>\"를 붙여 다시 실행");
  process.exit(1);
}
// 배포 뒤 대기 줄 정리·인수인계를 안전 커밋 도우미로 하도록, 고치기 전 기준 사본을 지금 떠 둠(2026-10-23 — 배포 기록 커밋의 되돌림 방지)
const docAs = `deploy-${folder.replace(/[^\w.-]/g, "_")}`;
spawnSync(process.execPath, [join(ROOT, "scripts", "safe-commit.mjs"), "--begin", "docs/PENDING_DEPLOYS.md", "docs/HANDOFF.md", "docs/PROGRAM_CAPABILITY_MAP.md", "--as", docAs], { stdio: "inherit" });
console.log(`\n[3/3] 배포 실행: npx ${cmd.join(" ")}  (빌드 1회)`);
// 배포 출력에서 이번 배포 주소를 받아 vercel inspect로 상태·운영 주소 연결을 직접 확인(2026-10-23 — 예전엔 vercel ls 표를 읽다 「?」가 자주 나옴)
const r = spawnSync("npx", cmd, { cwd: dir, encoding: "utf8", shell: process.platform === "win32", maxBuffer: 64 * 1024 * 1024 });
const deployOut = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
process.stdout.write(deployOut.split("\n").filter((l) => /https:\/\/|Error|error|Ready|Production/.test(l)).slice(0, 12).join("\n") + "\n");
if (r.status !== 0) { console.log(`✖ 배포 명령 실패(코드 ${r.status}). vercel inspect로 원인을 확인하세요.`); process.exit(r.status ?? 1); }
const deployUrl = (deployOut.match(new RegExp(`https://${project}-[a-z0-9]+-buylife\\.vercel\\.app`)) || [])[0];
if (!deployUrl) console.log("\n⚠ 배포 출력에서 배포 주소를 찾지 못했습니다 — `vercel ls`로 직접 확인하세요.");
else {
  const ins = spawnSync("npx", ["vercel", "inspect", deployUrl, "--scope", "buylife"], { cwd: dir, encoding: "utf8", shell: process.platform === "win32" });
  const io = `${ins.stdout ?? ""}\n${ins.stderr ?? ""}`;
  const status = (io.match(/status\s+●?\s*(\w+)/) || [])[1] ?? "?";
  const aliases = [...io.matchAll(/https:\/\/[a-z0-9.-]+\.buylife\.xyz/g)].map((m) => m[0]);
  console.log(`\n${status === "Ready" ? "✔" : "⚠"} 이번 배포: ${deployUrl}  상태 ${status}` + (aliases.length ? ` · 운영 주소 연결 ${[...new Set(aliases)].join(", ")}` : " · ⚠ buylife.xyz 운영 주소 연결이 안 보입니다"));
}
console.log("\n[버전]");
const vr = await syncVersion();
// 프로그램 비교표 이 프로그램 한 줄(목록 표·카드 버전) — DB가 화면 버전과 같을 때만(다른 세션이 배포 뒤 지도를 안 고쳐 어긋나던 문제, 2026-10-23)
if (vr && vr.db === vr.ver) fixMapRow(vr.slug, vr.ver);
// 관리자 첫 화면 숫자(미배포 대기·정리 기록 진행률) 갱신 — 운영 DB site_settings.ops_overview 한 줄(2026-10-23)
console.log("\n[관리자 화면 숫자 갱신]");
spawnSync(process.execPath, [join(ROOT, "scripts", "pending-check.mjs"), "--publish"], { stdio: "inherit" });
console.log("이어서 할 일: ① (버전이 다르면) --version-only --set-version ② 위 대기 줄을 docs/PENDING_DEPLOYS.md 「내보낸 기록」으로·폴더 대기 표시 정리 ③ 크롬 화면 확인 ④ 인수인계 문서·비용 리포트");
console.log(`②·④ 문서 커밋은 일반 git commit 말고 (기준 사본은 이미 떠 둠):\n  node scripts/safe-commit.mjs "<메시지>" docs/PENDING_DEPLOYS.md docs/HANDOFF.md docs/PROGRAM_CAPABILITY_MAP.md --as ${docAs} --push`);
