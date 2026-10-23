#!/usr/bin/env node
// 휴대폰 폭(767px 이하)에서 좌측 메뉴 아래 계정·로그아웃이 보이는지 — 코드 읽기만 하는 「확인 필요 후보」 점검(2026-10-23, Claude Code 윈도우)
// 판정(좌측 메뉴 파일 = 「로그아웃」이 들어 있는 components/app 파일):
//   ✓ 함께 보임: 데스크톱 전용 감춤(hidden md:…)이 없음 → 같은 메뉴가 휴대폰에서 펼쳐짐(계정 포함), 또는 로그아웃이 2곳 이상(데스크톱·휴대폰 각각)
//   ⚠ 확인 필요: 데스크톱 전용 메뉴(hidden md:flex 등)에만 로그아웃이 1곳 있고 휴대폰 메뉴(md:hidden)가 따로 있음 → 펼침 메뉴에 계정이 빠졌을 수 있음
//   ⚠ 휴대폰 메뉴 없음: md:hidden도, globals.css의 max-width:767px 전환도 없음(docs/SIDEBAR_LAYOUT_STANDARD.md 「모바일 레이아웃」)
// 오판이 있을 수 있으니 ⚠ 후보는 크롬(390px)에서 펼침 메뉴를 열어 확인한다. 사용: node scripts/check-mobile-account.mjs [폴더] [--all]  (폴더를 주면 그 폴더만 — deploy.mjs 배포 확인 단계가 씀)
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { ROOT } from "./program-info.mjs";

const showAll = process.argv.includes("--all");
const only = process.argv.slice(2).find((a) => !a.startsWith("--"));
function files(dir, out = [], depth = 0) {
  if (depth > 6 || !existsSync(dir)) return out;
  for (const n of readdirSync(dir)) {
    if (n === "node_modules" || n.startsWith(".")) continue;
    const p = join(dir, n);
    const st = statSync(p);
    if (st.isDirectory()) files(p, out, depth + 1);
    else if (/\.(tsx|jsx)$/.test(n)) out.push(p);
  }
  return out;
}

const rows = [];
for (const folder of readdirSync(ROOT).sort()) {
  if (only && folder !== only) continue;
  if (!existsSync(join(ROOT, folder, ".vercel", "project.json")) || folder.startsWith(".")) continue;
  const roots = ["src/components", "components", "src/app", "app"].map((d) => join(ROOT, folder, d));
  const all = roots.flatMap((r) => files(r)).filter((f) => !/[\\/](login|register|auth|reset-password)[\\/]/.test(f));
  const sidebar = all.filter((f) => /로그아웃/.test(readFileSync(f, "utf8")));
  if (!sidebar.length) continue; // 로그인 없는 화면(옛 주소 전달 등)
  // 휴대폰 전환 흔적: CSS 파일의 1024px 이하 max-width 미디어 쿼리, Tailwind 반응형 감춤(sm/md/lg/xl:hidden, max-[..]:), 서랍 메뉴(setOpen/isOpen + translate-x)
  const cssFiles = ["src/app", "app", "src/styles", "styles", "src"].flatMap((d) => { const p = join(ROOT, folder, d); return existsSync(p) ? readdirSync(p).filter((n) => n.endsWith(".css")).map((n) => join(p, n)) : []; });
  const cssMobile = cssFiles.some((c) => [...readFileSync(c, "utf8").matchAll(/@media[^{]*max-width:\s*(\d+)px/g)].some((m) => Number(m[1]) <= 1024));
  const anyMobile = cssMobile || all.some((f) => { const t = readFileSync(f, "utf8"); return /(sm|md|lg|xl):hidden|max-\[\d+px\]:/.test(t) || (/(setOpen|isOpen|setMobile|mobileOpen)/.test(t) && /translate-x/.test(t)); });
  let verdict = "✓ 함께 보임", note = "";
  if (!anyMobile) { verdict = "⚠ 휴대폰 메뉴 없음"; note = "휴대폰 전환(☰ 펼침) 흔적 없음 — 메뉴가 본문 위에 쌓이거나 그대로 남을 수 있음(원칙 19)"; }
  else {
    const logoutCount = sidebar.reduce((n, f) => n + (readFileSync(f, "utf8").match(/로그아웃/g) ?? []).filter(Boolean).length, 0);
    const desktopOnly = sidebar.some((f) => /className="[^"]*\bhidden md:(flex|block|grid)/.test(readFileSync(f, "utf8")));
    // 메뉴 내용을 함수·변수 하나로 만들어 서랍과 데스크톱 메뉴에서 두 번 쓰면(renderNavContent()·{navContent}) 계정도 양쪽에 보임
    const shared = sidebar.some((f) => {
      const t = readFileSync(f, "utf8");
      const uses = [...t.matchAll(/\{\s*(render\w+)\(\)\s*\}|\{\s*(\w*[Cc]ontent)\s*\}/g)].map((m) => m[1] || m[2]);
      return uses.some((u) => uses.filter((x) => x === u).length >= 2);
    });
    if (desktopOnly && logoutCount < 2 && !cssMobile && !shared) { verdict = "⚠ 확인 필요"; note = "데스크톱 전용 메뉴에만 로그아웃 1곳"; }
  }
  rows.push({ folder, verdict, note, files: sidebar.map((f) => relative(join(ROOT, folder), f).replace(/\\/g, "/")) });
}
const warn = rows.filter((r) => r.verdict !== "✓ 함께 보임");
console.log(`[휴대폰 폭 계정 표시] 좌측 메뉴가 있는 프로그램 ${rows.length}곳 · 확인 필요 후보 ${warn.length}곳`);
for (const r of showAll ? rows : warn) console.log(`  ${r.verdict} ${r.folder}${r.note ? ` — ${r.note}` : ""} (${r.files.slice(0, 2).join(", ")})`);
if (warn.length) console.log("  → 후보는 크롬 390px 폭에서 ☰ 펼침 메뉴에 계정·로그아웃이 보이는지 확인(코드 읽기 판정이라 오판 가능)");
