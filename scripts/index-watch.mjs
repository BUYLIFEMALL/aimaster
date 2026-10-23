#!/usr/bin/env node
// 공용 스테이징(.git/index) 블랙박스 — 2026-10-23 (Claude Code 윈도우)
// 2026-10-23 공용 스테이징이 두 번(11:13경 65개, 13:28 11개) 비워졌는데 「누가 무엇을 한 직후인지」 증거가 없었다.
// 부를 때마다 .git/aimaster-index-log.txt에 한 줄: 시각 · 장비 · pid · 부른 곳 · index 크기·수정 시각 · 항목 수 · HEAD 파일 수.
// 직전 기록보다 항목 수가 절반 아래로 줄었으면 ⚠와 직전 기록을 보여 준다(막지는 않음). 4만 줄을 넘으면 최근 3만 줄만 유지(약 이틀 이상 — 24시간 관찰이 가능하도록, 2026-10-23 2,000줄에서 늘림). 커밋되지 않는 파일(.git 안).
// 사용: node scripts/index-watch.mjs <부른 곳> [--quiet]   예: session-check, pre-commit, pre-push, safe-commit:start
//       node scripts/index-watch.mjs commit-gate --stale-only   묵은 스테이징 항목만 확인(있으면 종료 코드 3)
// 잠금(.git/index.lock)이 5분 넘게 남으면 잠금 하나당 한 번 .git/aimaster-lock-evidence.txt에 그때 프로세스·전후 기록을 남긴다.
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import { join, resolve } from "node:path";

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
  const line = [t(new Date()), hostname(), `pid=${process.ppid}`, tag, `index=${st ? st.size : "없음"}B@${st ? t(st.mtime) : "-"}`, `entries=${entries}`, `head=${head}`, lockAge === null ? "" : `lock=${lockAge}s`, process.env.GIT_INDEX_FILE ? `GIT_INDEX_FILE=${process.env.GIT_INDEX_FILE}` : ""].filter(Boolean).join(" | ");
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
      }
    } catch { /* 증거 기록 실패는 무시 */ }
  }
  // git 잠금이 5분 넘게 남아 있으면 — 일반 커밋·스테이징 맞추기가 모두 멈춘 상태(지우지 말고 확인)
  const printLock = () => { if (lockAge !== null && lockAge > 300) console.log(`⚠ [공용 스테이징 잠금 오래 남음] .git/index.lock ${Math.round(lockAge / 60)}분째 — 일반 커밋과 도우미의 스테이징 맞추기가 모두 멈춘 상태. 지우지 말고 git 프로세스(장비 두 곳)를 확인한 뒤 주인님께(루트 CLAUDE.md 최상단). 그때 돌던 프로세스·기록: ${evidencePath}`); };
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
    console.log(`${lockAge !== null ? "⚠ " : ""}[공용 스테이징 잠금 증거] ${head1.replace(/ · 부른 곳 .*/, "")} · 의심: ${suspect.length > 140 ? `${suspect.slice(0, 140)}…` : suspect} — 전체 ${evidencePath}`);
  };
  const shrunk = (lastEntries > 200 && entries * 2 < lastEntries) || (head > 200 && entries * 2 < head);
  if (shrunk) {
    console.error(`⚠ [공용 스테이징 축소 감지] 지금 ${entries}개 (HEAD ${head}개, 직전 기록 ${lastEntries}개)`);
    console.error(`  직전 기록: ${last ?? "(없음)"}`);
    console.error(`  기록 전체: ${logPath} — 줄어든 시각(index=…@시각) 앞뒤 줄의 장비·부른 곳으로 원인을 좁힌다. 고치기 전에 주인님께(루트 CLAUDE.md 최상단).`);
  } else if (!quiet) console.log(`[공용 스테이징 기록] ${entries}개 · HEAD ${head}개 · index 수정 ${st ? t(st.mtime) : "-"}`);
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
  if (tag === "session-check") {
    const since = Date.now() - 24 * 3600_000;
    const rows = [...prev, line].map((l) => {
      const m = l.match(/^(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d) \| ([^|]+) \| pid=(\d+) \| ([^|]+) \|.*entries=(\d+) \| head=(\d+)/);
      return m ? { at: new Date(m[1].replace(" ", "T")), when: m[1].slice(11), host: m[2].trim(), pid: m[3], tag: m[4].trim(), shrunk: Number(m[6]) > 200 && Number(m[5]) * 2 < Number(m[6]), n: m[5] } : null;
    }).filter(Boolean);
    const starts = [];
    for (let i = 1; i < rows.length; i++) if (rows[i].shrunk && !rows[i - 1].shrunk && rows[i].at.getTime() >= since) starts.push(`${rows[i].when}(${rows[i].n}개, 직전 ${rows[i - 1].when} ${rows[i - 1].tag} pid=${rows[i - 1].pid}${rows[i - 1].host !== rows[i].host ? ` · 장비 ${rows[i - 1].host}→${rows[i].host}` : ""})`);
    const first = rows.find((r) => r.at.getTime() >= since);
    console.log(starts.length
      ? `⚠ [공용 스테이징 축소 이력] 최근 24시간 ${starts.length}번: ${starts.join(" · ")} — 기록 ${logPath}`
      : `[공용 스테이징 축소 이력] 최근 24시간 없음 (기록 ${first ? first.when + "부터" : "없음"})`);
    printLock();
    printEvidence(false);
    // 묵은 스테이징 항목(위 staleEntries 설명)
    try { printStale(staleEntries()); } catch { /* 기록 실패는 무시 */ }
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
  }
} catch (e) {
  if (!quiet) console.error(`[공용 스테이징 기록] 실패 — ${e.message.split("\n")[0]}`);
}
