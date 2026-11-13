// 독립몰 H2 — 프로셀 상품 이전 변환기 (2026-11-13, docs/PLAN_20261113_H2_PROSELL_PRODUCT_IMPORT.md)
// 입력: 프로셀 상품 페이지에서 읽은 데이터(extracted.json) + 내려받은 사진(images/<번호>/…, manifest.json) + 프로셀 내려받기 엑셀(원가·과세)
// 하는 일: ① 사진을 몰 공개 저장소(<몰 id>/products/prosell-<번호>/…)에 올림(다시 돌려도 같은 경로에 덮어씀)
//          ② 없는 카테고리를 1단계로 만듦 ③ 우리 「상품 엑셀 올리기」 양식 파일을 만듦 → 관리자 「상품 엑셀」 화면에서 올린다
// 실행: node scripts/prosell-import.mjs --store <몰 주소> [--export D:/PDS/Program_dev/prosell-export] [--xlsx D:/PDS/products_….xlsx] [--dry]
//   키: 환경변수 MB_IMPORT_SECRET_KEY 또는 .env.local 의 LAB_SUPABASE_SECRET_KEY (Lab 서버 키). 코드·문서에 키 값을 적지 않는다.
//   안전장치: 주소가 Lab DB(rjjtjakljjxsgjelqgek)가 아니면 멈춘다(운영 이전은 --allow-prod + 주인님 승인 뒤).
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes(`--${k}`);
const EXPORT = arg("export", "D:/PDS/Program_dev/prosell-export");
const XLSX = arg("xlsx", "D:/PDS/products_20261113_172740.xlsx");
const SLUG = arg("store");
const DRY = flag("dry");
const LAB_REF = "rjjtjakljjxsgjelqgek";
const BUCKET = "mall-builder-public";
const MAX_IMAGES = 5, MAX_DETAIL = 40;

if (!SLUG) throw new Error("--store <몰 주소>를 적어 주세요.");
const env = Object.fromEntries(
  (existsSync(join(root, ".env.local")) ? readFileSync(join(root, ".env.local"), "utf8") : "")
    .split(/\r?\n/).map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]),
);
const URL_ = process.env.MB_IMPORT_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.MB_IMPORT_SECRET_KEY || env.LAB_SUPABASE_SECRET_KEY;
if (!URL_?.includes(LAB_REF) && !flag("allow-prod")) throw new Error(`Lab DB(${LAB_REF})가 아닙니다. 운영 이전은 --allow-prod (주인님 승인 뒤).`);
if (!KEY && !DRY) throw new Error("Lab 서버 키가 없습니다. .env.local 에 LAB_SUPABASE_SECRET_KEY=… 를 넣어 주세요(주인님).");
const sb = KEY ? createClient(URL_, KEY, { auth: { persistSession: false } }) : null;

// ── 입력 읽기 ──
const recs = JSON.parse(readFileSync(join(EXPORT, "pages", "extracted.json"), "utf8"));
const manifest = JSON.parse(readFileSync(join(EXPORT, "images", "manifest.json"), "utf8"));
const fileOf = (m) => join(EXPORT, m.file.replace(/^prosell-img\//, "images/"));
const wb0 = new ExcelJS.Workbook();
await wb0.xlsx.readFile(XLSX);
const ws0 = wb0.worksheets[0];
const txt = (v) => (v == null ? "" : typeof v === "object" ? (v.text ?? v.result ?? "") : String(v)).trim();
const num = (s) => Number(String(s).replace(/[^0-9]/g, "")) || 0;
const orig = new Map();
for (let r = 2; r <= ws0.rowCount; r++) {
  const id = num(txt(ws0.getRow(r).getCell(2).value));
  if (id) orig.set(id, { cost: num(txt(ws0.getRow(r).getCell(12).value)), tax: txt(ws0.getRow(r).getCell(13).value) });
}

// ── 몰 ──
let store = { id: "<몰 id>", slug: SLUG };
if (sb) {
  const { data, error } = await sb.from("mall_builder_stores").select("id, slug, name").eq("slug", SLUG).maybeSingle();
  if (error || !data) throw new Error(`몰 「${SLUG}」을(를) 찾지 못했습니다. ${error?.message ?? ""}`);
  store = data;
}
console.log(`몰: ${store.slug} (${store.id})${DRY ? " · 미리보기(올리지 않음)" : ""}`);

const CT = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp" };
async function put(m) {
  const ext = m.file.split(".").pop().toLowerCase();
  const path = `${store.id}/products/prosell-${m.id}/${m.kind}-${String(m.n).padStart(2, "0")}.${ext}`;
  if (!DRY) {
    const { error } = await sb.storage.from(BUCKET).upload(path, readFileSync(fileOf(m)), { contentType: CT[ext] ?? "application/octet-stream", upsert: true });
    if (error) throw new Error(`사진 올리기 실패 ${path}: ${error.message}`);
  }
  const url = sb ? sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl : `${URL_}/storage/v1/object/public/${BUCKET}/${path}`;
  return { url, path, src: m.url };
}

// ── 카테고리(1단계, 없으면 만듦) ──
const catNames = [...new Set(recs.map((r) => r.category).filter(Boolean))];
if (sb && !DRY) {
  const { data: cats } = await sb.from("mall_builder_categories").select("name, depth").eq("store_id", store.id);
  const have = new Set((cats ?? []).filter((c) => c.depth === 1).map((c) => c.name));
  const missing = catNames.filter((n) => !have.has(n));
  if (missing.length) {
    const { error } = await sb.from("mall_builder_categories").insert(missing.map((name, i) => ({ store_id: store.id, name, depth: 1, sort: 100 + i * 10, is_visible: true })));
    if (error) throw new Error(`카테고리 만들기 실패: ${error.message}`);
  }
  console.log(`카테고리: ${catNames.join(", ")} (새로 만듦 ${missing.length}개)`);
}

// ── 상품별 사진 올리기 + 엑셀 행 ──
const rows = [];
const report = [];
for (const r of recs) {
  const mine = manifest.filter((m) => m.id === r.id);
  const pick = (kind) => mine.filter((m) => m.kind === kind).sort((a, b) => a.n - b.n);
  const seen = new Set();
  const mainSrc = [...pick("photo"), ...pick("list"), ...pick("gallery")].filter((m) => !seen.has(m.url) && seen.add(m.url));
  const images = [];
  for (const m of mainSrc.slice(0, MAX_IMAGES)) images.push(await put(m));
  const detail = [];
  for (const m of pick("desc").slice(0, MAX_DETAIL)) detail.push(await put(m));
  const o = orig.get(r.id) ?? { cost: 0, tax: "" };
  const qty = r.items?.[0]?.qty ?? 0;
  const manage = qty > 0 && qty < 999999;
  rows.push([
    `PS-${r.id}`, r.title, String(r.sale), String(r.list > r.sale ? r.list : ""), o.cost ? String(o.cost) : "",
    o.tax.includes("면세") ? "면세" : "과세", "판매 중", manage ? "수량 관리" : "관리 안 함", manage ? String(qty) : "",
    r.category ?? "", "", images.map((i) => i.url).join(";"), "", detail.map((i) => i.url).join(";"),
  ]);
  report.push({ 번호: r.id, 상품: r.title.slice(0, 18), 판매가: r.sale, 정가: r.list, 원가: o.cost, 사진: `${images.length}/${mainSrc.length}`, 상세그림: `${detail.length}/${pick("desc").length}` });
  process.stdout.write(`#${r.id} 사진 ${images.length} · 상세 그림 ${detail.length}\n`);
}
console.table(report);

// ── 우리 양식 엑셀 ──
const HEAD = ["품번", "상품명", "판매가", "정가", "원가", "과세", "상태", "재고 관리", "재고", "카테고리", "배송비 정책", "사진 주소", "상세 설명", "상세 그림"];
const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet("상품");
ws.addRow(HEAD);
rows.forEach((row) => ws.addRow(row));
ws.columns.forEach((c, i) => { c.width = [11, 13].includes(i) ? 60 : 16; });
const outDir = join(EXPORT, "import");
mkdirSync(outDir, { recursive: true });
const out = join(outDir, `prosell-to-${store.slug}${DRY ? "-dry" : ""}.xlsx`);
await wb.xlsx.writeFile(out);
console.log(`✔ 엑셀: ${out}\n  관리자 「상품 → 엑셀」에서 올리면 됩니다(품번 PS-<프로셀 번호>, 다시 올리면 같은 상품을 고침).`);
