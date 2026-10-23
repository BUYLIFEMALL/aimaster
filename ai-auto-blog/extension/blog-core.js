"use strict";

// BLOG 네이버 입력기 — 화면(DOM)·크롬 API와 무관한 순수 규칙 모음(2026-10-10, v1.41).
// 사이드패널·작업기(background)·테스트가 같은 코드를 쓴다. 여기에는 chrome.* 호출이 없다.
// 핵심은 "문서 단위 정확 비교": 네이버 편집기에서 읽어 온 문서를 [글 덩어리 / 이미지] 순서로 정리해, 지금까지 검증된 입력과 한 글자도 다르지 않은지 확인한다.
// (예전에는 "기대 문구가 문서 안에 들어 있는지"만 확인해서 기존 내용이 섞이거나 같은 본문이 두 번 입력돼도 통과했다.)
(function (root) {
  const normalize = (value) => String(value ?? "").replace(/[\s​﻿ ]/g, "");

  // 편집기에서 읽은 snapshot.blocks → 비교용 단위. 연속된 글 문단은 하나로 합친다(네이버가 문단을 쪼개 저장해도 같게 본다).
  // type: paragraph(글) | image(이미지) | linkPreview(링크 미리보기 카드, 비교에서 제외) | other(인용구·표 등 — 우리가 만들지 않은 요소)
  function unitsFromSnapshot(blocks) {
    const units = [];
    for (const block of Array.isArray(blocks) ? blocks : []) {
      if (block.type === "linkPreview") continue;
      if (block.type === "image") { units.push({ type: "image" }); continue; }
      if (block.type === "paragraph") {
        const text = normalize(block.text);
        if (!text) continue;
        const last = units[units.length - 1];
        if (last?.type === "text") last.text += text; else units.push({ type: "text", text });
        continue;
      }
      units.push({ type: "other", text: normalize(block.text) });
    }
    return units;
  }

  // 지금까지 입력해 검증한 내용(기대 단위)을 쌓는다. text는 합치고 image는 개별 단위.
  function createExpected() {
    const units = [];
    return {
      units,
      addText(text) {
        const value = normalize(text);
        if (!value) return;
        const last = units[units.length - 1];
        if (last?.type === "text") last.text += value; else units.push({ type: "text", text: value });
      },
      addImage() { units.push({ type: "image" }); },
      imageCount() { return units.filter((unit) => unit.type === "image").length; },
      // 복사본: 붙여넣기처럼 "됐을 때 / 안 됐을 때" 두 경우를 나란히 비교할 때 쓴다.
      clone() {
        const copy = createExpected();
        for (const unit of units) copy.units.push({ ...unit });
        return copy;
      },
    };
  }

  // 편집기 문서(snapshot.blocks)에서 이 주소로 걸린 링크 수. 붙여넣기가 실제 링크로 들어갔는지 화면 상태로 확인한다.
  function countLinks(blocks, url) {
    const target = String(url || "").replace(/\/$/, "");
    let count = 0;
    for (const block of Array.isArray(blocks) ? blocks : []) {
      for (const href of Array.isArray(block.links) ? block.links : []) {
        if (target && String(href).replace(/\/$/, "").startsWith(target)) count += 1;
      }
    }
    return count;
  }

  function describeUnit(unit) {
    if (!unit) return "없음";
    if (unit.type === "image") return "이미지";
    if (unit.type === "other") return "기타 요소";
    return `글 ${unit.text.length}자`;
  }

  // 정확 비교. 같으면 {ok:true}, 다르면 처음 달라진 위치와 이유를 돌려준다.
  function compareUnits(expected, actual) {
    for (let index = 0; index < Math.max(expected.length, actual.length); index += 1) {
      const e = expected[index];
      const a = actual[index];
      if (!e || !a) return { ok: false, index, reason: !e ? `편집기에 예상하지 못한 ${describeUnit(a)}이(가) 더 있습니다(${index + 1}번째).` : `편집기에서 ${describeUnit(e)}이(가) 빠졌습니다(${index + 1}번째).` };
      if (e.type !== a.type) return { ok: false, index, reason: `${index + 1}번째 요소 종류가 다릅니다(기대: ${describeUnit(e)}, 실제: ${describeUnit(a)}).` };
      if (e.type === "text" && e.text !== a.text) {
        let at = 0;
        while (at < e.text.length && at < a.text.length && e.text[at] === a.text[at]) at += 1;
        const kind = a.text.length > e.text.length ? "더 많은" : a.text.length < e.text.length ? "더 적은" : "다른";
        return { ok: false, index, reason: `${index + 1}번째 글이 원고와 다릅니다(${kind} 글자, ${at + 1}번째 글자부터 차이, 기대 ${e.text.length}자 / 실제 ${a.text.length}자).` };
      }
    }
    return { ok: true };
  }

  const titleMatches = (expectedTitle, actualTitle) => normalize(expectedTitle) === normalize(actualTitle);

  // 이미지 이름: 같은 이름의 파일이 여러 장 올라가도 구분되도록 순서 + 짧은 지문을 붙인다.
  function imageFileName(index, url, mime) {
    let hash = 5381;
    for (const character of String(url || "")) hash = ((hash * 33) ^ character.charCodeAt(0)) >>> 0;
    const extension = String(mime || "").split("/")[1] === "jpeg" ? "jpg" : String(mime || "").split("/")[1] || "png";
    return `blog-img-${String(index + 1).padStart(2, "0")}-${hash.toString(36)}.${extension.replace(/[^a-z0-9]/gi, "") || "png"}`;
  }

  // ---- 추천 태그(naver-blog-seo-studio 확장 v1.59와 같은 규칙, v1.29에서 그대로 옮김) ----
  const TAG_STOP_WORDS = new Set([
    "그리고", "하지만", "또한", "따라서", "그래서", "이러한", "이것은", "그것은", "이번", "오늘", "최근", "경우", "부분", "관련", "통해", "대해", "위해", "대한", "중요", "필요", "가능", "사용", "적용", "도입", "방법", "내용", "정보", "결과", "기능", "과정", "분야", "상황", "하나", "여러", "모든", "각각", "실제", "더욱", "가장", "먼저", "다음", "이후", "이전", "현재", "때문", "때문에", "있습니다", "있으며", "합니다", "됩니다", "좋습니다", "한다", "되는", "있는", "없는", "같은", "것을", "것이", "에서", "으로", "에게",
  ]);
  const TAG_GENERIC_BODY_WORDS = new Set([
    "콘텐츠", "고객", "브랜드", "메시지", "전략", "실무", "정리", "소개", "가이드", "초보자", "완벽", "핵심", "주요", "활용", "효율", "관리", "분석", "서비스", "제품", "시장", "업무", "시간", "여행", "여행지", "가을", "서울", "근교",
  ]);
  const KOREAN_TAG_PARTICLES = [
    "으로부터", "에서부터", "에게서는", "에게서", "에서는", "으로는", "에게는", "이라도", "에게", "에서", "부터", "까지", "처럼", "마다", "보다", "으로", "라도", "이나", "이며", "하고", "은", "는", "이", "가", "을", "를", "의", "에", "도", "와", "과", "로", "만",
  ];

  function normalizeTagCandidate(value) {
    let tag = String(value || "")
      .replace(/^#+/, "")
      .replace(/["'“”‘’()[\]{}<>]/g, " ")
      .replace(/^[,.:;!?]+|[,.:;!?]+$/g, "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 30);
    const particle = KOREAN_TAG_PARTICLES.find((suffix) => tag.endsWith(suffix));
    if (particle && tag.length - particle.length >= 2) tag = tag.slice(0, -particle.length);
    return tag;
  }

  function isCoveredBySpecificTag(tag, tags) {
    const compactTag = tag.replace(/\s+/g, "");
    return tags.some((existingTag) => {
      const compactExistingTag = existingTag.replace(/\s+/g, "");
      return compactExistingTag.length > compactTag.length && compactExistingTag.includes(compactTag);
    });
  }

  function buildRecommendedTags({ topic, keywords, title, body }) {
    const tags = [];
    const seen = new Set();
    const add = (value, { fromBody = false } = {}) => {
      const tag = normalizeTagCandidate(value);
      const key = tag.toLocaleLowerCase("ko-KR");
      if (tag.length < 2 || TAG_STOP_WORDS.has(key) || (fromBody && TAG_GENERIC_BODY_WORDS.has(key)) || (fromBody && isCoveredBySpecificTag(tag, tags)) || seen.has(key)) return;
      seen.add(key);
      tags.push(tag);
    };
    add(topic);
    for (const keyword of Array.isArray(keywords) ? keywords : []) add(keyword);
    const source = `${title || ""}\n${body || ""}`;
    const frequency = new Map();
    for (const rawWord of source.match(/[가-힣A-Za-z0-9][가-힣A-Za-z0-9+.-]{1,29}/g) || []) {
      const word = normalizeTagCandidate(rawWord);
      const key = word.toLocaleLowerCase("ko-KR");
      if (word.length < 2 || TAG_STOP_WORDS.has(key)) continue;
      frequency.set(key, { word, count: (frequency.get(key)?.count || 0) + 1 });
    }
    [...frequency.values()]
      .filter((item) => item.count >= 2)
      .sort((a, b) => b.count - a.count || b.word.length - a.word.length || a.word.localeCompare(b.word, "ko-KR"))
      .forEach((item) => add(item.word, { fromBody: true }));
    return tags.slice(0, 10);
  }

  // 태그 입력값 정리: 쉼표로 나눠 # 제거·중복 제거. 네이버 한도 30개.
  function parseTagInput(value) {
    return [...new Set(String(value || "").split(",").map((tag) => tag.trim().replace(/^#+/, "")).filter(Boolean))];
  }

  // 사람이 읽는 오류 문장(브라우저/네이버 화면 오류 → 안내).
  function formatBrowserError(error, context = "작업") {
    const message = error instanceof Error ? error.message : String(error || "");
    if (/already attached|another debugger/i.test(message)) return `${context} 실패: 다른 디버거가 네이버 탭에 연결되어 있습니다. DevTools와 다른 자동화 확장을 닫고 다시 시도하세요.`;
    if (/Cannot access contents of url|Receiving end does not exist|host permission/i.test(message)) return `${context} 실패: 네이버 페이지 접근 권한이 없습니다. 확장을 새로고침한 뒤 다시 시도하세요.`;
    if (/No tab with id|tab was closed|target closed|Invalid tab ID/i.test(message)) return `${context} 실패: 네이버 글쓰기 탭이 닫혔거나 이동했습니다.`;
    if (/debugger.*attach|debugger.*permission|permission denied/i.test(message)) return `${context} 실패: Chrome 디버거 권한이 거부되었습니다. 확장을 다시 로드하고 권한을 허용하세요.`;
    if (/Extension context invalidated|context invalidated/i.test(message)) return `${context} 실패: 확장이 업데이트되어 연결이 끊겼습니다. 확장 관리 화면에서 새로고침하세요.`;
    if (/Detached while handling command|Debugger is not attached|Cannot detach|target was detached/i.test(message)) return `${context} 실패: 입력 중 디버거 연결이 끊겼습니다(개발자 도구를 열었거나 탭이 이동했을 수 있습니다).`;
    return `${context} 실패: ${message || "알 수 없는 오류"}`;
  }

  const api = { normalize, unitsFromSnapshot, createExpected, countLinks, compareUnits, titleMatches, imageFileName, buildRecommendedTags, parseTagInput, formatBrowserError };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.BlogCore = api;
})(typeof self !== "undefined" ? self : globalThis);
