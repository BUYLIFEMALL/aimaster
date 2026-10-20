# 🤖 AI Agent 협업 가이드라인 (AGENTS.md)

> 📌 2026-10-20 인수인계: [`docs/IMPROVEMENT_HANDOFF_20261020.md`](docs/IMPROVEMENT_HANDOFF_20261020.md) · 세션 전체 [`docs/HANDOFF_CLAUDE_SESSION_2026-10-20_PERSONALITY_TAROT.md`](../docs/HANDOFF_CLAUDE_SESSION_2026-10-20_PERSONALITY_TAROT.md)

## 2026-10-20 v1.24 — 홈 큰 제목·통계 카드 제목이 글자 중간에서 끊기던 문제 (Claude Code 윈도우, 남은 작업 ⑩)
- `app/page.tsx`: 큰 제목(h1)과 통계 카드 제목 3개에 `break-keep`(단어 단위 줄바꿈), 카드 제목은 `text-xl lg:text-2xl`(중간 폭에서 한 단계 작게). 「16대 오리지 / 널」 → 끊겨도 「16대 / 오리지널」.
- **이 배포로 「이어서 보기」 공용 링크(`personality-program-links`)도 함께 나감.**
- 검수: tsc·build, 커밋 `0d239ca7`, 배포 `mbti-character-4t8fustga` Ready, DB v1.24(크롬 SQL Editor, PRODUCTION). 크롬 운영 홈 v1.24, 같은 페이지를 700px·390px 틀에 넣어 측정 — 390px 카드 제목 3개 모두 1줄, 700px(카드 3개 나란히)는 2줄이지만 단어 사이에서만 끊김(`word-break: keep-all`).

## 2026-10-20 (버전 변경 없음·미배포) — 「이어서 보기」 링크를 공용 기준 코드 사본으로 (Claude Code 윈도우)
- 한 일: 성격·운세 4개 프로그램의 「이어서 보기」 링크 코드를 공용 기준 코드 `personality-program-links`(`programLinks.ts`, 기준 `personality-suite/src/lib/`, 사본 `mbti/lib/`·`mbti-character/lib/`·`tarot/lib/`)로 모았다 — 타로점·캐릭코드·성격코드 주소, `tarotDrawLink(질문, from)`(300자 제한), `typeResultLink(주소, 유형, 지표, from)`(0~100 정수), 넘어온 곳 이름 `FROM_LABELS`. 이 프로그램은 `app/result/[type]/page.tsx` `TarotBridge`가 `tarotDrawLink`를 부른다.
- 옛 링크와 결과가 같은지 표본 3개로 대조(같음). 동작·화면 변경 없음. 검수: tsc·build(성격 진단 단위 22 포함) 통과, 공용 코드 점검 일치.
- **미배포**(내부 정리 — 다음 배포 때 함께, 버전 +0.01도 그때). **새 프로그램을 이 흐름에 연결할 때는 기준 `FROM_LABELS`에 이름을 넣고 `--sync`**.

## 2026-10-20 v1.23 — 그림 자동 생성을 「검사 직후」로만 제한(회원 키 과금 안전) (Claude Code 윈도우)
- 문제: 결과 화면을 `from` 없이 열기만 하면(새로고침·뒤로 가기·북마크·공유 링크) 회원 Gemini 키로 그림이 자동 생성돼 과금됨(2026-10-20 검수 중 관리자 키로 실제 발생).
- 수정: `components/TestFlow.tsx`가 결과로 갈 때 `&fresh=1`을 붙이고, `app/result/[type]/page.tsx`는 `autoGenerate={fresh === "1" && !from}`. `components/ResultInteractive.tsx`는 첫 렌더에서 `fresh`를 주소에서 바로 지우고(`history.replaceState`, 화면 다시 그리지 않음), 생성 성공 시 주소에 `img`를 넣어 새로고침해도 방금 만든 그림이 그대로 보임(서버 `getTrustedImageUrl`이 신뢰 저장소 주소만 받음). 버튼으로 만드는 「다시 생성」은 그대로.
- 검수: tsc·build, 커밋 `4736e0b6`(다른 세션 푸시와 동시라 원격에 함께 반영됨), 배포 `mbti-character-56vz6q4m1` Ready, DB `mbti-character` v1.23(크롬 SQL Editor, PRODUCTION 확인). 크롬(관리자, Gemini 키 있음): `/result/ENFP?EI=60&SN=55&TF=70&JP=65`(fresh 없음) 9초 동안 `generate-character-image` 요청 0회, 「AI 캐릭터 이미지 생성하기」 버튼만 표시, `v1.23` 표시. **검사 끝 → 자동 생성 경로(fresh=1)는 유료라 운영에서 실호출 안 함**(코드로만 확인) — 회원 사용 중 오류가 나면 그때 확인.

## 2026-10-20 v1.22 — 미드나잇 퍼플 테마로 변경 (Claude Code 윈도우, 주인님 지시)
- 파스텔 크림 → 타로점·AI 종합 성격 진단과 같은 미스틱 미드나잇 퍼플. `app/globals.css` 토큰·클래스 색 + 17개 화면 파일 일괄 대응표(상세 `docs/DESIGN_HANDOFF.md` 맨 위). 로그인 바탕 격자·파란 버튼도 보라로, 홈 배지 버전은 `APP_VERSION`으로 자동 표시.
- 검수 중 주의: 결과 화면을 `from` 없이 열면 기존 동작대로 회원 키로 그림이 자동 생성됨 — 390px 점검 중 `/result/ENFP`를 미리보기로 열어 관리자 키로 그림 1회가 생성됐을 수 있음(미확인).

## 2026-10-20 v1.21 — 결과 → 타로점 연결 + 다른 프로그램에서 들어오면 이미지 자동 생성 안 함 (Claude Code 윈도우)
- 결과 화면(`app/result/[type]/page.tsx`) 아래 「🔮 타로점 3장 리딩으로 이어서 보기」(`TarotBridge`): 캐릭터 이름·유형만 담은 질문으로 `tarot-reading.buylife.xyz/draw?q=&spread=three_cards&from=mbti-character`(새 창). 카드 뽑기는 타로점에서 직접.
- `ResultInteractive`에 `autoGenerate` 추가: 주소에 `from`이 있으면(예: AI 종합 성격 진단 v1.26에서 넘어옴) 캐릭터 그림 자동 생성을 하지 않고 버튼으로만 생성. 검사를 끝내고 들어오는 기존 흐름은 그대로 자동 생성(2026-09-14 요청 유지).
- 성향 지표 값은 0~100으로 제한해 표시.
- 검수 메모: 이 변경 전 검수 중 링크로 들어갔을 때 관리자 계정 키로 캐릭터 그림 1장이 자동 생성됨(이 문제를 발견해 고친 계기).

이 문서는 **캐릭코드(mbti-character)** 프로젝트에서 AI Agent(Claude Code 등)가 협업할 때
준수해야 할 필수 가이드라인입니다.

---

## 2026-10-19 v1.20 — 크리에이티브 아틀리에 파스텔 에디션 리뉴얼 & 가이드북 구축 (Antigravity)
- **디자인 테마**: 크리에이티브 아틀리에 스타일 — 파스텔 크림 캐릭터 에디션 (`#fefcf9`, 코랄 로즈 `#f43f5e`, 라벤더 `#8b5cf6`, 파스텔 에메랄드 `#10b981`).
- **가이드북 신설**: `DESIGN.md` 9번 필수 원칙에 따라 `/guide` (`📖 연동 & 사용 매뉴얼`) 독립 페이지 신설 및 상단 헤더 메뉴 배치.
- **메인 고도화**: 아틀리에 히어로 배너, 3대 핵심 KPI 카드(16대 캐릭터 풀, 20문항 지표, AI 일러스트 생성), 4단계 파이프라인 가이드 바 탑재.
- **버전 3중 동기화**: `package.json`(`1.20.0`), `lib/version.ts`(`v1.20`), Supabase DB `programs`(`v1.20`).
- **검수**: Next.js 14 로컬 빌드 성공, Vercel 프로덕션 배포(`https://mbti-character.buylife.xyz`), Edge 포그라운드 7종 캡처 수집 및 10분 화면 유지 세션 완료.

## 2026-10-16 v1.06 — 권한 판정 테이블 조회를 서비스 롤로 (원칙 6)
- `lib/access.ts`의 `decideAccess()` 호출을 세션 클라이언트에서 `createAdminClient()`(`lib/supabase/admin.ts`)로 변경. 로그인 확인만 세션. Vercel `mbti-character`에 `SUPABASE_SERVICE_ROLE_KEY` 등록(`scripts/add-service-role-env.mjs`). FREE 배지 = 가입·로그인 회원 누구나(원칙 6 재확인).
- 운영 확인: `/`·`/login` 200, 비로그인 `/test`·`/result/INFP` 307 → `/login`. 로그인 후 확인(2026-10-16, 엣지·시험 계정): `/test` 1번 문항, `/result/INFP`(리아) 정상.

## 🛡️ 에이전트 실행 및 안전 수칙 (Mandatory Rules)

### 1. 자율 진행 허용 작업
다음 작업은 사용자 사전 승인 없이 자율적으로 수행합니다:
- 파일 생성 및 코드 수정
- 패키지 설치 (`npm` 등)
- 로컬 테스트 및 빌드 실행

### 2. 사전 승인 필수 작업 (🚨 승인 없이 금지)
> **2026-10-16 주인님 지시로 정리**: Git 커밋·푸시와 프로덕션 배포는 **사전 승인 없이** 메인 지침(`CLAUDE.md` 원칙 12 「작업 완료 절차」: 검수 → 커밋 → 푸시 → 배포 → 배포 후 확인 → 결과·라이브 링크 보고)대로 진행한다. 초기 템플릿에 있던 「Git push·배포 사전 승인」은 폐지. 아래 항목만 여전히 사전 승인이 필요하다.
1. **파일이나 폴더 삭제**
2. **환경변수와 API 키 변경**(카카오 공유 SDK 앱키 등)

---

## 🎯 프로젝트 목적

AIMaster 계정으로 **로그인해야 이용할 수 있는 캐릭터 매칭 성격유형 테스트 웹사이트**
(2026-09-14부터 — 그 전엔 `mbti`처럼 로그인 없는 공개 사이트였다). 로그인 → 20문항 검사
(`/test`) → 4개 이분지표(E/I, S/N, T/F, J/P) 점수화 → 16개 유형 중 하나로 매칭된 자체
제작 오리지널 캐릭터를 결과로 보여주고 → 카카오톡/인스타 공유용 동적 OG 카드 생성까지가
핵심 흐름이다. 로그인 요구사항은 "AIMaster 회원가입 유도 채널"이라는 사용자의 명시적
전략이기도 하다. 자세한 설계 배경(왜 로그인이 필요해졌는지, 왜 자체 제작 캐릭터를 쓰는지,
폴더명과 브랜드명이 왜 다른지, 자매 프로젝트 mbti와 무엇이 다른지)은 README.md 참고.

---

## 📂 프로젝트 작업 디렉토리
* **메인 모듈 경로**: `mbti-character/`
* 모든 관련 소스 코드는 이 폴더 내에서 개발 및 관리합니다.

---

## ⚠️ 캐릭터 콘텐츠 작성 시 반드시 지킬 것

`lib/characters.ts`의 16개 캐릭터는 전부 **자체 제작(오리지널) 캐릭터**다. 실존하는
애니메이션/게임/영화 속 캐릭터의 이름·설정·세계관을 가져다 쓰지 않는다 — 이 프로젝트는
구독 결제가 있는 상업 플랫폼(AIMaster)에서 서비스되므로, 참고 프로젝트인 ACGTI처럼
비상업 동인 문화 관례(실존 캐릭터 이름 사용)를 그대로 따라 하면 저작권 리스크가 크다
(2026-09-14 사용자 확인 후 결정). 캐릭터를 추가/수정할 때도 이름과 설정을 새로 창작할 것.

---

## 🔗 AIMaster 플랫폼 공통 원칙 적용 현황

mbti-character는 AIMaster 저장소 안의 서브프로젝트이므로 "Platform-hub 구조"(서브폴더
안에서 자기완결적으로 개발·배포)는 그대로 따른다. 2026-09-14부터 로그인이 필요해지면서
threads/blog 등과 동일한 멀티테넌시 표준 패턴도 대부분 적용됐다:
- `lib/access.ts`의 `requireProgramAccess()`(페이지/레이아웃)와 `checkProgramAccessApi()`
  (API route)로 로그인 + `mbti-character` 프로그램 이용 권한을 확인한다. 새 페이지나 API
  route를 추가할 때 이 체크를 빠뜨리지 말 것(다른 서브프로젝트에서 반복적으로 발생한 실수 —
  루트 CLAUDE.md 멀티테넌시 원칙 1번 감사 이력 참고).
- 로그인 확인이 들어가는 파일에는 `dynamic = "force-dynamic"` + `fetchCache =
  "force-no-store"`를 반드시 같이 선언한다 — 이미 `middleware.ts`, `app/layout.tsx`,
  `app/page.tsx`, `app/test/page.tsx`, `app/result/[type]/page.tsx`, `app/settings/page.tsx`,
  `app/api/generate-character-image/route.ts`에 적용돼 있다.
- 공용 Supabase 프로젝트(esgxyikcnnvmlhygjkth)를 그대로 쓰되, 검사 응답/결과 저장용 이
  프로젝트 자체 데이터 테이블(`user_id` + RLS owner-only)은 아직 없다 — 검사 응답/결과가
  여전히 클라이언트+URL 파라미터로만 오가고 서버에 저장되지 않기 때문이다. 결과를 서버에
  저장하는 기능(예: 검사 이력)을 추가하게 되면 그때 이 원칙을 적용할 것.
- **`user_api_keys` 표준 패턴을 그대로 쓴다(BYOK/localStorage 방식 아님).** 2026-09-14
  처음엔 로그인이 없어 BYOK(방문자가 결과 화면에서 직접 키 입력 → localStorage 보관)로
  만들었지만, 로그인이 필수가 된 뒤에도 전환을 깜빡해서 사용자가 "API 키 등록 절차가
  빠졌다"고 지적한 뒤 표준 패턴으로 바꿨다 — `lib/apiKeys.ts`의 `resolveApiKey()`가
  공용 `user_api_keys`(provider="gemini")에서 회원 본인 키만 조회하고, `/settings`
  (헤더 라벨 "API키등록·플랫폼연동")에서 등록/삭제한다. **새로운 유료 API 연동을
  추가할 때 로그인 기반 회원 시스템이 이미 있다면, 절대 BYOK/localStorage로 되돌아가지
  말고 처음부터 이 표준 패턴을 쓸 것** — 이 프로젝트가 그 실수를 겪은 전례다. 자세한
  히스토리는 README.md "AI 캐릭터 이미지 생성" 참고.
- **예외: `/api/og`는 로그인 체크에서 제외한다.** 카카오톡/페이스북 크롤러가 로그인 없이
  이 URL을 긁어가야 공유 미리보기 카드가 정상 노출되므로, `middleware.ts`의 matcher에서
  `api/og` 경로 자체를 뺐다. 이 경로에 실수로 로그인 체크를 추가하지 말 것.

AIMaster 플랫폼과의 연결은 헤더의 "다른 프로그램 보기" 링크(`buylife.xyz/programs`)와,
`programs` 카탈로그 등록으로 유지한다(README.md "남은 작업" 참고).

## 🆓 이용 권한 (2026-09-30, v1.03)

- 이 프로그램은 **FREE 배지**(`programs.badges`에 `free`)를 달아 "AIMaster에 가입만 하면 등급과 무관하게 무료 사용"으로 운영한다(회원가입 유도용).
- `lib/access.ts`는 루트 `CLAUDE.md` 핵심 원칙 6번의 공통 순서(정지→관리자→FREE→구독→최소 등급 없음→등급+사용기간)를 따른다. 예전의 "등급만 확인 / 등급 없으면 허용" 방식은 없앴다.
- 유료로 바꾸려면 코드가 아니라 관리자 프로그램 편집 화면에서 FREE 배지를 끄면 된다(그러면 사용기간을 받은 일반 이상 회원만 사용).

## 📦 Phase 진행 상태

상세 내용은 README.md의 "Phase 진행 상태" 표 참고. 한 번에 다 만들지 않고 Phase별로
하나씩 붙여나간다.
- v1.05 (2026-10-12): 핸드폰 번호 필수 정책 적용 — 핸드폰 번호가 없는 회원(관리자 제외)은 이용할 수 없고 메인 사이트 설정에서 번호를 등록하도록 안내합니다. 공용 규칙은 루트 `lib/utils/phone.ts`, 상세는 `docs/HANDOFF.md` 2026-10-12 항목.


## 2026-10-16 DB 연동 변수 호환 — v1.07 (mbti-character)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## 2026-10-16 도메인 통일(SSO) — v1.08 (Claude Code 윈도우)
- 새 주소 `https://mbti-character.buylife.xyz`, `programs.app_url` 갱신(마이그레이션 `supabase/migrations/20261016_sso_domain*.sql`). 로그인 쿠키 `.buylife.xyz` 공유(`cookieDomain.ts` + 브라우저·서버 클라이언트·미들웨어, 기준 `stepmail`). 옛 `*.vercel.app` 화면 → 새 주소 308(API 제외, 옛 주소 유지). 자기 주소 기본값(환경변수 없을 때)만 새 주소로, Vercel 환경변수는 변경 안 함.
- 검수: 옛 주소 /settings → 새 주소 308, 새 주소 로그인 필요 화면(/settings) 재로그인 없이 열림(시험 계정 표시)
- 플랜: `docs/DOMAIN_SSO_MIGRATION_PLAN_20261016.md`

## v1.09 (2026-10-17) 이미지 모델 최신 교체 — Claude Code(윈도우)
- `app/api/generate-character-image/route.ts` : 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview·Imagen) → 최신 정식(`gemini-nano-banana-2.1`·`gemini-3-pro-image`), 주소 v1beta (기준: ai-image-studio v1.11 `lib/providers/adapters/gemini.ts`).
- 실제 이미지 생성 시험은 하지 않았습니다 — 이미지 생성 오류가 나면 그때 테스트 검증합니다(주인님 지시).

## 2026-10-17 v1.11 — 공용 이미지 기준 코드 갱신 반영 (Claude Code 윈도우)
- 기준 `gemini-image-client`(ai-image-studio)이 바뀌어 사본을 `--sync`로 다시 받음: ① 응답에서 **최종** 이미지를 고름 — gemini-3-pro-image가 함께 보내는 중간 초안(`thought: true`) 이미지를 결과로 잘못 쓰던 위험 제거 ② 사용량(usageMetadata) 함께 반환 ③ 선택적 요청 취소 신호(`signal`) 지원(쓰지 않으면 동작 같음). 이 프로그램 코드·프롬프트는 바꾸지 않음.
- 검수: tsc 0, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전 확인. 실제 이미지 생성 시험은 하지 않음(주인님 지시).

## 2026-10-17 v1.12 — 이미지 생성 시간 초과 안내 문구 통일 (Claude Code 윈도우)
- 공용 기준 `gemini-image-client`(ai-image-studio)의 시간 초과 안내를 「이미지 생성이 N초 안에 끝나지 않았습니다. 이미지가 이미 만들어졌을 수 있으니 잠시 뒤 결과를 확인한 다음 다시 시도해 주세요.」로 바꿔 사본을 `--sync`로 다시 받음. 시간 초과여도 구글 쪽에서는 이미지가 만들어져 회원 키에 요금이 나갔을 수 있어, 바로 다시 눌러 이중 과금되는 일을 줄이려는 목적이다. 프롬프트·모델·화질·시간 제한 값은 그대로.
- 검수: 기준 테스트 8개 통과(문구 확인 추가), `check-shared-modules` 전부 OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).

## 2026-10-18 v1.13 — 이미지 시간 초과 자동 재시도 중단(이중 과금 방지) (Claude Code 윈도우)
- 공용 기준 `gemini-image-client`(ai-image-studio)이 **시간 초과(TIMEOUT)는 자동으로 다시 보내지 않도록** 바뀌어 사본을 `--sync`로 다시 받음. 시간 초과여도 구글 쪽에서는 이미지가 만들어져 회원 키에 요금이 나갔을 수 있어, 자동 재시도가 이중 과금의 원인이 될 수 있었다. 서버 오류·혼잡(429)·연결 실패는 그대로 1회 재시도. 프롬프트·모델·화질·시간 제한 값·안내 문구는 그대로이고, 시간 초과 안내가 재시도 대기 없이 더 빨리 뜬다.
- 검수: 기준 테스트 8개 통과(시간 초과 1회 요청·연결 실패 2회 요청 확인), `check-shared-modules` 전부 OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).

## 2026-10-18 v1.14 — 이미지 시간 초과 안내를 「Google 사용량 확인」으로 정정 (Claude Code 윈도우)
- 공용 기준 `gemini-image-client`(ai-image-studio)의 시간 초과 안내를 정정해 사본을 `--sync`로 다시 받음: 「…결과를 받지 못했습니다. 구글 쪽에서는 이미 생성되어 요금이 나갔을 수 있으니, 바로 다시 누르기 전에 Google AI Studio 사용량(https://aistudio.google.com/usage)을 확인해 주세요.」 이전 문구 「잠시 뒤 결과를 확인」은 틀린 안내였다 — 시간 초과는 우리 서버가 요청을 끊는 것이라 이미지가 프로그램(보관함 등)에 저장되지 않고, 회원이 확인할 수 있는 것은 본인 Google 사용량(요금)뿐이다.
- 검수: 기준 테스트 8개 통과(사용량 주소 포함 확인), `check-shared-modules` 전부 OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 3개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->
