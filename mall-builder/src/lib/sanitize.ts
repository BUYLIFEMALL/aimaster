import sanitize from "sanitize-html";

// 글·HTML 블록(그리고 앞으로 상품 상세 HTML)의 위험 태그 제거 — 허용 목록 방식
// 스크립트·iframe·style·form·이벤트 속성(on*)·style 속성·javascript:/data: 주소는 모두 빠진다
// 링크·그림은 https 또는 이 몰 안 주소(/로 시작)만

const OPTIONS: sanitize.IOptions = {
  allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "s", "h2", "h3", "h4", "ul", "ol", "li", "a", "img", "blockquote", "hr", "span", "div", "table", "thead", "tbody", "tr", "th", "td"],
  allowedAttributes: { a: ["href", "target", "rel"], img: ["src", "alt", "width", "height"], td: ["colspan", "rowspan"], th: ["colspan", "rowspan"] },
  allowedSchemes: ["https"],
  allowedSchemesAppliedToAttributes: ["href", "src"],
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",
  // 라이브러리는 상대 주소(src="x")를 통과시키므로 여기서 한 번 더 좁힌다
  transformTags: {
    a: (tagName, attribs): sanitize.Tag => {
      const href = attribs.href ?? "";
      if (href.startsWith("https://")) return { tagName, attribs: { href, target: "_blank", rel: "noopener noreferrer" } };
      const keep: sanitize.Attributes = href.startsWith("/") && !href.startsWith("//") ? { href } : {};
      return { tagName, attribs: keep };
    },
    img: (tagName, attribs) => {
      const { src = "", ...rest } = attribs;
      return { tagName, attribs: src.startsWith("https://") ? { src, ...rest } : rest };
    },
  },
  exclusiveFilter: (frame) => frame.tag === "img" && !frame.attribs.src,
};

export function sanitizeHtml(html: string): string {
  return sanitize(html, OPTIONS).trim();
}
