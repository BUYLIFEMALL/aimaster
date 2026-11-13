// 메이커 P1(2026-11-13) 「🛍 상품 대표사진 합성」 — 상품코드 작업표 읽기·짝짓기·검사·파일 이름·결과표(순수 함수, 시험 대상).
// 파일 순서로 짝을 짓지 않는다: 작업표(코드→파일 이름) 또는 파일 이름 규칙(코드_main / 코드_sub1)으로만 짝짓는다.
// 결과표에는 키·이메일 같은 회원 정보를 넣지 않는다.

export const PRODUCT_MAX_JOBS = 50;
export const PRODUCT_MAX_SUBS = 3;
export const PHOTO_MAX_BYTES = 25 * 1024 * 1024;

export type PhotoRole = "main" | "sub";
export type JobStatus = "ready" | "invalid" | "running" | "done" | "failed" | "skipped";

export interface TableRow { code: string; option: string; name: string; main: string; subs: string[]; line: number }

export interface JobPhotoRef { role: PhotoRole; ref: string }
export interface ProductJobDraft {
  key: string;
  productId: string | null;
  code: string;
  option: string;
  label: string;
  photos: JobPhotoRef[];
  baseRevision: string | null;
  status: "ready" | "invalid";
  problems: string[];
}

const HEADER_ALIASES: Record<string, keyof Omit<TableRow, "subs" | "line"> | "sub"> = {
  code: "code", sku: "code", "상품코드": "code", "코드": "code", "상품번호": "code",
  option: "option", "옵션": "option",
  name: "name", "상품명": "name", "이름": "name",
  main: "main", "메인": "main", "대표": "main", "대표사진": "main", "메인사진": "main",
  sub: "sub", sub1: "sub", sub2: "sub", sub3: "sub", "서브": "sub", "서브1": "sub", "서브2": "sub", "서브3": "sub", "서브사진": "sub",
};

/** 한 줄을 칸으로 — 탭(엑셀 붙여넣기)이 있으면 탭, 없으면 쉼표(따옴표 안 쉼표 지원) */
function splitLine(line: string): string[] {
  if (line.includes("\t")) return line.split("\t").map((c) => c.trim());
  const out: string[] = []; let cur = ""; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (ch === "," && !q) { out.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

/**
 * 작업표 글(CSV·엑셀 붙여넣기)을 줄로. 머리줄이 있으면 이름으로 칸을 찾고,
 * 없으면 「코드, 옵션, 메인, 서브1, 서브2, 서브3」 순서로 읽는다.
 */
export function parseTable(text: string): { rows: TableRow[]; errors: string[] } {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).map((l, i) => ({ l, i: i + 1 })).filter((x) => x.l.trim());
  if (!lines.length) return { rows: [], errors: [] };
  const first = splitLine(lines[0].l).map((c) => c.toLowerCase().replace(/\s/g, ""));
  const hasHeader = first.some((c) => HEADER_ALIASES[c] === "code") && first.some((c) => HEADER_ALIASES[c] === "main");
  const cols = hasHeader ? first.map((c) => HEADER_ALIASES[c] ?? null) : (["code", "option", "main", "sub", "sub", "sub"] as const);
  const rows: TableRow[] = []; const errors: string[] = [];
  for (const { l, i } of hasHeader ? lines.slice(1) : lines) {
    const cells = splitLine(l);
    const r: TableRow = { code: "", option: "", name: "", main: "", subs: [], line: i };
    cells.forEach((v, k) => {
      const c = cols[k];
      if (!c || !v) return;
      if (c === "sub") r.subs.push(v); else r[c] = v;
    });
    if (!r.code) { errors.push(`${i}번째 줄: 상품코드가 비어 있습니다.`); continue; }
    if (r.subs.length > PRODUCT_MAX_SUBS) { errors.push(`${i}번째 줄: 서브사진은 ${PRODUCT_MAX_SUBS}장까지만 씁니다.`); r.subs = r.subs.slice(0, PRODUCT_MAX_SUBS); }
    rows.push(r);
  }
  return { rows, errors };
}

/** 파일 이름 규칙 「코드_main.jpg」「코드_sub1.jpg」(하이픈도 허용). 규칙에 안 맞으면 null */
export function roleFromFileName(fileName: string): { code: string; role: PhotoRole; index: number } | null {
  const m = /^(.+?)[_-](main|sub([1-9])?)\.(jpe?g|png|webp)$/i.exec(fileName.trim());
  if (!m) return null;
  const role: PhotoRole = m[2].toLowerCase() === "main" ? "main" : "sub";
  return { code: m[1].trim(), role, index: role === "main" ? 0 : Number(m[3] ?? 1) };
}

/** 파일 이름 규칙만으로 작업표를 만든다(작업표 없이 파일만 넣었을 때) */
export function rowsFromFileNames(fileNames: string[]): TableRow[] {
  const byCode = new Map<string, TableRow>();
  for (const f of fileNames) {
    const r = roleFromFileName(f);
    if (!r) continue;
    const row = byCode.get(r.code) ?? { code: r.code, option: "", name: "", main: "", subs: [], line: 0 };
    if (r.role === "main") { if (!row.main) row.main = f; else row.subs.push(`__dup_main__${f}`); }
    else row.subs[r.index - 1] = f;
    byCode.set(r.code, row);
  }
  return [...byCode.values()].map((r) => ({ ...r, subs: r.subs.filter(Boolean) }));
}

const norm = (s: string) => s.trim().toLowerCase();
export const jobKey = (code: string, option: string) => `${code}\u0000${option}`;

/**
 * 작업표 줄 + 넣은 파일 이름 → 상품 작업. 실행 전에 문제를 모두 표시한다.
 * sharedSub가 있으면 상품별 서브는 무시하고 모든 상품에 그 한 장을 쓴다.
 */
export function buildJobs(rows: TableRow[], fileNames: string[], sharedSub: string | null = null): { jobs: ProductJobDraft[]; orphans: string[] } {
  const files = new Map(fileNames.map((f) => [norm(f), f]));
  const used = new Set<string>();
  const seen = new Map<string, number>();
  const jobs: ProductJobDraft[] = rows.slice(0, PRODUCT_MAX_JOBS).map((r) => {
    const problems: string[] = [];
    const key = jobKey(r.code, r.option);
    seen.set(key, (seen.get(key) ?? 0) + 1);
    const photos: JobPhotoRef[] = [];
    const dupMain = r.subs.filter((s) => s.startsWith("__dup_main__"));
    if (dupMain.length) problems.push("메인 사진이 두 장 이상입니다.");
    const pick = (name: string, role: PhotoRole) => {
      const hit = files.get(norm(name));
      if (!hit) { problems.push(`${role === "main" ? "메인" : "서브"} 사진 「${name}」 파일이 없습니다.`); return; }
      used.add(norm(hit)); photos.push({ role, ref: hit });
    };
    if (!r.main) problems.push("메인 사진이 지정되지 않았습니다.");
    else pick(r.main, "main");
    if (sharedSub) { const hit = files.get(norm(sharedSub)); if (hit) { used.add(norm(hit)); photos.push({ role: "sub", ref: hit }); } else problems.push(`공용 서브 「${sharedSub}」 파일이 없습니다.`); }
    else r.subs.filter((s) => !s.startsWith("__dup_main__")).forEach((s) => pick(s, "sub"));
    return { key, productId: null, code: r.code, option: r.option, label: r.name || r.code, photos, baseRevision: null, status: problems.length ? "invalid" : "ready", problems };
  });
  for (const j of jobs) if ((seen.get(j.key) ?? 0) > 1) { j.problems.push("같은 상품코드·옵션이 작업표에 두 번 이상 있습니다."); j.status = "invalid"; }
  if (rows.length > PRODUCT_MAX_JOBS) jobs.push({ key: "__over__", productId: null, code: "", option: "", label: `${rows.length - PRODUCT_MAX_JOBS}개 상품은 넣지 않음`, photos: [], baseRevision: null, status: "invalid", problems: [`한 번에 ${PRODUCT_MAX_JOBS}개 상품까지만 합성합니다.`] });
  const orphans = fileNames.filter((f) => !used.has(norm(f)));
  return { jobs, orphans };
}

/** 파일 이름에 쓸 수 있게 정리(금지 문자·공백 → 밑줄, 60자) */
export function safePart(s: string): string {
  return s.normalize("NFC").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "").replace(/\s+/g, "_").replace(/_+/g, "_").replace(/^[_.]+|[_.]+$/g, "").slice(0, 60);
}

/** 결과 파일 이름: 틀 {prefix}_{code}_{option}_{role}. 빈 칸은 빠지고, 같은 이름은 (2)(3)… */
export function compositeNames(items: { code: string; option: string }[], opts: { prefix: string; template: string; ext: "jpg" | "png" }): string[] {
  const used = new Set<string>();
  return items.map((it) => {
    const base = opts.template
      .replace(/\{prefix\}/g, safePart(opts.prefix))
      .replace(/\{code\}|\{sku\}/g, safePart(it.code))
      .replace(/\{option\}/g, safePart(it.option))
      .replace(/\{role\}/g, "main")
      .replace(/_+/g, "_").replace(/^_+|_+$/g, "") || "product_main";
    let name = `${base}.${opts.ext}`;
    for (let k = 2; used.has(name.toLowerCase()); k++) name = `${base}(${k}).${opts.ext}`;
    used.add(name.toLowerCase());
    return name;
  });
}

export interface ManifestRow {
  code: string; option: string; label: string; productId: string | null;
  main: string; subs: string[]; result: string; status: JobStatus; error: string; returned: string;
}

const csvCell = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
/** 결과표 CSV(엑셀용 BOM 포함). 회원 정보·키는 넣지 않는다 */
export function manifestCsv(rows: ManifestRow[], settingsVersion: string, createdAt: string): string {
  const head = ["code", "option", "label", "productId", "main", "subs", "result", "status", "error", "returned", "settingsVersion", "createdAt"];
  const lines = rows.map((r) => [r.code, r.option, r.label, r.productId ?? "", r.main, r.subs.join(" | "), r.result, r.status, r.error, r.returned, settingsVersion, createdAt].map((v) => csvCell(String(v))).join(","));
  return "﻿" + [head.join(","), ...lines].join("\r\n");
}

export function manifestJson(rows: ManifestRow[], settingsVersion: string, createdAt: string): string {
  return JSON.stringify({ kind: "aimaster-product-composite", version: 1, settingsVersion, createdAt, items: rows }, null, 2);
}
