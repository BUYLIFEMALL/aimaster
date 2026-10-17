# 🤖 AI Agent 협업 가이드라인 (AGENTS.md)

이 문서는 **AI 음악 자동생성기(music)** 프로젝트에서 AI Agent(Claude Code 등)가 협업할 때
준수해야 할 필수 가이드라인 및 규칙입니다.

---

## 🛡️ 에이전트 실행 및 안전 수칙 (Mandatory Rules)

### 1. 자율 진행 허용 작업
다음 작업은 사용자 사전 승인 없이 자율적으로 수행합니다:
- 파일 생성 및 코드 수정
- 패키지 설치 (`npm` 등)
- 로컬 테스트 및 빌드 실행
- 스키마 추가/마이그레이션 (기존 threads/insta_auto_poster/shop-detail-page와 동일하게 자율 진행 가능)

### 2. 사전 승인 필수 작업 (🚨 승인 없이 금지)
다음 작업은 실행하기 전 **반드시 사용자에게 명확히 확인 및 승인**을 받으세요:
> **2026-10-16 주인님 지시로 정리**: Git 커밋·푸시와 프로덕션 배포는 **사전 승인 없이** 메인 지침(`CLAUDE.md` 원칙 12 「작업 완료 절차」: 검수 → 커밋 → 푸시 → 배포 → 배포 후 확인 → 결과·라이브 링크 보고)대로 진행한다. 초기 템플릿에 있던 「Git push·배포 사전 승인」은 폐지. 아래 항목만 여전히 사전 승인이 필요하다.
1. **파일이나 폴더 삭제**
2. **데이터베이스 데이터 삭제**
3. **환경변수와 API 키 변경**
4. **유료 API 호출** (GPT 곡 기획/가사 생성, Suno 곡 생성 등)

### 3. Supabase 타입·의존성 동기화 (2026-09-24 확인)

음악 프로젝트에서 `music_plannings` 또는 `music_tracks` 조회 결과가 TypeScript상 `{}`로
추론되어 `title`, `status`, `planning_id` 등의 컬럼 오류가 연쇄 발생하면 **DB 컬럼이 즉시
사라졌다고 판단하지 말 것**. 먼저 아래 순서로 점검한다.

1. 반드시 `music/` 폴더에서 `npm install`을 실행한다. 이 프로젝트 전용 의존성이 설치되지
   않으면 상위 AIMaster 폴더의 오래된 `@supabase/supabase-js`/`@supabase/ssr`을 잘못 참조할 수
   있다. 실제로 `supabase-js 2.95.3`, `ssr 0.8.0`이 참조되어 타입 추론이 깨진 사례가 있었다.
2. 설치 후 `node -e "console.log(require('@supabase/supabase-js/package.json').version)"`으로
   음악 폴더의 버전이 `music/package-lock.json` 기준인지 확인한다. 2026-09-24 정상 기준은
   `supabase-js 2.112.3`, `@supabase/ssr 0.12.4`이다.
3. `npm run build`를 실행한다. 2026-09-24에는 위 의존성 동기화만으로 전체 타입 오류가
   해결됐다.
4. 실제 원격 DB 스키마 확인이 필요하면 서비스 키를 브라우저에 노출하지 않는 서버 환경에서
   `music_plannings`와 `music_tracks`의 사용 컬럼을 `select(...).limit(1)`로 조회한다.
5. `supabase gen types`로 원격 타입 파일을 완전 재생성하려면 Supabase CLI 로그인 토큰이
   필요하다. 토큰이 없는 상태에서는 임의의 타입 파일을 만들거나 DB 스키마를 변경하지 말고,
   위 의존성·빌드·실제 컬럼 조회 결과를 먼저 확인한다.

`music/.env.local`은 로컬에서 값이 비어 있을 수 있다. 이 경우 DB 확인에는 루트 AIMaster의
서버 전용 환경변수를 사용하되, 키 값을 출력하거나 클라이언트 코드에 넣지 않는다.

---

## 🎯 프로젝트 목적

곡 설명(주제/분위기)을 입력하면 AI가 장르 스타일·제목·가사를 기획하고, Suno API로 실제 곡
(보컬판/인스트루멘탈판)을 자동 생성해주는 프로그램. 가사만 수정해서 재생성할 수도 있다.

**기존에 Make.com(Integromat) + Airtable로 운영하던 자동화 시나리오
(`D:\PDS\01/02/03/31/41 🟡🎵Suno자동화*.blueprint.json`)를 AIMaster 서브프로젝트로 이식한
것**이다 — 자세한 배경은 README.md "설계 배경" 참고. 멀티테넌시 스캐폴딩(로그인/API 키
정책/Supabase 클라이언트 등)은 shop-detail-page의 검증된 패턴을 그대로 재사용했다.

shots(유튜브 쇼츠)의 기존 Suno 연동(`shots/src/lib/ai/music.ts`)과는 목적이 다르다 — shots는
쇼츠 한 편의 배경음악(인스트루멘탈 전용, 폴링 방식)만 만드는 부속 기능이고, music은 가사가
있는 완성곡을 포함해 독립적으로 곡을 기획·생성·관리하는 전용 프로그램이다.

---

## 📂 프로젝트 작업 디렉토리

- **메인 모듈 경로**: `music/`
- 모든 관련 소스 코드(Next.js App Router), API 라우트, 서버 액션은 `music/` 폴더 내에서
  개발 및 관리합니다.

---

## 🔗 AIMaster 플랫폼 공통 원칙

music은 AIMaster 저장소 안의 서브프로젝트다. 개발/유지보수 시 루트의 `../CLAUDE.md`를
**메인 지침**으로 반드시 함께 읽을 것 — "Communication"(답변은 쉬운 한글로 작성), "Platform-hub
구조", "멀티테넌시 원칙" 섹션을 포함한 전체 내용이 이 서브프로젝트에도 그대로 적용된다. 핵심 요약:

- music은 개발자 전용 도구가 아니라, AIMaster 회원 중 이 프로그램
  (`programs.slug = "music-automation"`) 이용 권한(구독/개별부여/등급)이 있는 모든 사용자가
  각자 자신의 계정으로 동일하게 쓸 수 있어야 한다.
- 페이지는 `requireProgramAccess()`(권한 없으면 redirect), API route(`app/api/*/route.ts`)는
  반드시 redirect 대신 결과 객체를 반환하는 `checkProgramAccessApi()`로 로그인 여부뿐 아니라
  프로그램 이용 권한까지 확인한다. **단, `app/api/webhooks/suno/route.ts`는 예외다** — Suno가
  보내는 진짜 외부 콜백이라 로그인 세션 자체가 없으므로 이 검사를 쓸 수 없다(아래 "웹훅 설계"
  참고).
- 사용자 소유 데이터 테이블(`music_plannings`, `music_tracks`, `music_track_variants`,
  `music_track_mr`, `music_track_wav`, `music_track_remixes`, `music_track_remix_variants`)은
  `user_id` + RLS owner-only 정책으로 격리한다.
- API 키는 공용 `user_api_keys` 테이블(`resolveApiKey()`: 본인 키만, 관리자 키로 폴백 없음)을
  그대로 쓴다. 이 프로그램은 `openai`(곡 기획/가사 생성) + `suno`(실제 곡 생성) 두 provider를
  쓴다. 본인 키가 없으면 `/settings`로 안내하고 생성을 막는다.
- 생성된 오디오/커버이미지는 전부 `music-audio`(public) Storage 버킷의
  `{user_id}/{trackId}/{variantIndex}.{mp3|jpg}` 경로에 저장한다.

### 웹훅 설계 (AIMaster 최초의 진짜 외부 웹훅 수신 라우트)

Suno(`api.sunoapi.org`)는 곡 생성이 끝나면 우리가 넘긴 `callBackUrl`(`/api/webhooks/suno`)로
POST 콜백을 보낸다. 이 라우트는:
- 로그인 세션이 없으므로 `checkProgramAccessApi()`를 못 쓰고, `task_id`가 우리 DB의 실제
  `music_tracks` 레코드와 매칭되는지로만 신뢰성을 확보한다(Suno/Make.com 원본도 별도 서명
  검증이 없다).
- `createAdminClient()`(service role, RLS 우회)로 taskId 매칭 후 `record.user_id` 기준으로만
  갱신한다.
- Suno 콜백은 `callbackType`이 `text` → `first` → `complete` 순으로 여러 번 오므로,
  **`complete`일 때만 최종 저장 처리**하고 나머지는 무시한다(중간 콜백에서 빈 데이터로 잘못
  덮어쓰는 걸 방지 — 원본 Make.com 시나리오보다 안전하게 구현한 부분).
- `/api/webhooks/suno-vocal-removal`은 "MR(보컬제거) 만들기" 전용 웹훅이다. Suno의
  `/vocal-removal/generate`는 `/generate`, `/generate/extend`와 콜백 페이로드 구조가 완전히
  달라서(`callbackType`/`data` 배열이 없고 `vocal_removal_info` 하나만 옴) 별도 라우트로
  분리했다. `task_id` 매칭 방식과 admin 클라이언트 사용은 동일한 원칙을 따른다. 이 API는
  상태 조회(폴링)용 엔드포인트가 문서에 없어서, 웹훅이 도달하지 못하면(로컬 개발 환경 등)
  수동으로 복구할 방법이 없다 — 배포 환경에서만 실사용 가능.
- `/api/webhooks/suno-wav`는 "WAV로 변환" 전용 웹훅이다. Suno의 `/wav/generate`도 페이로드
  구조가 달라서(`audioWavUrl` 하나만 옴) 별도 라우트로 분리했다. 단, vocal-removal과 달리
  이 API는 `/wav/record-info?taskId=`로 상태 조회가 가능해서, `syncWavStatusAction()`으로
  곡 생성과 동일하게 수동 동기화 버튼을 제공한다(로컬 개발 환경에서도 폴링으로 테스트 가능).

## 📦 Make.com 시나리오 이식 현황 (Phase 진행 상태)

| Phase | 대응 시나리오 | 상태 |
|-------|---------|------|
| 1 | `01`(기획+생성호출), `02`(음악저장/웹훅), `03`(가사수정 재생성) | ✅ 구현 완료 |
| 2 | `31`(대량생성 — "생성 개수(대량생성)" 1~10곡 옵션으로 구현) | ✅ 구현 완료 |
| 2 | `41`(리믹스 — 업로드 오디오를 새 스타일로 커버, `createRemixAction()`, Suno `/generate/upload-cover`, 기존 `/api/webhooks/suno`가 task_id로 `music_track_remixes`도 함께 매칭하도록 확장. 완성곡 카드의 "🎛️ 이 곡으로 리믹스" 버튼으로 업로드 없이도 재사용 가능) | ✅ 구현 완료 (2026-08-17) |
| 3 | 곡 연장(Extend) — `extendTrackAction()`, Suno `/generate/extend`, `defaultParamFlag:true`로 continueAt/style/prompt 명시. **2026-08-29 추가 관찰**: 원곡 생성 완료 직후(약 1~2분 이내) 연장을 시도하면 Suno가 웹훅으로 `"File fetch failed. Check access settings..."` 오류를 보내는 사례를 확인함(요청 파라미터 자체는 정상 — 2026-08-15에 이미 검증된 안전한 형식). Suno 서버가 방금 만든 오디오를 아직 못 찾는 것으로 추정되어, `translateSunoErrorMessage()`(`lib/ai/suno.ts`)로 이 패턴을 감지해 "잠시 후 다시 시도해달라"는 한글 안내를 덧붙이도록 개선함(`markTrackFailed`/`markRemixFailed` 공통 적용). 확정된 원인은 아니라 재발 시 추가 조사 필요 | ✅ 구현 완료 |
| 3 | MR(보컬제거) 만들기 — `createMrAction()`, Suno `/vocal-removal/generate`(`type: separate_vocal`), 전용 웹훅 라우트 | ✅ 구현 완료 |
| 3 | WAV 변환 — `createWavAction()`/`syncWavStatusAction()`, Suno `/wav/generate` + `/wav/record-info` 폴링, 전용 웹훅 라우트 | ✅ 구현 완료 |
| 3 | Suno API 크레딧 조회 — `checkSunoCreditsAction()`, `/settings` 페이지 하단, GET `/api/v1/generate/credit` | ✅ 구현 완료 (2026-08-17) |
| 3 | 악기별 Stem 분리(`split_stem`), 보컬-반주 추가(Add Vocals/Instrumental), 타임스탬프 가사 등 | ⏳ 예정 |

한 번에 다 만들지 않고 Phase별로 하나씩 붙여나가기로 사용자와 합의함. 새 Phase를 시작할 때는
이 표를 갱신할 것.
- v1.04 (2026-10-12): 핸드폰 번호 필수 정책 적용 — 핸드폰 번호가 없는 회원(관리자 제외)은 이용할 수 없고 메인 사이트 설정에서 번호를 등록하도록 안내합니다. 공용 규칙은 루트 `lib/utils/phone.ts`, 상세는 `docs/HANDOFF.md` 2026-10-12 항목.


## 2026-10-16 DB 연동 변수 호환 — v1.05 (music-automation)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## 2026-10-16 디자인 리뉴얼 — v1.06 (music-automation)

- **스타일 템플릿**: `사이버 수노 다크 스튜디오 스타일 (Cyber Suno Dark Studio Style)`
- **작업 내용**: Suno 본사이트(`suno.com`)의 딥 다크 블랙(`#09090b`) & 앰버 오렌지(`#f97316`) 네온 테마 전면 적용.
- **개편 범위**: 사이드바(`Sidebar.tsx`), 레이아웃(`layout.tsx`), 로그인/회원가입(`app/(auth)/`), 리믹스 허브(`app/(dashboard)/remix/`), 트랙 기획/관리(`app/(dashboard)/plannings/`), 알약형 태그칩(`TagChips.tsx`), 비주얼 사용 매뉴얼(`SunoUsageGuide.tsx`) 신설.
- **DB 동기화**: `programs.version = 'v1.06'` 반영 완료.
- **검수**: Microsoft Edge (`msedge`) 브라우저 전용 실세션 검수 완료 (데스크톱 1440px / 모바일 375px 스크린샷 5장 캡처).
- **상세 문서**: [docs/DESIGN_HANDOFF.md](docs/DESIGN_HANDOFF.md), [docs/IMPROVEMENTS.md](docs/IMPROVEMENTS.md)

## 2026-10-16 Suno v6 최신 엔진 반영 — v1.07 (music-automation)

- **작업 내용**: 사용자 지시(Suno v6 출시 대응)에 따른 Suno 엔진 버전 표기 최신화.
- **개편 범위**:
  - `components/layout/Sidebar.tsx`: 좌측 사이드바 하단 배너 "Suno v3.5 & v4 엔진 탑재" ➔ "Suno v4 ~ v6 최신 엔진 탑재"로 갱신.
  - `app/(dashboard)/plannings/page.tsx`: 곡 기획·트랙 관리 헤더 배지 "Suno v3.5 & v4" ➔ "Suno v4 ~ v6 Engine"으로 갱신.
  - `lib/version.ts`: `APP_VERSION = "v1.07"` 판올림.
- **DB 동기화**: `programs.version = 'v1.07'` 반영 완료 (`scratch/update_db_version.js` 실행).
- **검수**: Microsoft Edge (`msedge`) 브라우저 전용 실세션 검수 완료 (`edge_suno_plannings_v107.png`).
- **상세 문서 및 백로그**:
  - 개선사항 목록: [`docs/IMPROVEMENTS.md`](docs/IMPROVEMENTS.md)
  - **Suno v6 모델 연동 인수인계서**: [`docs/IMPROVEMENT_HANDOFF_20261016.md`](docs/IMPROVEMENT_HANDOFF_20261016.md) (v6 파라미터 연동 및 UI 선택 기능 미구현 분석 및 구현 가이드 포함)

## 2026-10-16 가이드북(/guide) 전면 신설 및 사이드바 연동 — v1.08 (music-automation)

- **주인님 지시**:
  - "https://music-rho-virid-22.vercel.app/ 좌츠게 사용방법 메뉴얼 메뉴와 매뉴얼페이지 작업이 안되어 있어"
- **주요 작업 내용**:
  1. **사이드바 유틸리티 메뉴 보강 및 계정 밀착 배치 (`components/layout/Sidebar.tsx`)**:
     - `UTILITY_ITEMS`에 `📚 연동 & 사용 안내` (`/guide`) 메뉴 신설 및 오렌지 틴트 액센트 적용.
     - 접속 계정 정보 및 로그아웃 버튼을 유틸리티 메뉴 바로 아래(`border-t border-[#23232f] pt-3 px-1`)에 바짝 밀착 배치 (최신 사이드바 표준 완벽 준수).
  2. **가이드북 라우트 신설 (`app/(dashboard)/guide/page.tsx`)**:
     - `requireProgramAccess()` 탑재로 회원 세션 및 등급/이용권한 철저 검증.
     - 상단 헤더 배너: "🎵 Suno AI 음악 자동화 사용 가이드북" 및 "Cyber Suno Studio Guide" 배지 탑재.
  3. **3대 인터랙티브 탭 컴포넌트 신설 (`components/guide/MusicUsageGuide.tsx`)**:
     - `📋 4단계 실전 마스터 가이드`: STEP 00 (API키등록) ➔ STEP 01 (새 음악 기획) ➔ STEP 02 (Suno AI 생성·2트랙 동시생성) ➔ STEP 03 (프로 후가공: 곡 연장 Extend, MR/보컬 분리, 방송용 무손실 WAV 추출) ➔ STEP 04 (음악 Remix 스튜디오).
     - `🎛️ Suno 스타일 & 메타 태그 비법`: 4대 인기 스타일 프리셋 코드 블록 및 6대 가사 메타 태그(`[Intro]`, `[Verse]`, `[Pre-Chorus]`, `[Chorus]`, `[Bridge]`, `[Outro]`) 아코디언 탑재.
     - `💡 사운드 꿀팁 & FAQ`: 프로 사운드 4대 꿀팁(한글 발음 최적화, 곡 연장 이음매 맞추기 등) 및 5대 트러블슈팅 FAQ 아코디언 탑재.
  4. **버전 및 DB 동기화**:
     - 코드 `lib/version.ts`: `APP_VERSION = "v1.08"`
     - Supabase 공유 DB: `programs.version = 'v1.08'` (slug: `music-automation`) 업데이트 완료.
- **배포 및 검수**:
  - Vercel 프로덕션 배포 완료 (`dpl_BX2dEv8K8btS5SEcTbXSDEu6N84E`, `https://music-rho-virid-22.vercel.app`).
  - Microsoft Edge (`msedge.exe`) 전용 실세션(`buylifemall@naver.com`) 검수 완료:
    - `edge_music_guide_steps_v108.png` (4단계 가이드 & 사이드바 메뉴/계정 밀착)
    - `edge_music_guide_styles_v108.png` (스타일 & 메타 태그 비법)
    - `edge_music_guide_faq_v108.png` (사운드 꿀팁 & FAQ)
    - `edge_music_guide_mobile_v108.png` (모바일 375px)
- **라이브 URL**: `https://music-rho-virid-22.vercel.app/guide`

## 2026-10-16 도메인 통일(SSO) — v1.09 (Claude Code 윈도우)
- 새 주소 `https://music-automation.buylife.xyz`, `programs.app_url` 갱신(마이그레이션 `supabase/migrations/20261016_sso_domain*.sql`). 로그인 쿠키 `.buylife.xyz` 공유(`cookieDomain.ts` + 브라우저·서버 클라이언트·미들웨어, 기준 `stepmail`). 옛 `*.vercel.app` 화면 → 새 주소 308(API 제외, 옛 주소 유지). 자기 주소 기본값(환경변수 없을 때)만 새 주소로, Vercel 환경변수는 변경 안 함.
- 검수: 새 주소 / → /plannings 재로그인 없이 열림(시험 계정 표시), 옛 주소 화면 → 새 주소
- 플랜: `docs/DOMAIN_SSO_MIGRATION_PLAN_20261016.md`

## 2026-10-16 v1.10 — 옛 vercel.app 삭제 대비: Suno 콜백 주소 새 주소 (Claude Code 윈도우)
- 플랜: `../docs/OLD_DOMAIN_RETIREMENT_PLAN_20261016.md` 항목 G. `lib/ai/suno.ts`의 Suno `callBackUrl` 기준을 `NEXT_PUBLIC_SITE_URL`(옛 주소) 대신 `SUNO_CALLBACK_ORIGIN = https://music-automation.buylife.xyz`로 고정(요청마다 주소를 넘기므로 이후 생성분부터 새 주소로 결과 수신). 환경변수 없음 오류 분기(5곳)는 불필요해져 정리.
- 검수: 빌드·배포, 새 주소 `/api/webhooks/suno` POST 200(경로 동작). 실제 Suno 생성은 유료라 미시험.

## v1.11 (2026-10-17) 이미지 모델 최신 교체 — Claude Code(윈도우)
- `lib/ai/nanobanana.ts` `scripts/backfill-album-cover.mjs` : 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview·Imagen) → 최신 정식(`gemini-nano-banana-2.1`·`gemini-3-pro-image`), 주소 v1beta (기준: ai-image-studio v1.11 `lib/providers/adapters/gemini.ts`).
- 실제 이미지 생성 시험은 하지 않았습니다 — 이미지 생성 오류가 나면 그때 테스트 검증합니다(주인님 지시).

## 2026-10-17 v1.12 — 이미지 생성 호출·모델 목록을 공용 기준 코드로 (3묶음 단일 주소형, Claude Code 윈도우)
- `lib/ai/nanobanana.ts` 앨범 커버 생성이 공용 사본(`lib/ai/`)으로 위임하고, 주석대로 공용 목록의 **Pro 등급**을 쓴다 → 모델 `nano-banana-2.1` → `gemini-3-pro-image`(4K·온도 0.4 그대로, 1장 가격 약 $0.113 → $0.24, 회원 본인 키). 운영자용 `scripts/backfill-album-cover.mjs`는 TS 사본을 불러올 수 없는 스크립트라 그대로 둠.
- 개선: 키 머리글 전송, 시간 제한, 서버 오류·혼잡 1회 재시도, 응답의 모든 조각에서 이미지 탐색, 안전 차단·한도·키 오류 한국어 안내, 키 가리기. 프롬프트·비율·화질은 그대로.
- 검수: tsc·eslint(바뀐 파일) 0, build, 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음 — 오류가 나면 그때 검증(주인님 지시).
- **주의(다음 CLI)**: `geminiImage.ts`·`nanoBananaModels.ts`는 공용 기준 코드 사본이다(기준: `ai-image-studio/lib/providers/`). 직접 고치지 않는다. 이 프로그램만 결과를 다르게 해야 하면 `getNanoBananaConfig()` 결과를 호출하는 쪽에서 덮어써 보완한다. 지도: 루트 `docs/SHARED_FEATURE_MAP.md` §3.
