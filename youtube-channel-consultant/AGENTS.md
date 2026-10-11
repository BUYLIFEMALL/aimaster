# YOUTUBE CHANNEL CONSULTANT — AI 에이전트 인수인계 문서 (AGENTS.md)

> # ★★★ 최상위 절대 불변 규칙 (2026-10-09 주인님 지시)
> **모든 사용자는 본인의 계정과, 본인이 사용할 본인 API 키(YouTube Data API v3, 이후 AI 키)를 각각 직접 등록·연동해서 사용한다.**
> 운영자(주인님)나 타인의 키로 대신 처리하지 않으며, 키가 없으면 "본인 키를 등록해주세요"로 안내한다. 상세: 루트 `docs/TOP_RULE_PERSONAL_ACCOUNT_API.md`.

작업 전에 루트 `CLAUDE.md`, `docs/HANDOFF.md`, `docs/ERROR_LESSONS.md`, `docs/SIDEBAR_LAYOUT_STANDARD.md`를 먼저 읽는다.

## 1. 개요와 현황
- 프로그램명 `YOUTUBE CHANNEL CONSULTANT` / slug `youtube-channel-consultant` / 현재 버전 **v1.01** (`src/lib/version.ts`, `package.json`, DB `programs.version`, 마이그레이션 SQL 모두 같이 올린다)
- 주소: https://youtube-channel-consultant.buylife.xyz (Vercel 프로젝트 `buylife/youtube-channel-consultant`, 별칭 `youtube-channel-consultant.vercel.app`)
- 기술: Next.js 16 + React 19 + Tailwind 4 + Supabase SSR(공유 DB `esgxyikcnnvmlhygjkth`). 외부 차트 라이브러리 없음(CSS 차트).
- 기획 배경: 외부 참고 프로그램(AI Studio 앱 "유튜브 채널 컨설턴트")의 기능 흐름을 참고해 새로 만들었다. 이름·디자인은 복제하지 않았고 화면은 흰색 바탕(`docs/PLATFORM_PATTERNS.md` §27-1).
- 기반 코드: `youtube-viral-studio`(로그인·권한·키 저장 구조)를 복사해 시작했다.

## 2. 단계별 범위
| 버전 | 내용 | 상태 |
|---|---|---|
| v1.01 | ① 채널 분석 ② 키워드 분석 (+ JSON/CSV 내보내기) | **완료·배포** |
| v1.02 (예정) | AI 분석: 영상 요약, 경쟁 전략, 성장 과정, 채널 진단 (회원 본인 Gemini/OpenAI/Claude 키, 모델은 `docs/AI_MODEL_INTEGRATION_STANDARD.md` 레지스트리 방식) | 미착수 |
| v1.03 (예정) | 공략 채널 찾기 — `youtube-viral-studio/src/lib/youtube/goldenChannels.ts` 재사용 검토 | 미착수 |

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
- 모바일 폭은 CSS(반응형 클래스·상단 메뉴)로만 구현했고 실제 폰 폭 브라우저 검수는 아직 못 했다.
- 카탈로그 썸네일은 전용 이미지가 없어 `youtube-viral-studio` 썸네일을 임시로 쓰고 있다(전용 실사 썸네일 제작 필요, `docs/PLATFORM_PATTERNS.md` §13).
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
