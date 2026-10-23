#!/usr/bin/env node
// 공용 스테이징(.git/index) 블랙박스 — 2026-10-23 (Claude Code 윈도우)
// 2026-10-23 공용 스테이징이 두 번(11:13경 65개, 13:28 11개) 비워졌는데 「누가 무엇을 한 직후인지」 증거가 없었다.
// 부를 때마다 .git/aimaster-index-log.txt에 한 줄: 시각 · 장비 · pid · 부른 곳 · index 크기·수정 시각 · 항목 수 · HEAD 파일 수.
// 직전 기록보다 항목 수가 절반 아래로 줄었으면 ⚠와 직전 기록을 보여 준다(막지는 않음). 4만 줄을 넘으면 최근 3만 줄만 유지(약 이틀 이상 — 24시간 관찰이 가능하도록, 2026-10-23 2,000줄에서 늘림). 커밋되지 않는 파일(.git 안).
// 사용: node scripts/index-watch.mjs <부른 곳> [--quiet]   예: session-check, pre-commit, pre-push, safe-commit:start
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
  const indexPath = join(gitDir, "index");
  const st = existsSync(indexPath) ? statSync(indexPath) : null;
  const entries = st ? git(["ls-files"]).split("\n").filter(Boolean).length : 0;
  let head = 0;
  try { head = git(["ls-tree", "-r", "--name-only", "HEAD"]).split("\n").filter(Boolean).length; } catch { /* 첫 커밋 전 */ }
  const pad = (n) => String(n).padStart(2, "0");
  const t = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  const line = [t(new Date()), hostname(), `pid=${process.ppid}`, tag, `index=${st ? st.size : "없음"}B@${st ? t(st.mtime) : "-"}`, `entries=${entries}`, `head=${head}`, process.env.GIT_INDEX_FILE ? `GIT_INDEX_FILE=${process.env.GIT_INDEX_FILE}` : ""].filter(Boolean).join(" | ");
  const logPath = join(gitDir, "aimaster-index-log.txt");
  const prev = existsSync(logPath) ? readFileSync(logPath, "utf8").trimEnd().split("\n") : [];
  const last = prev[prev.length - 1];
  const lastEntries = Number((last?.match(/entries=(\d+)/) ?? [])[1] ?? 0);
  appendFileSync(logPath, line + "\n");
  if (prev.length > 40000) writeFileSync(logPath, [...prev.slice(-30000), line].join("\n") + "\n");
  const shrunk = (lastEntries > 200 && entries * 2 < lastEntries) || (head > 200 && entries * 2 < head);
  if (shrunk) {
    console.error(`⚠ [공용 스테이징 축소 감지] 지금 ${entries}개 (HEAD ${head}개, 직전 기록 ${lastEntries}개)`);
    console.error(`  직전 기록: ${last ?? "(없음)"}`);
    console.error(`  기록 전체: ${logPath} — 줄어든 시각(index=…@시각) 앞뒤 줄의 장비·부른 곳으로 원인을 좁힌다. 고치기 전에 주인님께(루트 CLAUDE.md 최상단).`);
  } else if (!quiet) console.log(`[공용 스테이징 기록] ${entries}개 · HEAD ${head}개 · index 수정 ${st ? t(st.mtime) : "-"}`);
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
