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

  const bodyLocator = editorFrame.locator(".se-text-paragraph").first();
  await bodyLocator.waitFor({ state: "visible", timeout: 15000 });
  await clickAndType(bodyLocator, body);
}

module.exports = { fillTitleAndBody };
