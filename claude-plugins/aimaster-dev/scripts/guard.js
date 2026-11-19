#!/usr/bin/env node
// AIMaster 금지 명령 차단 훅(PreToolUse) — 루트 CLAUDE.md 「저장소 대량 삭제 사고 재발 방지」·「.env* 덮어쓰기 사고 재발 방지」를 실행 전에 막는다.
// 입력: 표준 입력의 훅 JSON(tool_name, tool_input). 출력: 막을 때만 permissionDecision(deny 또는 ask) JSON.
// 판단하지 못하면 항상 통과시킨다(이 훅 때문에 작업이 멈추지 않게). 시험: node --test scripts/guard.test.js
"use strict";
const fs = require("fs");
const path = require("path");

const deny = (reason) => ({ decision: "deny", reason });
const ask = (reason) => ({ decision: "ask", reason });

const HELPERS =
  "일반 파일은 `node scripts/commit-paths.mjs \"<메시지>\" <경로>... --as <세션>`, 공용 문서는 `node scripts/safe-commit.mjs`를 씁니다.";

/** heredoc 본문을 지우고, 따옴표 안 글자는 자리표시 Q로 바꾼다(커밋 메시지 속 문구를 명령으로 오해하지 않게) */
function strip(command) {
  return String(command)
    .replace(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2(?=\s|$)/g, " ")
    .replace(/"(?:[^"\\]|\\.)*"|'[^']*'/g, "Q");
}

function isEnvFile(p) {
  const base = path.basename(String(p || "").replace(/["']/g, ""));
  if (!/^\.env(\..+)?$/.test(base)) return false;
  return !/\.(example|sample|template|dist)$/.test(base);
}

function checkGit(tokens) {
  let i = 0;
  let massDelete = false;
  while (i < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[i])) {
    if (/^AIMASTER_ALLOW_MASS_DELETE=1/.test(tokens[i])) massDelete = true;
    i++;
  }
  if (tokens[i] !== "git") return null;
  i++;
  while (i < tokens.length && tokens[i].startsWith("-")) {
    i += tokens[i] === "-C" || tokens[i] === "-c" ? 2 : 1;
  }
  const sub = tokens[i];
  const args = tokens.slice(i + 1);
  const has = (...flags) => args.some((a) => flags.includes(a));
  const shortHas = (ch) => args.some((a) => /^-[A-Za-z]+$/.test(a) && a.includes(ch));

  if (massDelete) return ask("AIMASTER_ALLOW_MASS_DELETE=1은 주인님이 승인한 실제 대량 삭제에만 붙입니다. 승인받으셨습니까?");
  if (has("--no-verify")) return deny("`--no-verify`로 커밋·푸시 차단 훅을 건너뛰지 않습니다(대량 삭제 사고 재발 방지).");

  if (sub === "add" && (has("-A", "--all", ".") || shortHas("A"))) {
    return deny("`git add -A`·`git add .`은 공용 스테이징에 다른 세션의 변경을 섞습니다. 내 경로만 지정하거나 커밋 도우미를 씁니다. " + HELPERS);
  }
  if (sub === "commit") {
    if (has("--all") || shortHas("a")) return deny("`git commit -a`는 쓰지 않습니다. " + HELPERS);
    if (shortHas("n")) return deny("`git commit -n`(훅 건너뛰기)은 쓰지 않습니다.");
    const sep = args.indexOf("--");
    if (sep === -1 || sep === args.length - 1) {
      return deny("경로 없는 `git commit`은 공용 스테이징 전체를 커밋합니다. " + HELPERS + " 도우미를 쓸 수 없을 때만 `git commit -m \"…\" -- <경로>`.");
    }
  }
  if (sub === "push" && (has("--force", "--force-with-lease", "-f") || args.some((a) => a.startsWith("--force")))) {
    return ask("force-push는 주인님 승인이 필요한 작업입니다. 승인받으셨습니까?");
  }
  if (sub === "reset" && has("--hard")) return deny("`git reset --hard`는 다른 세션의 미커밋 작업을 지웁니다. 인덱스 복구는 주인님 승인 뒤 `git read-tree HEAD` 한 번만 씁니다.");
  if (sub === "stash" && !["list", "show"].includes(args[0])) return deny("`git stash`는 다른 세션의 미커밋 작업을 숨깁니다. 쓰지 않습니다.");
  if ((sub === "checkout" || sub === "restore") && has(".")) return deny("`git " + sub + " .`은 다른 세션의 미커밋 작업을 지웁니다. 파일을 하나씩 지정합니다.");
  return null;
}

function checkBash(command) {
  const noHeredoc = String(command).replace(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2(?=\s|$)/g, " ");
  const stripped = strip(command);

  if (/\brm\b[^\n;&|]*\.git\/(index|safe-commit-index)(\.lock)?(\s|$)/.test(stripped)) {
    return deny("`.git/index`·잠금 파일은 지우지 않습니다. 잠금이 있으면 기다리고, 인덱스가 이상하면 멈추고 주인님께 알립니다.");
  }

  // .env* 덮어쓰기: `> .env`(추가 `>>`는 허용), `tee .env`(-a 없이)
  const redirect = /(^|[^>&\d])>\s*(["']?)([^\s"'|;&>]+)\2/g;
  let m;
  while ((m = redirect.exec(noHeredoc))) {
    if (isEnvFile(m[3])) return deny("`.env*` 파일은 덮어쓰지 않습니다(2026-11-14 사고). 저장소 밖에 사본을 뜬 뒤 줄 추가(`>>`)만 하고, 인수인계 글은 `docs/`에 씁니다.");
  }
  const tee = /\btee\b((?:\s+-\S+)*)\s+(["']?)([^\s"'|;&]+)\2/g;
  while ((m = tee.exec(noHeredoc))) {
    if (isEnvFile(m[3]) && !/(^|\s)(-a|--append)(\s|$)/.test(m[1])) return deny("`tee`로 `.env*` 파일을 덮어쓰지 않습니다. 줄 추가는 `tee -a`를 씁니다.");
  }

  for (const seg of stripped.split(/&&|\|\||[;|\n]/)) {
    const tokens = seg.trim().replace(/^[({]\s*/, "").split(/\s+/).filter(Boolean);
    const r = tokens.length ? checkGit(tokens) : null;
    if (r) return r;
  }
  return null;
}

function checkFile(toolName, filePath) {
  if (!isEnvFile(filePath)) return null;
  if (toolName === "Write") {
    if (fs.existsSync(filePath)) return deny("이미 있는 `.env*` 파일을 통째로 다시 쓰지 않습니다(2026-11-14 사고). 사본을 뜬 뒤 줄 추가만 합니다.");
    return ask("새 `.env*` 파일을 만듭니다. 비밀값은 주인님이 직접 넣는 것이 원칙입니다. 계속할까요?");
  }
  return ask("`.env*` 파일을 고칩니다. 저장소 밖에 사본을 떠 두었고, 인수인계 글이 아닌 `이름=값` 줄만 고치는 것이 맞습니까?");
}

function evaluate(input) {
  const tool = input && input.tool_name;
  const ti = (input && input.tool_input) || {};
  if (tool === "Bash") return checkBash(ti.command || "");
  if (tool === "Write" || tool === "Edit" || tool === "MultiEdit") return checkFile(tool, ti.file_path || "");
  return null;
}

module.exports = { checkBash, checkFile, evaluate };

if (require.main === module) {
  let raw = "";
  process.stdin.on("data", (d) => (raw += d));
  process.stdin.on("end", () => {
    try {
      const r = evaluate(JSON.parse(raw));
      if (r) {
        process.stdout.write(JSON.stringify({
          hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: r.decision,
            permissionDecisionReason: "[aimaster-dev] " + r.reason,
          },
        }));
      }
    } catch (_) { /* 판단 불가 → 통과 */ }
    process.exit(0);
  });
}
