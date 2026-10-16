# 페르소나 문체 자동화 — 인수인계 (AGENTS.md)

> 다른 CLI(Codex·Gemini·다른 Claude 세션)가 대화 없이 이어서 작업할 수 있도록 쓴 문서입니다. 작업 전에 루트 `CLAUDE.md`, `docs/HANDOFF.md`, `docs/ERROR_LESSONS.md`를 먼저 읽습니다. 작업 기록은 아래 "작업 기록"에 **추가만** 합니다.

## 1. 한눈에 보기
| 항목 | 값 |
|---|---|
| 이름 / slug | 페르소나 문체 자동화 / `persona-style-studio` |
| 현재 버전 | **v1.05** (`src/lib/version.ts` = `package.json` = DB `programs.version`) |
| 라이브 | https://persona-style-studio.buylife.xyz (옛 `persona-style-studio.vercel.app` 유지) |
| Vercel | 팀 `buylife`, 프로젝트 `persona-style-studio` (CLI 업로드 배포) |
| 배지·카테고리 | FREE + new, Tools, 최소 등급 일반, 요금제 1·2·3개월(1만/2만/3만원) 등록 |
| 스택 | Next.js 16 · React 19 · Tailwind 4 · Supabase · `@google/genai` |
| AI 모델 | `gemini-2.5-flash` (`src/lib/gemini.ts`의 `GEMINI_TEXT_MODEL` 한 줄, thinking 끔 → 응답 약 1~3초) |
| 비용 | **회원 본인의 Gemini 키**로 서버에서 호출 → 운영자 비용 없음 → 프리미엄 후보 아님 |
| 참고 원본 | prompt-equalizer.vercel.app (HTML·번들 전체 분석, 구조·동작만 참고, 기본 페르소나·샘플·프리셋 문구는 새로 작성) |

## 2. 무엇을 하는 프로그램인가
글을 넣고 창의성·명확성·감정 깊이·길이·전문성 5개 슬라이더(프리셋 8종)와 캐릭터 페르소나(말투·세계관·문체)로 문체를 바꿔 다시 써 준다. 화면은 3단: 왼쪽 페르소나 / 가운데 집필 캔버스 / 오른쪽 이퀄라이저·프리셋.

## 3. 구조
```
src/lib/persona/types.ts     타입·상수(EQ 키, 한도, 라벨)
src/lib/persona/data.ts      프리셋 8·기본 페르소나 10·샘플 5 (ko/en) — 문구는 직접 작성
src/lib/persona/prompt.ts    값 보정, 길이→분량 비율, 다시쓰기/페르소나 생성 프롬프트(연도 지침 포함), JSON 파싱
src/lib/gemini.ts            회원 키로 Gemini 호출 + 오류를 한국어 문구로 변환
src/lib/apiKeys.ts           user_api_keys(provider=gemini) 읽기/저장 — 본인 키만, 폴백 없음
src/app/api/rewrite          글 다시쓰기(권한→본인 키→8,000자 제한)
src/app/api/persona-generate 이름·역할로 페르소나 상세 자동 생성(JSON)
src/app/api/personas         내 페르소나 목록/저장/삭제(기본 페르소나 수정값 + custom-… ), 최대 custom 100개
src/app/api/drafts           초안 목록/저장/삭제, 최대 200개
src/app/api/user-key         Gemini 키 상태(마스킹)/저장
src/components/studio/*      StudioWorkspace(상태·API 연결), PersonaPanel, CanvasPanel, EqPanel, EqSlider, i18n
src/components/settings/ApiKeySettings.tsx   API키등록·플랫폼연동 + 📖 연동 매뉴얼 팝업(platform_guides f442cd37…)
supabase/migrations/0001_persona_style_tables.sql  테이블·RLS, 0002_register_program.sql  프로그램 등록
tests/persona.test.mjs · access.test.mjs   `npm test` 14개 통과
```
- 접근 판정은 `image-convert-studio`와 같은 핸드폰 확인 포함 코드(정지 → 관리자 → 핸드폰 → FREE → 구독 → 등급+부여). 모든 API route는 `checkProgramAccessApi()` + `dynamic/fetchCache` 두 줄 선언.
- 사이드바 표준: ← 다른 프로그램 보기, 번호 흐름(1 집필 스튜디오), API키등록·플랫폼연동, 사용 안내, 계정·로그아웃이 마지막 메뉴 바로 아래.

## 4. DB (공용 Supabase `esgxyikcnnvmlhygjkth`)
- `persona_style_personas` (user_id, persona_key, name, role, description, avatar, lore, voice, style, eq_values jsonb, UNIQUE(user_id, persona_key)) — RLS owner-only. 기본 페르소나를 고치면 persona_key=`persona-…` 행이 생기고(초기화=삭제), 직접 만든 것은 `custom-…`.
- `persona_style_drafts` (user_id, title, content, eq_values, persona_key) — RLS owner-only.
- 서버는 service role로 쓰되 **항상 user_id로 필터**한다.

## 5. 동작 메모 (원본과 다르게 한 점)
- 키: 원본은 브라우저 localStorage(base64)+브라우저에서 직접 호출 → 우리는 서버 호출·DB 저장(본인 키만). 키 없으면 `needKey` 응답 → "API 키 등록이 필요합니다" 팝업.
- 저장: 원본의 로컬 폴더 파일 → 계정 DB + 내보내기/가져오기(JSON) + 초안은 `.txt` 다운로드도 함께.
- 길이 슬라이더는 원문 대비 분량 비율(0→30%, 50→100%, 100→200%)로 프롬프트에 명시. 입력은 `<original_text>` 태그로 감싸 지시문으로 오해하지 않게 함. 당해 연도(2026) 지침 포함.
- 원본의 하단 가짜 값(TOKENS 420/4096, LATENCY 12ms)은 만들지 않고 실제 입력 글자 수·마지막 응답 시간만 표시.
- 결과는 캔버스 글을 덮어쓰고(원본과 같음) **되돌리기** 버튼으로 직전 글 복원(원본에 없던 추가).

## 6. 배포·운영 절차
1. `npm test` → `npm run build`. 2. 버전 +0.01(`src/lib/version.ts`의 `APP_VERSION` **줄만** — 주석의 "v1.01 형태" 문구를 바꾸지 않게 주의) + `package.json` + DB `update programs set version='vX.YY' where slug='persona-style-studio'` + 이 문서·README 기록. 3. `cd persona-style-studio && vercel deploy --prod --yes --scope buylife`. 4. 경로를 지정해 커밋(`git commit -- persona-style-studio …`) 후 `git push origin master`. 5. 라이브를 새로고침해 사이드바 버전 확인.
- 환경변수 4개(Supabase URL/ANON/SERVICE_ROLE, `NEXT_PUBLIC_MAIN_SITE_URL`)는 `scripts/add-persona-style-vercel-env.mjs`로 production에 등록 완료.

## 7. 알려진 한계·남은 일
- 화면 검수(2026-10-13, 일반 회원 `buylifemall@naver.com` 실제 Chrome): 접근 판정 통과, 페르소나 만들기+**AI 자동 생성**(본인 키)+저장, 내보내기(JSON 내용 확인)·가져오기(기본 페르소나 수정본+새 인물)·초기화·삭제, 초안 저장(txt 다운로드 내용 확인)·불러오기 모달·초안 반영, English 전환(전 영역), 키 없음 팝업(응답을 흉내 내 확인 — 이 계정은 키가 등록돼 있어 실제 미등록 상태는 못 봄), 슬라이더 **마우스 드래그**(85→21)·키보드·프리셋 선택/해제, 모바일 폭(390px) 가로 넘침 없음. 시험 데이터는 모두 삭제함.
- 슬라이더는 Pointer Events(마우스 드래그 확인)와 키보드를 지원하지만 실제 **터치 기기**에서는 시험하지 못했다.
- 결과 비교(원문/결과 나란히)는 만들지 않았다(되돌리기만).
- 모델 응답이 매우 길면 Vercel 함수 기본 시간 안에 끝나는지(8,000자 입력 + 긴 출력) 점검 필요.

## 8. 작업 기록 (추가만)
- **2026-10-13 v1.01** 신규 구축·배포·프로그램 등록·도메인 연결, 테이블 마이그레이션 적용.
- **2026-10-13 v1.02** Gemini thinking 끔(응답 약 20초 → 1~3초), 페르소나 패널 머리글 줄바꿈 수정. 썸네일 생성·등록(관리자 Gemini 키 1회 사용, 임시 파일 삭제).
- **2026-10-13 v1.03** 일반 회원 화면 시험 결과 반영: 내보내기 파일 날짜를 한국 날짜로, 페르소나 패널을 화면 높이 안으로 제한(수정 패널의 저장 버튼이 화면 밖으로 밀리던 문제).
- **2026-10-13 v1.04** 페르소나 패널 높이를 `100vh-7rem`으로 더 줄여 스크롤 없이 수정 패널의 저장 버튼이 보이게 함(확인 완료).


## B5 (2026-10-15) — 한국 시간 현재 월 기준 추가 (v1.05)

- 주 생성·분석 지침에 한국 시간 기준 현재 연·월을 반영하고, 계절·시기 표현은 현재 월에 맞추며 불필요한 계절·연도 표현을 덧붙이지 않도록 했습니다.


## 2026-10-16 DB 연동 변수 호환 — v1.06 (persona-style-studio)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.
