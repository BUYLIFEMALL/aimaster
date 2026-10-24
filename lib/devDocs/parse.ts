// 관리자 「개발 문서 관리」 — 역할 파일·작업 중 표·외부 프로그램 개발분석표를 표 데이터로 읽는 순수 함수들.
// 칸 이름은 docs/roles/README.md·docs/EXTERNAL_PROGRAM_ANALYSIS_REGISTRY.md 양식을 따른다(양식이 바뀌면 여기도 고친다).

export type TableRow = string[];

/** 마크다운 표 한 줄 → 칸 배열 (머리글 구분선·빈 줄은 null) */
function splitRow(line: string): string[] | null {
  const t = line.trim();
  if (!t.startsWith("|")) return null;
  if (/^\|\s*:?-{3,}/.test(t)) return null;
  // `\|`(칸 안의 세로선)는 칸을 나누지 않게 잠시 바꿔 둔다
  return t.replace(/\\\|/g, "\u0000").split("|").slice(1, -1).map((c) => c.replace(/\u0000/g, "|").trim());
}

/** 제목(`## …`) 아래 첫 표의 데이터 줄(머리글 제외). 「— 없음」 자리표시 줄은 뺀다. */
function tableUnder(md: string, heading: RegExp): TableRow[] {
  const lines = md.split(/\r?\n/);
  const start = lines.findIndex((l) => heading.test(l));
  if (start < 0) return [];
  const rows: TableRow[] = [];
  let seenHeader = false;
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^#{1,3}\s/.test(l)) break;
    const cells = splitRow(l);
    if (!cells) {
      if (rows.length || seenHeader) { if (l.trim() === "") continue; }
      continue;
    }
    if (!seenHeader) { seenHeader = true; continue; }
    if (cells.every((c) => c === "—" || c === "없음" || c === "")) continue;
    if (cells[0] === "—" && cells[1] === "없음") continue;
    rows.push(cells);
  }
  return rows;
}

function listUnder(md: string, heading: RegExp): string[] {
  const lines = md.split(/\r?\n/);
  const start = lines.findIndex((l) => heading.test(l));
  if (start < 0) return [];
  const out: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^#{1,3}\s/.test(l)) break;
    const m = l.match(/^\s*(?:\d+\.|-)\s+(.+)$/);
    if (m && m[1].trim() !== "없음" && m[1].trim() !== "…") out.push(m[1].trim());
  }
  return out;
}

const field = (md: string, name: string) => (md.match(new RegExp(`^- ${name}:\\s*(.+)$`, "m")) || [])[1]?.trim() ?? "";

export type RoleStatus = {
  id: string;
  path: string;
  title: string;
  owner: string;
  folders: string;
  category: string;
  work: string;
  updated: string;
  updatedAt: number | null;
  isDraft: boolean;
  now: TableRow[];
  waiting: TableRow[];
  done: TableRow[];
  next: string[];
  asks: string[];
};

export function parseDate(s: string): number | null {
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!m) return null;
  // 한국 시간으로 적힌 값 → UTC 밀리초
  return Date.UTC(+m[1], +m[2] - 1, +m[3], (m[4] ? +m[4] : 0) - 9, m[5] ? +m[5] : 0);
}

export function parseRoleFile(path: string, md: string): RoleStatus {
  const id = path.split("/").pop()!.replace(/\.md$/, "");
  const updated = field(md, "마지막 갱신");
  return {
    id,
    path,
    title: (md.match(/^#\s+(.+)$/m) || [])[1]?.trim() ?? id,
    owner: field(md, "담당"),
    folders: field(md, "맡은 폴더"),
    category: field(md, "카테고리"),
    work: field(md, "주력 업무"),
    updated,
    updatedAt: parseDate(updated),
    isDraft: /초안/.test(updated),
    now: tableUnder(md, /^##\s*지금 하는 일/),
    waiting: tableUnder(md, /^##\s*대기 중/),
    done: tableUnder(md, /^##\s*최근 완료/),
    next: listUnder(md, /^##\s*다음 첫 단계/),
    asks: listUnder(md, /^##\s*주인님께 여쭐 것/),
  };
}

export type ActiveWorkRow = { folders: string; agent: string; start: string; work: string; role: string };

export function parseActiveWork(md: string): ActiveWorkRow[] {
  return tableUnder(md, /^##\s*작업 중\s*$/).filter((c) => c.length >= 4).map(([folders, agent, start, work]) => ({
    folders,
    agent,
    start,
    work,
    role: (agent.match(/\[역할:\s*([^\]]+)\]/) || [])[1]?.trim() ?? "",
  }));
}

export type RegistryRow = {
  id: string;
  category: string;
  origin: string;
  form: string;
  date: string;
  feature: string;
  decision: string;
  decisionType: "independent" | "merge" | "hold" | "exclude" | "unknown";
  target: string;
  status: string;
};

export type RegistryData = { rows: RegistryRow[]; cards: Record<string, string>; pending: TableRow[]; clusters: string };

export function parseRegistry(md: string): RegistryData {
  const sec1 = md.split(/^## 1\. 총괄표\s*$/m)[1]?.split(/^\*\*제작자 계열/m)[0] ?? "";
  const rows: RegistryRow[] = [];
  let category = "";
  for (const line of sec1.split(/\r?\n/)) {
    const cells = splitRow(line);
    if (!cells) continue;
    const head = cells[0].match(/^\*\*(.+)\*\*$/);
    if (head) { category = head[1]; continue; }
    if (!/^EXT-/.test(cells[0]) || cells.length < 8) continue;
    const d = cells[5];
    rows.push({
      id: cells[0], category, origin: cells[1], form: cells[2], date: cells[3], feature: cells[4], decision: d,
      decisionType: d.startsWith("🆕") ? "independent" : d.startsWith("🔗") ? "merge" : d.startsWith("⏸") ? "hold" : d.startsWith("❌") ? "exclude" : "unknown",
      target: cells[6], status: cells[7],
    });
  }
  const cards: Record<string, string> = {};
  const sec3 = md.split(/^## 3\. 카테고리별 상세 카드\s*$/m)[1]?.split(/^## 4\./m)[0] ?? "";
  for (const part of sec3.split(/^#### /m).slice(1)) {
    const id = (part.match(/^(EXT-[A-Z]+-\d+)/) || [])[1];
    if (id) cards[id] = "#### " + part.replace(/^### .*$/gm, "").trim();
  }
  const pending = tableUnder(md, /^## 5\. 남은 결정 모음/);
  const clusters = md.split(/^## 2\. 기능 묶음 지도[^\n]*$/m)[1]?.split(/^---\s*$/m)[0]?.trim() ?? "";
  return { rows, cards, pending, clusters };
}

/** 표 칸 안의 마크다운 표시(`코드`, **굵게**, 링크)를 걷어낸 글자 */
export function plain(s: string): string {
  return s.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[`*]/g, "").trim();
}

export type DocLink = { title: string; path: string };
export type CategoryGuide = { name: string; status: string; docs: DocLink[]; extra: string };
export type CategoryMapData = { common: { topic: string; docs: DocLink[] }[]; categories: CategoryGuide[] };

/** docs/CATEGORY_GUIDE_MAP.md 기준 상대 링크 → 저장소 경로 (.md만) */
function docLinks(cell: string, base = "docs/"): DocLink[] {
  const out: DocLink[] = [];
  for (const m of cell.matchAll(/\[([^\]]+)\]\(([^)#]+)(?:#[^)]*)?\)/g)) {
    const href = m[2].trim();
    if (/^[a-z]+:/i.test(href) || !/\.md$/i.test(href)) continue;
    const parts = base.split("/").filter(Boolean);
    for (const seg of href.split("/")) {
      if (seg === "..") parts.pop();
      else if (seg && seg !== ".") parts.push(seg);
    }
    const path = parts.join("/");
    if (!out.some((d) => d.path === path)) out.push({ title: m[1].replace(/[`*]/g, "").trim(), path });
  }
  return out;
}

/** 카테고리 지침 지도 §2 공통 지침 표 + §3 카테고리별 표 */
export function parseCategoryMap(md: string): CategoryMapData {
  const common = tableUnder(md, /^## 2\. 모든 카테고리 공통 지침/).map((c) => ({ topic: plain(c[0] ?? ""), docs: docLinks(c[1] ?? "") }));
  const categories = tableUnder(md, /^## 3\. 카테고리별 지도/)
    .filter((c) => /^\*\*/.test(c[0] ?? ""))
    .map((c) => ({
      name: plain(c[0]).replace(/^🆕\s*/u, ""),
      status: plain(c[1] ?? ""),
      docs: [...docLinks(c[3] ?? ""), ...docLinks(c[4] ?? "")].filter((d, i, a) => a.findIndex((x) => x.path === d.path) === i),
      extra: plain(c[8] ?? ""),
    }));
  return { common, categories };
}
