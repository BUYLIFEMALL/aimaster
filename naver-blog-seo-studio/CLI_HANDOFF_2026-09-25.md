# 네이버 블로그 SEO 스튜디오 — CLI 인수인계

최종 갱신: 2026-09-25  
대상: Claude Code, Gemini CLI, Codex 등 후속 작업 에이전트

## 1. 시작 전 필독

1. 루트 `AGENTS.md`와 이 문서를 읽는다.
2. `README.md`, `AGENTS.md`, `docs/NAVER_BLOG_EDITOR_AUTOMATION_GUIDE.md`도 함께 읽는다.
3. 작업 경로는 `D:\Antigravity\AIMaster\naver-blog-seo-studio`다. 참고 이미지·스크린샷은 기본적으로 `D:\PDS`에서 찾는다.
4. 기존 `naver-blog-auto-poster_app`, `naver-blog-auto-poster_web`은 참고용일 뿐, 코드·권한·확장 프로그램을 섞지 않는다.

## 2. 배포·현재 버전

- 웹 앱: `https://naver-blog-seo-studio.vercel.app`
- 대시보드: `https://naver-blog-seo-studio.vercel.app/dashboard`
- Vercel 프로젝트: `buylife/naver-blog-seo-studio`
- 프로그램 slug: `naver-blog-seo-studio`
- 공용 Supabase 프로젝트: `esgxyikcnnvmlhygjkth`
- Chrome 확장 원본 설치 폴더: `naver-blog-seo-studio/extension/`
- Chrome 확장 manifest 버전: **1.0.31**
- 배포 ZIP: `/downloads/naver-blog-seo-studio-extension-v1.0.31.zip`
- 마지막 기능 커밋: `dc72ffb fix: verify publish settings and preserve tag focus`

확장 프로그램은 Vercel 배포만으로 사용자 PC에 갱신되지 않는다. 확장 코드를 바꾸면 원본
`extension/` 폴더, ZIP, `/settings`의 다운로드 버전을 반드시 같은 버전으로 맞춘다.

## 3. 제품 범위와 안전 경계

이 프로그램은 사용자 자신의 API 키로 네이버 블로그 콘텐츠를 기획·생성·검수하고, 사용자가
열어 둔 네이버 글쓰기 화면에 제목·이미지·본문 및 발행 설정을 입력하도록 돕는다.

- 사용자별 OpenAI/Gemini 키만 사용한다. 운영자 키 폴백은 금지다.
- 사용자별 확장 연동 토큰을 사용한다.
- 자동 로그인, 대량 게시, 댓글·공감·이웃 추가는 범위 밖이다.
- **네이버 최종 발행 버튼은 자동으로 누르지 않는다.** 카테고리·태그까지만 입력하고 사용자가 검토 후 직접 발행한다.

## 4. 구현 완료 기능

### 웹 앱

- AIMaster 공용 로그인·프로그램 이용권한 게이트
- 주제·키워드·SEO 전략 기반 초안 생성, 제목 추천, 기존 글 최적화, 초안 이력
- `/settings`의 사용자별 OpenAI/Gemini 키 저장
- OpenAI 콘텐츠 생성 모델과 Gemini 이미지 생성 모델 선택·현재 선택값 표시
- Chrome 확장 연동 토큰 발급·폐기
- 확장 ZIP 다운로드 및 설치 상태 안내

### Chrome 확장

1. 토큰으로 SEO Studio 계정 연결
2. 주제·키워드 입력 후 웹 API에서 초안 생성
3. 선택 시 Gemini 나노바나나 대표 이미지 생성
4. 네이버 SmartEditor에 **제목 → 대표 이미지 → 본문**의 최종 화면 순서로 입력
5. 실제 제목·본문 문단 수를 DOM에서 검증
6. 네이버 편집기 구조 분석 JSON 출력
7. 네이버 발행 설정창에 저장한 카테고리·태그 입력

## 5. 핵심 파일 지도

| 대상 | 주요 파일 | 역할 |
|---|---|---|
| 웹 대시보드 | `components/StudioPage.tsx` | 초안 생성·편집 UI |
| 설정 | `app/settings/page.tsx`, `ApiKeySettings.tsx`, `AiModelSettings.tsx` | 키, 모델, 토큰, 확장 ZIP |
| AI 텍스트 | `lib/ai/generator.ts`, `lib/ai/openaiModels.ts` | OpenAI 초안·모델 설정 |
| AI 이미지 | `lib/ai/nanoBanana.ts`, `lib/ai/geminiModels.ts` | Gemini 이미지 생성·모델 설정 |
| 확장 인증 | `lib/extensionAuth.ts`, `lib/tokenActions.ts` | 개인 토큰 검증·관리 |
| 확장 API | `app/api/extension/drafts/route.ts` | 확장 초안·이미지 생성 |
| 확장 UI·자동화 | `extension/sidepanel.js` | 입력, 업로드, 발행 정보, 구조 분석 |
| 확장 권한 | `extension/manifest.json` | MV3, `debugger` 포함 권한 |
| 확장 회귀 테스트 | `tests/browser/extension-regression.test.mjs` | SmartEditor 모형 기반 6개 회귀 테스트 |
| ZIP 생성 | `scripts/build-extension-archive.mjs` | manifest 버전 기반 ZIP 생성 |
| DB 원본 | `supabase/migrations/20260921093000_register_naver_blog_seo_studio.sql` | 프로그램·요금제·초안 RLS |

## 6. 네이버 편집기 입력 — 검증된 방식

### 구조

네이버 글쓰기 편집기는 최상위 탭이 아니라 보통 `PostWriteForm.naver` iframe 안에 있다. 제목·본문
후보 컨테이너 자체가 `contenteditable`이 아닐 수 있으므로, 모든 프레임을 탐색한 뒤 하위 또는
상위의 실제 `[contenteditable="true"]` 요소를 찾아야 한다.

### 입력 원칙

- `chrome.scripting.executeScript`는 항상 `allFrames: true`로 실행한다.
- 제목 입력 뒤 본문 후보를 다시 찾는다.
- 일반 문자는 `chrome.debugger` CDP `Input.insertText`로 한 글자씩 입력한다.
- 줄바꿈은 문자열 `\n` 삽입이 아니라 `Input.dispatchKeyEvent`의 Enter keyDown/keyUp으로 보낸다.
- AI Markdown은 `plainText()`에서 링크·강조·제목 기호 등을 제거하되 공백과 문단 줄바꿈은 보존한다.
- 함수가 예외 없이 끝난 것만으로 성공 처리하지 말고, 제목 텍스트와 실제 본문 문단을 검증한다.
- 디버거는 반드시 `finally`에서 detach한다. DevTools나 다른 확장이 이미 연결되어 있으면 attach가 실패한다.

`execCommand("insertText")` 또는 본문 전체 일괄 주입 방식으로 되돌리지 않는다. 줄바꿈·문단과
공백이 깨진 과거 문제가 이 방식으로 해결됐다.

### 이미지 삽입

이미지는 네이버 사진 도구를 누른 뒤 동적으로 생성되는 `input[type=file]`에 `File`/`DataTransfer`로
전달한다. Windows 네이티브 파일 선택 창이 남는 문제를 막기 위해 두 안전장치를 함께 유지한다.

1. CDP `Page.setInterceptFileChooserDialog`을 업로드 시작 전에 활성화한다.
2. 모든 프레임의 `MAIN` world에서 업로드 중에만 file input의 기본 click/showPicker를 막고, 완료·실패·20초 타임아웃에 원복한다.

중요: 최상위 프레임의 `file input not found` 결과를 성공/실패 판단에 쓰지 않는다. 모든 프레임 결과 중
`ok: true`인 실제 업로드 결과를 선택한다. 이미지가 삽입된 뒤에는 네이버 라이브러리/운영체제 팝업이
남지 않아야 하며, `finally`에서 가드·CDP 설정·debugger를 모두 해제한다.

### 구조 분석으로 고장 진단

확장 하단 **구조 분석** 버튼은 프레임별 URL, 제목/문단 후보, contenteditable, 이미지·발행·카테고리·태그 버튼, file input을 JSON으로 출력한다. 입력 문제가 생기면 추측으로 셀렉터를 고치지 말고 이 결과를 먼저 받아 `PostWriteForm.naver` 프레임을 식별한다.

## 7. 카테고리·태그 입력

확장 하단의 발행 설정은 `chrome.storage.local` 키 `seoStudioPublishSettings`에 저장된다.

1. 사용자가 네이버의 **발행** 버튼을 눌러 발행 설정창을 먼저 연다.
2. 확장에서 `카테고리·태그 입력`을 누른다.
3. `#tag-input`이 실제로 보이는 프레임 하나만 찾아 각 태그를 CDP 입력 + Enter로 추가한다.
4. 태그마다 입력란이 비워졌는지 검증한다. `#`는 제거하고, 중복 태그는 제거하며 최대 30개다.
5. 태그가 끝난 뒤에만 카테고리를 연다. 이전에는 카테고리를 먼저 열어 태그 포커스를 빼앗는 버그가 있었다.
6. 카테고리는 전체 이름 정확 일치를 우선한다. 부분 일치가 여러 개면 임의 선택하지 않고 오류를 보낸다.
7. 선택 결과를 카테고리 버튼 표시 텍스트로 검증한다.

최종 네이버 발행 클릭은 절대 넣지 않는다.

## 8. API·데이터·권한

- 초안 테이블: `naver_blog_seo_drafts`, 사용자 소유 `user_id`, RLS owner-only
- API 키: 공용 `user_api_keys`, providers `openai`, `gemini`
- 사용자 API 키가 없으면 생성 요청을 막고 설정 안내를 반환한다.
- 확장 요청은 Bearer 토큰 → `verifyExtensionToken()` → 프로그램 이용권한 검증 순서다.
- API route와 권한 페이지는 `dynamic = "force-dynamic"`, `fetchCache = "force-no-store"`를 유지한다.
- 서비스 역할 클라이언트는 서버 API에서만 사용하며 모든 데이터는 해당 사용자 ID로 한정한다.

## 9. 로컬 검증·배포 절차

```powershell
cd D:\Antigravity\AIMaster\naver-blog-seo-studio
npm.cmd run lint
npm.cmd run test:browser
npm.cmd run build
```

확장 코드가 바뀐 경우 추가로:

```powershell
npm.cmd run extension:archive
```

- `extension/manifest.json` 버전을 올린다.
- `public/downloads/naver-blog-seo-studio-extension-v<버전>.zip` 생성 여부를 확인한다.
- `/settings`가 manifest에서 읽은 동일 버전과 ZIP 링크를 표시하는지 확인한다.
- 사용자는 `chrome://extensions`에서 기존 확장 카드의 새로고침 버튼을 눌러야 한다. 개발자 모드 원본 설치는 `extension/` 폴더를 그대로 사용한다.
- 모든 변경은 빌드 → 관련 파일만 커밋 → `git push origin master` → `vercel.cmd --prod --scope buylife --yes` 순서로 완료한다.

## 10. 현재 확인된 결과와 다음 작업

실사용 네이버 편집기에서 다음 흐름은 v1.0.31 기준 확인됐다.

- 제목 입력 성공
- 대표 이미지 삽입 성공
- 띄어쓰기·줄바꿈·문단 분리된 본문 입력 성공
- 이미지 선택 Windows 팝업 자동 잔류 없음
- 카테고리·태그 입력 성공

아직 사용자가 직접 수행해야 하는 단계는 내용 검토와 네이버의 최종 발행 클릭이다. 이후 기능을 확장할 때는 이 동작을 회귀시키지 않는 것이 최우선이다.

가능한 후속 후보는 다음과 같다.

- 실제 네이버 화면에서 제목·본문·이미지·카테고리·태그 통합 회귀 검수 자동화 보강
- 초안 품질/최신성 개선(생성 프롬프트의 연도·사실 검증 규칙 강화)
- 이미지 다수 삽입 또는 이미지 설명 처리 — 네이버 구조 분석을 다시 한 뒤 작은 단위로 구현
- 발행 전 SEO 체크리스트와 사용자 검수 UX 강화

## 11. 금지·주의 목록

- 확장 파일만 바꾸고 ZIP 또는 `/settings` 다운로드를 갱신하지 않는 행위
- 실제 DOM 구조 분석 없이 네이버 셀렉터를 추측해 추가하는 행위
- `allFrames`를 빼거나 첫 프레임 실패를 전체 실패로 처리하는 행위
- 제목·본문 검증을 생략하고 성공 메시지만 보여주는 행위
- 이미지가 있다고 본문 검증 실패를 성공으로 덮는 행위
- 운영자 키·계정을 사용자에게 대신 사용하는 행위
- 자동 최종 발행 구현

