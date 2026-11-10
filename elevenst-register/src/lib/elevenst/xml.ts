import iconv from "iconv-lite";

// 11번가 Seller API 본문 도우미 — 본문은 EUC-KR XML(명세: elevenst-register/docs/API_SPEC_NOTES.md §1).
// EUC-KR에 없는 글자(이모지·일부 한자·특수기호)는 보내기 전에 찾아서 회원에게 고치게 한다(조용히 ?로 바뀌지 않게).

/** XML 텍스트 이스케이프(CDATA를 쓰지 않는 짧은 값용) */
export function escapeXml(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/** CDATA로 감싼다. 본문 안의 `]]>`는 두 CDATA로 나눠 깨지지 않게 한다 */
export function cdata(v: string): string {
  return `<![CDATA[${v.split("]]>").join("]]]]><![CDATA[>")}]]>`;
}

/** EUC-KR로 바꿀 수 없는 글자 목록(중복 없이, 나온 순서) */
export function findNonEucKr(v: string): string[] {
  const bad: string[] = [];
  for (const ch of v) {
    if (ch === "?") continue;
    const back = iconv.decode(iconv.encode(ch, "euc-kr"), "euc-kr");
    if (back !== ch && !bad.includes(ch)) bad.push(ch);
  }
  return bad;
}

export type XmlValue = string | number | { cdata: string } | XmlNode | XmlNode[];
export interface XmlNode {
  [tag: string]: XmlValue | undefined;
}

function renderValue(tag: string, v: XmlValue | undefined): string {
  if (v === undefined) return "";
  if (Array.isArray(v)) return v.map((n) => `<${tag}>${renderNode(n)}</${tag}>`).join("");
  if (typeof v === "string" || typeof v === "number") return `<${tag}>${escapeXml(String(v))}</${tag}>`;
  if ("cdata" in v && typeof v.cdata === "string") return `<${tag}>${cdata(v.cdata)}</${tag}>`;
  return `<${tag}>${renderNode(v as XmlNode)}</${tag}>`;
}

function renderNode(node: XmlNode): string {
  return Object.entries(node)
    .map(([tag, v]) => renderValue(tag, v))
    .join("");
}

/** `<?xml … encoding="EUC-KR"?><root>…</root>` 문자열을 만든다(값이 undefined인 칸은 빠짐 — 명세: 안 쓰는 Element는 모두 삭제) */
export function buildXml(root: string, node: XmlNode): string {
  return `<?xml version="1.0" encoding="EUC-KR"?>${renderValue(root, node)}`;
}

/** 보낼 바이트(EUC-KR) */
export function encodeEucKr(xml: string): Buffer {
  return iconv.encode(xml, "euc-kr");
}

/** 받은 바이트를 글자로. 선언부가 UTF-8이면 UTF-8로 읽는다 */
export function decodeResponse(bytes: Uint8Array): string {
  const head = Buffer.from(bytes.subarray(0, 100)).toString("latin1");
  const enc = /encoding="utf-?8"/i.test(head) ? "utf-8" : "euc-kr";
  return iconv.decode(Buffer.from(bytes), enc);
}

/** 응답에서 태그 하나의 글자를 꺼낸다(네임스페이스 접두어 허용, CDATA 풀기). 없으면 "" */
export function pickTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<(?:[\\w-]+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w-]+:)?${tag}>`));
  if (!m) return "";
  return m[1].replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, "$1").trim();
}
