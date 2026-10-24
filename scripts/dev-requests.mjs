#!/usr/bin/env node
// 관리자 「개발 문서 관리」(/admin/dev-docs)에서 저장한 수정안·관리자 지시·역할 메모를 확인·반영하는 CLI 도구 — 2026-10-24 (Claude Code 윈도우 `claude-win-dotori`)
// 주인님 지시: 「내가 다는 코멘트 지시사항은 관리자로서 절대적이고 따라야 할 지시사항이자 요청사항이야」 → 지시(doc_comment)·메모(role_note)는 절대 지시로 다룬다.
//
// 사용:
//   node scripts/dev-requests.mjs list [--role <역할 ID>] [--all]     대기 중(open) 요청 보기 — 작업 시작 때 꼭 실행
//   node scripts/dev-requests.mjs show <id>                            요청 하나 자세히(수정본·지시 전문)
//   node scripts/dev-requests.mjs apply <id> --as <세션> [--push]      반영: 수정안은 3-way 병합, 지시는 문서 맨 위에 옮겨 적기 → 안전 커밋 → 「반영됨」 기록
//   node scripts/dev-requests.mjs done <id> --as <세션> [--note "…"]  역할 메모를 읽고 따랐음을 기록
//   node scripts/dev-requests.mjs reject <id> --as <세션> --reason "…" 반려(이유를 화면에 남김 — 관리자 지시는 반려하지 말고 주인님께 먼저 여쭌다)
//
// 세션 → 주인님 방향(2026-10-24 마이그레이션 0044, 주인님 지시 「작업요청한 내용에 대한 결과를 받아 볼 수 있도록」「내가 해줘야 할 요청사항도 카테고리별로」):
//   node scripts/dev-requests.mjs report --title "<맡긴 일>" --summary "<결과 요약>" --as <세션> [--request <요청id>] [--link <프로그램 주소>] [--commit <해시>] [--cost "<비용>"]
//        작업이 끝날 때마다 결과를 남긴다 → 관리자 화면 「수정 요청함 › 📬 작업 결과」
//   node scripts/dev-requests.mjs ask --category <분류> --title "<해 주실 일>" --as <세션> [--note "<자세히>"] [--link <주소>]
//        주인님 승인·조치가 필요할 때 채팅으로 여쭙는 것과 함께 올린다 → 「🙋 내가 해 줄 일」(주인님이 화면에서 완료 처리)
//        분류: approval(승인·결정) cost(비용 승인) account(로그인·계정) db(DB SQL 실행) install(PC 설치·확장) check(화면 확인·검수) external(외부 서비스 설정) etc(기타)
//   node scripts/dev-requests.mjs asks [--all]                       주인님께 올려 둔 「해 줄 일」 보기(처리 여부 확인)
// 서버 키는 로컬 .env.local(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY 또는 SUPABASE_SERVICE_ROLE_KEY)에서 읽는다. 키를 출력하지 않는다.
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const cmd = args[0];
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const flag = (name) => args.includes(name);

function loadEnv() {
  const env = { ...process.env };
  const p = join(ROOT, ".env.local");
  if (existsSync(p)) {
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = (env.SUPABASE_SECRET_KEY || "").trim() || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error("✖ .env.local에 NEXT_PUBLIC_SUPABASE_URL과 서버 키가 없습니다."); process.exit(1); }
  return { url: url.replace(/\/$/, ""), key };
}
const { url: SB_URL, key: SB_KEY } = loadEnv();
async function rest(path, init = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers || {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`DB 오류 ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}
const KIND = { doc_edit: "수정안", doc_comment: "관리자 지시(절대)", role_note: "역할 메모(절대)", work_result: "작업 결과", owner_action: "주인님이 해 줄 일" };
const ADMIN_KINDS = "kind=in.(doc_edit,doc_comment,role_note)&";
const CATEGORIES = { approval: "승인·결정", cost: "비용 승인", account: "로그인·계정", db: "DB SQL 실행", install: "PC 설치·확장", check: "화면 확인·검수", external: "외부 서비스 설정", etc: "기타" };
function need(name) {
  const v = opt(name);
  if (!v || !v.trim()) { console.error(`✖ ${name} "…"이 필요합니다.`); process.exit(1); }
  return v.trim();
}
function missingColumnHint(e) {
  if (String(e.message).includes("42703")) console.error("✖ DB에 0044 칸이 아직 없습니다 — supabase/migrations/0044_admin_dev_requests_results_owner_actions.sql을 주인님이 SQL 편집기에서 실행해야 합니다.");
  else console.error(`✖ ${e.message}`);
  process.exit(1);
}
const lf = (s) => s.replace(/\r\n/g, "\n");
const hash = (s) => createHash("sha256").update(lf(s)).digest("hex");
const git = (a) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8" }).trim();
const kst = (iso) => new Date(new Date(iso).getTime() + 9 * 3600000).toISOString().slice(0, 16).replace("T", " ");

async function getReq(id) {
  const rows = await rest(`admin_dev_requests?id=eq.${encodeURIComponent(id)}&select=*`);
  if (!rows?.length) { console.error(`✖ 요청 ${id}를 찾지 못했습니다.`); process.exit(1); }
  return rows[0];
}
async function mark(id, patch) {
  await rest(`admin_dev_requests?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ ...patch, handled_at: new Date().toISOString() }) });
}
function needAs() {
  const as = opt("--as");
  if (!as) { console.error("✖ --as <세션 이름>이 필요합니다."); process.exit(1); }
  return as;
}
function safeCommit(path, msg, as, push) {
  const r = spawnSync("node", ["scripts/safe-commit.mjs", msg, path, "--as", as, ...(push ? ["--push"] : [])], { cwd: ROOT, encoding: "utf8" });
  process.stdout.write(r.stdout || ""); process.stderr.write(r.stderr || "");
  if (r.status !== 0) throw new Error("안전 커밋 실패 — 위 메시지를 확인하세요.");
  return git(["log", "-1", "--format=%h", "--", path]);
}

if (cmd === "list") {
  const role = opt("--role");
  const q = (flag("--all") ? "" : "status=eq.open&") + ADMIN_KINDS;
  const rows = await rest(`admin_dev_requests?${q}select=id,kind,target_path,target_role,note,status,created_at,commit_sha&order=created_at.asc&limit=200`);
  const shown = rows.filter((r) => !role || r.target_role === role || (r.target_path || "").includes(`docs/roles/${role}.md`));
  if (!shown.length) { console.log(role ? `역할 ${role}에 대기 중인 요청이 없습니다.` : "대기 중인 요청이 없습니다."); process.exit(0); }
  console.log(`대기 중인 요청 ${shown.length}개 — 관리자 지시·메모는 절대 지시입니다. 문서 내용보다 먼저 따릅니다.\n`);
  for (const r of shown) {
    console.log(`■ ${r.id}  [${KIND[r.kind]}]  ${r.target_path || `역할 ${r.target_role}`}  (${kst(r.created_at)}${r.status !== "open" ? ` · ${r.status}` : ""})`);
    if (r.note) console.log("   " + r.note.split("\n").join("\n   "));
  }
  console.log("\n반영: node scripts/dev-requests.mjs apply <id> --as <세션>   (역할 메모는 done)");
} else if (cmd === "show") {
  const r = await getReq(args[1]);
  console.log(`[${KIND[r.kind]}] ${r.target_path || `역할 ${r.target_role}`} · ${r.status} · ${kst(r.created_at)}`);
  if (r.note) console.log(`\n지시·메모:\n${r.note}`);
  if (r.proposed_content) console.log(`\n--- 수정본 (${r.proposed_content.length}자) ---\n${r.proposed_content}`);
} else if (cmd === "apply") {
  const as = needAs();
  const r = await getReq(args[1]);
  if (r.status !== "open") { console.error(`✖ 이미 처리된 요청입니다(${r.status}).`); process.exit(1); }
  if (r.kind === "role_note") { console.error("✖ 역할 메모는 apply가 아니라 done으로 처리합니다(문서를 바꾸지 않음)."); process.exit(1); }
  const path = r.target_path;
  if (!path || path.includes("..") || !path.endsWith(".md")) { console.error("✖ 잘못된 경로"); process.exit(1); }
  const abs = join(ROOT, path);
  if (!existsSync(abs)) { console.error(`✖ ${path} 파일이 없습니다.`); process.exit(1); }

  // 안전 커밋 도우미에 「고치기 전」 상태를 먼저 알린다
  const b = spawnSync("node", ["scripts/safe-commit.mjs", "--begin", path, "--as", as], { cwd: ROOT, encoding: "utf8" });
  if (b.status !== 0) { process.stderr.write(b.stderr || ""); console.error("✖ 안전 커밋 시작 실패"); process.exit(1); }

  const raw = readFileSync(abs, "utf8");
  const crlf = raw.includes("\r\n");
  const current = lf(raw);
  let next;
  if (r.kind === "doc_edit") {
    const base = lf(r.base_content || "");
    const proposed = lf(r.proposed_content || "");
    if (hash(current) === r.base_hash || current === base) {
      next = proposed;
    } else {
      // 화면에서 수정을 시작한 뒤 문서가 바뀌었으면 3-way 병합(현재 ← 기준 → 수정본)
      const dir = mkdtempSync(join(tmpdir(), "devreq-"));
      try {
        writeFileSync(join(dir, "cur"), current); writeFileSync(join(dir, "base"), base); writeFileSync(join(dir, "prop"), proposed);
        const m = spawnSync("git", ["merge-file", "-p", join(dir, "cur"), join(dir, "base"), join(dir, "prop")], { encoding: "utf8" });
        if (m.status !== 0) {
          console.error(`✖ 그사이 바뀐 부분과 수정안이 같은 곳을 고쳐 자동으로 합칠 수 없습니다(충돌 ${m.status}곳). 문서를 바꾸지 않았습니다.\n  주인님께 알리고, 필요하면 show로 수정본을 보고 손으로 반영한 뒤 done --note로 기록하세요.`);
          process.exit(2);
        }
        next = m.stdout;
        console.log("ℹ 화면 저장 뒤 문서가 바뀌어 3-way 병합으로 합쳤습니다.");
      } finally { rmSync(dir, { recursive: true, force: true }); }
    }
  } else {
    // doc_comment: 문서 맨 위(첫 제목 바로 아래)에 절대 지시 칸으로 옮겨 적는다
    const block = [
      `> **🗣 주인님(관리자) 지시 — ${kst(r.created_at)} (관리자 화면, 요청 ${r.id.slice(0, 8)})** — **절대 지시: 이 문서의 다른 내용보다 먼저 따른다.**`,
      ...r.note.split("\n").map((l) => `> ${l}`),
      "",
    ].join("\n");
    const lines = current.split("\n");
    const h = lines.findIndex((l) => /^#\s/.test(l));
    if (h >= 0) { lines.splice(h + 1, 0, "", block.trimEnd()); next = lines.join("\n"); }
    else next = block + "\n" + current;
  }
  if (crlf) next = next.replace(/\n/g, "\r\n");
  writeFileSync(abs, next);
  const label = r.kind === "doc_edit" ? `apply admin edit ${r.id.slice(0, 8)}` : `add admin directive ${r.id.slice(0, 8)}`;
  const sha = safeCommit(path, `docs: ${label} (${path})${r.note && r.kind === "doc_edit" ? ` — ${r.note.slice(0, 60)}` : ""}`, as, flag("--push"));
  await mark(r.id, { status: "applied", handled_by: as, commit_sha: sha });
  console.log(`✔ 반영 완료 — ${path} · 커밋 ${sha} · 화면에 「반영됨」 기록`);
} else if (cmd === "done") {
  const as = needAs();
  const r = await getReq(args[1]);
  if (r.status !== "open") { console.error(`✖ 이미 처리된 요청입니다(${r.status}).`); process.exit(1); }
  await mark(r.id, { status: "applied", handled_by: as, reject_reason: opt("--note") || null });
  console.log(`✔ 처리 기록 — ${r.id}`);
} else if (cmd === "reject") {
  const as = needAs();
  const reason = opt("--reason");
  if (!reason) { console.error("✖ --reason \"…\"이 필요합니다."); process.exit(1); }
  const r = await getReq(args[1]);
  if (r.status !== "open") { console.error(`✖ 이미 처리된 요청입니다(${r.status}).`); process.exit(1); }
  if (r.kind !== "doc_edit") console.log("⚠ 관리자 지시·메모는 절대 지시입니다. 반려 전에 주인님께 확인했는지 다시 보세요.");
  await mark(r.id, { status: "rejected", handled_by: as, reject_reason: reason });
  console.log(`✔ 반려 기록 — ${r.id}`);
} else if (cmd === "report") {
  const as = needAs();
  const row = { kind: "work_result", status: "applied", title: need("--title"), note: need("--summary"), from_session: as, handled_by: as, handled_at: new Date().toISOString(),
    parent_id: opt("--request") || null, link: opt("--link") || null, commit_sha: opt("--commit") || null, cost: opt("--cost") || null };
  if (row.parent_id) await getReq(row.parent_id);
  const out = await rest("admin_dev_requests", { method: "POST", body: JSON.stringify(row) }).catch(missingColumnHint);
  console.log(`✔ 작업 결과 기록 — ${out[0].id} · 관리자 화면 「수정 요청함 › 📬 작업 결과」`);
} else if (cmd === "ask") {
  const as = needAs();
  const category = need("--category");
  if (!CATEGORIES[category]) { console.error(`✖ --category는 ${Object.keys(CATEGORIES).join("·")} 중 하나입니다.`); process.exit(1); }
  const title = need("--title");
  // 같은 세션이 같은 제목으로 이미 올려 두었으면 다시 올리지 않는다
  const dup = await rest(`admin_dev_requests?kind=eq.owner_action&status=eq.open&from_session=eq.${encodeURIComponent(as)}&title=eq.${encodeURIComponent(title)}&select=id`).catch(missingColumnHint);
  if (dup.length) { console.log(`ℹ 이미 올려 둔 요청입니다 — ${dup[0].id}`); process.exit(0); }
  const row = { kind: "owner_action", status: "open", category, title, note: opt("--note") || null, link: opt("--link") || null, from_session: as };
  const out = await rest("admin_dev_requests", { method: "POST", body: JSON.stringify(row) }).catch(missingColumnHint);
  console.log(`✔ 주인님께 요청 올림 — [${CATEGORIES[category]}] ${title} · ${out[0].id} · 관리자 화면 「수정 요청함 › 🙋 내가 해 줄 일」`);
} else if (cmd === "asks") {
  const q = flag("--all") ? "" : "status=eq.open&";
  const rows = await rest(`admin_dev_requests?kind=eq.owner_action&${q}select=id,category,title,from_session,status,created_at,handled_at&order=created_at.asc&limit=200`).catch(missingColumnHint);
  if (!rows.length) { console.log("주인님께 올려 둔 요청이 없습니다."); process.exit(0); }
  for (const r of rows) console.log(`■ ${r.id}  [${CATEGORIES[r.category] ?? r.category}]  ${r.title}  (${r.from_session} · ${kst(r.created_at)}${r.status !== "open" ? ` · ${r.status === "applied" ? "주인님 완료" : "필요 없음"}` : ""})`);
} else {
  console.log("사용: node scripts/dev-requests.mjs list | show <id> | apply <id> --as <세션> [--push] | done <id> --as <세션> | reject <id> --as <세션> --reason \"…\"\n      report --title … --summary … --as <세션> [--request <id>] [--link …] [--commit …] [--cost …] | ask --category <분류> --title … --as <세션> [--note …] [--link …] | asks [--all]");
}
