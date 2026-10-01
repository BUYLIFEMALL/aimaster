# 네이버 블로그 SEO 스튜디오 — CLI 인수인계 (v1.56)

최종 갱신: 2026-10-01

다른 Codex·Claude Code·Gemini CLI가 이 프로젝트를 이어서 작업할 때의 최신 기준 문서입니다. 시작 전 루트 `AGENTS.md`, 이 폴더의 `AGENTS.md`, `README.md`, [`DATA_RETENTION.md`](./DATA_RETENTION.md)를 모두 읽습니다.

## 제품 역할과 금지선

- 웹 스튜디오는 블로그(원문), 대표 이미지, 본문 이미지를 생성하고 사용자가 최종 편집하는 곳입니다.
- Chrome 확장은 웹에서 전송한 완성 콘텐츠를 네이버 SmartEditor에 사람처럼 입력하고, 카테고리·태그 설정까지 준비합니다.
- **네이버의 마지막 발행 버튼은 어떤 경우에도 자동 클릭하지 않습니다.** 사용자가 직접 검토하고 발행합니다.
- AI 호출은 회원 본인의 `API키등록·플랫폼연동` 키만 사용합니다. 운영자 키 폴백이나 회원 간 키 공유는 금지입니다.
- 네이버 공식 API가 없으므로 실제 SmartEditor DOM을 조사한 뒤 CDP 키 입력·클릭 방식만 사용합니다. 값 즉시 대입, 추측성 선택자, 무인·대량 발행은 금지입니다.

## 현재 사용자 흐름

1. `/dashboard#title`에서 제목, 전략, 페르소나, 본문 생성 AI 모델을 정하고 완성형 블로그(원문)를 생성합니다.
2. `/dashboard#new-draft`의 `블로그(원문) 편집기`에서 문단·이미지 순서·전송 제외 상태를 수정한 뒤 `수정 내용 저장`을 누릅니다.
3. `Chrome 확장으로 전송`은 저장된 `content_blocks` 순서와 이미지 정보를 확장 라이브러리에 전달합니다.
4. 확장 프로그램에서 `전송된 콘텐츠 목록 새로고침` 후 목록의 콘텐츠를 **선택**합니다. 선택 즉시 제목·본문·대표/본문 이미지·태그가 자동으로 로드되고 claim 기록이 남습니다.
5. `전체 포스팅 미리보기`는 팝업에서 제목, 텍스트 문단, 대표 이미지, 본문 매칭 이미지를 **실제 입력 블록 순서**로 보여줍니다. 팝업의 `네이버 편집기로 입력`도 동일한 입력 절차를 시작합니다.
6. 확장은 제목 → 콘텐츠 블록(텍스트·이미지) 순으로 입력하고 DOM 결과를 검증합니다. 성공 시 저장된 카테고리·태그를 네이버 설정창에 자동 입력합니다.
7. 사용자만 네이버의 최종 발행 버튼을 직접 누릅니다.

## 확장 프로그램 핵심 파일

- `extension/sidepanel.html` — 전송 목록, 전체 포스팅 미리보기 dialog, 입력·카테고리·태그 UI
- `extension/sidepanel.js` — 콘텐츠 라이브러리 로드, 블록 미리보기, CDP 사람 입력, 이미지 업로드, 발행 설정 자동 준비
- `extension/styles.css` — 사이드패널·미리보기 팝업 UI
- `app/api/extension/drafts/library/route.ts` — 확장용 전송 콘텐츠 목록
- `app/api/extension/drafts/library/[draftId]/claim/route.ts` — 선택 콘텐츠 확정 기록
- `app/api/extension/drafts/library/[draftId]/image/route.ts` — 대표/본문 이미지 반환
- `app/api/extension/drafts/library/[draftId]/input-result/route.ts` — 입력 진행·실패·발행 준비 상태 기록
- `components/StudioPage.tsx` — 웹 스튜디오의 콘텐츠 생성·편집·확장 전송 UI

## 장애 판별 순서

1. 확장 상태 영역의 문구를 먼저 확인합니다. 이 UI는 토큰 부재, 콘텐츠 미선택, 네이버 편집기 탭 부재, 제목/본문 요소 탐지 실패, debugger 충돌을 구체적으로 표시합니다.
2. Vercel 로그에서 `GET /api/extension/drafts/library`만 있고 `POST .../claim` 또는 `input-result`가 없다면, 목록만 새로고침했을 뿐 선택 콘텐츠가 로드되지 않은 것입니다. v1.51부터는 목록 선택 시 자동 로드됩니다.
3. `claim`은 있으나 입력 기록이 없다면 네이버 글쓰기 탭/에디터 요소/debugger 권한을 확인합니다. DevTools 또는 다른 debugger 확장을 닫고 재시도합니다.
4. 콘텐츠 또는 이미지가 바뀐 뒤에는 확장 ZIP을 다시 설치하거나 `chrome://extensions`에서 확장을 새로고침합니다. 현재 공개 확장은 **v1.56**입니다.
5. 실제 네이버 DOM이 바뀌었다면 추측하지 말고 확장의 `에디터 구조 분석` 결과를 수집한 뒤 `focusNaverEditor`, 이미지 업로드, 발행 설정 로직을 최소 범위로 보완합니다. 이 진단 섹션은 서버에서 검증된 `profiles.is_admin`이 참인 관리자 확장 토큰에서만 보이며, 일반 회원에게는 숨겨집니다.

## 이미지·블록 보존 규칙

- 기본은 대표 1장 + 본문 핵심 문장 이미지 2장, 선택 시 본문 3장(총 4장)입니다.
- 본문 이미지는 해당 핵심 문장이 있는 문단 시작 전 블록으로 저장됩니다. 문단 중간을 분할하지 않습니다.
- 편집기에서 저장한 `content_blocks`가 있으면 확장은 문장 검색으로 위치를 다시 계산하지 않고 이 순서대로 입력·미리보기 합니다.
- 대표/본문 이미지가 준비되지 않은 콘텐츠는 본문만 전송되지 않도록 웹에서 차단합니다.
- 30일 보관 기한이 지나거나 사용자가 초안을 삭제하면 대표 이미지와 `seo_report.contentImages`의 본문 이미지까지 비공개 Storage에서 함께 삭제합니다. Storage 삭제가 실패하면 초안 DB 삭제를 중단해 다음 정리에서 재시도합니다.

## 모델·권한 기준

- 본문 생성 모델: OpenAI, Anthropic Claude, Google Gemini. 선택한 provider의 회원 키가 반드시 필요합니다.
- 문장 매칭 이미지: OpenAI(문장·프롬프트 분석) + Gemini(이미지 생성) 회원 키가 필요합니다.
- 웹은 `lib/access.ts`, 확장 토큰 API는 `lib/extensionAuth.ts`를 사용합니다. 화면뿐 아니라 쓰기 API도 프로그램 이용 권한을 검사합니다.

## 버전·배포 체크리스트

웹 앱과 확장은 같은 공개 버전을 사용합니다. 기능·문서 작업마다 0.01씩 올립니다.

1. `lib/version.ts`의 `APP_VERSION`
2. `extension/manifest.json`의 `version`, `version_name`
3. Supabase `public.programs`에서 slug `naver-blog-seo-studio`의 `version`
4. `README.md`, `AGENTS.md`, 이 최신 인수인계 문서의 버전
5. `npm.cmd run extension:archive` — 직전 ZIP은 삭제되고 새 ZIP만 남음
6. `npm.cmd run lint` → `npm.cmd run test:browser` → `npm.cmd run build`
7. 관련 파일만 `git add` → commit → `git push origin master`
8. `vercel.cmd deploy --prod --yes --scope buylife`
9. `curl.exe -I https://naver-blog-seo-studio.vercel.app/downloads/naver-blog-seo-studio-extension-vX.XX.zip`가 HTTP 200인지 확인

Supabase project id는 `esgxyikcnnvmlhygjkth`, Vercel 프로젝트는 `buylife/naver-blog-seo-studio`입니다.

## 확장 설치 상태 표시

- 웹은 Chrome 보안 정책상 압축해제 확장의 실제 설치 여부를 자동으로 감지할 수 없습니다.
- ZIP 다운로드 뒤에는 `설치 진행 중 · Chrome에 확장을 추가하세요`를 표시하고, 압축 해제·`chrome://extensions` 개발자 모드·압축해제된 확장 프로그램 로드까지의 남은 단계를 안내합니다.
- 사용자가 실제 설치 또는 기존 확장 새로고침을 마친 뒤 `Chrome 설치 후 완료 표시`를 누르면, 확인창 뒤 현재 브라우저 localStorage에 해당 버전을 기록합니다. 이 표시는 안내용이므로 브라우저 저장공간 삭제·다른 PC에서는 초기화됩니다.

## 마지막 검증 상태

- v1.52에서 전체 포스팅 미리보기 팝업 및 팝업 내 네이버 입력 버튼을 구현했습니다.
- `npm run lint`, `npm run test:browser`(21 통과, 1 skip), `npm run build`, 확장 ZIP HTTP 200을 확인했습니다.
- 로그인·네이버 세션이 필요한 실제 SmartEditor 입력은 사용자 Chrome 환경에서 확인합니다. 테스트가 통과해도 네이버 UI 변경 가능성을 고려해 실제 구조 분석 결과를 우선합니다.
