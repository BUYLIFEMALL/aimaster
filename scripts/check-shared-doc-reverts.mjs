#!/usr/bin/env node
// 공용 문서 「되돌림」 경고 — 2026-10-23 (Claude Code 윈도우, docs/PROPOSAL_20261023_SHARED_DOC_OVERWRITE.md 방안 B)
// 이번 커밋(스테이징)이 공용 문서에서 지우는 줄 가운데 「최근 2시간 안 다른 커밋이 넣은 줄」이 있으면 경고만 한다(커밋은 막지 않음).
// 흔한 원인: 파일을 읽은 뒤 몇 분 지나 커밋하는 사이 다른 세션 커밋이 들어옴 → 예전 내용으로 덮어씀.
// 사용: node scripts/check-shared-doc-reverts.mjs --staged   (pre-commit 훅이 부름. 별도 인덱스(GIT_INDEX_FILE)로 커밋해도 그 인덱스를 본다)
import { execFileSync } from "node:child_process";

const SHARED = [
  "docs/HANDOFF.md", "docs/PENDING_DEPLOYS.md", "docs/PROGRAM_CAPABILITY_MAP.md", "docs/SHARED_MODULES.md",
  "docs/PROGRAM_IDEA_BACKLOG.md", "docs/ERROR_LESSONS.md", "docs/ACTIVE_WORK.md", "docs/VERCEL_COST_REDUCTION_PLAN.md",
  "CLAUDE.md", "AGENTS.md", "GEMINI.md", "DESIGN.md",
];
// 여러 세션이 함께 고치는 공용 스크립트 — 되돌림 감사 대상은 아니고(코드 정리의 줄 삭제가 잦음) 「안전 커밋 도우미를 쓰세요」 알림만(2026-10-23,
// 다른 세션이 파일 통째로 커밋하며 남의 미커밋 수정이 섞인 48b3fc4d0 등 재발 방지)
const SHARED_SCRIPTS = [
  "scripts/deploy.mjs", "scripts/safe-commit.mjs", "scripts/program-info.mjs", "scripts/pending-check.mjs",
  "scripts/check-shared-doc-reverts.mjs", "scripts/check-shared-modules.mjs", "scripts/check-mobile-account.mjs",
  "scripts/check-index-health.mjs", "scripts/mac-mini/commit-gate.sh",
];
const isSharedScript = (f) => SHARED_SCRIPTS.includes(f) || f.startsWith("scripts/git-hooks/");
const WINDOW = "2 hours ago";
// 지운 줄이 「고친 것」인지: 같은 커밋의 새 줄 중 앞 30자가 같거나, 같은 `코드 이름`(표의 slug 등)을 가진 줄이 있으면 고친 것(2026-10-23)
const codeKey = (l) => (l.match(/`([^`]{3,})`/) || [])[1];
const editedSet = (plus) => ({ heads: new Set(plus.map((l) => l.slice(0, 30))), codes: new Set(plus.map(codeKey).filter(Boolean)) });
const isEdited = (l, e) => e.heads.has(l.slice(0, 30)) || (codeKey(l) && e.codes.has(codeKey(l)));
const git = (...a) => execFileSync("git", a, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });

// --audit [시간]: 최근 N시간(기본 24) 커밋을 훑어, 각 커밋이 지운 줄 중 「그 커밋 직전 2시간 안 다른 커밋이 넣은 줄」이 있던 커밋 목록(놓친 덮어쓰기 찾기, 2026-10-23)
if (process.argv.includes("--audit")) {
  const hours = Number(process.argv[process.argv.indexOf("--audit") + 1]) || 24;
  const lines = (t) => t.split("\n");
  const commits = git("log", `--since=${hours} hours ago`, "--reverse", "--format=%H %ct %s", "--", ...SHARED).split("\n").filter(Boolean);
  const found = [];
  for (const c of commits) {
    const [sha, ct, ...msg] = c.split(" ");
    let parent;
    try { parent = git("rev-parse", `${sha}^`).trim(); } catch { continue; }
    const files = git("diff", "--name-only", parent, sha, "--", ...SHARED).split("\n").filter(Boolean);
    for (const file of files) {
      const d = lines(git("diff", "-U0", parent, sha, "--", file));
      const removed = d.filter((l) => l.startsWith("-") && !l.startsWith("---")).map((l) => l.slice(1).trimEnd()).filter((l) => l.trim().length > 12);
      if (!removed.length) continue;
      const plus = d.filter((l) => l.startsWith("+") && !l.startsWith("+++")).map((l) => l.slice(1).trimEnd());
      const readded = new Set(plus);
      // 같은 머리말(앞 30자)로 시작하는 새 줄이 같은 커밋에 있으면 「그 줄을 고친 것」으로 보고 뺌(표 버전 칸 갱신 등)
      const ed = editedSet(plus);
      const since = Number(ct) - 2 * 3600;
      const recent = lines(git("log", `--since=${since}`, "--format=", "-p", parent, "--", file));
      const added = new Set(recent.filter((l) => l.startsWith("+") && !l.startsWith("+++")).map((l) => l.slice(1).trimEnd()));
      const hits = removed.filter((l) => added.has(l) && !readded.has(l) && !isEdited(l, ed));
      if (!hits.length) continue;
      // 지금 HEAD에 그 줄이 남아 있으면(다시 반영·다른 곳으로 옮김) 「복구됨」, 없으면 「사라짐」
      let head = "";
      try { head = git("show", `HEAD:${file}`); } catch {}
      const headLines = new Set(lines(head).map((l) => l.trimEnd()));
      let lost = hits.filter((l) => !headLines.has(l));
      // PENDING_DEPLOYS에서 배포 커밋이 대기 줄을 빼는 건 정해진 절차(docs/PENDING_DEPLOYS.md 쓰는 법) — 사라짐으로 세지 않음
      // 작업 중 표(ACTIVE_WORK)에서 표 줄을 지우는 것도 정해진 절차(작업 끝나면 내 줄 삭제) — 표 줄만 지운 경우 「작업 끝 정리」(2026-10-23)
      const shipped = (file === "docs/PENDING_DEPLOYS.md" && /deploy|shipped|v\d+\.\d{2}/i.test(msg.join(" ")))
        || (file === "docs/ACTIVE_WORK.md" && lost.every((l) => l.startsWith("| `")));
      if (shipped) lost = [];
      // 커밋한 세션(도우미 --as가 남긴 `AIMaster-Session:` 트레일러, 없으면 빈 값 = 세션 미상) — 담당이 자기 커밋을 확인하도록(2026-10-23)
      const session = (git("log", "-1", "--format=%(trailers:key=AIMaster-Session,valueonly)", sha) || "").trim().split("\n")[0];
      found.push({ sha: sha.slice(0, 9), when: new Date(Number(ct) * 1000).toLocaleString("ko-KR"), msg: msg.join(" ").slice(0, 70), file, n: hits.length, lost, shipped, session, sample: (lost[0] || hits[0]).slice(0, 90) });
    }
  }
  // 확인 목록(scripts/reverts-reviewed.txt, 「sha 메모」 한 줄씩): 사람이 의도한 정리로 확인한 커밋은 「✓ 확인됨」으로만 표시
  let reviewed = new Map();
  try {
    const t = (await import("node:fs")).readFileSync(new URL("./reverts-reviewed.txt", import.meta.url), "utf8");
    reviewed = new Map(t.split(/\r?\n/).filter((l) => /^[0-9a-f]{7,}/.test(l)).map((l) => [l.split(/\s+/)[0].slice(0, 9), l.replace(/^\S+\s*/, "")]));
  } catch {}
  for (const f of found) if (f.lost.length && reviewed.has(f.sha)) { f.reviewed = reviewed.get(f.sha); f.lost = []; }
  const lostAll = found.filter((f) => f.lost.length);
  // --json: 다른 스크립트(deploy.mjs --version-only --all, pending-check --publish)가 읽는 요약
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify({ hours, commits: commits.length, suspect: found.length, lost: lostAll.map((f) => ({ sha: f.sha, when: f.when, file: f.file, lines: f.lost.length, msg: f.msg, session: f.session, sample: f.sample })) }));
    process.exit(0);
  }
  console.log(`[되돌림 감사] 최근 ${hours}시간 공용 문서 커밋 ${commits.length}개 중 의심 ${found.length}건 — 지금 HEAD에서 사라진 줄이 있는 것 ${lostAll.length}건`);
  for (const f of found) console.log(`  ${f.lost.length ? "⚠ 사라짐" : f.reviewed ? `✓ 확인됨(${f.reviewed})` : f.shipped ? (f.file === "docs/ACTIVE_WORK.md" ? "✓ 작업 끝 정리" : "✓ 배포로 정리") : "✓ 복구됨"} ${f.sha}${f.session ? ` (세션 ${f.session})` : ""} ${f.when} ${f.file} −${f.n}줄${f.lost.length ? `(지금 없음 ${f.lost.length}줄)` : ""} | ${f.msg}\n      예: ${f.sample}`);
  // --lost: 사라진 줄 원문 출력(되살릴 때 참고)
  if (process.argv.includes("--lost")) for (const f of lostAll) { console.log(`\n--- ${f.sha} ${f.file} 사라진 줄 ---`); for (const l of f.lost) console.log(l); }
  if (found.length) console.log("  ※ 의도한 정리(줄 옮기기·대기 줄을 내보낸 기록으로 등)도 잡힐 수 있습니다. 지워진 줄이 지금 HEAD에 다른 곳으로 남았는지 확인 후 되살리세요.");
  process.exit(0);
}

let staged;
try { staged = git("diff", "--cached", "--name-only").split("\n").filter(Boolean); } catch { process.exit(0); }
const targets = staged.filter((f) => SHARED.includes(f));
const scriptTargets = staged.filter(isSharedScript);
// --block-scripts(2026-10-23, 주인님 승인 제안): 공용 스크립트를 일반 git commit으로 올리면 커밋을 막는다.
// 일반 커밋은 그 파일의 다른 세션 미커밋 수정까지 통째로 담기 때문(48b3fc4d0 사고). 안전 커밋 도우미는 이 훅을 거치지 않아 막히지 않는다.
// 혼자 고친 것을 확인한 경우만 AIMASTER_SHARED_SCRIPT_OK=1 로 통과.
if (process.argv.includes("--block-scripts")) {
  if (!scriptTargets.length || process.env.AIMASTER_SHARED_SCRIPT_OK === "1") process.exit(0);
  console.error(`\n⛔ [공용 스크립트 차단] ${scriptTargets.join(", ")} 를 일반 git commit으로 커밋하려 해 멈췄습니다.
  여러 세션이 고치는 파일이라, 일반 커밋은 그 파일에 있는 다른 세션의 미커밋 수정까지 함께 담습니다(48b3fc4d0 사고).
  이렇게 하세요:
    1) 고치기 전에  node scripts/safe-commit.mjs --begin <파일> --as <세션이름>
    2) 고친 뒤      node scripts/safe-commit.mjs "<메시지>" <파일> --as <세션이름> --push
  이미 고쳤다면: git diff -- <파일> 로 내가 쓴 줄만 있는지 확인한 뒤에만 AIMASTER_SHARED_SCRIPT_OK=1 git commit ...
  (docs/CLI_COLLABORATION_RULES.md 9번)\n`);
  process.exit(1);
}
if (scriptTargets.length) console.error(`\nℹ [공용 스크립트] ${scriptTargets.join(", ")} 를 일반 git commit으로 커밋합니다. 다른 세션도 고치는 파일이라, 작업 파일에 남의 미커밋 수정이 있으면 함께 들어갑니다(예: 48b3fc4d0).\n  고치기 전에 node scripts/safe-commit.mjs --begin <파일> --as <세션이름> 로 기준 사본을 떠 두고, 커밋도 safe-commit으로 하세요(docs/CLI_COLLABORATION_RULES.md 9번). 지금 커밋 전이면 git diff -- <파일> 로 내가 쓴 줄만 있는지 확인.`);
if (!targets.length) process.exit(0);
// 안전 커밋 도우미(safe-commit.mjs)는 이 훅을 거치지 않음 → 여기 왔다면 공용 문서를 일반 git commit으로 커밋하는 중(2026-10-23)
console.error(`\nℹ [공용 문서] ${targets.join(", ")} 를 일반 git commit으로 커밋합니다. 다른 세션 내용을 지키려면 다음부터 안전 커밋 도우미를 쓰세요:\n  node scripts/safe-commit.mjs --begin <파일> --as <세션이름>  →  고침  →  node scripts/safe-commit.mjs "<메시지>" <파일> --as <세션이름> --push  (docs/CLI_COLLABORATION_RULES.md 9번)`);

const warnings = [];
for (const file of targets) {
  // 이번 커밋이 지우는 줄(빈 줄·아주 짧은 줄 제외)
  const removed = git("diff", "--cached", "-U0", "--", file).split("\n")
    .filter((l) => l.startsWith("-") && !l.startsWith("---")).map((l) => l.slice(1).trimEnd()).filter((l) => l.trim().length > 12);
  if (!removed.length) continue;
  // 최근 2시간 커밋이 넣은 줄
  let recent = "";
  try { recent = git("log", `--since=${WINDOW}`, "--format=", "-p", "--", file); } catch { continue; }
  const added = new Set(recent.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++")).map((l) => l.slice(1).trimEnd()));
  // 같은 줄을 다시 넣는 경우(내용만 옮김)는 빼고 셈
  const plusLines = git("diff", "--cached", "-U0", "--", file).split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++")).map((l) => l.slice(1).trimEnd());
  const readded = new Set(plusLines);
  const ed = editedSet(plusLines);
  const hits = removed.filter((l) => added.has(l) && !readded.has(l) && !isEdited(l, ed));
  if (hits.length) warnings.push({ file, hits });
}

if (warnings.length) {
  console.error("\n⚠ [공용 문서 되돌림 경고] 이번 커밋이 최근 2시간 안 다른 커밋이 넣은 줄을 지웁니다(커밋은 계속 진행됩니다).");
  for (const w of warnings) {
    console.error(`  • ${w.file}: ${w.hits.length}줄`);
    for (const l of w.hits.slice(0, 3)) console.error(`      - ${l.slice(0, 110)}${l.length > 110 ? "…" : ""}`);
  }
  console.error("  의도한 정리가 아니면: 최신 HEAD를 다시 읽어 「HEAD + 내 변경」만 커밋하고, 지운 줄은 다음 커밋으로 되살리세요(docs/PROPOSAL_20261023_SHARED_DOC_OVERWRITE.md).\n");
}
process.exit(0);
