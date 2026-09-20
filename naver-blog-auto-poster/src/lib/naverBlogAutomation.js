"use strict";

const { sleep, randomDelay, humanType, clickAndType } = require("./humanInput");

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

/**
 * 이미지 삽입. Playwright가 OS 파일 선택창을 가로채므로(사용자에게 실제 다이얼로그가
 * 뜨지 않음), 어떤 파일을 넣을지는 호출하는 쪽(Electron 메인 프로세스)이 먼저
 * `dialog.showOpenDialog`로 사용자에게 직접 물어봐서 filePath로 넘겨준다.
 */
async function insertImage(page, filePath) {
  const editorFrame = page.frameLocator('iframe[src*="PostWriteForm.naver"]');
  const imageButton = editorFrame.locator(".se-image-toolbar-button").first();
  await imageButton.waitFor({ state: "visible", timeout: 15000 });

  await imageButton.hover();
  await sleep(randomDelay(300, 700));

  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser", { timeout: 15000 }),
    imageButton.click()
  ]);
  await chooser.setFiles(filePath);

  // 업로드/처리 시간을 기다린다. 정확한 "삽입 완료" 셀렉터는 아직 조사되지 않아서,
  // 넉넉히 기다린 뒤 사람이 화면에서 직접 확인하는 방식으로 우선 검증한다.
  await sleep(randomDelay(3000, 5000));
}

/**
 * 태그 입력. "발행" 버튼을 눌러서 뜨는 발행 설정 레이어 안에 있는 기능이라, 그 레이어를
 * 여는 것은 사람이 직접 한다(잘못해서 진짜 발행 버튼까지 누르는 사고를 막기 위함) —
 * 이 함수는 그 레이어가 이미 열려 있다고 가정하고 태그만 채운다.
 */
async function fillTags(page, tags) {
  const editorFrame = page.frameLocator('iframe[src*="PostWriteForm.naver"]');
  const tagInput = editorFrame.locator("#tag-input");
  await tagInput.waitFor({ state: "visible", timeout: 15000 }).catch(() => {
    throw new Error(
      "태그 입력창을 찾지 못했습니다 — 먼저 브라우저 창에서 '발행' 버튼을 눌러 발행 설정창을 열어주세요."
    );
  });

  for (const tag of tags) {
    const trimmed = tag.trim();
    if (!trimmed) continue;

    await tagInput.click();
    await sleep(randomDelay(200, 500));
    await humanType(page, trimmed);
    await sleep(randomDelay(200, 450));
    await page.keyboard.press("Enter");
    await sleep(randomDelay(400, 800));
  }
}

/**
 * 카테고리 선택. 태그와 마찬가지로 발행 설정 레이어 안의 기능이다(사람이 직접 '발행'
 * 버튼을 눌러 이미 열려 있다고 가정). 드롭다운이 아직 닫혀 있으면 먼저 열고, 목록에서
 * 이름이 일치하는 항목을 찾아 클릭한다. 항목 텍스트 앞에 카테고리 색상을 나타내는
 * 기호(●◆★▶ 등)가 붙어 있으므로 완전히 일치하는 대신 부분 포함으로 찾는다.
 */
async function selectCategory(page, categoryName) {
  const editorFrame = page.frameLocator('iframe[src*="PostWriteForm.naver"]');

  const trigger = editorFrame.locator(".selectbox_button__IxraO").first();
  await trigger.waitFor({ state: "visible", timeout: 15000 }).catch(() => {
    throw new Error(
      "카테고리 선택 버튼을 찾지 못했습니다 — 먼저 브라우저 창에서 '발행' 버튼을 눌러 발행 설정창을 열어주세요."
    );
  });

  const listLayer = editorFrame.locator(".option_list_layer__o54Wx");
  const isOpen = await listLayer.isVisible().catch(() => false);
  if (!isOpen) {
    await trigger.hover();
    await sleep(randomDelay(300, 600));
    await trigger.click();
    await sleep(randomDelay(400, 800));
    await listLayer.waitFor({ state: "visible", timeout: 5000 });
  }

  const items = editorFrame.locator(".item__dTdzo");
  const count = await items.count();

  let target = null;
  for (let i = 0; i < count; i += 1) {
    const text = (await items.nth(i).innerText()).trim();
    if (text.includes(categoryName)) {
      target = items.nth(i);
      break;
    }
  }

  if (!target) {
    throw new Error(`"${categoryName}" 카테고리를 목록에서 찾지 못했습니다 — 이름이 정확한지 확인해주세요.`);
  }

  await target.hover();
  await sleep(randomDelay(300, 600));
  await target.click();
  await sleep(randomDelay(300, 600));
}

module.exports = { fillTitleAndBody, insertImage, fillTags, selectCategory };
