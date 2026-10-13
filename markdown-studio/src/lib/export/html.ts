// 내려받는 HTML 문서. 본문은 호출하는 쪽이 DOMPurify로 정제한 조각을 넣는다.
// 만약을 위해 CSP 메타로 스크립트·외부 연결을 막는다(문서를 열었을 때 어떤 코드도 실행되지 않음).
export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const STYLE = `body{margin:0;background:#fff;color:#172033;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Malgun Gothic","Noto Sans KR",Arial,sans-serif;line-height:1.8}
article{max-width:820px;margin:0 auto;padding:40px 24px}section+section{border-top:1px solid #e5e7eb;margin-top:48px;padding-top:32px;page-break-before:always}
h1{font-size:28px;border-bottom:1px solid #e5e7eb;padding-bottom:10px}h2{font-size:22px;margin-top:28px}h3{font-size:18px}
pre{background:#f4f5f7;border:1px solid #e5e7eb;border-radius:8px;padding:14px;overflow:auto}code{background:#f4f5f7;padding:2px 4px;border-radius:4px;font-family:Consolas,monospace}pre code{padding:0;background:none}
blockquote{border-left:3px solid #818cf8;background:#f5f7ff;margin:16px 0;padding:8px 16px}table{border-collapse:collapse;width:100%;margin:16px 0}td,th{border:1px solid #d8dde5;padding:8px 10px}th{background:#f7f8fb}
ol[type=a]{list-style-type:lower-alpha}img{max-width:100%;height:auto}a{color:#4f46e5}hr{border:0;border-top:1px solid #e5e7eb}`;

export interface HtmlSection { title: string; bodyHtml: string }

/** 완전한 HTML 문서. sections가 둘 이상이면 파일별 구역(쪽 나눔)으로 합친다 */
export function buildHtmlDocument(title: string, sections: HtmlSection[]): string {
  const body = sections.length === 1
    ? `<article>${sections[0].bodyHtml}</article>`
    : `<article>${sections.map(s => `<section><h1>${escapeHtml(s.title)}</h1>${s.bodyHtml}</section>`).join("\n")}</article>`;
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>${escapeHtml(title)}</title>
<style>${STYLE}</style>
</head>
<body>
${body}
</body>
</html>
`;
}
