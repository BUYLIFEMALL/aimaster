# AI 인플루언서 자동화 — AI 에이전트 인수인계 문서 (AGENTS.md)

> **프로그램 버전**: `v1.06` (2026-10-12 최신 배포)  
> **공식 커스텀 도메인**: [https://ai-influencer.buylife.xyz](https://ai-influencer.buylife.xyz)  
> **Vercel 프로덕션 도메인**: [https://ai-influencer-studio-sage.vercel.app](https://ai-influencer-studio-sage.vercel.app)  
> **프로그램 slug**: `ai-influencer-studio`  
> **카테고리**: 멀티미디어 / 인스타 / 마케팅  
> **배지**: `['free', 'new']` (AIMaster 가입 회원 누구나 무료 이용)

---

## 0. 절대 불변 최상위 규칙 (모든 에이전트 필독)

1. **★ 사용자 본인 Gemini API 키 직접 등록 및 연동 원칙**:
   - 운영자(buylifemall) 또는 시스템 공용 키로 폴백하지 않습니다.
   - 키가 없으면 기능을 임의로 우회하거나 폴백하지 않고 `ApiKeyModal`을 열어 등록을 안내합니다.
   - DB 테이블: 공용 `user_api_keys` (`provider = 'gemini'`).
2. **FREE 배지 가입자 전체 무료 이용 원칙**:
   - `programs.badges`에 `'free'`가 포함되어 있으므로 등급이나 구독 여부와 무관하게 가입한 회원은 누구나 이용 가능합니다.
   - 단, 비로그인 사용자는 `/login?redirect=%2F`로 안전하게 리다이렉트됩니다.
3. **작업 화면 클린 화이트 베이스 원칙 (`docs/SIDEBAR_LAYOUT_STANDARD.md`)**:
   - 배경은 `bg-slate-50` / `bg-white`, 경계는 `border-slate-200`, 본문 텍스트는 `text-slate-800`.
   - 포인트 컬러는 `pink-500` / `pink-600` (인플루언서 뷰티 테마).
4. **단일 작업 세트 완결 원칙**:
   - 빌드(`npm run build`) → Git Commit → Git Push → Vercel 배포(`vercel deploy --prod --yes`) → 버전 상향 동기화(`lib/version.ts` + `package.json` + DB `programs.version`) → 결과 보고까지 한 번에 완료합니다.

---

## 1. 아키텍처 및 디렉토리 구조

```
ai-influencer-studio/
├── src/
│   ├── app/
│   │   ├── (auth)/login/page.tsx      # 자체 도메인 로그인 화면 (Supabase SSO 쿠키 공유)
│   │   ├── api/
│   │   │   ├── auth/logout/route.ts   # 안전한 로그아웃 라우트
│   │   │   ├── generate-image/route.ts# Gemini/Imagen 초고해상도 화보 생성 엔진
│   │   │   ├── generate-caption/route.ts # Gemini 3종 인스타 맞춤 캡션 생성 엔진
│   │   │   ├── plan-day/route.ts      # 인플루언서 5대 타임라인 시나리오 기획
│   │   │   ├── plan-variations/route.ts# 단일 이벤트 5각 앵글 변형 기획
│   │   │   └── user-key/route.ts      # 사용자 개인 Gemini API 키 CRUD (AdminClient)
│   │   ├── layout.tsx                 # 루트 레이아웃 (Inter 폰트, 메타데이터)
│   │   └── page.tsx                   # 대시보드 메인 페이지 (requireProgramAccess)
│   ├── components/
│   │   ├── Sidebar.tsx                # AIMaster 표준 좌측 사이드바 (Step 1~5 네비게이션)
│   │   ├── ControlPanel.tsx           # 중앙 옵션 컨트롤 패널 (5단계 설정 블록 & 툴바)
│   │   ├── ImageDisplay.tsx           # 우측 뷰어, 3종 캡션 탭, 미세 보정 인풋, 다운로드
│   │   ├── ApiKeyModal.tsx            # 본인 Gemini API 키 등록 모달
│   │   ├── HelpModal.tsx              # 사용 가이드 팝업
│   │   ├── HistoryDrawer.tsx          # 작업 히스토리 로컬 스토리지 드로어
│   │   └── InfluencerStudio.tsx       # 최상위 상태 관리자 & 화면 통합 컨테이너
│   ├── data/
│   │   └── influencer-options.ts      # 국적 30종, 헤어 31종, 피부 30종 등 전수 프리셋
│   ├── lib/
│   │   ├── access.ts                  # AIMaster 공용 프로그램 이용 권한 게이트
│   │   ├── gemini.ts                  # Google Gen AI SDK 클라이언트 헬퍼
│   │   └── version.ts                 # APP_VERSION = 'v1.06', APP_NAME
│   └── types/
│       └── influencer.ts              # InfluencerConfig, GenerationResult, HistoryItem 정의
├── MANUAL.md                          # 사용자 및 운영 상세 매뉴얼
├── README.md                          # 프로젝트 개요 및 최근 기능 내역
└── package.json                       # Next.js 16.2.11, React 19.2.4
```

---

## 2. 핵심 API 엔드포인트 명세

### 1) `/api/generate-image` (POST)
* **목적**: 인플루언서 설정 및 프롬프트를 조합하여 고화질 화보 생성
* **엔진**: `imagen-3.0-generate-002` (폴백: `gemini-2.5-flash`)
* **요청 본문**:
  ```json
  {
    "config": {
      "gender": "female",
      "ethnicity": "kr",
      "age": "24",
      "hairStyle": "c_wave",
      "expression": "soft smile",
      "pose": "holding cup",
      "outfit": "oversized white shirt",
      "location": "cozy cafe",
      "lighting": "m_win",
      "camera": "iphone_rear",
      "skin": ["glass_korean", "subtle_pores"],
      "aspectRatio": "9:16",
      "quality": "1K",
      "isAdMode": false,
      "productImages": []
    },
    "refinementFeedback": "조금 더 환하게 웃는 표정으로 변경해줘"
  }
  ```
* **응답**: `{ "success": true, "imageUrl": "data:image/jpeg;base64,..." }`

### 2) `/api/generate-caption` (POST)
* **목적**: 화보 컨셉과 스토리 맥락에 최적화된 인스타그램 3종 캡션 및 해시태그 생성
* **엔진**: `gemini-2.5-flash` (빠른 응답 속도 및 자연스러운 한국어 구사)
* **응답**:
  ```json
  {
    "success": true,
    "captions": [
      "🌿 따스한 햇살과 함께 시작하는 하루...",
      "✨ 오늘의 ootd 완성! 화이트 셔츠는 진리...",
      "☕️ 여러분은 얼죽아파인가요, 따아파인가요? 댓글로 알려주세요!"
    ]
  }
  ```

### 3) `/api/plan-day` (POST)
* **목적**: 일과 문장 한 줄 입력 시 5대 시간대별(오전, 브런치, 오후, 골든아워, 야경) 시나리오 기획
* **엔진**: `gemini-2.5-flash` (JSON 포맷 스트럭처드 아웃풋)

### 4) `/api/plan-variations` (POST)
* **목적**: 단일 이벤트 입력 시 5각 카메라 구도(거울 셀카, 전면 셀카, 전신 샷 등) 변형 기획

### 5) `/api/user-key` (GET / POST)
* **목적**: 로그인 회원의 `user_api_keys` 테이블 내 Gemini 키 조회 및 안전한 저장 (마스킹 처리)

---

## 3. 사이드바 및 레이아웃 표준 규격 (`docs/SIDEBAR_LAYOUT_STANDARD.md`)

* **좌측 사이드바 (`Sidebar.tsx`)**:
  * 상단: `AI 인플루언서 자동화` + `v1.06` 배지 + `← 다른 프로그램 보기` (`https://www.buylife.xyz/programs`)
  * `🏠 대시보드`
  * 번호형 작업 흐름 (원형 핑크 배지 1~5 + 세로 연결선):
    * Step 1: 외형 스타일링 (`#step-1-appearance`)
    * Step 2: 일과 & 앵글 기획 (`#step-2-routine`)
    * Step 3: 표정·포즈 & 연출 (`#step-3-styling`)
    * Step 4: 광고/공구 모드 (`#step-4-admode`)
    * Step 5: 화보 & 캡션 생성 (`#step-5-generate`)
  * 구분선 아래:
    * `🔑 API키등록·플랫폼연동`
    * `💡 사용 가이드`
    * `⚙️ 작업 히스토리`
    * 회원 계정 이메일과 로그아웃 버튼 **바짝 밀착** 배치 (`mt-auto` 금지 규칙 준수)
* **중앙 컨트롤 패널 (`ControlPanel.tsx`)**:
  * 상단 툴바: 불필요한 중복 타이틀 완전 삭제, `px-5 py-2.5` 슬림형 도구 바로 우측 정렬(`justify-end`)
  * 도구 버튼: 물음표(가이드), 톱니바퀴(API 설정), 주사위(전체 옵션 랜덤 믹스 🎲), 슬라이더(작업 히스토리)
  * 스크롤 동기화: 사용자가 스크롤할 때 `IntersectionObserver`로 좌측 사이드바 스텝 자동 하이라이트

---

## 4. 버전 갱신 규칙 (절대 불변)

프로그램을 수정하고 배포할 때마다 마이너 버전을 +0.01 올리며, 다음 3곳을 반드시 함께 동기화합니다:
1. `src/lib/version.ts`: `export const APP_VERSION = 'v1.06';`
2. `package.json`: `"version": "1.06.0"`
3. Supabase DB `programs` 테이블: `version = 'v1.06'` (scripts를 통해 갱신)
4. `README.md`, `MANUAL.md`, `docs/HANDOFF.md`에 변경 내용 기록.

---

## 5. 버전별 변경 이력

- **v1.01**: 원본 레퍼런스(PureGlow Pro) 정밀 분석 및 핵심 엔진/타입/프리셋 구축
- **v1.02**: 15개 섹션 전수 확장, K-Glass 물광 등 피부 30종, 일과 기획 & 단일 이벤트 변형 엔진 탑재
- **v1.03**: 접속 시 아무 옵션도 선택되지 않은 "빈 값(미선택/플레이스홀더)"을 기본값으로 전면 개편
- **v1.04**: 상단 툴바 주사위(Dices 🎲) 전체 옵션 무작위 믹스 엔진 구현
- **v1.05**: 플랫폼 공통 표준 지침 준수 좌측 표준 사이드바 메뉴(`Sidebar.tsx`) 구축 및 1~5단계 네비게이션 연동
- **v1.06**: 컨트롤 패널 상단 중복 브랜드 타이틀 블록 완전 삭제, 슬림형 도구바 정돈, 사용 매뉴얼(`MANUAL.md`) 및 인수인계 문서(`AGENTS.md`) 완비

## v1.07 (2026-10-15) — AI 지시문에 한국 시간 현재 월 추가 (Claude Code 보조 계정)
- 연도만 주면 AI가 계절을 지어내는 문제(10월에 "봄", 루트 `docs/ERROR_LESSONS.md` 2026-10-14) 예방: src/lib/gemini.ts 일상 장면 지시(옷차림·풍경 계절, 영어)에 `koreaNowRule()` — "[기준 시점: 한국 시간으로 지금은 YYYY년 M월… 계절·시기 표현은 현재 월에 맞춤]"(Asia/Seoul, 서버 UTC여도 한국 날짜). 빌드 통과·프로덕션 배포 READY·DB `programs.version` v1.07. 유료 AI 실제 생성 확인은 하지 않음.


## 2026-10-16 DB 연동 변수 호환 — v1.08 (ai-influencer-studio)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## v1.09 (2026-10-17) 이미지 모델 최신 교체 — Claude Code(윈도우)
- `src/lib/gemini.ts` : 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview·Imagen) → 최신 정식(`gemini-nano-banana-2.1`·`gemini-3-pro-image`), 주소 v1beta (기준: ai-image-studio v1.11 `lib/providers/adapters/gemini.ts`).
- 실제 이미지 생성 시험은 하지 않았습니다 — 이미지 생성 오류가 나면 그때 테스트 검증합니다(주인님 지시).

## 2026-10-17 v1.10 — 디자인 리뉴얼: 크리에이티브 아틀리에 「핑크 화보 스튜디오」 (Claude Code 맥미니)
- `if-*` 다크 토큰, 화면 안 매뉴얼(`components/GuideView.tsx`, 팝업 `HelpModal.tsx` 삭제), 사이드바 「📖 연동 & 사용 매뉴얼」, 미리보기 빈 화면 한글화. 생성·키·권한 로직 변경 없음.
- **빌드·배포·화면 검수는 윈도우 CLI 대기.**
- 문서: [docs/PLAN_20261017_DESIGN_RENEWAL.md](docs/PLAN_20261017_DESIGN_RENEWAL.md) · [docs/DESIGN_HANDOFF.md](docs/DESIGN_HANDOFF.md) · [docs/IMPROVEMENTS.md](docs/IMPROVEMENTS.md) · [docs/IMPROVEMENT_HANDOFF_20261017.md](docs/IMPROVEMENT_HANDOFF_20261017.md)


## 2026-10-18 v1.11 — 이미지 생성 호출을 공용 기준 코드로 (이미지 4묶음 B · SDK 사용형, Claude Code 윈도우)
- **한 일**: `src/lib/gemini.ts` `generateInfluencerImage`를 공용 호출로. 생성 라우트 한도 60초 → 시간 제한 50초(Pro 모델이라 50초를 넘기면 이제 원인 모를 끊김 대신 시간 초과 표준 안내). 오류 로그에는 코드·메시지만 남김.
- **왜**: ① SDK 호출에 시간 제한이 없어 Vercel 함수 한도에서 원인 모를 끊김(요금은 나갔을 수 있음) ② 응답의 첫 이미지만 꺼내 `gemini-3-pro-image`의 중간 초안(thought) 이미지를 결과로 쓸 위험 ③ 영어 오류 문장을 정규식으로 추측해 분류 — 공용 모듈은 시간 제한·최종 이미지 선택·상태 코드별 오류 구분·키 가리기·시간 초과 표준 안내(Google AI Studio 사용량 확인)를 갖췄다.
- **바꾸지 않은 것**: 프롬프트·모델 이름·비율·화질·화면·글 생성 호출(SDK 그대로). 유료 생성이라 재시도 0(이중 과금 방지).
- **검수**: tsc 0, 프로그램 테스트(없음(테스트 스크립트 없음)), `check-shared-modules` OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. eslint는 이 폴더에 설정 파일이 없어(이전부터) 실행 안 됨. 실제 이미지 생성 시험은 하지 않음(비용) — 오류가 나면 그때 검증.
- **주의(다음 CLI)**: `src/lib/geminiImage.ts`·`nanoBananaModels.ts`는 공용 기준 코드 사본이다(기준: `ai-image-studio/lib/providers/`). 직접 고치지 않고 기준을 고친 뒤 `node scripts/check-shared-modules.mjs --sync`. 이 프로그램만 다르게 해야 하면 호출하는 쪽에서 덮어쓴다. 점검표: 루트 `docs/SHARED_MODULE_CHECKPOINTS.md`.

## 2026-10-18 v1.12 — 이미지 함수 한도 상향 (Claude Code 윈도우)
- **함수 한도 상향**: 이미지 라우트 `maxDuration` 60초 → 300초, 이미지 호출 시간 제한 50초 → 240초(Pro 이미지 모델 시간 초과 방지). 오래 걸리는 요청만 그만큼 함수 시간이 늘고, 예전엔 60초에서 잘려도 구글 요금은 이미 나갔다.
  대상: `/api/generate-image`, `src/lib/gemini.ts` 240초.
- **검수**: tsc 0, `check-shared-modules` OK, Vercel 프로덕션 배포 1회(비용 절감 규칙)·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).

## 2026-10-20 v1.15 — ⏰ 인스타 예약 게시·게시 기록(자동 포스팅 2차) (Claude Code 윈도우)
- 플랜: `docs/PLAN_20261020_INSTA_SCHEDULE.md`. 기준 구현(복사 후 맞춤): `cardnews-studio` v1.19(게시 기록·예약)·v1.24(회원 실행 방식)·2026-10-20 실패 시 되돌리기. 지침: 루트 `docs/SCHEDULER_POLICY.md`.
- 게시 패널: 「지금 게시 / 예약 게시」 전환, 예약 날짜·시간(한국 시간, 10분 뒤~60일 안), 예약 실행 상태 줄(일시정지·재개·「실행 방식 바꾸기」 → 설정 창), 「최근 인스타 게시 기록(30일)」(예약됨·게시 중·게시됨·실패·취소, 게시물 보기, 예약 취소). 즉시 게시도 기록에 남고, 일시 오류 때 이미 올라갔는지 확인해 중복 게시를 막는다.
- 설정: 「🔑 API키등록·플랫폼연동」 창 아래 「⏰ 예약 발행」 — 실행 방식(AIMaster 기본 Vercel / 내 cron-job.org) + cron-job.org 키 한 줄(공용 `cronjob_org_api_key`, 다른 프로그램에서 등록했으면 「등록됨」으로 그대로 사용).
- 서버: `src/lib/instagram/posting.ts`(기록·예약 실행·30일 정리·30분 멈춤 정리·24시간 지연 미게시·1회 재시도 전 중복 확인), `schedule.ts`(순수 함수), `memberScheduler.ts`·`cronJobOrg.ts`(카드뉴스 사본, 표·주소·토큰 접두어 `aif_`만 변경). API: `/api/instagram/posts`(GET/POST/DELETE), `/api/instagram/dispatch`(Vercel 5분, `CRON_SECRET`), `/api/instagram/dispatch-member`(회원 cron-job.org 1분, 회원 토큰), `/api/instagram/scheduler`(상태·방식·일시정지·키 저장/삭제). `vercel.json` crons 추가.
- 예약 사진: INSTA 공개 저장소 `insta-post-images`의 `{userId}/influencer-insta/{묶음}/NN.jpg`에 예약 시각까지 보관 → 게시·실패·취소·30일 뒤 삭제.
- 운영 DB(ref `esgxyikcnnvmlhygjkth`, 주인님 승인): 표 `aif_insta_posts`·`aif_member_scheduler`(RLS 본인 읽기만, 쓰기는 서버만), `programs.version` v1.15 — `supabase/migrations/20261020120000_insta_schedule_v1_15.sql`. 운영 Vercel 환경변수 `CRON_SECRET` 추가(무작위 값). `AIF_PLATFORM_SCHEDULER`는 없음(= Vercel 방식 켜짐, 끌 때만 `off`).
- 검수(2026-10-20): 단위 시험 18개 통과(예약 시험 9개 추가), 타입 검사·빌드 통과. 배포 `ai-influencer-studio-ibmwdx619` Ready. 비로그인 새 주소 8개 모두 401, 잘못된 회원 토큰·잘못된 비밀값 401, **Vercel 예약 호출 08:45(KST) `GET /api/instagram/dispatch` 200**(로그 확인 — `CRON_SECRET` 인증 정상). 크롬(관리자 계정, 좁은 화면): 사이드바 v1.15, 설정 창 「⏰ 예약 발행」(Vercel 기본 선택, 공용 cron-job.org 키 「등록됨」 표시), 브라우저에만 넣은 시험 기록(900×1600 그림)으로 **예약 1건 실제 등록 → DB `scheduled`·09:42 KST=00:42 UTC 저장, 올라간 사진 900×1125(4:5로 잘림) 확인 → 화면에서 예약 취소 → 기록 「취소」·대기 0건·사진 삭제(저장소 400)**. 시험 기록은 원래대로 되돌림. 취소된 시험 기록 1건(관리자 본인)은 30일 뒤 자동 삭제.
- **하지 않은 것**: 실제 인스타 게시(예약 실행 포함), 「내 cron-job.org」 방식 전환(관리자 cron-job.org 하루 호출 한도 보호). 첫 실제 예약 때 게시 결과 확인 필요.

## 2026-10-20 v1.14 — 📤 인스타그램에 바로 게시(자동 포스팅 1차: 즉시 게시) (Claude Code 윈도우)
- 주인님 지시 「모든 인스타 자동화 프로그램은 자동 포스팅까지」. 플랜 `docs/PLAN_20261020_INSTA_AUTOPOST.md`, 기준 `cardnews-studio` v1.18.
- 결과 화면 아래 패널(`components/InstagramPublishPanel.tsx`, `ImageDisplay`에 `history` 전달): 연결 상태 → 사진 고르기(지금 + 이전 기록, 최대 10장 캐러셀) → 캡션 → 공개 게시 확인 → 게시. 브라우저에서 JPEG·피드 비율 자르기(`src/lib/instagram/feedImage.ts`).
- 서버: `src/app/api/instagram/{route,upload/route,publish/route}.ts`, `src/lib/instagram/{publish.ts(공용 사본),memberAccount.ts(카드뉴스 사본),posting.ts}`. 연결값은 공용 `insta_accounts`(INSTA에서 한 번 연결). 임시 사진은 `insta-post-images/{회원}/influencer-insta/` — 게시 뒤 삭제, DB 변경 없음.
- 검수: 단위 9/9(`tests/feedImage.test.mjs` +4), tsc, 빌드. 배포·크롬 결과는 아래 줄에.
- 배포·검수(2026-10-20): `ai-influencer-studio-odna10ak9` Ready, DB v1.14, 주소 https://ai-influencer.buylife.xyz . 비로그인 `/api/instagram`·`upload`·`publish` 모두 401. 크롬(관리자 계정): 사이드바 v1.14, 연결 상태 「연결됨 @계정」(INSTA에서 연결한 공용 값 그대로), 브라우저에만 시험 기록 2개를 넣어 패널 확인 — 사진 2개 표시·누른 순서 1·2 배지·「게시 (2장)」·확인 체크 전 비활성, 업로드 준비 주소 `내폴더/influencer-insta/묶음/01.jpg`, 11장 요청 400, 다른 회원 경로 게시 400. 시험 기록은 지움. **실제 인스타 게시·사진 변환 후 업로드는 하지 않음**(첫 회원 사용 때 확인).
- 다음: 2차 예약 게시(운영 DB 표 필요 — 사전 승인).

## 2026-10-19 v1.13 — 깨진 사진을 받지 않고 화면 안에 안내 (Claude Code 윈도우)
- 운영 실측: 깨진 JPG가 깨진 미리보기(아이콘)로 들어가고 안내 없음.
- 공용 부품 `image-file-check` 사본 `src/lib/imageFileCheck.ts`(+ `tests/imageFileCheck.test.mjs`) — **직접 고치지 말 것**, 기준 `portrait-photo/src/lib/imageFileCheck.ts` 수정 후 `node scripts/check-shared-modules.mjs --sync`. `npm test` 명령 신설.
- `src/components/ControlPanel.tsx` `handleFileUpload`에서 `splitReadableImages` → 깨진 사진은 받지 않고 상품 사진·레퍼런스(인물·장소) 칸 아래에 `role="alert"` 안내(팝업 `alert` 대신 화면 안).
- 검수: 공용 테스트 5/5, tsc, 빌드, Vercel READY(`ai-influencer-studio-pmvyjefy2`), DB v1.13, 운영 실측 — 상품·인물 칸 모두 안내, 깨진 미리보기 0. AI 비용 없음.

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 3개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->

## 2026-10-20 v1.16 — 회원 연동 정보 공용 저장: Instagram 공용 계정 먼저 읽기 (Claude Code 윈도우)
- `src/lib/instagram/memberAccount.ts` `getMemberInstagramAccount`가 공용 표 `member_platform_accounts`(platform `instagram`)를 먼저 보고, 로그인 방식에 맞는 게시 권한이 있고 재연결 필요가 아니면 그것을, 아니면 지금처럼 INSTA의 `insta_accounts`를 쓴다(카드뉴스 v1.26과 같은 코드). 연결 화면이 없어 쓰기·해제 코드는 없음. 공용 부품 사본 `src/lib/memberIntegrations.ts`(`scripts/check-shared-modules.mjs` 등록). 테스트 18개 통과. 루트 `docs/MEMBER_INTEGRATIONS.md` §6.

## 2026-10-20 v1.17 — 인스타 예약 서버 코드 공용 사본 전환 · 일시정지 안전 처리 보강 · 예약 취소 중복 누름 방지 (Claude Code 윈도우)
- 공용 기준 코드 등록(2026-10-20): `insta-schedule-time`(schedule.ts)·`insta-member-scheduler`(memberScheduler.ts)·`insta-cronjob-org`(cronJobOrg.ts) — 기준 = `cardnews-studio`, 사본 = 인플루언서·웹툰·4컷. 프로그램마다 다른 값(사이트 주소·표 이름·토큰 앞글자·환경변수 이름·실행 주소·작업 이름)은 각 폴더 `src/lib/instagram/schedulerConfig.ts`(공용 아님). 기준만 고치고 `node scripts/check-shared-modules.mjs --sync`.
- **일시정지 안전 처리 누락 보강**: v1.15 예약은 카드뉴스 v1.24를 그 수정 전에 복사해 「운영 12개 전부 적용」(`docs/SCHEDULER_POLICY.md` 처리 결과 2)에서 빠져 있었다 → 공용 사본으로 `pauseMemberScheduler`(일시정지 먼저 저장, cron-job.org 끄기 실패 시 `jobStopped: false`)·`skipPausedMember` 반영, 회원 실행 주소 `/api/instagram/dispatch-member`가 일시정지·비cronjob 회원을 건너뜀, 일시정지 응답에 끄기 실패 안내(`notice`), 상태 줄이 그 안내 표시.
- 게시 칸 기록 「예약 취소」 중복 누름 방지(누르는 즉시 막고 성공하면 바로 「취소」).
- 검수(2026-10-20): 4개 모두 타입 검사·시험·빌드 통과, 순차 배포 Ready(카드뉴스 `cardnews-studio-73dn1lu4s`·인플루언서 `ai-influencer-studio-ohxzut5xz`·웹툰 `ai-webtoon-studio-85kgtktv9`·4컷 `four-cut-comics-74d8ph7yq`), DB 버전 4개 갱신(크롬 SQL Editor). 회원 실행 주소 가짜 토큰·설정 주소 비로그인 모두 401. 관리자 계정으로 인플루언서·웹툰·4컷 일시정지 경로 실행: 실행 중 → 일시정지(200) → 「일시정지됨」 → 재개(200) → 원래대로(Vercel 방식이라 cron-job.org 호출 없음). Vercel 5분 예약 호출 10:40 카드뉴스·인플루언서·웹툰·4컷 모두 200.

## 2026-10-20 v1.18 — 방식이 다른 회원 토큰 호출 시 cron-job.org 작업 끄기 (Claude Code 윈도우)
- 회원 토큰 확인(`memberIdForToken`)에서 토큰은 맞지만 실행 방식이 「내 cron-job.org」가 아니면 지금처럼 401을 돌려주되 **cron-job.org 작업을 끄고 `active: false`로 정리**(재개·방식 변경이 겹쳐 작업이 켜진 채 남으면 5분마다 401 헛호출이 이어지던 문제). 직전 배포(c69b0407)의 `skipPausedMember` 방식 조건은 토큰 확인이 먼저 401로 걸러 닿지 않는 코드였으므로 일시정지만 보는 원래 조건으로 되돌림. 커밋 `be5c5107`, DB 버전 크롬 SQL Editor, 15개 순차 배포 Ready·가짜 토큰 401.
- 재현 검수(상품소싱, 관리자): 작업을 켠 뒤 DB 방식만 Vercel로 → 11:00 회원 실행 401 + 작업 꺼짐(`active: false`) → 11:05~11:34 호출 없음. 시험 전 상태로 복귀.
- 인스타 공용 기준 코드(`insta-member-scheduler`, 기준 cardnews-studio) 사본 — `node scripts/check-shared-modules.mjs --sync`로 반영.

## 2026-10-20 (버전 변경 없음·미배포) — 인스타 게시 처리·예약 API 5개 공용 사본 전환 (Claude Code 윈도우)
- 한 일: `src/lib/instagram/posting.ts`와 `src/app/api/instagram/{posts,dispatch,dispatch-member,scheduler}/route.ts` 5개를 **공용 기준 코드로 등록**(`insta-posting`·`insta-posts-route`·`insta-dispatch-route`·`insta-dispatch-member-route`·`insta-scheduler-route`, 기준 `ai-webtoon-studio`, 사본 `ai-influencer-studio`·`four-cut-comics`). 프로그램마다 다르던 값(게시 기록 표·slug·이미지 확인 함수 파일)은 `src/lib/instagram/schedulerConfig.ts`의 `SCHEDULER_POSTS_TABLE`·`SCHEDULER_PROGRAM_SLUG`·다시 내보낸 `MAX_INSTA_CAPTION`/`validInstaPaths`로. **사본은 직접 고치지 말고** 기준(웹툰)만 고친 뒤 `node scripts/check-shared-modules.mjs --sync`.
- 동작 변경 없음(표 이름·slug·키 가림 형식 모두 이전과 같음). DB 변경 없음. 카드뉴스는 구조가 달라 제외. 플랜 `ai-webtoon-studio/docs/PLAN_20261020_INSTA_POSTING_SHARED.md`.
- 검수: 세 프로그램 tsc·테스트(웹툰 18·인플루언서 18·4컷 52)·build 통과, `check-shared-modules.mjs` 일치.
- **미배포**(내부 정리 — 공용 기준 코드 배포 등급): 버전은 그대로이고, 이 프로그램을 다음에 배포할 때 함께 나가며 그때 버전 +0.01.

## 2026-10-20 (버전 변경 없음·미배포) — 인스타 예약 화면 동작 공용화(상태 줄·게시 기록 시각·예약 취소) (Claude Code 윈도우)
- 한 일: 인스타 예약 화면의 같은 동작을 공용 기준 코드 `insta-posts-client`(`src/lib/instagram/postsClient.ts`, 기준 `cardnews-studio`, 사본 인플루언서·웹툰·4컷)로 뺐다 — ① 「⏰ 예약 발행」 상태 줄 동작 `useInstaSchedulerStatus(주소, refreshKey)`(불러오기·일시정지/재개·다음 상태 계산) + 상태 이름·설명 `SCHEDULER_STATE_TEXT` ② 게시 기록 시각 문구 `postTimeLabel` ③ 예약 취소 훅 `useScheduledPostCancel(주소, {onCanceled, onError, onSettled})`(취소 중 다른 버튼 막기·성공 즉시 「취소」 표시) + `markCanceled`. **화면 모양(색·테마·배치)과 주소는 각 프로그램에 그대로**(상태 줄은 색 표 `STATE_TONE`/`STATE_COLOR`만 남김). 카드뉴스는 `src/lib/instagram/schedule.ts`를 새로 두어 `lib/cardnews/schedule.ts`를 다시 내보냄(공용 파일이 같은 경로로 부르도록).
- 바뀐 화면 파일: `SchedulePublishingControl.tsx`(4곳), 게시 기록이 있는 `InstagramPublishPanel.tsx`(카드뉴스·인플루언서·웹툰) / `InstaPostHistory.tsx`(4컷). 화면 마크업·문구 변경 없음.
- 검수: 네 프로그램 tsc·테스트(카드뉴스 52·웹툰 18·인플루언서 18·4컷 52)·build 통과, `check-shared-modules.mjs` 일치, 훅 앞 이른 return 없음 확인. **화면 실검수는 다음 배포 때**(미배포).
- **미배포**(내부 정리 — 공용 기준 코드 배포 등급): 다음 배포 때 함께 나가며 버전 +0.01도 그때. 그 배포 때 「⏰ 예약 발행」 줄·게시 기록 「예약 취소」 화면을 크롬으로 한 번 확인할 것.
- 2026-10-20 추가: 공용 `insta-member-scheduler`를 예약 프로그램 15개 공용 **`member-scheduler`**로 넓혔다. `schedulerConfig.ts`에 `SCHEDULER_IS_STANDALONE`(false)·`countRemainingWork`(남은 예약 게시 수) 추가, 기준 `memberScheduler.ts`는 상대 경로(`./cronJobOrg`·`./schedulerConfig`)로 부름. 동작 같음·미배포. 플랜 `cardnews-studio/docs/PLAN_20261020_MEMBER_SCHEDULER_SHARED.md`.

## 2026-10-20 v1.19 — 결과 화면 맨 위 「⏰ 인스타 예약 n건 대기」 + 대기 목록 예약 취소 (Claude Code 윈도우, 남은 작업 ⑨)
- 문제: 게시 기록·예약은 사진을 만든 결과 화면(게시 패널) 안에서만 보여, 새로 들어오거나 다른 작업 중에는 지난 예약을 알 수 없었음.
- 수정: `src/components/ScheduledSummary.tsx` 새로 — 결과 화면(`ImageDisplay`) 맨 위에 대기 예약이 있을 때만 「⏰ 인스타 예약 n건 대기 · 다음 게시 …」 + 「대기 목록 보기」(시각·제목·예약 취소, 공용 `postsClient` 취소 훅). 게시 패널이 기록을 다시 불러올 때 `aif-insta-posts-changed` 신호를 보내 이 줄도 갱신. 참고: 웹툰 `ScheduledSummary`(v1.17). DB 변경 없음.
- **이 배포로 미배포 공용 정리 3건도 함께 나감**(게시 처리·예약 API 5개, 예약 화면 동작, 예약 실행 방식).
- 검수: tsc·시험 18·build, 커밋 `6ed583a8`, 배포 `ai-influencer-studio-liuouabpa` Ready, DB v1.19(크롬 SQL Editor, PRODUCTION). 운영 예약 실행 주소 3개 401, 크롬(관리자) 제목 v1.19·화면 정상·예약 상태 API 200(`platform`)·게시 기록 API 200, 대기 0건이라 요약 줄은 숨김(정상). **대기 예약이 있을 때의 줄 표시·취소는 미시험**(실제 인스타 예약을 만들어야 해서 하지 않음).
- 남은 제안: 작업 히스토리 DB 저장(현재 브라우저 저장, DB 추가라 승인 필요), 「하루 일과 자동 예약」.

## 2026-10-20 v1.20 — 작업 히스토리를 회원 계정(DB)에 저장 (Claude Code 윈도우, 추가개선 제안 2-1, 주인님 운영 DB 새 표 승인)
- 문제: 히스토리가 브라우저 localStorage에만 있어 다른 PC·브라우저에서 안 보이고, 원본 이미지(base64)를 담아 저장 공간이 차면 실패.
- 구조: 표 `aif_history`(id·user_id·image_path·captions jsonb·config jsonb·summary·created_at, RLS 본인 읽기만, 쓰기는 서버만) + **비공개** 버킷 `aif-history`(`{userId}/history/{id}.jpg`, 보기는 1시간 서명 주소). SQL `supabase/migrations/20261020300000_history_v1_20.sql`, 플랜 `docs/PLAN_20261020_HISTORY_DB.md`.
- API `src/app/api/history/route.ts`: GET(최근 30개, 30일 지난 것·30개 초과분은 이때 파일과 함께 삭제), POST(JPEG base64 3MB 이하, 사진 데이터 키 `personImage`·`placeImage`·`productImages`·`lastResultImage` 제거, 30개 초과 정리), DELETE(`?id=` / `?all=1`).
- 화면 `src/components/InfluencerStudio.tsx`: 열 때 서버에서 불러오고, 예전 브라우저 히스토리는 오래된 것부터 계정으로 옮긴 뒤 모두 성공하면 브라우저에서 지움. 저장은 화면에 바로 보이고 긴 변 1440px JPEG로 줄여 서버 저장 후 서버 값으로 교체. **불러오기 때 직접 올린 사진은 복원되지 않음**(얼굴 사진을 서버에 남기지 않기 위함).
- 검수: tsc·시험 18·build, 커밋 `16500d3b`, 운영 DB(ref `esgxyikcnnvmlhygjkth`) 표·비공개 버킷·version v1.20(크롬 SQL Editor — 「파괴적 작업」 경고는 새 표의 `drop policy if exists`라 지워지는 것 없음 확인 후 실행), 배포 `ai-influencer-studio-exks34d1k` Ready, 비로그인 `/api/history` 401. 크롬(관리자) 운영 API: 작은 시험 이미지 저장 200 → 목록에 있음·사진 키 제거·글자 설정 유지·서명 주소 200 image/jpeg → 삭제 → 목록 0, SQL로 버킷 파일 0·행 0 확인. 유료 생성 0회. **다른 PC에서 같은 계정으로 보이는지·예전 브라우저 히스토리 자동 이전은 실제 데이터가 없어 미시험.**

## 2026-10-20 v1.21 — 「🗓 하루 일과 자동 예약」(현재 **중지** 상태, 스위치로 켤 수 있음) (Claude Code 윈도우, 주인님 지시)
- 주인님 지시: 「실제 동작 가능 테스트 후 예약 기능은 일단 중지로 해 놔, 나중에 필요하면 사용할 수 있게만」.
- 기능: 일과 플래닝으로 만든 장면 컷(작업 히스토리)을 날짜 하나 + 장면별 시각(기본 08:00·11:30·14:00·18:00·21:00, 수정 가능)으로 한 번에 인스타 예약. **그림은 새로 만들지 않음**(회원 키 예고 없는 다장 과금 방지). 예약 경로는 게시 패널과 같음(사진 올리기 → `/api/instagram/posts`), DB 변경 없음.
- 파일: `src/lib/routineSchedule.ts`(★ 스위치 `ROUTINE_SCHEDULE_MODE` = `"off"`(현재) / `"admin"`(관리자만) / `"on"`(회원 모두), 최근 일과 컷 묶기·기본 시각), `src/components/RoutineSchedulePanel.tsx`(패널 — 사진 올리기 전에 공용 `validateScheduleTime`으로 지난 시각·10분 안·60일 넘음을 먼저 검사, 예약 중 창 닫기 경고), `src/types/influencer.ts`(`config.routine` = {planId, label, order}), `src/components/ControlPanel.tsx`(하루 일과 장면 적용 때만 `routine` 표시, 단일 이벤트 변형·랜덤 믹스는 제외), `src/app/page.tsx`(스위치 서버 판정), `InfluencerStudio`·`ImageDisplay`(결과 화면 맨 위 「⏰ 예약 n건 대기」 아래에 패널), `InstagramPublishPanel`의 `toFeedJpeg` 내보내기.
- **켜는 법**: `src/lib/routineSchedule.ts`의 `ROUTINE_SCHEDULE_MODE`를 `"on"`(또는 시험은 `"admin"`)으로 바꾸고 배포 + 버전 +0.01.
- 운영 시험(스위치 `admin`으로 배포 `72s78fvgt`·`axw7zk7l3`, 관리자 계정, 유료 생성 0회): 시험 이미지 2장을 일과 장면 1·2로 히스토리에 저장 → 패널 표시(기본 시각 08:00·11:30, @buylife.co.kr 연결) → ① 2027-01-05: 서버가 「60일 안으로만」으로 거절 → **사진을 올리기 전에 같은 규칙으로 막도록 수정**(재시험: 경고·버튼 꺼짐, 거절 때 사진은 서버가 정리해 저장소 남은 0건 확인) ② 2026-12-15: **실제 예약 2건 생성**(KST 08:00·11:30, 1장씩, 캡션 일치), 결과 화면 「⏰ 인스타 예약 2건 대기」 즉시 갱신 → 2건 취소(200)·시험 히스토리 삭제(남은 0). 그 뒤 스위치 `off`로 배포 `l7fxxjbrt` Ready, 일과 컷을 넣어도 관리자 화면에서도 패널 숨김 확인 후 시험 컷 삭제. DB version v1.21.

## 2026-10-22 v1.22~v1.23 — 「📊 최근 7일 게시」 그래프 (Claude Code 윈도우)
- 결과 화면 맨 위 예약 요약 줄 아래(`src/components/ImageDisplay.tsx`, 게시·예약 뒤 `INSTA_POSTS_CHANGED`로 다시 불러옴)에 접힌 한 줄 「📊 최근 7일 게시 n건 · 그래프 보기」 → 펼치면 날짜별 그래프 + 막대 누르면 그날 게시한 글(캡션 앞부분·인스타 바로가기).
- 공용 기준 코드 사본(직접 고치지 말 것): `src/components/weekChart/InstaWeekPosts.tsx`(기준 insta_auto_poster)·`WeekReplyPanel.tsx`·`WeekReplyChart.tsx`·`src/lib/weekChart/bucket.ts`(기준 comment-inbox). 데이터는 기존 `/api/instagram/posts`(본인 최근 30건, 공용 `insta-posts-route` — 응답에 `caption` 추가). 게시 완료 뒤 이미지를 지우는 표라 썸네일은 없음.
- 검수: tsc·build, 커밋 `4ae8a4b9`·`3e7ecf43`·`bf0b8479`, 배포 `ai-influencer-studio-ixcal01ow`(v1.22) → `ai-influencer-studio-hzsguzd4q`(v1.23) READY, DB 반영, 크롬(시험 회원)에서 버전·접힌 한 줄·펼치기·막대 누르기 「이날 게시한 글이 없어요」. 게시 기록 0건이라 높이 있는 막대는 미확인. 비용: Vercel 빌드 2회(썸네일 바로잡기 다시 배포 1회 포함).

## 2026-10-22 ⏸ 보류 — 7일 그래프 글자 크게 (주인님 지시: 「놔뒀다가 다음에 수정할때 그때 같이 빌드」)
- 무엇: 공용 그래프 사본 `src/components/weekChart/WeekReplyChart.tsx`·`WeekReplyPanel.tsx` 글자 한 단계씩 크게(제목 14→16px, 합계 12→14px, 막대 위 건수 11→14px, 날짜·요일 10→12px, 흐린 글자 투명도 60→80%, 그날 목록도 한 단계씩). 커밋 `9479f0bc`로 저장소에는 이미 반영됨.
- **이 프로그램 단독 배포는 하지 않는다.** 다음에 이 프로그램을 다른 이유로 수정해 배포할 때 **함께 빌드**되며, 그때 버전 +0.01·DB 버전 갱신·크롬에서 그래프 글자 크기 확인 후 이 항목을 「배포됨(버전)」으로 바꾼다. 쓰레드 쇼핑제휴(v1.79)에는 이미 배포됨.

## 2026-10-22 ⏸ 대기 — 게시 기록 API 「최근 7일 게시 완료만」 조회
- **⏸ 다음 빌드 때 함께 — 「최근 7일 게시 완료만」 조회(2026-10-22 주인님 지시: 따로 빌드하지 않고 이 프로그램을 다음에 수정·배포할 때 같이)**
  - 왜: 「📊 최근 7일 게시」 그래프(공용 `insta-week-posts`)가 게시 기록 API의 최근 30건(생성 순)만 받아서 세므로, 일주일에 30건 넘게 만들거나 예약이 많은 회원은 그래프·그날 목록이 덜 나온다.
  - 할 일: `src/app/api/instagram/posts/route.ts`의 GET에 `?week=1`을 받으면 `status=published`·`published_at` ≥ 한국 시간 6일 전 0시(`weekStartIso()`, `lib/weekChart/bucket.ts`)·`order(published_at desc)`·`limit(500)`로 돌려주게 추가(기존 응답은 그대로 — 예약 요약·기록 화면이 계속 씀). 그다음 공용 기준 `insta_auto_poster/src/components/weekChart/InstaWeekPosts.tsx`가 `postsUrl + "?week=1"`로 부르게 바꾸고 `node scripts/check-shared-modules.mjs --sync`. 이 파일은 공용 `insta-posts-route` **사본**이라 직접 고치지 말고 기준(`ai-webtoon-studio`)을 고친 뒤 `--sync`.
  - 검수: 그래프 합계가 DB의 최근 7일 게시 완료 수와 같은지(30건 넘는 시험 데이터는 만들지 않고 쿼리 조건으로 확인), 막대 누르기·예약 요약 줄이 그대로인지. 배포 뒤 이 항목을 「배포됨(버전)」으로 바꾼다.

## 2026-10-22 ⏸ 대기 — 게시 뒤 썸네일용 이미지 1장 남기기
- **⏸ 다음 빌드 때 함께 — 게시 뒤 썸네일용 이미지 1장 남기기(2026-10-22 주인님 지시: 따로 빌드하지 않고 다음 수정·배포 때 같이)**
  - 왜: 그날 게시 목록(공용 `week-reply-panel`)에 썸네일을 보이고 싶은데, `src/lib/instagram/posting.ts`가 게시 완료(즉시·예약·이미 올라감 확인) 직후 `removeImages(post.image_paths)`로 저장소 파일을 **모두** 지워서 지금은 썸네일이 없음(2026-10-22 v1.46에서 썸네일을 뺀 이유).
  - 할 일: 게시 **성공** 때만 첫 장(`image_paths[0]`)은 남기고 나머지만 지움(실패·취소는 지금처럼 전부 삭제). 남긴 장은 기존 30일 정리(`cleanupOldPosts` — 생성 30일 뒤 행과 이미지 삭제)가 그대로 지우므로 별도 정리 불필요. 그다음 ① 게시 기록 API가 `image_paths`를 돌려주고 ② 공용 `InstaWeekPosts`(기준 `insta_auto_poster`)에 `thumbUrl: publicImageUrl(r.image_paths, imageBucket)`와 `imageBucket` 항목을 되살리고 ③ INSTA 대시보드 `src/lib/instaWeek.ts`의 카드뉴스·AI 인플루언서·웹툰·네컷 `image` 칸을 `image_paths`로(카드뉴스 저장소 `cardnews-images`, 나머지 `insta-post-images`). 되돌릴 코드는 커밋 `3e7ecf43`(썸네일 추가)·`bf0b8479`(뺌)에 있음. 공용 `insta-posting` **사본** — 기준(`ai-webtoon-studio`)을 고친 뒤 `--sync`. 즉시 게시 경로 `src/app/api/instagram/publish/route.ts`도 확인.
  - 검수: 게시 완료 행의 첫 장 주소가 200으로 열리는지 실제로 확인(2026-10-22 교훈 — 주소가 404면 깨진 그림), 30일 정리 뒤 남은 장도 지워지는지 코드로 확인. 배포 뒤 이 항목을 「배포됨(버전)」으로.
