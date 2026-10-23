#!/usr/bin/env node
// 공용 스테이징(.git/index) 블랙박스 — 2026-10-23 (Claude Code 윈도우)
// 2026-10-23 공용 스테이징이 두 번(11:13경 65개, 13:28 11개) 비워졌는데 「누가 무엇을 한 직후인지」 증거가 없었다.
// 부를 때마다 .git/aimaster-index-log.txt에 한 줄: 시각 · 장비 · pid · 부른 곳 · index 크기·수정 시각 · 항목 수 · HEAD 파일 수.
// 직전 기록보다 항목 수가 절반 아래로 줄었으면 ⚠와 직전 기록을 보여 준다(막지는 않음). 4만 줄을 넘으면 최근 3만 줄만 유지(약 이틀 이상 — 24시간 관찰이 가능하도록, 2026-10-23 2,000줄에서 늘림). 커밋되지 않는 파일(.git 안).
// 사용: node scripts/index-watch.mjs <부른 곳> [--quiet]   예: session-check, pre-commit, pre-push, safe-commit:start
//       node scripts/index-watch.mjs commit-gate --stale-only   묵은 스테이징 항목만 확인(있으면 종료 코드 3)
// 잠금(.git/index.lock)이 5분 넘게 남으면 잠금 하나당 한 번 .git/aimaster-lock-evidence.txt에 그때 프로세스·전후 기록을 남긴다.
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import { join, relative, resolve } from "node:path";

// 세션 이름: 이름표에 이미 (이름)이 없으면 환경변수 AIMASTER_SESSION을 붙인다 — 훅은 git이 부를 때 환경변수를 물려받으므로
// `AIMASTER_SESSION=claude-win-x git commit …`이면 훅 기록에도 세션 이름이 남는다(2026-10-23)
const rawTag = process.argv[2] || "manual";
const tag = !rawTag.includes("(") && process.env.AIMASTER_SESSION ? `${rawTag}(${process.env.AIMASTER_SESSION.replace(/[^\w.-]/g, "_")})` : rawTag;
const quiet = process.argv.includes("--quiet");
try {
  const env = { ...process.env };
  delete env.GIT_INDEX_FILE; // 훅이 임시 인덱스로 돌 때도 「공용」 index를 잰다
  const git = (args) => execFileSync("git", args, { encoding: "utf8", env, maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
  const root = git(["rev-parse", "--show-toplevel"]).trim();
  const gitDir = resolve(root, git(["rev-parse", "--git-dir"]).trim());
  const shown = (p) => relative(root, p).replace(/\\/g, "/"); // 안내 문장에는 저장소 기준 짧은 경로(.git/…)로(2026-10-23)
  // 묵은 스테이징 항목(2026-10-23): 스테이징은 HEAD와 다른데(M·D) 작업 파일은 HEAD와 같은 파일 = 옛 판이 스테이징에 남은 것.
  // 누가 일반 커밋에 섞으면 그 파일의 최근 변경이 되돌려진다(예: 루트 지침의 새 최상위 규칙). 새로 추가(A)는 진짜 작업일 수 있어 뺀다.
  const staleEntries = () => git(["diff", "--cached", "--name-status"]).split("\n").filter(Boolean).map((l) => l.split("\t")).filter(([st]) => st === "M" || st === "D")
    // 작업 파일 내용 해시 = HEAD 내용 해시로 직접 비교(스테이징에 없는 새 파일이 「D」로 보일 때 git diff HEAD는 비교하지 않아 놓쳤음)
    .map(([, f]) => f).filter((f) => {
      try {
        const headBlob = git(["rev-parse", `HEAD:${f}`]).trim();
        const workBlob = execFileSync("git", ["hash-object", "--", f], { cwd: root, env, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
        return headBlob === workBlob;
      } catch { return false; } // HEAD에 없거나 작업 파일이 없음 = 진짜 추가·삭제일 수 있음
    });
  // 요약 줄은 앞 5개만(세션 점검 요약 칸이 220자에서 잘림), 정리 명령은 전체 파일로 다음 줄에 따로
  const printStale = (stale) => {
    if (!stale.length) return;
    const q = stale.map((f) => (/\s/.test(f) ? `"${f}"` : f)).join(" ");
    console.log(`⚠ [공용 스테이징 묵은 항목] ${stale.length}개: ${stale.slice(0, 5).join(", ")}${stale.length > 5 ? ` 외 ${stale.length - 5}개` : ""} — 작업 파일은 HEAD와 같은데 스테이징만 옛 판(일반 커밋에 섞이면 최근 변경이 되돌려짐)`);
    console.log(`  정리(작업 파일은 그대로, 이 파일들의 스테이징만 HEAD로): git reset -q HEAD -- ${q}`);
  };
  const indexPath = join(gitDir, "index");
  const st = existsSync(indexPath) ? statSync(indexPath) : null;
  const entries = st ? git(["ls-files"]).split("\n").filter(Boolean).length : 0;
  let head = 0;
  try { head = git(["ls-tree", "-r", "--name-only", "HEAD"]).split("\n").filter(Boolean).length; } catch { /* 첫 커밋 전 */ }
  const pad = (n) => String(n).padStart(2, "0");
  const t = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  // git 잠금(.git/index.lock)이 있으면 몇 초째인지 — 2026-10-23 14:33~15:39 스테이징이 한 시간 멈춰 있던 일(커밋 도우미는 임시 스테이징이라 성공해 아무도 몰랐음)을 다음엔 기록으로 확인
  const lockPath = join(gitDir, "index.lock");
  const lockAge = existsSync(lockPath) ? Math.round((Date.now() - statSync(lockPath).mtimeMs) / 1000) : null;
  // 어느 CLI가 부른 것인지 추정(2026-10-23, 환경변수 — 훅은 git을 부른 CLI의 환경을 물려받음): 「하루 동안 시작 점검을 안 한 장비·CLI」 알림에 쓴다
  const envKeys = Object.keys(process.env);
  // (CODEX_HOME은 이 PC 전체 설정이라 Claude Code 환경에도 있음 — 2026-10-23 확인, 판단에서 뺀다) 1순위: 세션 이름 첫 단어(멀티세션 규칙 §2 「<CLI>-<장비>-<날짜>-<작업>」, 예 codex-win-…) — 이름표의 (세션) 또는 AIMASTER_SESSION. 2순위: 환경변수(CLAUDECODE는 확인, 나머지는 추정)
  const cliOf = (s) => (String(s ?? "").match(/(?:^|\()(claude|codex|agy)-/) ?? [])[1] ?? "";
  const cli = cliOf(tag) || cliOf(process.env.AIMASTER_SESSION) || (process.env.CLAUDECODE ? "claude" : envKeys.some((k) => k.startsWith("CODEX_") && k !== "CODEX_HOME") ? "codex" : envKeys.some((k) => /^(ANTIGRAVITY|AGY|GEMINI_CLI)/.test(k)) ? "agy" : "");
  const line = [t(new Date()), hostname(), `pid=${process.ppid}`, tag, `index=${st ? st.size : "없음"}B@${st ? t(st.mtime) : "-"}`, `entries=${entries}`, `head=${head}`, lockAge === null ? "" : `lock=${lockAge}s`, cli ? `cli=${cli}` : "", process.env.GIT_INDEX_FILE ? `GIT_INDEX_FILE=${process.env.GIT_INDEX_FILE}` : ""].filter(Boolean).join(" | ");
  const logPath = join(gitDir, "aimaster-index-log.txt");
  const prev = existsSync(logPath) ? readFileSync(logPath, "utf8").trimEnd().split("\n") : [];
  const last = prev[prev.length - 1];
  const lastEntries = Number((last?.match(/entries=(\d+)/) ?? [])[1] ?? 0);
  appendFileSync(logPath, line + "\n");
  if (prev.length > 40000) writeFileSync(logPath, [...prev.slice(-30000), line].join("\n") + "\n");
  // 잠금 증거(2026-10-23): 잠금이 5분 넘게 남았으면 잠금 하나당 한 번, 그때 돌던 git 프로세스와 잠금 생성 시각 ±2분의 기록 줄을 남긴다
  // (14:33 잠금은 만든 명령이 미확인으로 남았음 — 다음엔 이 파일로 좁힌다). 시간이 걸리는 프로세스 조회는 이때만 한다.
  const evidencePath = join(gitDir, "aimaster-lock-evidence.txt");
  if (lockAge !== null && lockAge > 300) {
    try {
      const lockAt = statSync(lockPath).mtime;
      const key = `lock@${t(lockAt)}`;
      if (!(existsSync(evidencePath) && readFileSync(evidencePath, "utf8").includes(key))) {
        const procs = process.platform === "win32"
          ? execFileSync("powershell", ["-NoProfile", "-Command", "[Console]::OutputEncoding=[Text.Encoding]::UTF8; Get-CimInstance Win32_Process -Filter \"Name='git.exe' or Name='node.exe' or Name='sh.exe' or Name='bash.exe'\" | Where-Object { $_.Name -eq 'git.exe' -or $_.CommandLine -match 'git |index-watch|safe-commit|commit-paths' } | ForEach-Object { $c = ([string]$_.CommandLine) -replace '\\s+', ' '; if ($c.Length -gt 300) { $c = $c.Substring(0, 300) + '…' }; '{0} ppid={1} 시작={2:yyyy-MM-dd HH:mm:ss} {3}' -f $_.ProcessId, $_.ParentProcessId, $_.CreationDate, $c }"], { encoding: "utf8", timeout: 15000, stdio: ["ignore", "pipe", "ignore"] })
          : execFileSync("ps", ["-axo", "pid,ppid,lstart,command"], { encoding: "utf8", timeout: 15000, stdio: ["ignore", "pipe", "ignore"] }).split("\n").filter((l, i) => i === 0 || /\bgit\b|index-watch|safe-commit|commit-paths/.test(l)).join("\n");
        const near = prev.filter((l) => { const m = l.match(/^(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d)/); return m && Math.abs(new Date(m[1].replace(" ", "T")).getTime() - lockAt.getTime()) <= 120_000; });
        appendFileSync(evidencePath, [`===== ${key} · 발견 ${t(new Date())} · ${hostname()} · ${Math.round(lockAge / 60)}분째 · 부른 곳 ${tag}`,
          "-- 잠금 생성 ±2분의 블랙박스 기록:", ...(near.length ? near : ["(없음 — 기록을 남기지 않는 명령이 만든 잠금)"]),
          `-- 지금 이 장비(${hostname()})의 git·node·셸 프로세스(다른 장비는 그 장비에서 다시 보기):`, procs.trim() || "(없음)", ""].join("\n") + "\n");
        // 끝없이 커지지 않게(2026-10-23): 잠금 기록이 100개를 넘으면 최근 50개만 남긴다(잠금 1건 = 수십 줄, 한 해 수십 건이면 넉넉함)
        const blocks = readFileSync(evidencePath, "utf8").split(/(?=^===== )/m);
        if (blocks.length > 100) writeFileSync(evidencePath, blocks.slice(-50).join(""));
      }
    } catch { /* 증거 기록 실패는 무시 */ }
  }
  // git 잠금이 5분 넘게 남아 있으면 — 일반 커밋·스테이징 맞추기가 모두 멈춘 상태(지우지 말고 확인)
  const printLock = () => { if (lockAge !== null && lockAge > 300) console.log(`⚠ [공용 스테이징 잠금 오래 남음] .git/index.lock ${Math.round(lockAge / 60)}분째 — 일반 커밋과 도우미의 스테이징 맞추기가 모두 멈춘 상태. 지우지 말고 git 프로세스(장비 두 곳)를 확인한 뒤 주인님께(루트 CLAUDE.md 최상단). 그때 돌던 프로세스·기록: ${shown(evidencePath)}`); };
  // 마지막 잠금 증거 한 줄 요약(2026-10-23): 잠금 시각·발견 장비·의심 프로세스 1개 — 파일을 열지 않고 판단. 지금 잠금이 있으면 ⚠, 없으면 24시간 안의 것만 참고로
  const printEvidence = (onlyIfLocked) => {
    if (!existsSync(evidencePath) || (onlyIfLocked && lockAge === null)) return;
    const block = readFileSync(evidencePath, "utf8").split("===== ").filter(Boolean).pop() ?? "";
    const head1 = block.split("\n")[0].trim(); // lock@시각 · 발견 시각 · 장비 · N분째 · 부른 곳
    const at = head1.match(/^lock@(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d)/);
    if (!at) return;
    if (lockAge === null && Date.now() - new Date(at[1].replace(" ", "T")).getTime() > 24 * 3600_000) return;
    const sec = (title) => (block.split(title)[1] ?? "").split("\n-- ")[0].split("\n").slice(1).map((l) => l.trim()).filter((l) => l && !l.startsWith("PID") && !l.startsWith("("));
    // 윈도우 줄 「pid ppid=N 시작=날짜 시각 명령」은 「명령 (pid, 시작 시각)」으로 바꾸고, 명령줄을 못 읽은 프로세스(빈 명령)는 뺀다
    const procs = sec("-- 지금 이 장비").filter((l) => !/index-watch/.test(l)).map((l) => {
      const m = l.match(/^(\d+) ppid=\d+ 시작=\S+ (\S+) ?(.*)$/);
      return m ? (m[3] ? `${m[3]} (pid ${m[1]}, 시작 ${m[2]})` : "") : l;
    }).filter(Boolean);
    const suspect = procs.find((l) => /git(\.exe)?"?\s/.test(l) && !/shell-snapshots/.test(l)) ?? procs.find((l) => !/shell-snapshots/.test(l))
      ?? sec("-- 잠금 생성").map((l) => l.split(" | ")).filter((p) => p.length > 3).map((p) => `잠금 무렵 기록 ${p[0].slice(11)} ${p[3]} ${p[2]} @${p[1]}`).pop()
      ?? "(git 프로세스·기록 없음 — 이미 끝난 명령이 남긴 잠금)";
    console.log(`${lockAge !== null ? "⚠ " : ""}[공용 스테이징 잠금 증거] ${head1.replace(/ · 부른 곳 .*/, "")} · 의심: ${suspect.length > 140 ? `${suspect.slice(0, 140)}…` : suspect} — 전체 ${shown(evidencePath)}`);
  };
  const shrunk = (lastEntries > 200 && entries * 2 < lastEntries) || (head > 200 && entries * 2 < head);
  if (shrunk) {
    console.error(`⚠ [공용 스테이징 축소 감지] 지금 ${entries}개 (HEAD ${head}개, 직전 기록 ${lastEntries}개)`);
    console.error(`  직전 기록: ${last ?? "(없음)"}`);
    console.error(`  기록 전체: ${shown(logPath)} — 줄어든 시각(index=…@시각) 앞뒤 줄의 장비·부른 곳으로 원인을 좁힌다. 고치기 전에 주인님께(루트 CLAUDE.md 최상단).`);
  } else if (!quiet && rawTag !== "session-check") console.log(`[공용 스테이징 기록] ${entries}개 · HEAD ${head}개 · index 수정 ${st ? t(st.mtime) : "-"}`);
  // --stale-only(2026-10-23): 커밋 전에 묵은 항목만 확인 — 있으면 종료 코드 3. 맥미니 commit-gate.sh(멈춤)·safe-commit·commit-paths(안내만)가 부른다.
  // 축소 감지(위, stderr)는 그대로 나온 뒤에 실행한다.
  if (process.argv.includes("--stale-only")) {
    const stale = staleEntries();
    printStale(stale);
    process.exit(stale.length ? 3 : 0);
  }
  // --warn-lock(2026-10-23): 세션 시작 훅(scripts/cloud-session-start.mjs, 윈도우·맥미니 Claude Code 공통)용 — 잠금·증거·묵은 항목 경고만
  if (process.argv.includes("--warn-lock")) {
    printLock();
    printEvidence(true);
    try { printStale(staleEntries()); } catch { /* 무시 */ }
  }
  // 세션 시작 점검: 최근 24시간 「축소가 시작된」 순간(정상 → 절반 미만으로 바뀐 기록)과 그 직전 기록을 한 줄로(2026-10-23)
  if (rawTag === "session-check") { // 이름표에 (세션)이 붙어도 점검은 그대로(2026-10-23 — tag로 비교해 AIMASTER_SESSION을 주면 점검 전체가 건너뛰어졌음)
    // 출력을 모았다가 ⚠가 없으면 한 줄로 합친다(2026-10-23 — 매번 4~5줄이 나와 정작 경고가 묻힘). ⚠가 있으면 전부 그대로.
    const out = [], realLog = console.log;
    let activeList = ""; // 작업 중 세션 목록 — 요약 여부와 상관없이 맨 끝에 한 줄
    console.log = (...a) => out.push(a.join(" "));
    console.log(`[공용 스테이징 기록] ${entries}개 · HEAD ${head}개 · index 수정 ${st ? t(st.mtime) : "-"}`);
    const since = Date.now() - 24 * 3600_000;
    const rows = [...prev, line].map((l) => {
      const m = l.match(/^(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d) \| ([^|]+) \| pid=(\d+) \| ([^|]+) \|.*entries=(\d+) \| head=(\d+)/);
      return m ? { at: new Date(m[1].replace(" ", "T")), when: m[1].slice(11), host: m[2].trim(), pid: m[3], tag: m[4].trim(), shrunk: Number(m[6]) > 200 && Number(m[5]) * 2 < Number(m[6]), n: m[5], cli: (l.match(/\| cli=(\w+)/) ?? [])[1] ?? cliOf(m[4]) } : null; // cli= 칸이 없던 옛 기록은 이름표의 세션 이름으로
    }).filter(Boolean);
    // 시작 점검 누락(2026-10-23, 루트 AGENTS.md·GEMINI.md 최상위 ⑥): 최근 24시간 기록(커밋 훅·도우미 등)이 있는 장비·CLI 중 시작 점검
    // (session-check·claude-session-start) 기록이 없는 곳. ⑥ 시행(16:30) 이전 기록은 보지 않는다. CLI는 환경변수 추정이라 모르는 경우 장비만 본다.
    {
      const from = Math.max(since, new Date("2026-10-23T16:30:00").getTime());
      const recent = rows.filter((r) => r.at.getTime() >= from);
      const isStart = (r) => /^(session-check|claude-session-start)/.test(r.tag);
      const keys = (r) => [r.host, ...(r.cli ? [`${r.host}/${r.cli}`] : [])];
      const checked = new Set(recent.filter(isStart).flatMap(keys));
      const missing = [...new Set(recent.filter((r) => !isStart(r)).flatMap(keys))].filter((k) => !checked.has(k))
        .filter((k, _, all) => k.includes("/") || !all.some((o) => o.startsWith(`${k}/`))); // 「장비/CLI」가 있으면 장비만 있는 항목은 뺀다
      // 세션 이름 없이(=CLI를 모르게) 시작 점검한 장비는 「누락」이 오판일 수 있어 함께 적는다
      const unnamed = new Set(recent.filter((r) => isStart(r) && !r.cli).map((r) => r.host));
      const note = missing.map((k) => (k.includes("/") && unnamed.has(k.split("/")[0]) ? `${k}(이 장비에 세션 이름 없는 시작 점검 있음 — 그것일 수 있음)` : k));
      if (missing.length) console.log(`⚠ [시작 점검 누락] 최근 24시간 커밋·기록은 있는데 시작 점검이 없는 장비·CLI: ${note.join(", ")} — 그 CLI 지침 맨 위 ⑥ 안내. CLI 구분은 세션 이름 첫 단어 기준이니 \`AIMASTER_SESSION=<세션명> node scripts/index-watch.mjs session-check\`로 실행`);
    }
    const starts = [];
    for (let i = 1; i < rows.length; i++) if (rows[i].shrunk && !rows[i - 1].shrunk && rows[i].at.getTime() >= since) starts.push(`${rows[i].when}(${rows[i].n}개, 직전 ${rows[i - 1].when} ${rows[i - 1].tag} pid=${rows[i - 1].pid}${rows[i - 1].host !== rows[i].host ? ` · 장비 ${rows[i - 1].host}→${rows[i].host}` : ""})`);
    const first = rows.find((r) => r.at.getTime() >= since);
    console.log(starts.length
      ? `⚠ [공용 스테이징 축소 이력] 최근 24시간 ${starts.length}번: ${starts.join(" · ")} — 기록 ${shown(logPath)}`
      : `[공용 스테이징 축소 이력] 최근 24시간 없음 (기록 ${first ? first.when + "부터" : "없음"})`);
    printLock();
    printEvidence(false);
    // 묵은 스테이징 항목(위 staleEntries 설명)
    try { printStale(staleEntries()); } catch { /* 기록 실패는 무시 */ }
    // 오래된 기준 사본(2026-10-23): safe-commit --begin 뒤 커밋하지 않고 끝난 세션의 사본(.git/safe-commit/<세션>/*.base)이 24시간 넘게 남음 — 지우지 말고 확인
    try {
      const sc = join(gitDir, "safe-commit");
      if (existsSync(sc)) {
        // deploy-<폴더> 사본은 deploy.mjs가 배포마다 --force-begin으로 새로 뜨고 3개 중 바뀐 것만 커밋해 남는 게 정상 → 경고에서 빼고 개수만
        const old = []; let deployLeft = 0;
        for (const who of readdirSync(sc)) for (const f of readdirSync(join(sc, who))) {
          const age = Date.now() - statSync(join(sc, who, f)).mtimeMs;
          if (age <= 24 * 3600_000) continue;
          if (who.startsWith("deploy-")) { deployLeft++; continue; }
          old.push(`${who}:${f.replace(/__/g, "/").replace(/\.base$/, "")}(${Math.floor(age / 3600_000)}시간)`);
        }
        if (old.length) console.log(`⚠ [오래된 기준 사본] ${old.length}개: ${old.slice(0, 3).join(", ")}${old.length > 3 ? ` 외 ${old.length - 3}개` : ""} — 수정 시작 표시 뒤 커밋 없이 끝난 세션일 수 있음. \`node scripts/safe-commit.mjs --status\`로 보고, 그 세션에 확인 후 정리(내 것이면 커밋하거나 --begin ... --force-begin)${deployLeft ? ` · 배포 스크립트가 남긴 것 ${deployLeft}개는 정상` : ""}`);
      }
    } catch { /* 무시 */ }
    // 작업 중 표의 세션 이름(2026-10-23, docs/ACTIVE_WORK.md 사용법 2): 「에이전트(장비)」 칸에 claude-·codex-·agy- 세션 이름이 없는 줄
    try {
      const aw = join(root, "docs", "ACTIVE_WORK.md");
      if (existsSync(aw)) {
        const body = readFileSync(aw, "utf8").split(/^## 작업 중\s*$/m)[1] ?? "";
        const tableRows = body.split("\n").filter((l) => l.startsWith("|") && !/^\|\s*(폴더|-{3})/.test(l))
          .map((l) => l.split("|").map((c) => c.trim())).filter((c) => c.length > 3)
          // 범위(2026-10-23, docs/ACTIVE_WORK.md 사용법 2): 폴더 칸 끝 「(범위: a·b/c)」 = 폴더 안 경로만 맡음 → 그 밖 파일 수정은 겹침이 아님
          .map((c) => ({ scope: ((c[1].match(/범위:\s*([^)]*)\)/) ?? [])[1] ?? "").split("·").map((s) => s.replace(/`/g, "").trim().replace(/^\.\//, "").replace(/\/$/, "")).filter(Boolean), folders: (c[1].replace(/\(범위:[^)]*\)/, "").match(/`([^`]+)`/g) ?? []).map((f) => f.replace(/`/g, "").replace(/\/$/, "")), folder: c[1].replace(/`/g, "").split("·")[0].trim().slice(0, 40), name: (c[2].match(/((?:claude|codex|agy)-[\w.-]+)/) ?? [])[1], start: (c[3].match(/\d{4}-\d\d-\d\d/) ?? [])[0] }));
        const noName = tableRows.filter((r) => !r.name).map((r) => r.folder);
        if (noName.length) console.log(`⚠ [작업 중 표 세션 이름 없음] ${noName.length}줄: ${noName.slice(0, 3).join(", ")}${noName.length > 3 ? ` 외 ${noName.length - 3}줄` : ""} — 「에이전트(장비)」 칸에 \`세션 <CLI>-<장비>-<날짜>-<작업>\`을 넣어야 다른 세션이 찾아 물을 수 있음(docs/ACTIVE_WORK.md 사용법 2)`);
        // 끝났는데 줄을 안 지운 듯한 세션(2026-10-23): 시작이 하루 넘게 지났고, 24시간 안에 그 이름의 블랙박스 기록·커밋이 하나도 없음 — 지우지 말고 주인님께(사용법 4)
        let named24 = "";
        try { named24 = git(["log", `--since=${new Date(since).toISOString()}`, "--format=%(trailers:key=AIMaster-Session,valueonly,separator=%x2C)"]); } catch { /* 무시 */ }
        const seen = (n) => named24.split(/[\n,]/).some((s) => s.trim() === n) || rows.some((r) => r.at.getTime() >= since && r.tag.includes(`(${n})`));
        const idle = tableRows.filter((r) => r.name && r.start && new Date(`${r.start}T23:59:59`).getTime() < since && !seen(r.name));
        if (idle.length) console.log(`⚠ [작업 중 표 오래된 줄] ${idle.length}줄: ${idle.slice(0, 3).map((r) => `${r.folder}(${r.name}, ${r.start} 시작)`).join(", ")}${idle.length > 3 ? ` 외 ${idle.length - 3}줄` : ""} — 24시간 동안 그 세션의 기록·커밋이 없음. 끝난 세션일 수 있으니 지우지 말고 주인님께 확인(docs/ACTIVE_WORK.md 사용법 4)`);
        // 지금 작업 중인 세션 목록(폴더 → 세션 이름) — 다른 세션에 메시지를 보낼 때 바로 찾게. ⚠가 없어 요약 한 줄이 되어도 따로 보인다
        if (tableRows.some((r) => r.name)) activeList = `[작업 중 세션] ${tableRows.filter((r) => r.name).map((r) => `${r.folder}${r.folders.length > 1 ? ` 외 ${r.folders.length - 1}개` : ""} → ${r.name}`).join(" · ")}`;
        // 표에 없는 세션이 표의 폴더를 고침(2026-10-23): 24시간 안 커밋 중 세션 이름이 붙었고 그 폴더 줄의 세션과 다른 것 — 같은 폴더 동시 작업을 빨리 잡는다
        // (이름 없는 커밋은 판단하지 않음. 주인님 승인으로 다른 세션이 맡는 경우도 있으니 막지 않고 확인만)
        try {
          const log = git(["log", `--since=${new Date(since).toISOString()}`, "--name-only", "--format=@@%h|%(trailers:key=AIMaster-Session,valueonly,separator=%x2C)"]);
          const commits = log.split("@@").filter(Boolean).map((b) => { const [h, ...files] = b.trim().split("\n"); const [hash, who] = h.split("|"); return { hash, who: (who ?? "").trim(), files: files.filter(Boolean) }; }).filter((c) => c.who);
          const clash = [];
          for (const r of tableRows.filter((x) => x.name)) for (const c of commits) {
            if (c.who === r.name) continue;
            // 그 폴더의 docs/(인수인계·개선 목록)만 고친 커밋은 빼고 코드·설정 등만 본다 — 문서 정리는 다른 세션이 자주 함(첫 실측: 맥미니 세션의 IMPROVEMENTS.md 정리)
            const inScope = (f, p) => !r.scope.length || r.scope.some((s) => p.slice(f.length + 1) === s || p.slice(f.length + 1).startsWith(`${s}/`));
            const hits = c.files.filter((p) => r.folders.some((f) => (p === f || p.startsWith(`${f}/`)) && !p.startsWith(`${f}/docs/`) && inScope(f, p)));
            // 바꾼 파일 1~2개를 함께 — 코드인지 설정인지 바로 판단(2026-10-23)
            if (hits.length) clash.push(`${hits.slice(0, 2).join("·")}${hits.length > 2 ? ` 외 ${hits.length - 2}개` : ""} ← ${c.who}(${c.hash}, 표의 세션 ${r.name}${r.scope.length ? ", 범위 안" : ""})`);
          }
          if (clash.length) console.log(`⚠ [작업 중 폴더를 다른 세션이 고침] ${clash.length}건: ${clash.slice(0, 3).join(" · ")}${clash.length > 3 ? ` 외 ${clash.length - 3}건` : ""} — 같은 폴더 동시 작업인지 두 세션에 확인(주인님 승인으로 넘겨받은 경우면 표의 줄을 고칠 것)`);
        } catch { /* 무시 */ }
      }
    } catch { /* 읽기 실패는 무시 */ }
    // 세션 트레일러 이행률(2026-10-23): 트레일러 도입(15:20) 이후·최근 7일 커밋 중 `AIMaster-Session:`이 붙은 비율 — 규칙이 지켜지는지 매번 보이게
    try {
      const since = new Date(Math.max(new Date("2026-10-23T15:20:00").getTime(), Date.now() - 7 * 24 * 3600_000)).toISOString();
      const commits = git(["log", `--since=${since}`, "--format=%h|%(trailers:key=AIMaster-Session,valueonly,separator=%x2C)"]).split("\n").filter(Boolean);
      const tagged = commits.filter((l) => l.split("|")[1]).length;
      if (commits.length) console.log(`[세션 이름 표시] 최근 커밋 ${commits.length}개 중 ${tagged}개(${Math.round((tagged / commits.length) * 100)}%)에 세션 이름 — 나머지는 「세션 미상」(도우미 --as 또는 AIMASTER_SESSION=<세션> git commit, 멀티세션 규칙 §2-1)`);
    } catch { /* 기록 실패는 무시 */ }
    // 원인 확정 관찰(2026-10-23): 안전 커밋 도우미 「공용 스테이징 맞추기」 잠금 수정 뒤 24시간 축소가 없으면 원인 확정 — 사람이 날짜를 기억하지 않아도 되게
    const OBSERVE = { from: new Date("2026-10-23T14:07:00"), what: "safe-commit 잠금 수정 a88f09453" };
    const after = [];
    for (let i = 1; i < rows.length; i++) if (rows[i].shrunk && !rows[i - 1].shrunk && rows[i].at >= OBSERVE.from) after.push(`${rows[i].at.toISOString().slice(5, 10)} ${rows[i].when}(직전 ${rows[i - 1].tag})`);
    const hours = (Date.now() - OBSERVE.from.getTime()) / 3600_000;
    const covered = rows.length && rows[0].at <= OBSERVE.from; // 기록이 관찰 시작부터 남아 있는지(보관 줄 수에 밀려 지워졌으면 판단 불가)
    if (hours < 48) {
      if (after.length) console.log(`⚠ [축소 원인 관찰] ${OBSERVE.what} 뒤에도 축소 ${after.length}번: ${after.join(" · ")} — 원인이 그것만이 아님. 직전 기록을 docs/ERROR_LESSONS.md 14:00 항목에 덧붙이기`);
      else if (hours >= 24) console.log(`⚠ [축소 원인 관찰 끝] ${OBSERVE.what} 뒤 ${Math.floor(hours)}시간 축소 0번${covered ? "" : "(단, 기록이 관찰 시작부터 남아 있지 않음)"} — 원인 확정 정리: docs/ERROR_LESSONS.md 14:00 항목에 「확정」·경고 기준 유지 여부, 그 뒤 이 관찰 코드 삭제`);
      else console.log(`[축소 원인 관찰] ${OBSERVE.what} 뒤 ${hours.toFixed(1)}시간째 · 축소 0번 (24시간 지나면 ⚠로 알림)`);
    }
    console.log = realLog;
    if (out.some((l) => l.startsWith("⚠"))) for (const l of out) console.log(l);
    else {
      const pick = (re) => (out.join("\n").match(re) ?? [])[1];
      const named = pick(/세션 이름 표시\] 최근 커밋 \d+개 중 \d+개\((\d+%)\)/);
      const obs = pick(/뒤 (\d+\.\d)시간째 · 축소 0번/);
      const ev = out.some((l) => l.startsWith("[공용 스테이징 잠금 증거]"));
      console.log(`[공용 스테이징] 이상 없음 — ${entries}개 = HEAD ${head}개 · 24시간 축소 0번 · 잠금·묵은 항목 없음${named && parseInt(named, 10) < 90 ? ` · 세션 이름 ${named}(도우미는 2026-10-23부터 이름 필수)` : ""}${obs ? ` · 원인 관찰 ${obs}시간째` : ""}${ev ? ` · 24시간 안 잠금 증거 있음(${shown(evidencePath)})` : ""}`);
    }
    if (activeList) console.log(activeList.length > 600 ? `${activeList.slice(0, 600)}… (전체 docs/ACTIVE_WORK.md)` : activeList);
  }
} catch (e) {
  if (!quiet) console.error(`[공용 스테이징 기록] 실패 — ${e.message.split("\n")[0]}`);
}
