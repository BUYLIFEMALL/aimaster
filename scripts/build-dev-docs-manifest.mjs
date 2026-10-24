#!/usr/bin/env node
// 관리자 「개발 문서 관리」(/admin/dev-docs)가 읽는 문서 목록 만들기 — 2026-10-24 (Claude Code 윈도우 `claude-win-dotori`)
// 화면은 GitHub 공개 저장소의 원문을 바로 읽지만, 폴더 목록은 GitHub API 한도(시간당 60회)에 걸리지 않게 이 파일로 대신한다.
// 결과: docs/dev-docs/manifest.json (git이 추적하는 .md만, 큰 파일은 보기 전용 표시)
// 사용: node scripts/build-dev-docs-manifest.mjs   — 새 문서를 추가·삭제한 커밋에서 같이 돌리고 결과 파일도 커밋한다.
import { execFileSync } from "node:child_process";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const OUT = join(ROOT, "docs", "dev-docs", "manifest.json");
const EDIT_LIMIT = 400 * 1024; // 이보다 큰 문서는 화면에서 보기만(예: HANDOFF.md 2MB)

const files = execFileSync("git", ["ls-files", "-z", "--", "*.md"], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
  .split("\0").filter(Boolean)
  .filter((p) => !/(^|\/)(node_modules|\.next|\.vercel|dist)\//.test(p));

const entry = (p) => {
  let size = 0;
  try { size = statSync(join(ROOT, p)).size; } catch { /* 지운 파일 */ }
  return { path: p, size, editable: size <= EDIT_LIMIT };
};

const root = ["CLAUDE.md", "AGENTS.md", "GEMINI.md", "DESIGN.md"].filter((p) => files.includes(p)).map(entry);
const guidelines = files.filter((p) => /^docs\/guidelines\/[^/]+\.md$/.test(p)).sort().map(entry);
const roles = files.filter((p) => /^docs\/roles\/[^/_][^/]*\.md$/.test(p) && !p.endsWith("README.md")).sort().map(entry);
const docs = files.filter((p) => /^docs\/[^/]+\.md$/.test(p)).sort().map(entry);
const analyses = files.filter((p) => /^docs\/analysis-[^/]+\/[^/]+\.md$/.test(p)).sort().map(entry);

// 프로그램 폴더 = 맨 위 폴더 중 AGENTS.md가 있는 것(labs·docs 제외)
const programFolders = [...new Set(files.filter((p) => /^[^/]+\/AGENTS\.md$/.test(p)).map((p) => p.split("/")[0]))]
  .filter((f) => !["docs", "labs", "app", "components", "lib", "scripts", "supabase", "public"].includes(f))
  .sort();
const programs = programFolders.map((folder) => ({
  folder,
  files: files
    .filter((p) => p === `${folder}/AGENTS.md` || p === `${folder}/README.md` || new RegExp(`^${folder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/docs/[^/]+\\.md$`).test(p))
    .sort((a, b) => (a.endsWith("AGENTS.md") ? -1 : b.endsWith("AGENTS.md") ? 1 : a.localeCompare(b)))
    .map(entry),
}));

const manifest = { generatedAt: new Date().toISOString(), editLimit: EDIT_LIMIT, root, guidelines, roles, docs, analyses, programs };
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(manifest) + "\n");
console.log(`문서 목록 작성: 루트 ${root.length} · 분야별 지침 ${guidelines.length} · 역할 ${roles.length} · docs ${docs.length} · 분석 ${analyses.length} · 프로그램 ${programs.length}개 → docs/dev-docs/manifest.json`);
