# INSTA 포스팅 자동화 (`insta_auto_poster`) AI 에이전트 인수인계 문서 (AGENTS.md)

> # ★★★ 최상위 절대 불변 규칙 (2026-10-09 주인님 지시)
> **모든 사용자는 본인의 계정과 본인 API 키(Gemini·OpenAI·Claude·Perplexity) 및 본인 Meta 앱 정보를 각각 직접 등록·연동해서 사용한다.**
> 운영자(주인님)나 타인의 키로 대신 처리하지 않으며, 키가 없으면 "본인 키를 등록해주세요"로 안내한다. 상세: 루트 `docs/TOP_RULE_PERSONAL_ACCOUNT_API.md`.
> **생성 데이터도 회원 본인 소유로 격리하며 다른 회원과 공유·복사·재사용하지 않는다.**

---

## 1. 프로그램의 사용목적 및 대상
- **프로그램명**: INSTA 포스팅 자동화 (영문 `INSTA Auto Posting` / `insta_auto_poster`)
- **서비스 URL**: https://auto-instagram-posting.buylife.xyz
- **사용 목적**: 인스타그램 피드 및 캐러셀 콘텐츠의 소재 수집(HTTP/RSS/Perplexity)부터 AI 캡션·해시태그·고화질 나노바나나 이미지 생성, 그리고 Meta 공식 Graph API를 통한 즉시/예약 포스팅까지 전 과정을 자동화하는 인스타그램 전문 마케팅 솔루션.
- **주요 대상**:
  - 인스타그램 계정을 정기적으로 육성하고 있는 1인 크리에이터 및 인플루언서
  - 매일 트렌드 피드 및 지식 콘텐츠를 안정적으로 포스팅해야 하는 SNS 마케터
  - 인스타그램 비즈니스/크리에이터 계정 운영사 및 쇼핑몰 셀러

---

## 2. 개발 구현에 사용된 도구 / 개발기법 / 플러그인 / 스킬
- **프레임워크 & 런타임**: Next.js 16.2.11 (App Router, Turbopack), React 19, TypeScript
- **스타일링**: Tailwind CSS v4, 인라인 테마 CSS 변수
- **디자인 템플릿**: **플로우 위저드 스타일 (인스타 바이럴 변형)** 다크 테마 (`bg-[#0d0f17]`, 서피스 `#161922`, 보더 `#262c3d`, 인스타 로즈/핑크 그라디언트)
- **반응형 아키텍처**: 데스크톱(1440px) 260px 좌측 사이드바 + 모바일(375px) 상단 56px 고정 헤더 & 슬라이드 오버레이 드로어
- **백엔드 & 데이터베이스**: Supabase SSR (공유 DB `esgxyikcnnvmlhygjkth`), PostgreSQL RLS (회원별 데이터 엄격 격리)
- **외부 연동 API**: Meta Graph API v20+ (Facebook 로그인 페이지 연동 & Instagram 비즈니스 로그인 BYOK 연동)
- **AI 모델 연동**: Google Gemini (`gemini-nano-banana-2.1`, `gemini-3-pro-image`), OpenAI GPT-4o, Anthropic Claude 3.7 Sonnet, Perplexity Sonar

---

## 3. 핵심 기능 및 시스템 로직 / 아키텍처, 장점 및 단점
### 핵심 기능 (5단계 파이프라인)
1. **1단계 AI 키 등록 (`/settings`)**: Gemini(이미지), OpenAI/Claude(캡션), Perplexity(트렌드 검색) 회원 본인 키 등록.
2. **2단계 Meta 앱 & 인스타 연결 (`/settings`)**:
   - 📘 **Facebook 페이지 방식 (파란 버튼)**: 인스타그램이 Facebook 페이지에 연결된 공식 경로 (Meta 앱 ID/시크릿).
   - 📗 **Instagram 로그인 방식 (초록 버튼)**: Instagram 전용 앱 ID/시크릿을 통한 직접 연결.
3. **3단계 게시글 주제 수집 (`/candidates`)**: HTTP 웹 크롤링, RSS 구독 피드, Perplexity 실시간 트렌드 검색으로 글감 자동 발굴.
4. **4단계 AI 생성 (`/posts/new`)**: 단일 피드(1장) 또는 카드뉴스(캐러셀 4장) 선택, 캡션·25개 해시태그 및 나노바나나 2.1 고화질 이미지 생성.
5. **5단계 즉시 / 예약 게시 (`/posts`)**: 즉시 게시 및 Supabase Cron 기반의 예약 시간대 자동 발행 파이프라인.

### 장점 및 단점
- **장점**:
  - Meta Graph API 공식 가이드라인을 완벽히 준수하여 계정 차단(섀도우밴) 위험 없이 안정적인 공식 발행 지원.
  - Facebook 페이지 연동과 Instagram 로그인 연동 2가지 경로를 모두 지원하여 사용자 환경에 맞춤 대응.
  - 주제 발굴부터 이미지 생성, 예약 게시까지 원스톱으로 처리되어 일일 인스타 운영 공수 90% 이상 절감.
- **단점**:
  - 개인 인스타그램 계정은 Meta 정책상 API 자동 포스팅이 불가하며, 반드시 비즈니스/크리에이터 전문 계정으로 전환 필요.
  - 현재 숏폼 비디오(Reels) 자동 발행은 미지원(추후 확장 예정).

---

## 4. 현재 버전 및 버전별 변경 히스토리
- **현재 버전**: `v1.24` (2026-10-18)
- **v1.24 (2026-10-18, Claude Code 윈도우)**: 운영 예약 게시 실행 연결 — `vercel.json` 새로 만들어 Vercel 자동 실행이 `/api/posts/dispatch-scheduled`를 5분마다 호출(`CRON_SECRET`은 기존 등록값 사용, 환경변수 변경 없음). 그전에는 실행 장치가 없어 예약 글이 나가지 않았음. 같은 배포에 강의용 독립 운영 모드 코드(커밋 `956d1156`, 운영에는 영향 없음)도 함께 반영. 검수: Vercel cron 목록 등록 확인, 01:30:12 첫 자동 실행 GET 200, 비밀값 없는 호출 401. 실행 기록 조회는 `npx vercel logs requests --since 20m --json`(일반 `vercel logs`는 함수 출력만 보여 요청이 안 잡힘).
- **v1.23 (2026-10-18, Antigravity CLI)**:
  - **플로우 위저드 스타일 (인스타 바이럴 변형)** 다크 테마 전면 적용 (`globals.css`, `layout.tsx`, `Sidebar.tsx`, `dashboard`, `settings`, `ui`).
  - 375px 모바일 전용 상단 고정 헤더(`h-14`) 및 슬라이드 오버레이 드로어 메뉴 구축 완료.
  - **비주얼 연동 & 사용 매뉴얼 (`/guide`) 전면 고도화** (마스코트 배너, 5단계 파이프라인, Meta 앱 2대 연동 방식 비교 카드, 인스타 바이럴 팁, FAQ 6종).
  - Microsoft Edge 포그라운드 실세션 검수 완료 (데스크톱/모바일 5종 캡처 보존).
- **v1.22 (2026-10-18)**: 이미지 시간 초과 안내를 Google AI Studio 사용량 확인으로 정정.
- **v1.21 (2026-10-18)**: 이미지 시간 초과 자동 재시도 중단 (이중 과금 방지).
- **v1.20 (2026-10-17)**: 이미지 생성 시간 초과 안내 문구 통일.
- **v1.19 (2026-10-17)**: 공용 이미지 기준 코드 갱신 반영.
- **v1.18 (2026-10-17)**: 공용 이미지 어댑터(`geminiImage.ts`) 연동.
- **v1.15 (2026-10-17)**: 기본 연동 & 사용 매뉴얼 추가.
- **v1.14 (2026-10-17)**: 등록 주소 한눈에 보기 카드 및 복사 버튼 탑재.
- **v1.13 (2026-10-17)**: 연결 버튼 색 구분 (Facebook 파란색 / Instagram 초록색).
- **v1.11 (2026-10-16)**: Facebook 페이지 방식 전용 앱 ID 칸 분리.
- **v1.08 (2026-10-16)**: SSO 새 도메인 `https://auto-instagram-posting.buylife.xyz` 이전.

---

## 5. 남아 있는 추가 프로그램 및 디자인 작업 대기 내용
- 상세 내역은 [`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md) 참조:
  1. `INSTA-01`: Instagram 릴스(Reels) 영상 자동 포스팅 지원
  2. `INSTA-02`: 인스타그램 9분할 피드 그리드 시뮬레이터 뷰
  3. `INSTA-03`: INSTA Cardnews 자동화(`cardnews-studio`) 1클릭 캐러셀 전송 파이프라인
  4. `INSTA-04`: 팔로워 활동 기반 최적 발행 시간대 AI 추천

---

## 6. 기존 다른 프로그램과의 연계 / 기능 병합 제안
1. **`cardnews-studio` (INSTA Cardnews 자동화) 연계**:
   - 카드뉴스 스튜디오에서 캔버스로 글자를 얹어 완성한 고해상도 카드뉴스 슬라이드(4~10장)를 본 프로그램으로 원클릭 전송하여 즉시 인스타 캐러셀 예약 포스팅으로 등록하는 파이프라인 구축.
2. **`threads-posting` (Threads 포스팅 자동화) 연계**:
   - 동일한 Meta 생태계 내에서 인스타그램 피드 게시물과 Threads 피드 타래글을 한 번에 동시 발행하는 멀티 퍼블리싱 옵션 연동.

---

## 7. 사용자 편의성 증대를 위한 디자인 UI개선안과 레이아웃 제안
1. **피드 그리드 프리뷰 룸**: 내 실제 인스타그램 프로필 9분할 그리드에 새로운 게시물이 어떻게 어우러지는지 미리 맞춰볼 수 있는 플래너 룸 추가.
2. **캡션 2,200자 및 해시태그 30개 실시간 카운터 위젯**: 작성 중 플랫폼 제약조건을 시각적으로 안내하는 실시간 게이지 제공.

---

## 8. 관련 문서 링크
- [디자인 개발 플랜](docs/PLAN_20261017_DESIGN_RENEWAL.md)
- [디자인 핸드오프](docs/DESIGN_HANDOFF.md)
- [개선 및 특이사항](docs/IMPROVEMENTS.md)
- [개선 백로그](docs/IMPROVEMENT_BACKLOG.md)

## 2026-10-18 — `test:own-meta` 실패 해결: 함수 모양 검사를 추가 인자 허용으로 (Claude Code 윈도우, 시험 파일만 변경·버전·배포 없음)
- 증상: `npm run test:own-meta`가 `getFacebookAuthorizeUrl(state: string, appId: string)` 글자 그대로 찾다 실패.
- 원인: 2026-10-16 옛 vercel.app 주소 정리 대비(두 콜백 주소 지원)로 `getFacebookAuthorizeUrl`·`exchangeFacebookCode`에 `redirectUri` 인자가 추가됐는데 시험은 옛 모양을 검사. 실제 코드는 정상(회원 본인 앱 ID·시크릿 사용 그대로).
- 해결: `scripts/test-own-meta-app.cjs`가 본인 앱 ID·시크릿 인자는 그대로 확인하고 그 뒤 추가 인자는 허용 → `own meta app ok`. Antigravity의 v1.23 작업 종료(커밋 `f5fdf6da`) 확인 후 진행.

## 2026-10-18 — 강의용 독립 설치 키트(독립 운영 모드·KIT/·설치 스크립트) (Claude Code 윈도우, 버전·배포 없음)

- **배경**: 주인님 강의(2026-10-18)에서 수강생이 이 프로그램을 **본인 계정(Supabase·Vercel·Meta)에 독립 설치**해 실제 포스팅까지 쓰도록 하기 위한 설치 키트. AIMaster와 연결 없음, 화면 이름은 수강생 이름/브랜드.
- **독립 운영 모드**: 환경변수 `NEXT_PUBLIC_STANDALONE_MODE=true`일 때만 동작(패턴 출처 threads-affiliate-poster `deployment.ts`). 운영 사이트(AIMaster)는 이 변수가 없어 **동작 변화 없음** — 그래서 이번에는 배포·버전 변경 없이 커밋만 하고, 다음 배포 때 함께 나간다(2026-10-17 비용 절감 규칙). **다음 배포자는 버전 +0.01 하고 이 항목을 버전 기록에 넣을 것.**
  - `src/lib/deployment.ts`(새 파일): `IS_STANDALONE`·`SITE_URL`·`BRAND_NAME`·`brandTitle()`
  - 독립 모드에서: 권한 판정은 로그인만 확인(구독·등급·핸드폰 없음), 자체 로그인·회원가입 화면, OAuth 콜백 주소는 `NEXT_PUBLIC_SITE_URL` 기준, buylife.xyz로 보내는 리디렉션·"다른 프로그램 보기" 링크·AIMaster 매뉴얼 버튼·약관 링크 숨김, 화면 제목·좌측 메뉴에 `NEXT_PUBLIC_BRAND_NAME` 표시.
- **키트 파일(`KIT/`)**: `README.md`(설치 안내 0~9단계) · `PLATFORMS.md`(플랫폼별 가입·키 발급) · `schema.sql`(운영 DB 카탈로그에서 구조만 뽑아 만든 새 DB용 전체 구조 — PGlite로 두 번 실행해 재실행 안전 확인, 테이블 12·정책 32·`insta-post-images` 버킷) · `setup.ps1`/`setup.sh`(윈도우/맥 대화형 설치: npm install → `.env.local` 생성(CRON_SECRET 자동) → 빌드 → Vercel 로그인·연결·환경변수 등록·배포) · `env.example` · `kit.json`
- **묶음 만들기**: 루트 `python scripts/make_lecture_kit.py` → `D:\PDS\SNS_Auto_Posting_Kit_YYYYMMDD.zip`(두 프로그램 + `00_START_HERE.md`, `.env*`·`node_modules`·`.next`·`.vercel`·내부 문서·`supabase/`·`scripts/` 제외). 소스·KIT를 고치면 이 스크립트를 다시 돌린다.
- **예약 게시**: Vercel 무료 플랜은 하루 1번 cron만 허용 → 수강생은 cron-job.org로 `/api/posts/dispatch-scheduled`(5분)를 `Authorization: Bearer CRON_SECRET` 헤더와 함께 호출.
- **검수**: `tsc` 통과, 기존 시험 `test:own-meta` 통과, 압축을 새 폴더에 풀어 독립 모드 가짜 설정으로 `npm install`·`npm run build` 통과(단, 윈도우에서 폴더 경로가 아주 길면 Turbopack `file is too long`으로 빌드 실패 — 짧은 경로 `D:\kt`에서는 통과, KIT/README 문제 해결 표에 안내 추가). **실제 Meta 계정 연결·게시는 시험하지 않음**(수강생 계정 없음) — 강의 때 첫 수강생 설치에서 확인 필요.

- **바뀐 파일**: `src/lib/deployment.ts`(새) · `src/lib/oauthRedirect.ts` · `src/proxy.ts`·두 Instagram 콜백(독립 모드에서 buylife 리디렉션 안 함) · `src/lib/access.ts` · `src/lib/actions/auth.ts`(`signUpAction`) · `(auth)/login`·`signup`·`layout` · `settings/page.tsx`·`guide/page.tsx` · `Sidebar.tsx` · `app/layout.tsx` · `src/lib/posts/dispatch.ts`(독립 모드는 핸드폰 조건 건너뜀 — 없으면 수강생 사이트 예약 글이 영원히 안 나감)
- **발견(미처리)**: 운영 사이트에는 `dispatch-scheduled`를 부르는 Vercel cron이 없음 → DB `cron.job`에도 없음 → 운영 예약 게시가 실행되지 않음(밀린 글 0건, `docs/IMPROVEMENTS.md` 2026-10-18 항목, 주인님 확인 필요).

## 2026-10-18 — 예약 화면 안내 문구 「예약 시각 후 5분 안에 자동으로 발행됩니다」 (Claude Code 윈도우, **미배포 — 다음 배포 때 함께**)
- `src/components/posts/PostForm.tsx` 예약 시각 입력란에 안내 추가. 정확히 그 분에 안 올라가도 회원이 헷갈리지 않게(예약 게시 누락 방지 ②, 플랜 `docs/PLAN_20261018_SCHEDULED_DISPATCH_MONITOR.md`).
- 급하지 않은 화면 문구라 비용 규칙에 따라 커밋만 함. **다음에 이 프로그램을 배포하는 CLI는 버전 +0.01(코드·DB)하고 버전 기록에 이 항목을 넣을 것.** 검수: tsc 0.

## 2026-10-19 — 게시 코드를 공용 기준 코드 `instagram-publish`로 분리 (Claude Code 윈도우, **미배포 — 다음 배포 때 함께**)
- `src/lib/instagram/publish.ts`(새 파일, **공용 기준**): `client.ts`에 있던 게시 함수(`graphBaseFor`·`publishInstagramPost`·`publishInstagramCarousel`과 내부 컨테이너·대기·재시도)를 동작 그대로 옮김. `client.ts`는 이 파일에서 다시 내보내 기존 import는 그대로 동작. 사본: `cardnews-studio/src/lib/instagram/publish.ts`(v1.18 인스타 바로 게시). 고칠 때는 이 파일만 고치고 `node scripts/check-shared-modules.mjs --sync`.
- 이 프로그램의 `insta_accounts`(회원별 인스타 연결값)는 루트 최상위 지침 「회원 연동 정보 공용 저장·재사용 규칙」에 따라 카드뉴스·인플루언서·웹툰이 새로 등록하지 않고 가져다 씀 — 테이블 구조를 바꿀 때는 그 프로그램들도 함께 확인.
- 검수: tsc 0, `npm run test:own-meta` 통과. 동작 변화 없어 배포·버전 변경 없이 커밋만 — **다음 배포자는 버전 +0.01하고 이 항목을 버전 기록에 넣을 것.**

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 4개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->

## 2026-10-19 — 배포 키트 공용화 (Claude Code 윈도우, 코드·배포 변경 없음)
- `KIT/kit.json`에 포장 설정(예전 `scripts/make_lecture_kit.py` 안에 있던 뺄 항목·덮어쓸 파일)을 옮김, `KIT/setup.*`는 공용 템플릿(`AIMaster/scripts/kit-template/`)으로 교체(키 숨김 입력·GitHub 자동 연결 해제). 예약 방식 지침(`docs/SCHEDULER_POLICY.md`)은 아직 미적용(1순위 예정). 지침: 루트 `docs/DISTRIBUTION_KIT_GUIDE.md`.
