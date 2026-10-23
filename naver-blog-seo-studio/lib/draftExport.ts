// 병합 B-5(작업실 ReviewView toHtml·서식 포함 복사·TXT) + B-7(콘텐츠 메이커 MD·HTML 내보내기) → SEO 스튜디오.
// 원고 본문에는 소제목 표시가 따로 없어(확장도 모든 줄을 일반 문단으로 입력) 짧은 한 줄을 소제목으로 판별한다.
// 실행 시점 import 없음(화면·시험 공용). 이미지는 넣지 않는다(저장소 이미지가 비공개 주소).
export type ExportBlock = { type: "heading"; text: string } | { type: "paragraph"; text: string } | { type: "list"; items: string[] };

const LIST_LINE = /^\s*(?:[•·▪◦]|[-*]\s)/;
const SENTENCE_END = /(?:[.!。]|다|요|죠|니다|습니다)["」』)]*$/;

/** 짧은 한 줄(60자 이하)이면서 평서문으로 끝나지 않으면 소제목. 「~할까요?」 같은 질문형 짧은 줄도 소제목. */
export function isHeadingLine(text: string): boolean {
  const t = text.trim();
  if (!t || t.includes("\n") || t.length > 60 || LIST_LINE.test(t) || /^[QA]\.\s/.test(t)) return false;
  if (/\?$/.test(t)) return true;
  // 물음표 없는 질문형 소제목(「~무엇일까요」「~좋을까요」 — 2026-10-24 시험 계정 실제 원고에서 확인)
  if (/(?:까요|나요|가요|을까|일까|할까|는지|인지)$/.test(t)) return true;
  return !SENTENCE_END.test(t);
}

export function toBlocks(body: string): ExportBlock[] {
  const blocks: ExportBlock[] = [];
  for (const raw of body.replace(/\r\n?/g, "\n").split(/\n\s*\n/)) {
    const para = raw.trim();
    if (!para) continue;
    const lines = para.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.every((l) => LIST_LINE.test(l))) { blocks.push({ type: "list", items: lines.map((l) => l.replace(LIST_LINE, "").trim()) }); continue; }
    if (isHeadingLine(para)) { blocks.push({ type: "heading", text: para }); continue; }
    blocks.push({ type: "paragraph", text: lines.join("\n") });
  }
  return blocks;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** 클립보드·파일용 HTML 조각(제목 h2·소제목 h3·문단 p·목록 ul). */
export function toHtmlFragment(title: string, body: string): string {
  const parts = toBlocks(body).map((b) => b.type === "heading" ? `<h3>${esc(b.text)}</h3>`
    : b.type === "list" ? `<ul>${b.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`
    : `<p>${esc(b.text).replace(/\n/g, "<br>")}</p>`);
  return `<h2>${esc(title.trim())}</h2>${parts.join("")}`;
}

export function toHtmlDocument(title: string, body: string): string {
  return `<!doctype html>\n<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title.trim())}</title>`
    + `<style>body{max-width:720px;margin:40px auto;padding:0 16px;font-family:"Pretendard","Malgun Gothic",sans-serif;line-height:1.8;color:#222}h2{font-size:1.6em}h3{margin-top:2em}</style></head>`
    + `<body>${toHtmlFragment(title, body)}</body></html>\n`;
}

export function toMarkdown(title: string, body: string): string {
  const md = toBlocks(body).map((b) => b.type === "heading" ? `## ${b.text}`
    : b.type === "list" ? b.items.map((i) => `- ${i}`).join("\n")
    : b.text.split("\n").join("  \n"));
  return `# ${title.trim()}\n\n${md.join("\n\n")}\n`;
}

export function toPlainText(title: string, body: string): string {
  return `${title.trim()}\n\n${body.replace(/\r\n?/g, "\n").trim()}\n`;
}

/** 파일 이름: 쓸 수 없는 문자 제거·공백 정리·60자. 비면 「블로그 원고」. */
export function exportFileName(title: string, ext: "txt" | "md" | "html"): string {
  const base = title.replace(/[\\/:*?"<>|\x00-\x1f]/g, "").replace(/\s+/g, " ").trim().slice(0, 60) || "블로그 원고";
  return `${base}.${ext}`;
}
