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

## 2026-10-19 v1.13 — 깨진 사진을 받지 않고 화면 안에 안내 (Claude Code 윈도우)
- 운영 실측: 깨진 JPG가 깨진 미리보기(아이콘)로 들어가고 안내 없음.
- 공용 부품 `image-file-check` 사본 `src/lib/imageFileCheck.ts`(+ `tests/imageFileCheck.test.mjs`) — **직접 고치지 말 것**, 기준 `portrait-photo/src/lib/imageFileCheck.ts` 수정 후 `node scripts/check-shared-modules.mjs --sync`. `npm test` 명령 신설.
- `src/components/ControlPanel.tsx` `handleFileUpload`에서 `splitReadableImages` → 깨진 사진은 받지 않고 상품 사진·레퍼런스(인물·장소) 칸 아래에 `role="alert"` 안내(팝업 `alert` 대신 화면 안).
- 검수: 공용 테스트 5/5, tsc, 빌드, Vercel READY(`ai-influencer-studio-pmvyjefy2`), DB v1.13, 운영 실측 — 상품·인물 칸 모두 안내, 깨진 미리보기 0. AI 비용 없음.
