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

  // 주의: 제목 모듈도 내부적으로 ".se-text-paragraph" 클래스를 재사용한다(2026-09-20 실사용
  // 테스트에서 발견 — 범위를 좁히지 않으면 본문 클릭이 실제로는 제목을 다시 클릭하게 되어
  // 본문 첫 줄이 제목 뒤에 그대로 붙어버림). 반드시 ".se-body" 컨테이너 안으로 범위를 좁힌다.
  const bodyLocator = editorFrame.locator(".se-body .se-text-paragraph").first();
  await bodyLocator.waitFor({ state: "visible", timeout: 15000 });

  const isInsideTitle = await bodyLocator.evaluate((el) => Boolean(el.closest(".se-documentTitle")));
  if (isInsideTitle) {
    throw new Error(
      "본문 영역을 찾았는데 실제로는 제목 영역 안이었습니다 — 네이버 화면 구조가 바뀐 것 같습니다. 자동 입력을 중단합니다."
    );
  }

  await clickAndType(bodyLocator, body);
}

module.exports = { fillTitleAndBody };
