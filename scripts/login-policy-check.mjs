// 로그인 정책 점검 — 같은 계정 「PC 1곳 + 모바일 1곳」(2026-11-12 주인님 확정)
// 플랜: docs/PLAN_20261112_DEVICE_SLOT_LOGIN.md, 작업 지시서: docs/WORKPLAN_20261112_DEVICE_SLOT_LOGIN.md 5·7절
// 1) 범위 없는 signOut() — 기본값이 global이라 그 계정의 모든 기기·모든 프로그램을 끊는다(비밀번호 재설정 파일은 제외).
// 2) 서버 로그인 기기 정보 미전달 — 서버에서 signInWithPassword를 부르는데 User-Agent를 넘기지 않으면
//    로그인 기록에 서버 정보가 찍혀 동시 접속 제한에서 빠진다.
// 읽기만 하고 아무것도 바꾸지 않는다. pending-check.mjs에서 불러 쓴다.
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SKIP = new Set(["node_modules", ".next", "dist", "build", "out", ".vercel", ".turbo", "coverage", "extension", "public"]);
const EXT = /\.(ts|tsx|js|jsx|mjs)$/;
// 메인 사이트(루트)는 하위 프로그램 폴더를 뒤지지 않도록 이 폴더만 본다
const ROOT_DIRS = ["app", "components", "lib", "middleware.ts"];
const PROGRAM_DIRS = ["src", "app", "components", "lib", "utils", "web", "middleware.ts", "proxy.ts"];

function walk(abs, out) {
  if (!existsSync(abs)) return out;
  const st = statSync(abs);
  if (st.isFile()) {
    if (EXT.test(abs)) out.push(abs);
    return out;
  }
  for (const d of readdirSync(abs, { withFileTypes: true })) {
    if (d.name.startsWith(".") || SKIP.has(d.name)) continue;
    walk(join(abs, d.name), out);
  }
  return out;
}

export function sourceFiles(root, folder) {
  const base = join(root, folder);
  const dirs = folder === "." ? ROOT_DIRS : PROGRAM_DIRS;
  return dirs.flatMap((d) => walk(join(base, d), []));
}

const isResetPassword = (rel) => /reset[-_]?password|update[-_]?password|passwordReset/i.test(rel);

/** 범위 없는 signOut() 이 남은 파일(폴더 기준 상대 경로) */
export function unscopedSignOutFiles(root, folder) {
  const base = join(root, folder);
  return sourceFiles(root, folder)
    .filter((f) => {
      const rel = relative(base, f);
      if (isResetPassword(rel)) return false;
      return /\.signOut\(\s*\)/.test(readFileSync(f, "utf8"));
    })
    .map((f) => relative(base, f).replace(/\\/g, "/"));
}

/** 서버 로그인인데 User-Agent를 넘기지 않는가 — "none"(서버 로그인 없음) | "done" | "missing" */
export function serverLoginUaStatus(root, folder) {
  const files = sourceFiles(root, folder);
  const serverLogin = files.filter((f) => {
    const t = readFileSync(f, "utf8");
    if (!t.includes("signInWithPassword")) return false;
    const rel = f.replace(/\\/g, "/");
    return /^\s*["']use server["']/m.test(t) || /\/actions\//.test(rel) || /\/api\//.test(rel);
  });
  if (!serverLogin.length) return "none";
  // 서버용 Supabase 클라이언트 파일 또는 로그인 파일 자체에 User-Agent 전달이 있으면 고친 것으로 본다
  const serverClients = files.filter((f) => /supabase[\\/](server|serverClient)\.(ts|js|mjs)$/.test(f));
  const hasUa = [...serverClients, ...serverLogin].some((f) => /["']User-Agent["']/.test(readFileSync(f, "utf8")));
  return hasUa ? "done" : "missing";
}
