// D-4 (2026-10-24, 도톨이 v1.3 「참고 링크 읽기」 기능 참고): 「자료부터 집필」 주소 종류 판별·붙여넣기 검사.
// 실행 시점 import 없음(화면·서버·시험 공용).
export type SourceUrlKind = { kind: "youtube"; videoId: string } | { kind: "pdf" } | { kind: "web" };

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

export function classifySourceUrl(raw: string): SourceUrlKind {
  let url: URL;
  try { url = new URL(raw.trim()); } catch { return { kind: "web" }; }
  const host = url.hostname.replace(/^(www\.|m\.|music\.)/, "");
  let id = "";
  if (host === "youtu.be") id = url.pathname.split("/")[1] ?? "";
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") id = url.searchParams.get("v") ?? "";
    else { const m = url.pathname.match(/^\/(shorts|embed|live)\/([^/?#]+)/); id = m?.[2] ?? ""; }
  }
  if (YT_ID.test(id)) return { kind: "youtube", videoId: id };
  if (/\.pdf$/i.test(url.pathname)) return { kind: "pdf" };
  return { kind: "web" };
}

export const PASTE_MIN = 100;
export const PASTE_MAX = 20_000;

/** 원문 붙여넣기 검사. 비어 있으면 null(넣지 않음), 길이가 맞지 않으면 오류 문구. */
export function readPaste(text: unknown, link: unknown): { error: string } | { text: string; link: string } | null {
  const body = typeof text === "string" ? text.trim() : "";
  if (!body) return null;
  if (body.length < PASTE_MIN || body.length > PASTE_MAX) return { error: `붙여 넣은 원문은 ${PASTE_MIN}~${PASTE_MAX.toLocaleString("ko-KR")}자로 넣어 주세요.` };
  const href = typeof link === "string" ? link.trim() : "";
  return { text: body, link: /^https?:\/\//i.test(href) ? href.slice(0, 500) : "" };
}
