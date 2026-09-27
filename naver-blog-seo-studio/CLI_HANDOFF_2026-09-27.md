# 네이버 SEO블로그 스튜디오 — 작업 인수인계

최종 갱신: 2026-09-27
대상: Claude Code, Gemini CLI, Codex 등 후속 작업 에이전트

## 시작 전

1. 루트 `AGENTS.md`, 프로젝트 `AGENTS.md`, 이 문서, `README.md`, 루트 `docs/NAVER_BLOG_EDITOR_AUTOMATION_GUIDE.md`를 읽는다.
2. 프로젝트 경로는 `D:/Antigravity/AIMaster/naver-blog-seo-studio`, 참고 자료는 `D:/PDS`다.
3. `naver-blog-auto-poster_app`, `naver-blog-auto-poster_web`은 참고용이다. 코드·권한·확장을 공유하거나 섞지 않는다.

## 배포 기준

- 웹: `https://naver-blog-seo-studio.vercel.app`
- 대시보드: `https://naver-blog-seo-studio.vercel.app/dashboard`
- 설정: `https://naver-blog-seo-studio.vercel.app/settings`
- Vercel: `buylife/naver-blog-seo-studio`
- Supabase: `esgxyikcnnvmlhygjkth`
- 브랜치: `master`
- 확장 원본: `extension/`
- 확장 버전: **1.0.38**
- 최신 ZIP: `/downloads/naver-blog-seo-studio-extension-v1.0.38.zip`
- 기준 커밋: `b39a636 fix(seo-studio): show personas in draft workspace`

Chrome 확장은 웹 배포로 사용자 PC에 자동 갱신되지 않는다. 확장 변경 시 `extension/` 원본, 최신 ZIP, `/settings` 다운로드 표기를 같은 버전으로 갱신하고 사용자는 `chrome://extensions`에서 새로고침한다.

## 제품 범위와 안전 경계

SEO블로그 스튜디오는 개인 API 키를 이용해 네이버 콘텐츠를 기획·생성·검수하고, 사용자가 열어둔 글쓰기 화면에 입력하는 보조 도구다.

- OpenAI/Gemini 키와 확장 토큰은 사용자별로만 사용한다. 운영자 키 폴백은 금지한다.
- 자동 로그인, 무인 대량 포스팅, 댓글·공감·이웃 추가는 범위 밖이다.
- **네이버 최종 발행 버튼은 자동 클릭하지 않는다.** 사용자가 검토 후 직접 발행한다.

## 완료된 기능

### 웹

- AIMaster 로그인·이용권한 게이트
- 주제·키워드 → 제목 5개 추천, 사용자별 기록 저장·삭제
- 선택 제목과 글쓰기 전략(C-Rank·ALCON·AEO·홈판 스토리·인사이트 엣지)으로 초안 생성
- `새 글 만들기` 화면에서 글쓰기 페르소나 선택 및 커스텀 페르소나 직접 입력
- 나노바나나/Gemini 대표 이미지 생성
- 초안 편집·저장·삭제·이력, 기존 글 최적화, SEO 사실 확인, 확장 전송
- 사용자별 OpenAI/Gemini API 키와 생성 모델 선택
- 확장 연동 토큰 발급·재설정

### 저장·보안

- 제목 추천 기록과 초안은 생성 후 **30일 보관**한다.
- Vercel Cron이 매일 한국 시간 03:00에 만료 초안·제목 기록·대표 이미지 파일을 정리한다.
- 대표 이미지는 private Supabase Storage 버킷 `naver-blog-seo-images`에 `<user_id>/...` 구조로 보관한다.
- `naver_blog_seo_drafts`의 `image_path`, `image_model`, `image_mime_type`, `image_created_at`에 메타데이터를 저장한다.
- Storage 정책은 인증된 사용자의 자기 폴더만 허용한다. 서비스 역할 키는 서버 API에서만 사용한다.

### Chrome 확장

1. 개인 토큰으로 계정을 연결한다.
2. 웹에서 저장한 초안을 라이브러리로 불러온다.
3. 저장 대표 이미지가 있으면 Gemini를 다시 호출하지 않고 토큰 인증 전용 API로 이미지를 미리보기에 복원한다.
4. 저장 이미지가 없는 경우에만 기존 Gemini 이미지 생성이 대체 수단으로 실행된다.
5. 네이버 SmartEditor에 **제목 → 대표 이미지 → 본문** 순서로 입력한다.
6. 제목·본문·문단 수를 DOM으로 검증하고 구조 분석 JSON을 제공한다.
7. 사용자가 발행 설정창을 연 뒤 저장된 카테고리·태그를 입력한다.

## 이번 작업에서 추가 완료된 내용 (2026-09-27)

- 대표 이미지가 포함된 웹 초안을 확장 라이브러리에서 선택하면, 확장이 Gemini 이미지 생성을 다시 호출하지 않고 저장된 원본 이미지를 토큰 인증 API로 불러오도록 연결했다.
- 전용 이미지 API는 확장 토큰, 초안 소유자, 확장 전송 완료 여부를 모두 확인한 뒤 private Storage 파일만 반환한다. 이미지 경로나 공개 URL은 초안 목록 응답에 노출하지 않는다.
- 이미지 조회 실패는 초안 로드 자체를 막지 않는다. 저장 이미지가 없거나 읽기에 실패한 경우에만 기존 Gemini 이미지 생성 흐름을 사용할 수 있다.
- 확장 원본과 배포 ZIP은 v1.0.38로 일치한다. ZIP HTTP 200, 린트, 확장 회귀 8건, Next.js 프로덕션 빌드를 확인했다.
- 제목 추천 기록·초안·대표 이미지의 30일 보관/정리 정책과 private Storage RLS는 이미 반영·검증됐다.
- 확장 사이드패널 버전은 `manifest.json`을 런타임에 읽어 표시하므로 manifest 버전과 UI 표기가 자동으로 일치한다.
- 웹 초안 생성은 페르소나를 서버에서 검증해 프롬프트에 반영한다. 기본 6종과 커스텀 입력(500자 이하)을 지원하며, 사실이 아닌 체험담을 생성하지 않는다. Chrome 확장 직접 생성은 기존 동작 호환성을 위해 기본 전문 에디터 페르소나를 사용한다.

## 미작업 및 다음 CLI의 시작점

### P0 — 반드시 먼저 할 실사용 통합 검수

저장된 대표 이미지가 있는 기존 초안으로 확장 v1.0.38을 실제 로그인 Chrome에서 검수한다. 웹 목록에서 초안을 불러온 직후 대표 이미지가 보여야 하며, 네이버 편집기에 제목 → 이미지 → 본문 순서로 입력되어야 한다. 이미지 선택 팝업이 남지 않고, 발행 설정 카테고리·태그 입력도 기존처럼 유지되어야 한다.

문제가 발생하면 확장 구조 분석 JSON, 확장 버전, 오류 문구, 네이버 글쓰기 URL을 남긴다. 실제 DOM 확인 없이 선택자를 추측해 수정하지 않는다.

### P1 — 다음 기능 후보

- 초안 기록 검색·필터·복제
- 다중 이미지 삽입 또는 이미지 설명 입력
- 제목·초안의 최신성 및 사실 확인 프롬프트 개선
- 사용자 최종 검토를 유지하는 예약 발행 설계

### 변경 금지 기준

- 최종 네이버 발행 자동 클릭 금지
- 사용자 API 키·토큰·데이터의 교차 사용 금지
- `chrome.debugger` 기반 실제 입력, 모든 iframe 탐색, 제목/본문 DOM 검증을 일괄 주입 방식으로 되돌리지 않음
- 확장 변경 때 원본 폴더, ZIP, 설정 다운로드 안내의 버전 불일치 금지
## 핵심 파일

| 대상 | 파일 |
| --- | --- |
| 대시보드 UI | `components/StudioPage.tsx` |
| 초안 API | `app/api/drafts/*` |
| 제목 추천 | `app/api/titles/recommend/route.ts` |
| 확장 초안 목록 | `app/api/extension/drafts/library/route.ts` |
| 확장 저장 이미지 전달 | `app/api/extension/drafts/library/[draftId]/image/route.ts` |
| 30일 정리 | `lib/draftRetention.ts`, `app/api/cron/draft-retention/route.ts`, `vercel.json` |
| 확장 자동화 | `extension/sidepanel.js` |
| 확장 권한 | `extension/manifest.json` |
| ZIP 생성 | `scripts/build-extension-archive.mjs` |
| 회귀 검사 | `tests/browser/extension-regression.test.mjs` |
| 이미지 Storage 마이그레이션 | `supabase/migrations/20260926100223_persist_draft_images.sql` |
| Storage 보안 마이그레이션 | `supabase/migrations/20260926100813_restrict_seo_draft_image_policies.sql` |

## 네이버 편집기 구현 규칙

- 편집기는 보통 `PostWriteForm.naver` iframe 안에 있다. 모든 탐색은 `allFrames: true`로 한다.
- `.se-title-text`, `.se-text-paragraph`는 후보일 뿐이다. 하위·상위의 실제 `[contenteditable="true"]`와 active element를 확인한다.
- 제목 입력 뒤 본문 후보를 다시 탐색한다.
- 문자 입력은 `chrome.debugger` CDP `Input.insertText`, 문단 나눔은 실제 Enter keyDown/keyUp으로 한다.
- Markdown을 평문화하되 공백과 문단 나눔을 보존한다.
- 성공은 상태문구가 아닌 제목·본문 DOM과 문단 수로 검증한다.
- debugger, CDP 파일 선택 차단, 클릭/showPicker 가드는 항상 `finally`에서 해제한다.
- 장애가 나면 셀렉터를 추측하지 말고 **구조 분석** 결과로 iframe·contenteditable·이미지/발행 버튼을 확인한다.
- 이미지 업로드는 사진 도구 클릭 후 동적으로 생긴 file input에 `File`/`DataTransfer`를 전달한다. Windows 파일 선택 창 잔류 방지를 위해 `Page.setInterceptFileChooserDialog`과 MAIN world 가드를 유지한다.

## 검증과 배포

```powershell
cd D:/Antigravity/AIMaster/naver-blog-seo-studio
npm.cmd run lint
npm.cmd run test:browser
npm.cmd run build
```

확장 변경 시:

```powershell
npm.cmd run extension:archive
```

1. manifest 버전을 올린다.
2. `extension/`, `public/downloads/...v<버전>.zip`, `/settings` 표기를 대조한다.
3. API 변경은 인증·소유자 필터·`force-dynamic`·`force-no-store`를 확인한다.
4. 관련 파일만 커밋 → `git push origin master` → `vercel.cmd --prod --scope buylife --yes` 순서로 완료한다.
5. 프로덕션 URL과 최신 ZIP의 HTTP 200을 확인한다.

## 지금 남은 최우선 작업

### v1.0.38 대표 이미지 실사용 통합 검수

코드·빌드·회귀 검사는 통과했다. 로그인된 Chrome에서 아래를 실제 확인해야 한다.

1. 대시보드에서 대표 이미지가 저장된 기존 초안을 선택한다.
2. 확장에서 웹 초안 목록을 새로고침하고 초안을 불러온다.
3. Gemini 재생성 없이 저장된 대표 이미지가 즉시 미리보기에 나타나는지 확인한다.
4. 네이버 글쓰기 화면에서 제목 → 저장 이미지 → 본문이 순서대로 입력되는지 확인한다.
5. 이미지 선택/라이브러리 팝업이 남지 않는지 확인한다.
6. 발행 설정창의 카테고리·태그 입력이 기존처럼 동작하는지 확인한다.
7. 최종 발행은 사용자가 직접 클릭한다.

문제 발생 시 확장 버전, 오류 문구, 네이버 글쓰기 URL, 구조 분석 JSON을 함께 남긴다.

## 이후 후보

1. 저장 대표 이미지의 확장 실사용 통합 검수 완료
2. 초안 기록 검색·필터·복제
3. 다중 이미지 삽입 또는 이미지 설명 입력(시작 전 최신 네이버 구조 분석 필수)
4. 사용자 최종 확인을 유지하는 예약 발행 설계
5. 제목·초안의 최신성 및 사실 확인 프롬프트 개선

## 금지

- 확장 원본만 바꾸고 ZIP·설정 다운로드 갱신을 빠뜨리는 행위
- 실제 DOM 조사 없이 네이버 셀렉터를 추가하는 행위
- 첫 프레임 실패를 전체 실패로 처리하는 행위
- 이미지가 있다는 이유로 본문 검증 실패를 성공 처리하는 행위
- 사용자 API 키·토큰·데이터를 다른 사용자 또는 운영자와 공유하는 행위
- 자동 최종 발행, 무인 대량 게시, 댓글·공감·이웃 추가
