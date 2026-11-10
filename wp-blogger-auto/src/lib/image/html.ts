// 본문에 이미지 넣기·빼기 — n번째 소제목(h2) 바로 아래. 같은 이미지 주소가 이미 있으면 바꿔 끼운다.
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function figureHtml(url: string, alt: string) {
  return `<figure><img src="${esc(url)}" alt="${esc(alt)}" /></figure>`;
}

/** 주소로 figure를 찾아 뺀다(주소 일부만 같아도 같은 칸의 옛 이미지로 본다: 경로 앞부분 prefix) */
export function removeImage(html: string, urlPrefix: string): string {
  const re = /<figure>\s*<img [^>]*src="([^"]+)"[^>]*\/?>\s*(?:<figcaption>[\s\S]*?<\/figcaption>)?\s*<\/figure>/gi;
  return html.replace(re, (m, src: string) => (src.replace(/&amp;/g, "&").startsWith(urlPrefix) ? "" : m));
}

export function insertAfterSection(html: string, section: number, figure: string): string {
  let i = 0;
  const out = html.replace(/<\/h2>/gi, (m) => (++i === section ? `${m}${figure}` : m));
  return i >= section ? out : `${html}${figure}`;
}
