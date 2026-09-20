"use strict";

const { sleep, randomDelay, clickAndType } = require("./humanInput");

// 프로토타입 3 — 제목/본문 자동 입력.
//
// 셀렉터는 프로토타입 2 조사 결과(README "프로토타입 2 조사 결과" 참고)를 따른다.
// 네이버가 마크업을 바꿀 수 있으므로 요소를 못 찾으면 조용히 실패하지 않고 명확한
// 에러를 던진다 — 그래야 다음에 셀렉터를 다시 조사해야 한다는 걸 바로 알 수 있다.

async function fillTitleAndBody(page, { title, body }) {
  const editorFrame = page.frameLocator('iframe[src*="PostWriteForm.naver"]');

  const titleLocator = editorFrame.locator(".se-title-text").first();
  await titleLocator.waitFor({ state: "visible", timeout: 15000 });
  await clickAndType(titleLocator, title);

  await sleep(randomDelay(500, 1000));

  // 주의: 제목 모듈도 내부적으로 ".se-text-paragraph" 클래스를 재사용하고, ".se-body"는
  // 본문 전용이 아니라 제목까지 포함한 문서 전체 컨테이너다(2026-09-20 실사용 테스트에서
  // 두 차례 확인됨 — 처음엔 셀렉터를 안 좁혀서, 그다음엔 ".se-body"로 좁혔는데도 여전히
  // 제목이 걸렸음). 그래서 컨테이너로 범위를 좁히는 대신, 후보 문단들을 순서대로 확인하며
  // "제목(.se-documentTitle) 안에 있지 않은 첫 번째 문단"을 직접 찾는다.
  const paragraphCandidates = editorFrame.locator(".se-text-paragraph");
  const candidateCount = await paragraphCandidates.count();

  let bodyLocator = null;
  for (let i = 0; i < candidateCount; i += 1) {
    const candidate = paragraphCandidates.nth(i);
    const insideTitle = await candidate.evaluate((el) => Boolean(el.closest(".se-documentTitle")));
    if (!insideTitle) {
      bodyLocator = candidate;
      break;
    }
  }

  if (!bodyLocator) {
    throw new Error("본문 영역을 찾지 못했습니다 — 네이버 화면 구조가 바뀐 것 같습니다. 자동 입력을 중단합니다.");
  }

  await bodyLocator.waitFor({ state: "visible", timeout: 15000 });
  await clickAndType(bodyLocator, body);
}

module.exports = { fillTitleAndBody };
