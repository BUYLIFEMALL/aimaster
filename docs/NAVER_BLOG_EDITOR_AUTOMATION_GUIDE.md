# 네이버 블로그 편집기 자동 입력 개발 지침

이 문서는 AIMaster의 네이버 블로그 자동 입력 기능을 새 CLI, Chrome 확장, Playwright 프로그램에 재사용하기 위한 공통 지침이다.

> 목적은 네이버 SmartEditor의 현재 DOM 구조와 입력 이벤트를 안정적으로 처리하는 것이다. 자동화 탐지 우회나 서비스 정책 위반을 보장하는 문서가 아니며, 최종 게시 전 사용자가 내용을 검토해야 한다.

## 1. 기준 구현과 참고 위치

- Chrome 확장 기준 구현: `naver-blog-seo-studio/extension/`
- 기존 Chrome 확장 구조 분석 도구: `naver-blog-auto-poster_web/extension/sidepanel.js`
- Playwright 기준 구현: `naver-blog-auto-poster_app/src/lib/naverBlogAutomation.js`
- 기본 자료 폴더: `D:\PDS`

기존 프로그램을 재사용할 때는 선택자만 복사하지 말고, **프레임 탐색 → 실제 편집 대상 확인 → 포커스 → 입력 → 결과 검증**의 순서를 함께 유지한다.

## 2. 네이버 편집기 구조의 핵심

네이버 글쓰기 화면은 최상위 페이지가 아니라 `PostWriteForm.naver` iframe 안에 편집기를 동적으로 생성한다. 구조 분석 결과의 일반적인 형태는 다음과 같다.

```text
blog.naver.com/<blog>?Redirect=Write
└─ iframe: PostWriteForm.naver
   ├─ .se-documentTitle
   │  └─ .se-title-text                 제목 후보 컨테이너
   ├─ .se-text-paragraph                본문 문단 후보(P)
   └─ 별도의 [contenteditable="true"] DIV  실제 입력 대상
```

중요한 점은 `.se-title-text` 또는 `.se-text-paragraph`가 항상 `contenteditable` 자체라는 보장이 없다는 것이다. 해당 요소의 하위 또는 상위에 실제 편집 가능한 요소가 있을 수 있다.

## 3. 반드시 지켜야 하는 입력 순서

### 3.1 네이버 탭 찾기와 활성화

```js
const tabs = await chrome.tabs.query({
  url: ["https://blog.naver.com/*", "https://m.blog.naver.com/*"]
});
const tab = tabs.find((candidate) => candidate.active) || tabs[0];
await chrome.windows.update(tab.windowId, { focused: true });
await chrome.tabs.update(tab.id, { active: true });
```

입력 전에 브라우저 창과 탭을 실제로 활성화한다. 네이버 글쓰기 화면이 아직 열리지 않았으면 입력을 시도하지 말고 사용자에게 안내한다.

### 3.2 모든 iframe에서 대상 탐색

Chrome 확장은 반드시 `allFrames: true`로 실행한다.

```js
await chrome.scripting.executeScript({
  target: { tabId: tab.id, allFrames: true },
  ...
});
```

최상위 프레임에서 후보가 없다고 실패 처리하지 않는다. `frameId`별 결과를 모아 실제 `PostWriteForm.naver` 프레임의 결과를 사용한다.

### 3.3 실제 contenteditable 해석

후보 컨테이너에서 다음 순서로 실제 입력 대상을 찾는다.

```js
function findEditable(element) {
  if (element?.isContentEditable) return element;
  return element?.querySelector('[contenteditable="true"]')
    || element?.closest('[contenteditable="true"]');
}
```

요소를 클릭하고 `focus()`한 뒤 `document.activeElement`도 확인한다. iframe이 중첩될 수 있으므로 active element를 최대 5단계까지 따라가며 실제 `contenteditable`을 찾는다.

### 3.4 제목과 본문은 별도로 탐색

제목을 입력한 뒤 네이버 편집기가 본문 문단을 생성하거나 갱신할 수 있다. 따라서 본문 요소를 제목 입력 전에 캐시하지 않는다.

```js
const titleContainer = document.querySelector('.se-title-text');
const bodyContainer = [...document.querySelectorAll('.se-text-paragraph')]
  .find((element) => !element.closest('.se-documentTitle'));
```

제목 입력 후 지연을 두고 본문을 다시 검색한다.

## 4. 입력 방식

### 4.1 Chrome 확장: `chrome.debugger` + CDP

Manifest에 `debugger` 권한을 추가한다.

```json
{
  "permissions": ["sidePanel", "storage", "scripting", "tabs", "debugger"]
}
```

사용자 클릭 이벤트 안에서 탭에 연결한다.

```js
await chrome.debugger.attach({ tabId }, "1.3");
try {
  await chrome.debugger.sendCommand(
    { tabId },
    "Input.setIgnoreInputEvents",
    { ignore: false }
  );
  // 입력 수행
} finally {
  await chrome.debugger.detach({ tabId }).catch(() => {});
}
```

일반 문자는 `Input.insertText`로 보낸다.

```js
await chrome.debugger.sendCommand(
  { tabId },
  "Input.insertText",
  { text: character }
);
```

줄바꿈은 `insertText("\\n")`로 처리하지 말고 실제 Enter 키 이벤트를 보낸다.

```js
await sendCommand(tabId, "Input.dispatchKeyEvent", {
  type: "keyDown",
  key: "Enter",
  code: "Enter",
  windowsVirtualKeyCode: 13,
  nativeVirtualKeyCode: 13
});
await sendCommand(tabId, "Input.dispatchKeyEvent", {
  type: "keyUp",
  key: "Enter",
  code: "Enter",
  windowsVirtualKeyCode: 13,
  nativeVirtualKeyCode: 13
});
```

이 방식이 `execCommand("insertParagraph")`보다 SmartEditor의 문단 처리와 잘 맞는다. 공백은 각 문자를 `Input.insertText`로 전달하므로 일반 공백과 한글 사이 공백이 유지된다.

### 4.2 Playwright: 실제 keyboard API

Playwright에서는 `locator.fill()`로 본문 전체를 한 번에 넣지 않는다. 편집기가 내부적으로 문단을 관리하므로 실제 키보드 입력 API를 사용한다.

```js
await locator.click();
await page.keyboard.type(text, { delay: 70 });
```

줄바꿈은 문자열을 분리해 `Enter`를 명시적으로 누른다.

```js
for (const part of text.split("\n")) {
  await page.keyboard.type(part, { delay: 70 });
  if (part !== lastPart) await page.keyboard.press("Enter");
}
```

## 5. 텍스트 정규화 규칙

AI 초안이 Markdown으로 반환될 수 있으므로 네이버 입력 전에 다음을 정리한다.

- CRLF를 LF로 통일
- 문자열로 들어온 `\\n`을 실제 줄바꿈으로 변환
- Markdown 링크는 표시 텍스트만 사용
- 제목용 `#` 제거
- 코드 백틱 제거
- 필요 시 목록 기호 정리
- 마지막 `trim()`은 사용하되, 문단 사이의 내부 줄바꿈은 절대 제거하지 않음

정규화 후에는 각 문자를 순서대로 입력하고, `\n`만 Enter 이벤트로 분기한다.

## 6. 구조 분석 진단 도구

네이버 화면 변경으로 입력이 실패하면 추측하지 말고 먼저 구조를 캡처한다. `naver-blog-seo-studio` 확장에는 하단의 **구조 분석** 기능이 포함되어 있다.

진단 결과에 다음 항목을 포함한다.

- `frameId`
- `url`
- `titleCandidates`
- `paragraphCandidates`
- `contentEditableEls`
- 발행·저장·카테고리·태그 버튼 후보

기본 진단 함수:

```js
const describe = (element) => ({
  tag: element.tagName,
  id: element.id || null,
  classes: typeof element.className === "string"
    ? element.className.trim().split(/\s+/).slice(0, 8)
    : null,
  contentEditable: element.isContentEditable || null,
  text: (element.textContent || "").trim().slice(0, 80)
});
```

사용자가 전달한 구조 분석 결과에서 `PostWriteForm.naver` iframe과 실제 `contenteditable` 요소가 확인되는지 먼저 본다.

## 7. 입력 완료 검증

입력 함수가 예외 없이 끝났다고 성공 처리하지 않는다.

- 제목 입력 대상의 텍스트에 제목이 포함되는지 확인
- 본문 입력 대상에 본문의 앞부분이 포함되는지 확인
- 줄바꿈 개수가 지나치게 줄지 않았는지 확인
- 실제 화면에서 문단이 분리되어 보이는지 확인

검증 실패 시 성공 메시지를 표시하지 말고 구조 분석 결과와 함께 실패 원인을 표시한다.

## 8. 권한·보안·운영 주의사항

- `chrome.debugger`는 강한 권한이므로 사용자에게 확장 권한 경고가 표시될 수 있다.
- DevTools 또는 다른 디버거가 같은 탭에 연결되어 있으면 attach가 실패할 수 있다.
- 입력 중 탭이 닫히거나 이동하면 반드시 `detach` 예외를 안전하게 처리한다.
- Chrome 확장은 Vercel 배포로 갱신되지 않는다. 코드 변경 후 `chrome://extensions`에서 확장을 새로고침하거나 다음 폴더를 다시 로드한다.

```text
D:\Antigravity\AIMaster\naver-blog-seo-studio\extension
```

- 실제 게시 전 제목·본문·링크·이미지를 사람이 검토한다.
- 서비스 정책, 이용약관, 게시 제한을 확인하고 대량 게시를 전제로 설계하지 않는다.

## 9. 새 프로그램 개발 체크리스트

- [ ] 해당 프로젝트의 `README.md`와 `AGENTS.md`를 먼저 읽었는가?
- [ ] `D:\PDS`에서 제공 자료와 기존 작동 프로그램을 확인했는가?
- [ ] 네이버 탭을 활성화하는가?
- [ ] `allFrames: true`로 iframe을 탐색하는가?
- [ ] `.se-title-text`와 `.se-text-paragraph`를 실제 편집 대상과 구분하는가?
- [ ] 하위·상위 `contenteditable` 및 `activeElement`를 해석하는가?
- [ ] 제목 입력 후 본문을 다시 탐색하는가?
- [ ] 일반 문자는 CDP `Input.insertText` 또는 Playwright keyboard로 입력하는가?
- [ ] 줄바꿈은 실제 Enter 이벤트로 처리하는가?
- [ ] 공백과 내부 줄바꿈을 정규화 과정에서 보존하는가?
- [ ] 입력 후 실제 텍스트와 문단을 검증하는가?
- [ ] 구조 분석 도구로 실패 원인을 재현할 수 있는가?
- [ ] 확장 권한과 사용자의 최종 검토 절차를 안내하는가?

## 10. 관련 커밋

- `2270b6e` — Chrome debugger 기반 실제 키보드 입력 도입
- `5971314` — 실제 `contenteditable` 대상 및 activeElement 해석 보정
- `b57fb36` — SEO Studio 확장에 구조분석 진단 섹션 추가
