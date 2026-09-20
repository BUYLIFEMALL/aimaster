"use strict";

const fs = require("node:fs");
const path = require("node:path");

// 프로토타입 2 — 네이버 블로그 글쓰기 에디터 구조 조사.
//
// 실제 셀렉터를 미리 추측해서 하드코딩하지 않는다. 대신 사용자가 실제 글쓰기 화면으로
// 직접 이동한 뒤 이 함수를 실행하면, 화면(모든 iframe 포함)에서 제목/본문/이미지업로드/
// 태그/발행 버튼 후보가 될 만한 요소들을 넓게 수집해서 로컬 JSON 파일로 남긴다. 그 파일을
// 분석해서 다음 단계(실제 자동 입력 코드)에 쓸 셀렉터를 정한다.

function shortenElement(el) {
  const classes =
    el.className && typeof el.className === "string" ? el.className.trim().split(/\s+/).slice(0, 6) : null;
  return {
    tag: el.tagName,
    id: el.id || null,
    classes,
    placeholder: el.getAttribute("placeholder") || null,
    contentEditable: el.isContentEditable || null,
    inputType: el.getAttribute("type") || null,
    text: (el.textContent || "").trim().slice(0, 40)
  };
}

async function inspectFrame(frame) {
  try {
    return await frame.evaluate(() => {
      // eslint-disable-next-line no-undef
      const shorten = (el) => {
        const classes =
          el.className && typeof el.className === "string" ? el.className.trim().split(/\s+/).slice(0, 6) : null;
        return {
          tag: el.tagName,
          id: el.id || null,
          classes,
          placeholder: el.getAttribute("placeholder") || null,
          contentEditable: el.isContentEditable || null,
          inputType: el.getAttribute("type") || null,
          text: (el.textContent || "").trim().slice(0, 40)
        };
      };

      const titleCandidates = Array.from(
        document.querySelectorAll('[class*="se-title"], [placeholder*="제목"], .se-documentTitle')
      )
        .slice(0, 20)
        .map(shorten);
      const paragraphCandidates = Array.from(
        document.querySelectorAll('.se-text-paragraph, .se-component-content, [class*="text-paragraph"]')
      )
        .slice(0, 20)
        .map(shorten);
      const tagCandidates = Array.from(
        document.querySelectorAll('[class*="tag"], [placeholder*="태그"]')
      )
        .slice(0, 30)
        .map(shorten);
      const categoryCandidates = Array.from(document.querySelectorAll('[class*="category"]'))
        .slice(0, 30)
        .map(shorten);
      const seClassEls = Array.from(document.querySelectorAll('[class*="se-"]')).slice(0, 400).map(shorten);
      const contentEditableEls = Array.from(document.querySelectorAll('[contenteditable="true"]'))
        .slice(0, 50)
        .map(shorten);
      const fileInputs = Array.from(document.querySelectorAll('input[type="file"]')).map(shorten);
      const keywordButtons = Array.from(document.querySelectorAll('button, a, [role="button"]'))
        .filter((el) => /발행|저장|임시저장|카테고리|태그|등록|완료/.test(el.textContent || ""))
        .slice(0, 60)
        .map(shorten);

      return {
        url: location.href,
        title: document.title,
        titleCandidates,
        paragraphCandidates,
        tagCandidates,
        categoryCandidates,
        seClassEls,
        contentEditableEls,
        fileInputs,
        keywordButtons
      };
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

async function inspectEditorStructure(page, runtimeRoot) {
  const frames = page.frames();
  const results = [];
  for (const frame of frames) {
    const data = await inspectFrame(frame);
    results.push({ frameUrl: frame.url(), data });
  }

  const outDir = path.join(runtimeRoot, "inspection");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `editor-inspection-${Date.now()}.json`);
  fs.writeFileSync(
    outPath,
    JSON.stringify({ capturedAt: new Date().toISOString(), pageUrl: page.url(), frames: results }, null, 2),
    "utf8"
  );

  return outPath;
}

module.exports = { inspectEditorStructure };
