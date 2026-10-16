// 2026-10-17 v1.12: 템플릿 카드 미니어처 — 템플릿 원문 앞부분을 줄 종류(제목·목록·체크·표·코드·인용·글)로 나눠 작은 그림으로 보여준다.
export type PreviewLine = { kind: "h" | "list" | "check" | "table" | "code" | "quote" | "text"; text: string; level?: number };

export function templatePreviewLines(markdown: string, max = 6): PreviewLine[] {
  const out: PreviewLine[] = [];
  let inCode = false;
  for (const raw of markdown.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("```")) {
      if (!inCode) out.push({ kind: "code", text: line.slice(3) || "코드" });
      inCode = !inCode;
    } else if (inCode || !line || /^\|?\s*:?-{3,}/.test(line)) {
      continue;
    } else if (/^#{1,6}\s/.test(line)) {
      const level = line.match(/^#+/)![0].length;
      out.push({ kind: "h", text: line.replace(/^#+\s*/, ""), level });
    } else if (/^[-*+]\s+\[[ xX]\]/.test(line)) {
      out.push({ kind: "check", text: line.replace(/^[-*+]\s+\[[ xX]\]\s*/, "") });
    } else if (/^([-*+]|\d+\.)\s/.test(line)) {
      out.push({ kind: "list", text: line.replace(/^([-*+]|\d+\.)\s+/, "") });
    } else if (line.startsWith("|")) {
      out.push({ kind: "table", text: line.split("|").map(c => c.trim()).filter(Boolean).slice(0, 3).join(" · ") });
    } else if (line.startsWith(">")) {
      out.push({ kind: "quote", text: line.replace(/^>\s*/, "") });
    } else {
      out.push({ kind: "text", text: line });
    }
    if (out.length >= max) break;
  }
  return out;
}
