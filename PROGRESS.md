# PROGRESS — 작업 진행 현황 (클라우드 세션 이어받기용)

> 작성: 2026-10-01, 로컬 Claude Code 세션 마감 시점. 클라우드 세션(Claude Code on the web 등)이나 다른 CLI가 **이 파일부터 읽고** 이어서 작업한다.
> 더 자세한 기록: 루트 `CLAUDE.md`(핵심 원칙 7가지) · `AGENTS.md` · `docs/HANDOFF.md`(남은 일 표) · `docs/ERROR_LESSONS.md`(에러 해결 기록·점검 체크리스트)
> · 각 서브프로젝트 `AGENTS.md`. 이 파일은 요약본이고, 위 문서들이 원본이다.

---

## 0. 이어받자마자 할 일 (순서대로)

> **클라우드 세션이면 먼저 [`docs/CLOUD_SESSION.md`](docs/CLOUD_SESSION.md)** — `cloud-work` 브랜치 확인, `git merge origin/master`, 배포·버전·DB 쓰기는 하지 않음.

1. 루트 `CLAUDE.md` → `docs/HANDOFF.md` → `docs/ERROR_LESSONS.md`를 읽는다(핵심 원칙 7번: 작업 전 필독, 에러 해결 시 같은 커밋에 기록).
2. `git log --oneline -10`으로 최신 커밋이 이 파일 작성 시점(`9f93041`, BLOG v1.32) 이후인지 확인한다 — 다른 CLI(Codex 등)가 같은 저장소에서 동시에 작업한다.
3. 고칠 서브프로젝트의 `AGENTS.md`/`README.md`를 먼저 읽는다.
4. 답변은 **쉬운 한글 존댓말**(-습니다/-합니다), 사용자 호칭은 **"주인님"**.

---

## 1. 지금까지 한 작업 (이번 로컬 세션, 2026-09-29 ~ 10-01 중심)

### 1-1. BLOG(원문)생성 자동화 — 서브폴더 `ai-auto-blog/`, slug `ai-auto-blog`, 현재 **v1.32**
- 주소: https://ai-auto-blog-one.vercel.app (Vercel 프로젝트 `ai-auto-blog`). 예전 `www.buylife.xyz/blog/*`는 새 주소로 넘김.
- 주요 변경 이력(자세한 내용은 `ai-auto-blog/AGENTS.md`):

| 버전 | 내용 |
|---|---|
| v1.03~1.04 | 이미지 로직을 SEO 스튜디오 방식으로 개편(섹션 핵심 문장 → 장면 설명), 운영자 Gemini 키 폴백 제거, 본문 모델(OpenAI/Claude/Gemini)·이미지 모델 분리 선택 |
| v1.05~1.07 | 버전 표시, **루트 내장 → 단독 Vercel 배포 분리**, 메인 카탈로그 주소 교체, 옛 Supabase 주소로 로그인 실패하던 것 수정 |
| v1.08~1.11 | 본문 기본값 GPT-4.1, 모델 목록 정리(목록 API로 ID 검증), 주소 자동 `https://`, 이미지 프롬프트 섹션 숨김 |
| v1.12~1.16 | 모든 이미지를 Supabase Storage `post-images/<회원id>/ai-auto-blog/`에 저장(Cloudinary·base64 제거, 기존 12MB 글 3개 이전), **콘텐츠 일체 30일 자동 삭제**(매일 03시 KST 크론, 기존 데이터는 10/1부터 유예 → 첫 삭제 11/01), 안내 문구, 글쓰기 고급 설정 삭제 |
| v1.17~1.27 | **네이버 블로그 입력 크롬 확장**(BLOG 전용, `ai-auto-blog/extension/`): 글 보기 "🧩 네이버 입력기로 보내기" → 확장이 네이버 글쓰기 화면에 한 글자씩 입력(§20 속도 70~170ms), 이미지 파일 업로드, 카테고리·태그 입력, **마지막 발행은 사람**. 추천 링크는 링크 걸린 HTML 붙여넣기로 실제 링크 입력(포커스 프레임 1곳에서만 1번). 폴더 이름 `blog/` → `ai-auto-blog/` |
| v1.19 | **확장 버전 자동 동기화**: `npm run build`의 `prebuild`가 `utils/version.ts` 버전을 `extension/manifest.json`에 넣고 ZIP(`public/downloads/ai-auto-blog-extension-<버전>.zip`)을 새로 만든다 |
| v1.28~1.29 | 확장 "추천테그 추출" — SEO 스튜디오 v1.59 코드를 그대로 복사(규칙 바뀌면 같이 맞출 것) |
| v1.30~1.32 | 배지 "N일 후 자동삭제", **이미지 장수 1~5장 선택**(1번 = 글 전체 대표 제목용, 나머지는 문단 4개를 묶음으로 나눠 맡음: 3장=[1~2][3~4] 등), 본문 소제목·문단 3→4개 |

### 1-2. 플랫폼 공통
- 핵심 원칙 **5번(버전 관리 vX.YY)**, **6번(이용 권한: FREE 배지 → 구독 → 등급+사용기간)**, **7번(에러 해결 기록 `docs/ERROR_LESSONS.md`)** 추가.
- `GEMINI.md` 신설(Gemini CLI도 같은 규칙), `docs/PLATFORM_PATTERNS.md` §28(웹 → 크롬 확장 → 네이버 편집기 입력 패턴) 신설.
- 그 전(9/29~9/30): 쇼핑제휴(`threads-affiliate-poster`) 쿠팡·알리 이미지/링크 수정, 사이드바 표준화, 클론 키트, 권한 정책 통일 등 — `docs/HANDOFF.md` §2 참고.

---

## 2. 남은 작업

| # | 할 일 | 상태 | 위치 |
|---|---|---|---|
| 1 | **BLOG 실제 사용 확인** — ① 이미지 장수 1~5장으로 글 생성 시 제목용·문단 이미지 배치 ② 확장으로 네이버 입력 시 추천 링크가 **실제 링크 1개만** 들어가는지(v1.27 수정 후 재확인) ③ 추천테그 추출 결과 | 주인님 테스트 대기(실제 생성은 회원 키 유료 호출이라 에이전트가 임의 실행 금지) | `ai-auto-blog/AGENTS.md` |
| 2 | GPT-6 계열 본문 생성 실제 1회 검증(Responses API 대체 경로) | 유료 — 주인님 승인 필요 | `ai-auto-blog/AGENTS.md` v1.09 |
| 3 | BLOG 30일 자동 삭제 첫 실행(2026-11-01 03:00 KST) 결과 확인 — 현재 글 14·글감 25개 삭제 예정 | 날짜 대기 | `ai-auto-blog/app/api/cron/cleanup-images` |
| 4 | Meta 앱 심사(`threads_keyword_search`) | 비즈니스 인증 결과 대기 | `threads-affiliate-poster/docs/META_APP_REVIEW.md` |
| 5 | 회원 계정 동작 확인(쇼핑제휴 /trends, 댓글자동화, 사이드바 계정 표시) | 주인님 테스트 | `docs/HANDOFF.md` §1 |
| 6 | 티스토리 블로그 자동화(BLOG 방식, 웹 + 크롬 확장) | 기획·0단계(조사 확장) 완료, **주인님 PC에서 조사 실행 → JSON 전달 대기**. 로컬에서 이어감 | `tistory-auto-blog/docs/TISTORY_PLAN.md` §6 |
| 7 | (선택) BLOG 해시태그에도 본문 필터 적용 — SEO 규칙은 키워드를 그대로 살려 "위한·주목해야" 같은 말이 남음 | 주인님 결정 대기 | `ai-auto-blog/AGENTS.md` v1.29 |
| 8 | (Codex 담당) SEO 스튜디오 확장 타이핑 속도 24~52ms → §20 기준 70~170ms, 태그 "투자협의→투자협" 잘림 | Codex에 전달 | `docs/ERROR_LESSONS.md` D |

---

## 3. 주의할 점 (특히 클라우드 세션)

### 3-1. 클라우드 환경에서 안 되거나 다른 것
- **비밀값 없음**: `.env.local`(루트·서브프로젝트)은 git에 없다 → 클라우드에서는 Supabase 서비스 키·Vercel 토큰이 없어서
  **`vercel deploy`, DB 직접 수정 스크립트, 운영 API 테스트(임시 토큰 발급)는 그대로 안 된다.** 필요하면 주인님께 방법을 확인한다(비밀값을 대화·파일에 적지 말 것).
  Supabase MCP·Vercel MCP가 연결돼 있으면 그걸로 DB 조회/버전 갱신은 가능.
- **`D:\PDS`(주인님 스크린샷 폴더) 접근 불가** — 로컬 전용. 클라우드에서는 주인님께 이미지를 직접 첨부해 달라고 한다.
- **크롬 확장·네이버 화면 테스트 불가** — 실제 확인은 주인님 PC에서.
- 로컬은 Windows + Git Bash였다(경로 변환 `MSYS_NO_PATHCONV=1`, CRLF 등은 `docs/ERROR_LESSONS.md` E). 클라우드(리눅스)에서는 해당 없음.

### 3-2. 저장소 공통 규칙 (어디서든)
- **매 작업 세트**: 서브프로젝트 `npm run build` → 커밋(내 파일만 경로 지정) → `git push origin master` → `vercel deploy --prod --yes --scope buylife`(서브프로젝트 폴더에서)
  → 인수인계 문서(`<서브프로젝트>/AGENTS.md`, `docs/HANDOFF.md`, 에러·점검 사항은 `docs/ERROR_LESSONS.md`) 같은 커밋에.
- **버전**: 배포마다 `utils/version.ts`(BLOG) 또는 `lib/version.ts`의 `APP_VERSION` +0.01, 공용 DB `programs.version`도 같이(`update programs set version='vX.YY' where slug='ai-auto-blog'`). 메이저는 주인님 지시 때만.
- **BLOG 확장**: 버전을 올리고 빌드하면 manifest·ZIP이 자동으로 바뀐다 — 바뀐 `extension/manifest.json`과 ZIP(예전 ZIP 삭제 포함)을 같은 커밋에.
- **질문이 필요한 것**: 유료 API 호출, DB 구조 변경, 환경변수 변경, 실제 데이터 삭제, 결제·외부 게시.
- **다른 CLI 작업 중 폴더**: `naver-blog-seo-studio/`는 Codex 담당 — 읽기만. 스테이징(index)은 공유되니 `git add`는 커밋 직전에 내 파일만.
- **API 키는 회원 본인 것만**(운영자 키 폴백 금지), 새 API/Server Action은 `checkProgramAccessApi`/`requireProgramAccess` + `dynamic`/`fetchCache`.
- **네이버 등 브라우저 자동화**: `docs/PLATFORM_PATTERNS.md` §20(봇 탐지 회피 — 한 글자씩·클릭 전 hover·셀렉터 추측 금지·**발행 자동 클릭 금지**)·§28 먼저.
  상태를 바꾸는 주입은 `allFrames` 금지(대상 프레임 하나만).
- **AI 모델 ID 추측 금지** — 공급사 모델 목록 API로 확인(`docs/AI_MODEL_INTEGRATION_STANDARD.md`).
- 이미지 인물은 기본 한국인, 이미지 저장은 Supabase Storage(base64·Cloudinary 생성 API 금지).
- **BLOG 30일 자동 삭제**는 콘텐츠(글·이미지·글감)만 — 설정(카테고리·작성자·API 키)은 지우지 않는다. 공용 버킷 `post-images`에서는 `<회원id>/ai-auto-blog/`만.

### 3-3. 테스트 계정
- `buylifemall@naver.com` = 일반 회원 테스트용(회원 기능은 이 계정부터), `buylifemall@gmail.com` = 관리자. 비밀번호 입력 로그인은 에이전트가 하지 않는다.

---

## 5. 클라우드 세션 작업 기록 (cloud-work 브랜치)

클라우드 세션은 작업을 마칠 때 한 줄씩 추가하고, 로컬 세션은 병합·배포 후 마지막 칸을 채운다(`docs/CLOUD_SESSION.md` 4·5번).

| 날짜 | 서브프로젝트 | 클라우드에서 한 일 | 로컬에서 할 일(버전·배포·DB) | 로컬 병합·배포 결과 |
|---|---|---|---|---|
| 2026-10-01 | (준비) | `cloud-work` 브랜치·클라우드 작업 규칙·시작 훅 구성(로컬에서 만듦) | 없음 | master `→` cloud-work 동기화 |
| 2026-10-01 | tistory-auto-blog (신규, 0~2단계 완료) | 티스토리 계획 문서 `tistory-auto-blog/docs/TISTORY_PLAN.md`, 서브프로젝트 `AGENTS.md`, **조사 전용 크롬 확장 `tistory-auto-blog/inspector-extension/`**(읽기 전용, 제목·본문 내용 미저장, 문법·누출 테스트 통과) 작성. 아직 `programs` 미등록·배포 없음 | 주인님 PC에서 조사 확장 실행 → JSON 결과를 클라우드 세션에 전달(그 후 3·4단계 진행). 병합 시 별도 버전/배포 작업 없음(신규 프로그램은 완성 시 v1.01로 등록) | 대기 |
| 2026-10-01 | tistory-auto-blog 1~2단계 | ai-auto-blog 복제 뼈대(v1.01, 단독 빌드 통과), `supabase/migrations/0001_tistory_init.sql`(전부 회원별 + 복합 외래키, 로컬 PG16 격리 테스트 통과), 서버 API 보안 보완(GET 인증·소유자 확인), 루트 `.vercelignore`·`tsconfig.json` 제외 등록, 운영 DB 읽기 조회로 BLOG `blog_*` 정책 점검(**BLOG 공개 노출 문제 발견, 미수정**) | ① 마이그레이션 적용(주인님 승인) ② `programs` 등록(slug `tistory-auto-blog`, `version='v1.01'`) ③ Vercel 프로젝트·환경변수·배포 ④ **BLOG 정책·GET API 점검(HANDOFF #5)** ⑤ 확장 `BASE`·host_permissions 임시 주소 교체(배포 후). 3·4단계(서버 변환기·확장)는 조사 JSON 대기 | 대기 |
