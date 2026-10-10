"use strict";

// 티스토리 입력기 — 순수 규칙 모음(2026-10-10, v1.59). 브라우저·크롬 API를 쓰지 않아 시험에서 그대로 실행할 수 있다.
// 사이드패널에 있던 검증 규칙(sidepanel.js v1.56)을 옮긴 것이며 판정 방식은 바꾸지 않았다 — 티스토리는 TinyMCE가 HTML을 다시 구성하므로
// 문서 전체의 문자열 완전 일치가 아니라 "사람이 보는 텍스트의 앞·뒤 조각 + 의미 구조"로 확인한다(docs/OPERATIONS_HANDOFF.md 원칙 3).
(function (root) {
  const normalize = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

  // 공백·문장부호·대소문자 차이를 없앤 비교용 문자열(티스토리는 URL을 자동 링크로 바꾸고 줄바꿈을 p/figure로 다시 구성한다)
  function compactVerificationText(value) {
    return String(value || "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[​-‍﻿]/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, "");
  }

  // 긴 문단은 앞 48자·뒤 48자 조각으로 확인한다(원문 자체는 오류·로그에 남기지 않는다).
  function verificationSamples(value) {
    const compact = compactVerificationText(value);
    if (!compact) return [];
    if (compact.length <= 72) return [compact];
    return [...new Set([compact.slice(0, 48), compact.slice(-48)])];
  }

  function expectedBlockText(block) {
    return block.type === "link" ? `${block.text} ${block.url}` : block.text;
  }

  // 티스토리가 지원하는 의미 태그 중 원문 HTML에 있던 것(입력 뒤에도 남아 있어야 한다)
  function expectedStructure(html) {
    const supported = ["h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "pre", "ul", "ol", "table", "a"];
    const source = String(html || "").toLowerCase();
    return supported.filter((tag) => new RegExp(`<${tag}(?:\\s|>)`).test(source));
  }

  function normalizeTags(values) {
    const source = Array.isArray(values) ? values : String(values || "").split(/[\n,]/);
    return [...new Set(source.map((value) => String(value).replace(/^#+/, "").trim()).filter(Boolean))].slice(0, 30);
  }

  // 글에 실린 텍스트 블록(문단·서식 블록·링크)마다 본문에 샘플이 있는지 센다.
  function matchTextBlocks(blocks, bodyText) {
    const textBlocks = (Array.isArray(blocks) ? blocks : []).filter((block) => block.type === "text" || block.type === "html" || block.type === "link");
    const actual = compactVerificationText(bodyText);
    const matched = textBlocks.filter((block) => {
      const samples = verificationSamples(expectedBlockText(block));
      return samples.length === 0 || samples.some((sample) => actual.includes(sample));
    }).length;
    return { matched, total: textBlocks.length, bodyEmpty: !actual };
  }

  // 기본 발행값(공개·댓글 허용·현재 발행·홈주제 없음)은 티스토리 새 글에 이미 적용돼 있어 발행 설정창을 열 필요가 없다(v1.31).
  function needsPublishDialog(publish) {
    return publish.visibility !== "public" || publish.comment !== "allow" || Boolean(publish.topic) || publish.timing !== "now";
  }

  // "myblog", "myblog.tistory.com", "https://myblog.tistory.com/manage" → "myblog" (잘못된 값은 빈 문자열)
  function normalizeBlogName(input) {
    let value = String(input || "").trim().toLowerCase();
    value = value.replace(/^https?:\/\//, "").split(/[/?#]/)[0].replace(/\.tistory\.com$/, "");
    return /^[a-z0-9][a-z0-9-]{0,49}$/.test(value) ? value : "";
  }

  const editorUrl = (blogName) => `https://${blogName}.tistory.com/manage/newpost/?type=post&returnURL=${encodeURIComponent("/manage/posts/")}`;

  // 본인 블로그의 글쓰기 화면 주소인가(다른 블로그·로그인 화면·블로그 홈이면 false)
  function isOwnEditorUrl(rawUrl, blogName) {
    let url;
    try { url = new URL(rawUrl || ""); } catch { return false; }
    return url.protocol === "https:" && url.hostname.toLowerCase() === `${String(blogName).toLowerCase()}.tistory.com` && /^\/manage\/(newpost|post)(\/|$)/.test(url.pathname);
  }

  const isLoginUrl = (rawUrl) => {
    try {
      const url = new URL(rawUrl || "");
      return /(^|\.)kakao\.com$/.test(url.hostname) || (/(^|\.)tistory\.com$/.test(url.hostname) && /^\/auth\//.test(url.pathname));
    } catch { return false; }
  };

  function formatBrowserError(error, context = "작업") {
    const message = error instanceof Error ? error.message : String(error || "");
    if (/already attached|another debugger/i.test(message)) return `${context} 실패: 다른 디버거가 티스토리 탭에 연결되어 있습니다. DevTools와 다른 자동화 확장을 닫고 다시 시도하세요.`;
    if (/Cannot access contents of url|Receiving end does not exist|host permission/i.test(message)) return `${context} 실패: 티스토리 페이지 접근 권한이 없습니다. 확장을 새로고침한 뒤 다시 시도하세요.`;
    if (/No tab with id|tab was closed|target closed|Invalid tab ID/i.test(message)) return `${context} 실패: 티스토리 글쓰기 탭이 닫혔거나 이동했습니다.`;
    if (/debugger.*attach|debugger.*permission|permission denied/i.test(message)) return `${context} 실패: Chrome 디버거 권한이 거부되었습니다. 확장을 다시 로드하고 권한을 허용하세요.`;
    if (/Extension context invalidated|context invalidated/i.test(message)) return `${context} 실패: 확장이 업데이트되어 연결이 끊겼습니다. 확장 관리 화면에서 새로고침하세요.`;
    if (/Detached while handling command|Debugger is not attached|Cannot detach|target was detached/i.test(message)) return `${context} 실패: 입력 중 디버거 연결이 끊겼습니다(개발자 도구를 열었거나 탭이 이동했을 수 있습니다).`;
    return `${context} 실패: ${message || "알 수 없는 오류"}`;
  }

  const api = { normalize, compactVerificationText, verificationSamples, expectedBlockText, expectedStructure, normalizeTags, matchTextBlocks, needsPublishDialog, normalizeBlogName, editorUrl, isOwnEditorUrl, isLoginUrl, formatBrowserError };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.TistoryCore = api;
})(typeof self !== "undefined" ? self : globalThis);
