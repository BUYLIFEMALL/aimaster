// 태그가 붙은 원고(article) ↔ 네이버 HTML·마크다운·일반 텍스트 변환과 이미지 자리 관리. 순수 함수만 둔다.
import type { ImageSlot } from "./types";

export const COLOR_THEMES = [
  { id: "blue-gray", name: "블루-그레이", desc: "차분하고 전문적인 느낌", color: "#3b82f6", subColor: "#64748b" },
  { id: "green-orange", name: "그린-오렌지", desc: "활기차고 친근한 느낌", color: "#10b981", subColor: "#f97316" },
  { id: "purple-yellow", name: "퍼플-옐로우", desc: "세련되고 창의적인 느낌", color: "#8b5cf6", subColor: "#eab308" },
  { id: "teal-lightgray", name: "틸-라이트그레이", desc: "안정적이고 현대적인 느낌", color: "#14b8a6", subColor: "#94a3b8" },
  { id: "terracotta-lightgray", name: "테라코타-라이트그레이", desc: "따뜻하고 편안한 느낌", color: "#e07a5f", subColor: "#94a3b8" },
  { id: "classic-blue", name: "클래식 블루", desc: "신뢰할 수 있고 안정적인 느낌", color: "#1d4ed8", subColor: "#3b82f6" },
  { id: "nature-green", name: "네이처 그린", desc: "생기 있고 조화로운 느낌", color: "#15803d", subColor: "#22c55e" },
] as const;

export function findTheme(id: string) {
  return COLOR_THEMES.find((t) => t.id === id) ?? COLOR_THEMES[0];
}

export type Block =
  | { kind: "section"; title: string }
  | { kind: "image"; caption: string }
  | { kind: "para"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "quote"; text: string };

const SECTION_RE = /^\s*\[SECTION\s*-\s*([^\]]*)\]\s*$/i;
const IMAGE_RE = /^\s*\[IMAGE INSERT\s*-\s*([^\]]*)\]\s*$/i;
const BULLET_RE = /^\s*(?:[-•·*]|\d+[.)])\s+(.*)$/;
const QUOTE_RE = /^\s*>\s?(.*)$/;

/** 원고 텍스트를 블록으로 나눈다. 빈 줄은 단락 경계다. */
export function parseArticle(article: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: string[] | null = null;
  let quote: string[] | null = null;

  const flushPara = () => {
    if (para.length) blocks.push({ kind: "para", text: para.join(" ") });
    para = [];
  };
  const flushList = () => {
    if (list?.length) blocks.push({ kind: "list", items: list });
    list = null;
  };
  const flushQuote = () => {
    if (quote?.length) blocks.push({ kind: "quote", text: quote.join(" ") });
    quote = null;
  };
  const flushAll = () => {
    flushPara();
    flushList();
    flushQuote();
  };

  for (const raw of article.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushAll();
      continue;
    }
    const sec = SECTION_RE.exec(line);
    if (sec) {
      flushAll();
      blocks.push({ kind: "section", title: sec[1].trim() });
      continue;
    }
    const img = IMAGE_RE.exec(line);
    if (img) {
      flushAll();
      blocks.push({ kind: "image", caption: img[1].trim() });
      continue;
    }
    const bullet = BULLET_RE.exec(line);
    if (bullet) {
      flushPara();
      flushQuote();
      (list ??= []).push(bullet[1].trim());
      continue;
    }
    const q = QUOTE_RE.exec(line);
    if (q) {
      flushPara();
      flushList();
      (quote ??= []).push(q[1].trim());
      continue;
    }
    flushList();
    flushQuote();
    para.push(line.trim());
  }
  flushAll();
  return blocks;
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function inlineHtml(text: string): string {
  return escapeHtml(text).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

const stripBold = (text: string) => text.replace(/\*\*([^*]+)\*\*/g, "$1");

function slotFor(slots: ImageSlot[], caption: string): ImageSlot | undefined {
  return slots.find((s) => s.type === "body" && s.caption === caption);
}

const safeUrl = (url: string) => (/^https?:\/\//i.test(url) ? url : "");

/** 네이버 스마트에디터 ONE 에 붙여넣을 인라인 스타일 HTML(본문만, 제목 제외). */
export function renderHtml(article: string, slots: ImageSlot[], themeId: string): string {
  const color = findTheme(themeId).color;
  const out: string[] = [];
  const cover = slots.find((s) => s.type === "thumbnail" && s.url && safeUrl(s.url));
  if (cover?.url) {
    out.push(`<p style="text-align:center;margin:0 0 24px 0;"><img src="${escapeHtml(cover.url)}" alt="${escapeHtml(cover.caption)}" style="max-width:100%;height:auto;border-radius:8px;" /></p>`);
  }
  for (const b of parseArticle(article)) {
    if (b.kind === "section") {
      out.push(`<h3 style="color:${color};font-weight:bold;font-size:18px;border-left:4px solid ${color};padding-left:8px;margin:28px 0 12px 0;">${inlineHtml(b.title)}</h3>`);
    } else if (b.kind === "para") {
      out.push(`<p style="line-height:1.8;margin:0 0 14px 0;font-size:15px;color:#1e293b;">${inlineHtml(b.text)}</p>`);
    } else if (b.kind === "list") {
      out.push(`<ul style="line-height:1.8;margin:0 0 14px 18px;font-size:15px;color:#1e293b;">${b.items.map((i) => `<li>${inlineHtml(i)}</li>`).join("")}</ul>`);
    } else if (b.kind === "quote") {
      out.push(`<blockquote style="background:#f8fafc;border-left:4px solid ${color};padding:12px 16px;margin:16px 0;border-radius:4px;color:#1e293b;line-height:1.8;font-size:15px;">${inlineHtml(b.text)}</blockquote>`);
    } else {
      const slot = slotFor(slots, b.caption);
      const url = slot?.url ? safeUrl(slot.url) : "";
      if (url) out.push(`<p style="text-align:center;margin:20px 0;"><img src="${escapeHtml(url)}" alt="${escapeHtml(b.caption)}" style="max-width:100%;height:auto;border-radius:8px;" /></p>`);
    }
  }
  return out.join("\n");
}

/** 티스토리·워드프레스용 마크다운 */
export function renderMarkdown(article: string, slots: ImageSlot[], title: string): string {
  const out: string[] = [`# ${title}`];
  const cover = slots.find((s) => s.type === "thumbnail" && s.url && safeUrl(s.url));
  if (cover?.url) out.push(`![${cover.caption}](${cover.url})`);
  for (const b of parseArticle(article)) {
    if (b.kind === "section") out.push(`## ${stripBold(b.title)}`);
    else if (b.kind === "para") out.push(b.text);
    else if (b.kind === "list") out.push(b.items.map((i) => `- ${i}`).join("\n"));
    else if (b.kind === "quote") out.push(`> ${b.text}`);
    else {
      const slot = slotFor(slots, b.caption);
      if (slot?.url && safeUrl(slot.url)) out.push(`![${b.caption}](${slot.url})`);
    }
  }
  return out.join("\n\n");
}

/** 메모장·SNS용 일반 텍스트(이미지 제외) */
export function renderPlainText(article: string): string {
  const out: string[] = [];
  for (const b of parseArticle(article)) {
    if (b.kind === "section") out.push(`■ ${stripBold(b.title)}`);
    else if (b.kind === "para") out.push(stripBold(b.text));
    else if (b.kind === "list") out.push(b.items.map((i) => `· ${stripBold(i)}`).join("\n"));
    else if (b.kind === "quote") out.push(`“${stripBold(b.text)}”`);
  }
  return out.join("\n\n");
}

/** 구조 표식 줄을 뺀 본문 글자수(공백 포함). AI 추측이 아니라 코드로 센다. */
export function measureLength(article: string): number {
  return article
    .split(/\r?\n/)
    .filter((line) => !SECTION_RE.test(line) && !IMAGE_RE.test(line))
    .join("\n")
    .replace(/\*\*/g, "")
    .trim().length;
}

/**
 * 본문에 적힌 [IMAGE INSERT ...] 표식의 설명을 본문 이미지 컷의 캡션으로 바꿔 짝을 맞춘다.
 * 표식이 컷보다 적으면 모자란 만큼 문단 사이에 고르게 끼워 넣고, 많으면 남는 표식은 지운다.
 */
export function alignImageMarkers(article: string, bodySlots: ImageSlot[]): string {
  const captions = bodySlots.map((s) => s.caption.replace(/\]/g, ""));
  const lines = article.split(/\r?\n/);
  // 1) 컷 이름과 정확히 같은 표식은 그대로 두고(사진 기반 글), 같은 이름이 또 나오면 지운다
  const taken = new Set<string>();
  const exact = lines.map((line) => {
    const m = IMAGE_RE.exec(line);
    if (!m) return null;
    const name = m[1].trim();
    if (captions.includes(name) && !taken.has(name)) {
      taken.add(name);
      return name;
    }
    return "";
  });
  // 2) 나머지 표식은 아직 쓰지 않은 컷 이름을 순서대로 배정(남는 표식은 지움)
  const free = captions.filter((c) => !taken.has(c));
  const kept: string[] = [];
  lines.forEach((line, i) => {
    const e = exact[i];
    if (e === null) kept.push(line);
    else if (e) kept.push(`[IMAGE INSERT - ${e}]`);
    else if (free.length) kept.push(`[IMAGE INSERT - ${free.shift()}]`);
  });
  const placed = new Set(kept.map((l) => IMAGE_RE.exec(l)?.[1]?.trim()).filter(Boolean) as string[]);
  const remaining = captions.filter((c) => !placed.has(c));
  if (!remaining.length) return kept.join("\n");

  // 모자란 표식은 본문 단락 사이에 고르게 배치
  const paragraphIdx = kept.map((line, index) => ({ line, index })).filter((x) => x.line.trim() && !SECTION_RE.test(x.line) && !IMAGE_RE.test(x.line)).map((x) => x.index);
  const inserts = new Map<number, string[]>();
  remaining.forEach((caption, i) => {
    const at = paragraphIdx[Math.min(paragraphIdx.length - 1, Math.floor(((i + 1) * paragraphIdx.length) / (remaining.length + 1)))] ?? kept.length;
    inserts.set(at, [...(inserts.get(at) ?? []), `[IMAGE INSERT - ${caption}]`]);
  });
  const out: string[] = [];
  kept.forEach((line, index) => {
    out.push(line);
    const add = inserts.get(index);
    if (add) for (const marker of add) out.push("", marker);
  });
  for (const marker of inserts.get(kept.length) ?? []) out.push("", marker);
  return out.join("\n");
}

/** 본문에서 특정 캡션의 이미지 표식을 지운다(컷을 삭제할 때). */
export function removeImageMarker(article: string, caption: string): string {
  return article
    .split(/\r?\n/)
    .filter((line) => {
      const m = IMAGE_RE.exec(line);
      return !(m && m[1].trim() === caption);
    })
    .join("\n");
}

/** 본문 끝(참고자료 앞)에 이미지 자리 표식을 하나 추가한다(컷을 새로 만들 때). */
export function appendImageMarker(article: string, caption: string): string {
  const marker = `[IMAGE INSERT - ${caption.replace(/\]/g, "")}]`;
  const lines = article.split(/\r?\n/);
  let at = -1;
  lines.forEach((line, i) => {
    const m = SECTION_RE.exec(line);
    if (m && /참고자료/.test(m[1])) at = i;
  });
  if (at < 0) return `${article.replace(/\s+$/, "")}\n\n${marker}\n`;
  return [...lines.slice(0, at), marker, "", ...lines.slice(at)].join("\n");
}

/** 컷 캡션이 바뀌면 본문 표식도 같이 바꾼다. */
export function renameImageMarker(article: string, from: string, to: string): string {
  return article
    .split(/\r?\n/)
    .map((line) => {
      const m = IMAGE_RE.exec(line);
      return m && m[1].trim() === from ? `[IMAGE INSERT - ${to.replace(/\]/g, "")}]` : line;
    })
    .join("\n");
}

/** 본문에는 표식이 있는데 컷이 없는(또는 반대) 경우를 점검한다. */
export function imageMarkerProblems(article: string, slots: ImageSlot[]): string[] {
  const markers = parseArticle(article).filter((b): b is Extract<Block, { kind: "image" }> => b.kind === "image").map((b) => b.caption);
  const problems: string[] = [];
  for (const caption of markers) if (!slotFor(slots, caption)) problems.push(`본문의 이미지 자리 "${caption}"에 맞는 이미지 컷이 없습니다.`);
  for (const slot of slots.filter((s) => s.type === "body")) if (!markers.includes(slot.caption)) problems.push(`이미지 컷 "${slot.caption}"의 자리가 본문에 없습니다.`);
  return problems;
}
