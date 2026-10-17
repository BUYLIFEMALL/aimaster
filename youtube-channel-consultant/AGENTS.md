# YOUTUBE CHANNEL CONSULTANT — AI 에이전트 인수인계 문서 (AGENTS.md)

> # ★★★ 최상위 절대 불변 규칙 (2026-10-09 주인님 지시)
> **모든 사용자는 본인의 계정과, 본인이 사용할 본인 API 키(YouTube Data API v3, 이후 AI 키)를 각각 직접 등록·연동해서 사용한다.**
> 운영자(주인님)나 타인의 키로 대신 처리하지 않으며, 키가 없으면 "본인 키를 등록해주세요"로 안내한다. 상세: 루트 `docs/TOP_RULE_PERSONAL_ACCOUNT_API.md`.

작업 전에 루트 `CLAUDE.md`, `docs/HANDOFF.md`, `docs/ERROR_LESSONS.md`, `docs/SIDEBAR_LAYOUT_STANDARD.md`를 먼저 읽는다.

## 1. 개요와 현황
- 프로그램명 `YOUTUBE CHANNEL CONSULTANT` / slug `youtube-channel-consultant` / 현재 버전 **v1.03** (`src/lib/version.ts`, `package.json`, DB `programs.version`, 마이그레이션 SQL 모두 같이 올린다)
- 주소: https://youtube-channel-consultant.buylife.xyz (Vercel 프로젝트 `buylife/youtube-channel-consultant`, 별칭 `youtube-channel-consultant.vercel.app`)
- 기술: Next.js 16 + React 19 + Tailwind 4 + Supabase SSR(공유 DB `esgxyikcnnvmlhygjkth`). 외부 차트 라이브러리 없음(CSS 차트).
- 기획 배경: 외부 참고 프로그램(AI Studio 앱 "유튜브 채널 컨설턴트")의 기능 흐름을 참고해 새로 만들었다. 이름·디자인은 복제하지 않았고 화면은 흰색 바탕(`docs/PLATFORM_PATTERNS.md` §27-1).
- 기반 코드: `youtube-viral-studio`(로그인·권한·키 저장 구조)를 복사해 시작했다.

## 2. 단계별 범위
| 버전 | 내용 | 상태 |
|---|---|---|
| v1.01 | ① 채널 분석 ② 키워드 분석 (+ JSON/CSV 내보내기) | **완료·배포** |
| v1.02 | AI 분석: 영상 요약, 경쟁 전략, 성장 과정, 채널 진단 (회원 본인 Gemini/OpenAI/Claude 키) | **완료·배포** |
| v1.03 | 공략 채널 찾기 (소형 고효율 채널 발굴) | **완료·배포** |

## 3. 화면과 파일
- `/dashboard` 대시보드(키 연동 상태·쿼터 안내), `/channel-analysis`, `/keyword-analysis`, `/settings`(API키등록·플랫폼연동 + 📖 연동 매뉴얼 박스), `/login`
- `src/lib/youtube/client.ts` YouTube API 호출(쿼터 계산 `QuotaMeter`, `cache: "no-store"`), `analysis.ts` 채널·키워드 분석, `metrics.ts` 인기 점수·쇼츠 추정·업로드 주기·포맷터, `types.ts`
- `src/app/api/youtube/{channel,keyword}/route.ts` — 로그인 + 프로그램 이용 권한(`checkProgramAccessApi`) + 본인 키 확인 후 분석
- `src/lib/access.ts`(권한 확인) ← `src/lib/programAccess.ts`(루트 `lib/access/checkProgramAccess.ts`의 **사본**, 규칙이 바뀌면 같이 고칠 것)
- `src/components/analysis/` 차트·영상 목록·공통 부품, `src/components/layout/Sidebar.tsx`(모바일 상단 바 포함)

## 4. 지표 정의 (화면에도 표시)
- **인기 점수** = 조회수 60% + 좋아요 25% + 댓글 15%를 조회된 영상 안의 최고값 대비 0~100으로 환산. 좋아요·댓글이 모두 비공개이면 그 항목을 빼고 나머지 비중을 다시 나눈다. **조회된 영상끼리의 상대 점수**다.
- **쇼츠 구분은 추정**: 60초 이하이거나, 180초 이하이면서 제목·설명·태그에 `#shorts`. YouTube API는 쇼츠 여부를 알려주지 않는다.
- **채널 분석 범위는 최근 업로드 50/100/200개**다(채널 전체가 아니다). 구독자·총 조회수·영상 수는 YouTube 채널 정보 그대로. 구독자 비공개는 `null`("비공개"), 0으로 계산하지 않는다.
- 채널 개설일이 2005년 이전으로 오면(예: 공식 채널의 1970년 값) "-"로 표시한다.
- 입력에 없는 정보를 "분석 결과"로 만들지 않는다(`docs/PLATFORM_PATTERNS.md` §30 "가짜 분석 금지").

## 5. YouTube 쿼터
- `search.list` 100유닛(키워드 검색 1페이지 = 50개, 채널 이름 검색), 나머지 목록 조회 1유닛(채널/영상/재생목록).
- 채널 분석: @핸들·주소·ID 입력 ≈ 1 + 영상 50개당 2유닛, 이름 입력은 +100. 키워드 분석: 페이지당 100 + 약 2~3.
- 화면에 예상 쿼터와 실제 사용량을 표시한다. 필터·정렬은 이미 받은 데이터에서만 처리해 쿼터를 쓰지 않는다.
- 분석 결과는 **서버에 저장하지 않는다**(YouTube API 데이터 30일 보관 제한 문제 없음). 보관함을 만들 때는 30일 후 삭제 + 남은 일수 표시가 필요하다.

## 6. 권한·키 규칙 (그대로 유지)
- 모든 API route와 레이아웃에 `dynamic = "force-dynamic"` + `fetchCache = "force-no-store"`.
- 등록 시 `programs.badges`에 `free` 없음(유료/승인제), 최소 등급 `일반`. 사용하려면 결제 구독 또는 관리자가 넣은 사용기간(`user_program_access`)이 필요하다. 관리자는 항상 가능.
- 키는 `user_api_keys`(provider `youtube_api_key`, `gemini`, `openai`, `anthropic`)에서 **로그인한 회원 본인 행만**. DB 체크 제약의 Claude provider 이름은 `anthropic`이다(`claude`는 저장 실패).
- 키 저장·삭제 API도 프로그램 이용 권한을 확인한다. 로그에 키가 남지 않게 오류 메시지의 `key=` 값을 가린다.

## 7. 알려진 한계·다음 작업
- 모바일 폭: 2026-10-11 같은 출처 iframe(390px 폭)으로 대시보드·채널 분석·공략 채널 찾기와 햄버거 메뉴를 확인했다(Chrome 창 크기 변경 도구는 이 환경에서 적용되지 않아 iframe 방식을 썼다). 실제 폰 기기는 아직 확인하지 않았다.
- 카탈로그 썸네일: 2026-10-11 전용 실사 썸네일 제작·등록 완료(`program-images/catalog/youtube-channel-consultant-thumbnail.jpg`, `scripts/generate-program-thumbnail.mjs`, 마이그레이션 `20261011170000_...thumbnail.sql`).
- `npm run lint`는 ESLint 설정 파일이 없어 동작하지 않는다(복사 원본 `youtube-viral-studio`도 같음). 자동 검사는 `npm test`(지표 계산 7개)와 `npm run build`.
- 이후 검토: 영상 요약 등 AI 기능, 즐겨찾기 보관함, 공략 채널 찾기.

## 8. 배포 방법
```bash
cd youtube-channel-consultant
npm test && npm run build
vercel deploy --prod --yes --scope buylife
```
버전을 올릴 때: `src/lib/version.ts` + `package.json`(+lock) + DB `update programs set version='v1.0X' where slug='youtube-channel-consultant';` + `supabase/migrations/`에 새 SQL 파일.
첫 배포 때 겪은 점: `vercel.json {"framework":"nextjs"}` 필요(빈 프로젝트는 404). 환경변수 4개(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_MAIN_SITE_URL`)는 Vercel production에만 등록했다.

## 9. v1.02 구현 — AI 분석 (2026-10-11)
- 화면: 채널 분석에 `AI 경쟁 전략 분석`·`AI 성장 과정 분석`·`AI 채널 진단 및 컨설팅`, 키워드 분석에 `AI 경쟁 전략 분석`, 영상 카드마다 `AI로 영상 요약하기`. 결과는 오른쪽 서랍(`AiDrawer`)에 마크다운으로 표시(복사 버튼). 서버에 저장하지 않는다.
- 구조: `src/lib/ai/models.ts`(모델 레지스트리 — ID는 운영 중인 `naver-blog-agent/src/lib/ai/contentModels.ts`와 같은 값, Preview는 기본값 금지), `llm.ts`(공급사 REST 호출, SDK 없음, 키는 헤더로만·오류 메시지에서 제거), `prompts.ts`(프롬프트 5종), `src/app/api/ai/analyze/route.ts`(로그인+이용 권한+본인 키 확인, 입력 길이·형식 제한), `src/components/ai/*`(엔진 선택·서랍·마크다운).
- 키: `user_api_keys`의 `gemini`/`openai`/`anthropic` 본인 행만 사용(폴백 없음). 키가 없으면 400 + `needApiKey`.
- 영상 요약: Gemini는 공개 YouTube 주소를 `fileData`로 넘겨 **영상을 직접 보고** 요약(15분 이하만, 초과·GPT·Claude는 제목·설명·지표 기반 **추정**이라고 화면과 프롬프트에 명시).
- 프롬프트 규칙: 현재 연도 자동 주입, 제공 데이터에 있는 숫자만 근거, 없는 정보는 `확인 불가`, 추정은 `(추정)`. 채널 분석 AI는 최근 영상 최대 60개만 보낸다. `채널 경쟁 전략`은 경쟁 채널 데이터가 없다고 프롬프트에 알리고 포지셔닝·차별화만 제안한다.
- 실제 라이브 확인(buylifemall@naver.com 본인 키): Gemini `gemini-3.7-flash` 채널 진단·영상 직접 요약, OpenAI `gpt-4.1` 채널 진단, Claude `claude-sonnet-5` 채널 진단 성공. **Claude Sonnet 5는 응답까지 약 80초**가 걸리고(그래서 route `maxDuration = 300`), `max_tokens 4096`에서는 빈 응답이 나와 8192로 올렸다. 빠르게 쓰려면 Haiku 4.5를 고른다.
- 자동 검사: `npm test` 14개(지표 7 + AI 7: 레지스트리·프롬프트·요청 형식·키 비노출·오류 매핑). 다른 모델 ID(GPT-6 등)는 이 키로 실제 호출해 보지 않았다.

## 10. v1.03 구현 — 공략 채널 찾기 (2026-10-11)
- 화면 `/golden-channels`, API `/api/youtube/golden-channels`(로그인+이용 권한+본인 키), 로직 `src/lib/youtube/analysis.ts`의 `findTargetChannels` + 순수 함수 `targets.ts`의 `selectTargetChannels`(자동 검사 대상).
- 흐름: 키워드로 `search.list`(최근 30/90일·1년, 조회수순, 선택: 4분 미만 영상만, 지역) → 영상 상세(1유닛) → 영상을 올린 채널 상세(1유닛) → 구독자 상한 이하이면서 **채널 평균 조회수(총 조회수 ÷ 영상 수)** 하한 이상인 채널만 남겨 **파괴력 배수(평균 조회수 ÷ 구독자)** 순으로 정렬. 쿼터는 1페이지(영상 50개)당 약 102유닛.
- 정직한 표시: 평균 조회수는 최근 영상 평균이 아니라 채널 누적 평균, 검색에 잡힌 채널만 대상(시장 전체 아님), 구독자 비공개 채널은 0명으로 보지 않고 제외하며 개수를 알려준다(`youtube-viral-studio` 원본은 0명으로 처리해 통과시키는 문제가 있었다). 구독자 0명은 1명으로 보정해 배수 계산이 터지지 않게 했다.
- 카드에서 `이 채널 분석하기`를 누르면 `/channel-analysis?q=<채널ID>`로 자동 분석한다. JSON·CSV 내보내기는 `src/lib/export.ts`(VideoList도 공용 사용).
- 실제 라이브 확인(buylifemall@naver.com 본인 키): `AI자동화`(한국·90일·구독자 1만 이하·평균 1만 이상)로 영상 50개 → 채널 43개 중 4개 조건 충족, 카드·정렬·내보내기 버튼 정상.
- 자동 검사 `npm test` 17개(지표 7 + AI 7 + 공략 채널 3).
- v1.04 (2026-10-12): 핸드폰 번호 필수 정책 적용 — 핸드폰 번호가 없는 회원(관리자 제외)은 이용할 수 없고 메인 사이트 설정에서 번호를 등록하도록 안내합니다. 공용 규칙은 루트 `lib/utils/phone.ts`, 상세는 `docs/HANDOFF.md` 2026-10-12 항목.

## v1.05 (2026-10-15) — AI 지시문에 한국 시간 현재 월 추가 (Claude Code 보조 계정)
- 연도만 주면 AI가 계절을 지어내는 문제(10월에 "봄", 루트 `docs/ERROR_LESSONS.md` 2026-10-14) 예방: src/lib/ai/prompts.ts `systemPrompt()`에 `koreaNowRule()` — "[기준 시점: 한국 시간으로 지금은 YYYY년 M월… 계절·시기 표현은 현재 월에 맞춤]"(Asia/Seoul, 서버 UTC여도 한국 날짜). 빌드 통과·프로덕션 배포 READY·DB `programs.version` v1.05. 유료 AI 실제 생성 확인은 하지 않음.


## 2026-10-16 DB 연동 변수 호환 — v1.06 (youtube-channel-consultant)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## 2026-10-17 v1.07 — 디자인 리뉴얼: 유튜브 다크 콘솔 — 스튜디오 변형 (Claude Code 맥미니)
- `youtube-viral-studio`와 같은 `yt-*` 토큰·사이드바, 📖 매뉴얼 메뉴·`/guide` 신설, 대시보드 배너, 로그인 다크. API·지표 변경 없음. 디자인: [docs/DESIGN_HANDOFF.md](docs/DESIGN_HANDOFF.md)
- **빌드·배포·화면 검수는 윈도우 CLI 대기.**
- 플랜: [docs/PLAN_20261017_DESIGN_RENEWAL.md](docs/PLAN_20261017_DESIGN_RENEWAL.md) · 개선 원장: [docs/IMPROVEMENTS.md](docs/IMPROVEMENTS.md) · 인수인계: [docs/IMPROVEMENT_HANDOFF_20261017.md](docs/IMPROVEMENT_HANDOFF_20261017.md)
