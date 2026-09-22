# 네이버 블로그 SEO 스튜디오 인수인계 문서

최종 갱신: 2026-09-22

이 문서는 Claude/Gemini/Codex가 `naver-blog-seo-studio` 작업을 이어받을 때 반드시 먼저 읽어야 하는 작업 기록이다.

## 1. 프로젝트 목적과 범위

이 프로젝트는 네이버 블로그용 콘텐츠 제작 스튜디오다.

- 검색 주제·키워드 기반 AI 초안 생성
- 검색 의도 기반 제목 추천
- 기존 글 SEO 최적화
- 생성 초안 기록·재사용
- Chrome 확장에서 SEO Studio 초안을 네이버 글쓰기 화면에 입력
- 네이버 최종 발행 버튼은 자동으로 누르지 않으며 사용자가 검토 후 직접 발행

기존 `naver-blog-auto-poster_app`과 `naver-blog-auto-poster_web`은 별도 프로그램이다. SEO Studio 확장은 반드시 `naver-blog-seo-studio/extension` 안에서 관리한다.

## 2. 작업 폴더와 배포

- 저장소 루트: `D:\Antigravity\AIMaster`
- SEO Studio 프로젝트: `D:\Antigravity\AIMaster\naver-blog-seo-studio`
- SEO Studio Chrome 확장: `D:\Antigravity\AIMaster\naver-blog-seo-studio\extension`
- 사용자 제공 스크린샷·PDF·참고자료 기본 폴더: `D:\PDS`
- 웹 배포 URL: <https://naver-blog-seo-studio.vercel.app>
- Vercel 프로젝트: `buylife/naver-blog-seo-studio`
- 마지막 웹 배포: `dpl_4BXJcGA8MdfenBDdqfp8MbAz8WHt`
- 마지막 Git 커밋: `c025bb1`

확장 프로그램은 정적 Chrome 파일이므로 Vercel 배포 대상이 아니다. 코드 변경 후 Chrome에서 `chrome://extensions`의 확장을 제거하고 `extension` 폴더를 다시 로드해야 한다.

## 3. 현재 구현 기능

### 웹 앱

- `/login`: AIMaster 공용 Supabase 로그인
- `/dashboard`: SEO Studio 대시보드
- `/settings`: OpenAI/Gemini 개인 API 키, Chrome 토큰 발급·폐기, 연동 안내
- `/api/drafts/generate`: AI 초안 생성
- `/api/drafts/history`: 본인 초안 이력
- `/api/drafts/optimize`: 기존 글 SEO 최적화
- `/api/titles/recommend`: 제목 후보 추천
- `/api/extension/whoami`: Chrome 토큰 검증
- `/api/extension/drafts`: 확장 전용 초안 생성

공용 Supabase DB의 `user_api_keys`, `personal_access_tokens`, `naver_blog_seo_drafts`를 사용한다. API 키는 운영자 키로 대체하지 않고 사용자별 키만 사용한다.

### Chrome 확장

`extension/manifest.json` 기준:

- 이름: `AIMaster Naver Blog SEO Studio`
- 버전: `1.0.1`
- Manifest V3
- 권한: `sidePanel`, `storage`, `scripting`, `tabs`
- 호스트: `*.naver.com`, `naver-blog-seo-studio.vercel.app`

확장 UI 기능:

1. SEO Studio 토큰 연결
2. 주제·키워드 입력
3. `/api/extension/drafts` 호출
4. 제목·본문 표시
5. 네이버 편집기 입력 버튼

## 4. 토큰 발급·연결 흐름

1. SEO Studio `/settings` 로그인
2. Chrome 확장 연동 토큰에서 **새 토큰 발급**
3. `pat_...` 값을 복사
4. Chrome 사이드 패널의 계정 연동 입력칸에 붙여넣기
5. **SEO Studio 연결** 클릭
6. `연결됨: 이메일` 표시 확인

토큰 발급 오류의 원인은 SEO Studio Vercel Production에 `SUPABASE_SERVICE_ROLE_KEY`가 없거나 잘못된 값이었던 것이다. 현재 메인 AIMaster와 SEO Studio Production에 정상 서비스 키를 등록하고 재배포했다. 비밀값을 문서나 UI에 기록하지 않는다.

## 5. 네이버 입력 기능의 현재 상태와 미해결 문제

현재 가장 중요한 미해결 문제는 **제목·본문 입력은 시도되지만 네이버 편집기의 띄어쓰기·줄바꿈·문단 구조가 기대한 대로 보존되지 않는 것**이다. 일부 테스트에서는 입력 완료 메시지가 표시됐지만 실제 편집기 내용이 한 문단처럼 붙거나 제목이 비어 있었다.

이전 수정 `4604219`에서는 다음을 시도했다.

- 기존 확장의 `.se-title-text`, `.se-text-paragraph` 선택자 사용
- `chrome.tabs.query({url: ...})`로 네이버 탭 직접 탐색
- `chrome.windows.update`와 `chrome.tabs.update`로 OS 포커스 확보
- `executeScript({target:{tabId, allFrames:true}})` 사용
- `resolveActiveEditable()`로 클릭 후 실제 iframe 편집 노드 추적
- 제목은 문자 단위 `execCommand("insertText")`
- 본문은 `<p>`/`<br>` HTML을 `execCommand("insertHTML")`로 삽입
- Markdown 문법 제거 및 `\\n` 문자열을 실제 줄바꿈으로 복원

이 버전은 아직 사용자의 최종 검증에서 “완전히 해결”되었다고 확정하지 않았다. 다음 작업자는 성공 여부를 먼저 재현하고, 실패 시 추정 선택자를 더 추가하지 말고 실제 DOM 진단부터 수행해야 한다.

`c025bb1`에서 기존 Web 확장의 입력 순서를 다시 연결했다. 제목을 먼저 입력한 뒤 본문 `.se-text-paragraph`를 다시 찾는 순서와 `resolveActiveEditable`/`humanType` 흐름을 유지한다. HTML 문단 삽입 실험은 제거했으며, 먼저 이 버전을 기준으로 실제 네이버 화면에서 검증한다.

## 6. Claude/Gemini 기존 네이버 자동화 방식에서 확인된 사실

기존 `naver-blog-auto-poster_web` 및 `naver-blog-auto-poster_app` 문서와 코드를 확인한 결과:

- Electron 앱은 Playwright를 사용한다.
- 실제 에디터 iframe을 `iframe[src*="PostWriteForm.naver"]`로 잡는다.
- `frameLocator`로 iframe 내부에서 `.se-title-text`와 본문 후보를 찾는다.
- `.se-text-paragraph`가 제목 영역에도 재사용될 수 있으므로 `.se-documentTitle` 내부 후보는 제외한다.
- 클릭 후 `document.activeElement`가 iframe인지 확인하고 `contentDocument`의 실제 contenteditable 노드로 이동한다.
- 모든 Range/Selection/`execCommand`는 실제 대상의 `ownerDocument` 기준으로 수행한다.
- OS 포커스가 없으면 `execCommand`가 오류 없이 무시될 수 있어 창과 탭을 먼저 포커스한다.
- Claude/Playwright의 `humanType`은 실제 키보드 `page.keyboard.type()` 및 Enter를 사용한다.
- 줄바꿈은 `page.keyboard.press("Enter")`로 처리한다.
- 입력 후 DOM의 실제 텍스트를 읽어 `verified` 결과를 반환한다.
- 구조가 바뀌면 먼저 `blogEditorInspector.js` 방식으로 제목·본문·iframe·contenteditable을 수집한다.

핵심 차이점은 Playwright는 실제 키보드 입력을 사용할 수 있지만 Chrome 확장 `executeScript`는 `execCommand`/DOM 조작만 가능하다는 점이다. 따라서 두 구현을 동일하다고 가정하면 안 된다.

## 7. 다음 작업자가 해야 할 디버깅 순서

1. `D:\PDS`의 최신 캡처를 확인한다.
2. Chrome 확장 버전이 `1.0.1`인지 확인한다.
3. `chrome://extensions`에서 기존 확장을 제거하고 `naver-blog-seo-studio/extension`을 다시 로드한다.
4. 네이버 글쓰기 화면을 새 탭에서 연다.
5. 입력 전 확장 상태·현재 URL·네이버 탭 개수를 기록한다.
6. `allFrames:true` 결과를 프레임별로 수집한다.
7. 각 프레임에 대해 다음을 기록한다.
   - frame URL
   - `.se-title-text` 후보 수와 `getClientRects().length`
   - `.se-documentTitle` 후보 수
   - `.se-text-paragraph` 후보 수
   - `[contenteditable="true"]` 후보와 `isContentEditable`
   - 클릭 전후 `document.activeElement` 태그와 iframe 여부
   - 실제 입력 후 `textContent`/`innerText`
8. 성공 판정은 버튼 메시지가 아니라 제목·본문 실제 DOM 텍스트 검증으로 한다.
9. Playwright 방식을 그대로 복사할 수 없는 Chrome 확장 한계를 먼저 기록한다.
10. 필요하면 입력 방식을 다음 세 가지로 비교 테스트한다.
    - 문자 단위 `execCommand("insertText")` + Enter/`insertParagraph`
    - 문단별 `execCommand("insertHTML")`
    - 사용자가 직접 본문을 클릭한 뒤 입력하는 보조 흐름

## 8. 중요한 개발 규칙

- 기존에 동작한 함수 전체를 삭제하고 일반화하지 않는다. 변경 전후 `git diff`로 핵심 로직 보존을 확인한다.
- 네이버 DOM 선택자를 추측으로 늘리지 않는다. 실제 구조 진단 결과를 기준으로 수정한다.
- 네이버 최종 발행 버튼은 자동으로 누르지 않는다.
- 계정별 토큰·API 키를 공유하거나 운영자 키로 대체하지 않는다.
- 사용자가 제공한 캡처는 먼저 `D:\PDS`에서 찾는다.
- 기능 변경 후 `npm.cmd run build`, 문법 검사, 실제 화면 검증을 순서대로 한다.
- 작업 완료 요청이 있으면 대상 파일만 stage하고 커밋·푸시·해당 Vercel 프로젝트 배포까지 진행한다.
- 확장 코드 변경은 Vercel 배포가 아니라 Chrome 확장 제거 후 재로드가 필요하다.

## 9. 참고 파일

- `naver-blog-seo-studio/extension/sidepanel.js`: 현재 전용 확장 핵심 코드
- `naver-blog-seo-studio/extension/manifest.json`: 확장 버전·권한
- `naver-blog-seo-studio/lib/ai/generator.ts`: 초안 Markdown·줄바꿈 정리
- `naver-blog-auto-poster_web/sidepanel.js`: 기존 Chrome 확장 입력 구현
- `naver-blog-auto-poster_web/AGENTS.md`: 실제 DOM 조사·iframe·포커스·검증 규칙
- `naver-blog-auto-poster_app/src/lib/naverBlogAutomation.js`: Playwright 성공 구현
- `naver-blog-auto-poster_app/src/lib/humanInput.js`: 실제 키보드 입력 지연 구현
- `naver-blog-auto-poster_app/src/lib/blogEditorInspector.js`: DOM 조사 도구
- `naver-blog-auto-poster_app/AGENTS.md`: 기존 자동화의 상세 개발 규칙
- `D:\PDS`: 사용자 캡처·검수 자료

## 10. 현재 결론

SEO Studio 웹 앱·토큰·AI 초안 생성·전용 확장 구조는 구현되어 있다. 남은 핵심 과제는 Claude/Gemini의 Playwright 입력 품질을 Chrome 확장 환경에서 어떻게 재현할지 확정하는 것이다. 다음 작업자는 먼저 실제 DOM 진단 결과를 수집하고, 검증된 입력 방식 하나를 선택한 뒤 최소 변경으로 구현해야 한다.
