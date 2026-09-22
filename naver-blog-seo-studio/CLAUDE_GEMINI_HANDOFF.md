# 네이버 블로그 SEO Studio 인수인계

최종 갱신: 2026-09-22

이 문서는 Claude, Gemini, Codex 및 다른 CLI가 SEO Studio 작업을 이어받을 때 사용하는 최신 기준 문서다. 네이버 편집기 자동 입력의 상세 원칙은 루트 `docs/NAVER_BLOG_EDITOR_AUTOMATION_GUIDE.md`를 함께 읽는다.

## 1. 프로젝트 위치와 배포

- 저장소 루트: `D:\Antigravity\AIMaster`
- 웹 프로젝트: `D:\Antigravity\AIMaster\naver-blog-seo-studio`
- Chrome 확장: `D:\Antigravity\AIMaster\naver-blog-seo-studio\extension`
- 참고 자료 기본 폴더: `D:\PDS`
- Git 원격: `https://github.com/BUYLIFEMALL/aimaster.git`
- 기본 브랜치: `master`
- Vercel 프로젝트: `buylife/naver-blog-seo-studio`
- 프로덕션 URL: `https://naver-blog-seo-studio.vercel.app`
- 최신 배포 ID: `dpl_DnXLwn5vLgCBkkS95X3AfbC9bLGi`

Chrome 확장은 Vercel 배포 대상이 아니다. 확장 코드를 변경하면 `chrome://extensions`에서 기존 확장을 새로고침하거나 다음 폴더를 다시 로드한다.

```text
D:\Antigravity\AIMaster\naver-blog-seo-studio\extension
```

## 2. 제품 범위

SEO Studio는 네이버 블로그용 콘텐츠 기획·초안·SEO 점검 도구다.

- 주제·키워드 기반 AI 초안 생성
- 제목 후보 추천
- 기존 글 SEO 최적화
- 초안 이력 저장 및 조회
- Chrome 확장에서 초안 생성
- 네이버 글쓰기 화면에 제목·본문 입력
- 사용자가 최종 내용을 검토한 뒤 직접 발행

자동 로그인, 자동 발행, 대량 댓글·공감·이웃추가·무인 게시 기능은 구현하지 않는다.

## 3. 현재 구현 상태

웹 경로:

- `/login`: AIMaster 공용 Supabase 로그인
- `/dashboard`: SEO Studio 대시보드
- `/settings`: 개인 OpenAI/Gemini API 키, Chrome 토큰 발급·관리

API:

- `/api/drafts/generate`: AI 초안 생성
- `/api/drafts/history`: 사용자 초안 이력
- `/api/drafts/optimize`: 기존 글 SEO 최적화
- `/api/titles/recommend`: 제목 추천
- `/api/extension/whoami`: 확장 토큰 검증
- `/api/extension/drafts`: 확장 전용 초안 생성

공용 Supabase 테이블과 사용자별 RLS를 사용한다. 운영자 API 키로 사용자를 대신하지 않으며, 사용자의 API 키가 없으면 AI 기능을 실행하지 않는다.

## 4. Chrome 확장 상태

Manifest V3 확장 이름은 `AIMaster Naver Blog SEO Studio`이며 현재 버전은 `1.0.2`다.

권한:

- `sidePanel`
- `storage`
- `scripting`
- `tabs`
- `debugger`

기능:

1. SEO Studio 개인 토큰 연결
2. 주제·키워드 입력
3. AI 초안 생성
4. 제목·본문 확인 및 수정
5. 네이버 편집기에 실제 키보드 방식으로 입력
6. 네이버 편집기 구조 분석 결과 JSON 출력

## 5. 네이버 입력 구현의 최종 기준

현재 성공한 구현은 다음 순서를 반드시 유지한다.

1. `chrome.tabs.query()`로 `blog.naver.com` 탭을 찾는다.
2. 창과 탭을 활성화한다.
3. `chrome.scripting.executeScript({ target: { tabId, allFrames: true } })`로 모든 iframe을 탐색한다.
4. 제목 후보 `.se-title-text`와 본문 후보 `.se-text-paragraph`를 찾는다.
5. 후보 자체가 아닌 하위·상위 `[contenteditable="true"]`를 찾는다.
6. 필요하면 `document.activeElement`를 iframe 안쪽까지 추적한다.
7. 제목을 입력한다.
8. 제목 입력 후 본문 문단을 다시 찾는다.
9. `chrome.debugger`의 CDP `Input.insertText`로 일반 문자를 입력한다.
10. 줄바꿈은 `Input.dispatchKeyEvent`의 Enter keyDown/keyUp으로 입력한다.
11. 완료 후 실제 DOM 텍스트를 확인한다.
12. 항상 `chrome.debugger.detach()`를 실행한다.

`execCommand("insertText")`를 새 최종 방식으로 되돌리지 않는다. 네이버 편집기 구조가 변경되면 추측으로 선택자를 추가하지 말고 먼저 확장의 `구조 분석` 기능으로 iframe·편집 대상·activeElement를 확인한다.

## 6. 구조 분석 기능

확장 하단의 `구조 분석` 버튼은 모든 프레임에서 다음 정보를 수집한다.

- `frameId`, URL, 문서 제목
- 제목 후보
- 본문 문단 후보
- 실제 `contenteditable` 요소
- 발행·저장·카테고리·태그 버튼 후보

입력 장애가 발생하면 구조 분석 결과와 현재 네이버 글쓰기 URL을 함께 기록한다. 성공 여부는 상태 문구가 아니라 실제 제목·본문 DOM의 `textContent`와 화면 결과로 판단한다.

## 7. 최신 변경 이력

- `2270b6e`: Chrome debugger 기반 실제 키보드 입력 도입
- `5971314`: 실제 contenteditable 및 activeElement 해석 보정
- `b57fb36`: SEO Studio 확장에 구조분석 섹션 추가
- `834a71e`: 공통 네이버 편집기 자동화 매뉴얼 추가

## 8. 작업 규칙

- 작업 전 이 문서와 `docs/NAVER_BLOG_EDITOR_AUTOMATION_GUIDE.md`를 읽는다.
- 기존 `naver-blog-auto-poster_app`과 `naver-blog-auto-poster_web`은 참고 프로그램이지 동일 프로젝트가 아니다.
- 기존 작동 기능을 제거하거나 단순화하지 않는다.
- 실제 DOM을 조사한 뒤 최소 범위로 수정한다.
- 사용자별 인증·API 키를 공유하거나 운영자 키로 대체하지 않는다.
- 네이버 최종 발행은 사용자의 검토 후 수동으로 한다.
- 변경 후 `npm.cmd run build`, JavaScript 문법검사, 실제 브라우저 검증을 수행한다.
- 브라우저 회귀 테스트는 `npm.cmd run test:browser`로 실행한다. 테스트는 로컬 SmartEditor 모형에서 iframe·CDP 입력·공백·문단·Markdown 정규화를 검증한다.
- 사용자가 작업 완료를 요청하면 관련 파일만 커밋하고 원격 저장소에 푸시한다.

## 9. 다음 작업자 체크리스트

- [ ] 현재 브랜치와 `git status` 확인
- [ ] `D:\PDS`에서 최신 캡처·자료 확인
- [ ] 변경 대상 프로젝트의 `README.md`와 `AGENTS.md` 확인
- [ ] 네이버 DOM 변경 여부를 구조 분석으로 확인
- [ ] 제목·본문·띄어쓰기·복수 문단을 실제 화면에서 검증
- [ ] 웹 코드 변경 시 Vercel 프로덕션 배포
- [ ] 확장 코드 변경 시 Chrome 확장 새로고침 안내
- [ ] 결과와 커밋·배포 정보를 사용자에게 보고
