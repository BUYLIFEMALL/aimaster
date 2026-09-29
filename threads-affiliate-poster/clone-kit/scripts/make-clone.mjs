#!/usr/bin/env node
// Builds a ready-to-deploy standalone copy of Threads Affiliate Poster.
//
//   node clone-kit/scripts/make-clone.mjs <target-folder>
//
// Run it from the threads-affiliate-poster folder (or anywhere — paths resolve from this file).
// The target gets: the app source, supabase/schema.sql (one file to paste into the new
// Supabase SQL Editor), .env.example, the install manual as README.md, the operating rules as
// AGENTS.md, the DB design and the integration manuals under setup/.
// Nothing secret is copied: .env*, .vercel/, node_modules/, build output and AIMaster-only
// files are skipped.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const kitDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appDir = path.resolve(kitDir, "..");
const target = process.argv[2] ? path.resolve(process.argv[2]) : null;

if (!target) {
  console.error("사용법: node clone-kit/scripts/make-clone.mjs <복제본을 만들 폴더>");
  process.exit(1);
}
if (fs.existsSync(target) && fs.readdirSync(target).length > 0) {
  console.error(`대상 폴더가 비어 있지 않습니다: ${target}`);
  process.exit(1);
}

// Top-level entries that must not travel with the copy.
const SKIP_TOP = new Set([
  "node_modules", ".next", ".vercel", ".git", "clone-kit", "scripts",
  "tsconfig.tsbuildinfo", "AGENTS.md", "CLAUDE.md", "README.md",
]);
// AIMaster operator's own app-review record (business ids etc.).
const SKIP_REL = new Set([path.join("docs", "META_APP_REVIEW.md")]);

function copyTree(src, dst, rel = "") {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const relPath = path.join(rel, entry.name);
    if (rel === "" && SKIP_TOP.has(entry.name)) continue;
    if (SKIP_REL.has(relPath)) continue;
    if (entry.name.startsWith(".env")) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dst, entry.name);
    if (entry.isDirectory()) copyTree(from, to, relPath);
    else fs.copyFileSync(from, to);
  }
}

copyTree(appDir, target);
// docs/ only held the AIMaster operator's record; drop it if nothing else is there.
const docsDir = path.join(target, "docs");
if (fs.existsSync(docsDir) && fs.readdirSync(docsDir).length === 0) fs.rmdirSync(docsDir);

// One SQL file: AIMaster core tables -> this program's migrations in order -> finalize.
const migrationsDir = path.join(appDir, "supabase", "migrations");
const parts = [
  path.join(kitDir, "database", "00_core_tables.sql"),
  ...fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort().map((f) => path.join(migrationsDir, f)),
  path.join(kitDir, "database", "99_finalize.sql"),
];
const schema = [
  "-- Threads 쇼핑제휴 자동화 — 새 Supabase 프로젝트용 전체 스키마 (make-clone.mjs가 생성)",
  "-- Supabase 대시보드 → SQL Editor → New query에 이 파일 전체를 붙여넣고 Run 한 번이면 된다.",
  `-- 생성 시각: ${new Date().toISOString()}`,
  "",
  ...parts.map((p) => `-- ===== ${path.relative(appDir, p).replaceAll("\\", "/")} =====\n${fs.readFileSync(p, "utf8").trim()}\n`),
].join("\n");
fs.writeFileSync(path.join(target, "supabase", "schema.sql"), schema);

// Docs and settings for the new owner.
fs.copyFileSync(path.join(kitDir, "README.md"), path.join(target, "README.md"));
fs.copyFileSync(path.join(kitDir, "GUIDELINES.md"), path.join(target, "AGENTS.md"));
fs.writeFileSync(path.join(target, "CLAUDE.md"), "@AGENTS.md\n");
fs.copyFileSync(path.join(kitDir, "env.example"), path.join(target, ".env.example"));
fs.mkdirSync(path.join(target, "setup"), { recursive: true });
fs.copyFileSync(path.join(kitDir, "DB_DESIGN.md"), path.join(target, "setup", "DB_DESIGN.md"));
copyTree(path.join(kitDir, "manuals"), path.join(target, "setup", "manuals"));

// Keep .env files out of the new repository.
const gitignore = path.join(target, ".gitignore");
const ignore = fs.existsSync(gitignore) ? fs.readFileSync(gitignore, "utf8") : "";
if (!/^\.env\*/m.test(ignore)) fs.appendFileSync(gitignore, "\n# local secrets\n.env*\n!.env.example\n");

const version = fs.readFileSync(path.join(appDir, "src", "lib", "version.ts"), "utf8").match(/"(v[\d.]+)"/)?.[1];
console.log(`복제본을 만들었습니다: ${target}`);
console.log(`- 원본 버전: ${version ?? "알 수 없음"}`);
console.log("- 다음 단계: 그 폴더의 README.md(설치 매뉴얼) 2단계부터 따라 하세요.");
