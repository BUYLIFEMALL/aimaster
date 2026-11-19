# AI 무료 이미지 자동화 (`free-image-studio`) — 작업 지침

> 먼저 루트 [`CLAUDE.md`](../CLAUDE.md)·[`AI_TEAM_RULES.md`](../AI_TEAM_RULES.md)를 읽는다. 이 프로그램은 운영(AIMaster) 프로젝트다.
> 담당: [역할: ecommerce-image] Claud(ecommerce) `CC-ECOM-01` · 지휘 Codex(Master) · 일반 검수 맥미니 `CX-QA-01` · 로컬 모델 실기 Admin PC.

**지금 상태(2026-11-19)**: 5-1 기초(뼈대·접근 판정·고지·문서)와 5-2 엔진 연결 계층(화면 없음, 모의 엔진 시험)까지 있다. **미배포·미등록·미설치**(Vercel 프로젝트·도메인·`programs` 등록·`npm install` 모두 아직 없음). 등록 전에는 판정이 `not_found`라 관리자도 들어오지 못한다.

개발 플랜(기준 문서): [`docs/analysis-free-image-automation-20261119/P1_WEB_PLAN.md`](../docs/analysis-free-image-automation-20261119/P1_WEB_PLAN.md) · 이 폴더 안내 [`docs/PLAN_20261119_P1_WEB.md`](docs/PLAN_20261119_P1_WEB.md)

## 1. 사용 목적·대상

블로그·상품·썸네일용 그림이 여러 장 필요한 회원이, 용도를 고르고 설명을 여러 줄 맡기면 **내 PC가 그려서 폴더에 모아 주는** 프로그램. 그림 생성에는 API 키 0개·유료 호출 0건이 목표다. 한글 설명을 영문으로 바꾸는 AI 변환은 회원이 켜는 선택 기능이며 회원 본인 키만 쓴다.

## 2. 도구·기술

Next.js 16(App Router) · React 19 · Tailwind 4 · Supabase SSR(공용 DB, 새 표 없음). 그림은 브라우저가 회원 PC의 로컬 엔진(`http://127.0.0.1:47821`, `free-music-studio/engine`)에 직접 요청한다. 시험은 `node --test`(Node 22.18 이상의 타입 제거 실행, 추가 도구 없음).

## 3. 핵심 기능·구조·장단점

| 있는 것(5-1) | 위치 |
|---|---|
| 이용 권한 판정(정지 → 관리자 → 핸드폰 → FREE → 구독 → 등급+사용기간) | `src/lib/programAccess.ts`(루트 판정의 사본, `emotion-writer` 사본과 같은 내용) · `src/lib/access.ts` · `src/lib/accessDecision.ts`(보낼 곳·오류를 정하는 순수 함수) |
| 작업 화면 레이아웃(권한 판정 + 캐시 금지 2줄 + 검색 제외) | `src/app/(dashboard)/layout.tsx` |
| 로그인(공용 쿠키 `.buylife.xyz`) | `src/app/login/`, `src/lib/supabase/`, `src/lib/actions/auth.ts` → `src/lib/loginFlow.ts`(돌아갈 곳은 `safeInternalPath` 한 곳에서만 검증) |
| 세션 쿠키 갱신 | `src/proxy.ts` → `src/lib/sessionProxy.ts`(갱신된 쿠키를 같은 요청의 다음 단계로 전달, 응답에 Set-Cookie와 `private, no-store` 캐시 헤더) |
| 좌측 메뉴·767px 이하 위쪽 접는 메뉴 | `src/components/Sidebar.tsx`, `src/app/globals.css` |
| 엔진 연결 계층(화면 없음) | `src/lib/engine.ts` — 고정 루프백 주소, 회원 번호별 토큰·접수 기록, 이전 토큰으로 범위 이어받기, 접수 번호를 먼저 적고 보내기, 응답 유실 때 같은 번호로 확인(`confirm`)·다시 보내기(`resend`), 회원 전환·연결 해제 뒤 응답 버리기 |
| 저작권 고지 · 저장공간 위젯 한 줄 | `NOTICE`, `public/ai.txt`, `public/robots.txt`, `src/app/layout.tsx` |

아직 없는 것: 시작하기·만들기·작업 기록·설정·매뉴얼 화면, 한글 변환 API. 엔진 연결 계층을 부르는 화면이 아직 없다. 순서와 완료 기준은 플랜 6절.

지킬 것:
- 새 페이지는 `(dashboard)/` 아래에 두어 레이아웃 판정을 받게 하고, 쓰기 작업을 하는 API·Server Action은 각각 `checkProgramAccessApi()`·`requireProgramAccess()`를 직접 부른다. API 파일에는 `dynamic = "force-dynamic"`·`fetchCache = "force-no-store"` 두 줄.
- 그림·설명·참조는 서버에 올리지 않는다. 서버가 하는 일은 권한 판정과 (나중의) 변환 API 하나뿐이다.
- 운영자·다른 회원 키 폴백 금지. 이 프로그램에 API 키 입력 칸을 새로 만들지 않는다(메인 사이트 `/api-settings` 공용).
- **주인님 결정 전 항목은 코드·설정에 넣지 않는다**: 사양 지원 문구, 한글 변환의 기본 모델, FREE 배지·요금. `tests/access.test.mjs` 마지막 시험이 지킨다.
- 세션 쿠키와 로그인 뒤 이동은 `sessionProxy.ts`·`loginFlow.ts` 본체만 고친다. `proxy.ts`·`actions/auth.ts`에 쿠키 처리나 경로 검사를 따로 넣지 않는다(시험이 막는다).
- 엔진 호출은 `src/lib/engine.ts`만 거친다. 화면에서 `fetch`로 엔진 주소를 직접 부르지 않는다. 결과를 모르는 접수(`unknown`)는 새 접수 번호로 다시 넣지 않고 `confirm()`부터 한다(중복 그림 방지).
- 엔진 계약이 바뀌면 `tests/engine.test.mjs`의 「계약 대조」 시험이 먼저 깨진다. 그때는 엔진 소스를 다시 읽고 `engine.ts`·`tests/mockEngine.mjs`를 함께 맞춘다.
- `src/lib/programAccess.ts`는 사본이다. 규칙을 고칠 일이 있으면 루트 기준과 함께 고친다(이 파일만 고치지 않는다).

## 4. 버전·변경 기록

| 버전 | 날짜 | 내용 |
|---|---|---|
| `v1.01`(미배포) | 2026-11-19 | 5-1 기초: 폴더·뼈대·접근 판정·고지·문서. 맥미니 검수 P2 세 건 보완(쿠키 갱신 전달·캐시 헤더·로그인 뒤 이동 경로 검증 일원화). 시험 14개 통과. 설치·빌드·배포·DB 등록 없음 |
| `v1.01`(미배포) | 2026-11-19 | 5-2 엔진 연결 계층 `src/lib/engine.ts`와 모의 엔진 시험 17개(전체 31개). 엔진 실행·변경 없음 |

## 5. 남은 일

[`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md). 다음 첫 단계는 5-3(시작하기·만들기·작업 기록 화면)이며 Master 배정 뒤 시작한다.

## 6. 다른 프로그램과의 연계

- `free-music-studio/engine`: 같은 로컬 엔진. 새 그림 사이트용 범위(별도 토큰·대기열·결과 폴더)는 엔진 `e8e52b505`에 들어 있고, 출처 등록과 설치판 새 버전은 7단계다.
- `ai-image-studio`: 엔진 연결 코드(`lib/localEngine.ts`)를 사본으로 받아 확장할 예정.
- `emotion-writer`: 3사 글 모델 호출·모델 목록·본인 키 읽기를 검수된 부분만 사본으로 받을 예정(공용 기준 코드 등록은 하지 않음, Master 결정).
- 연계 아이디어(바나나 캔버스·상세페이지로 보내기)는 [`docs/IMPROVEMENTS.md`](docs/IMPROVEMENTS.md).

## 7. 디자인

플로우 위저드(시작하기) + 포커스 스튜디오(만들기·기록), 다크 기본. 지금은 임시 토큰만 있다. 템플릿 이름·토큰 확정과 기록은 화면 구현 단계에서 [`docs/DESIGN_HANDOFF.md`](docs/DESIGN_HANDOFF.md)에 한다.

## 확인 명령

```bash
node --test tests/*.test.mjs                              # 설치 없이 실행됨
node ../scripts/apply-source-notice.mjs --check free-image-studio
```

`tsc`·`npm run build`는 `npm install` 뒤에 한다(설치는 Master 배정·주인님 승인 범위에서).
