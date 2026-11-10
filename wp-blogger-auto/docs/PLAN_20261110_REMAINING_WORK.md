# 남은 작업 플랜 — AI 워드프레스·구글블로그 자동화 (2026-11-10)

작성: [역할: blog] Claude Code(윈도우) · 세션 `claude-win-blog` · 주인님 「작업 플랜세우고 보여줘」
원 플랜·결정 기록: 루트 `docs/PLAN_20261110_WORDPRESS_BLOGGER_API.md`(결정 1~6 완료)
상태: **플랜 — 아래 「결정 항목」 답변 대기**

## 0. 지금까지(완료, 미배포)
| 단계 | 결과 | 커밋 |
|---|---|---|
| 뼈대 | 로그인·권한 판정·SSO 쿠키·사이드바(카페 모집에서 복사, 메뉴는 아직 카페용) | `b77696d8f` |
| 공용 발행 엔진 | `src/lib/publish/wordpress.ts`(연결 확인·카테고리·태그·미디어 업로드·초안/발행/예약·예약 취소), `blogger.ts`(블로그 목록·초안/발행/예약·초안으로 되돌리기), 모의 시험 17개 | `b77696d8f` |
| DB 초안 | 공용 연동 항목 2개(`wordpress`·`blogger`), 표 `wba_posts`(회원별 RLS), 이미지 버킷, 30일 정리 함수(열외 회원 제외), 격리 DB 시험 5개 | `3dbb91309` |

## 1. 남은 단계와 순서
### 1단계 — 운영 DB 적용 (주인님 승인 `eefe9433` 뒤)
- `supabase/migrations/20261110120000_wba_init.sql`을 운영(ref `esgxyikcnnvmlhygjkth`)에 적용 → 표·정책·버킷·함수 존재를 읽어서 확인.
- `programs`에 `wp-blogger-auto` 등록(`is_active=false`, 블로그 카테고리, `v1.01`, 기본 요금제 3단계, `app_url`).
- 보관 연장 지정(결정 3)을 `docs/TOP_RULE_PERSONAL_ACCOUNT_API.md` §8에 한 줄.

### 2단계 — 화면·서버 구현 (로컬, 비용 없음)
| 번호 | 내용 | 주요 파일 |
|---|---|---|
| 2-1 | 메뉴 교체: 🏠 오늘의 발행 / ✍️ 원고 만들기 / 📚 보관함·발행 결과 / 🔗 블로그 연결 / ⚙️ AI 키·모델 / 📖 연동 & 사용 매뉴얼 | `Sidebar.tsx`, `(dashboard)/*` |
| 2-2 | 블로그 연결 — 워드프레스 3단계(주소·사용자명·응용 비밀번호 → 연결 확인 → 카테고리 불러오기). 401이면 카페24 `Authorization` 머리글 안내 | `/connect`, `api/connect/wordpress` |
| 2-3 | 블로그 연결 — 구글 블로그 4단계(회원 구글 앱: 유튜브용으로 등록돼 있으면 재사용 → 「구글 연결」 → 내 블로그 목록 → 고르기). 공용 저장 `member_platform_accounts` + `lib/memberIntegrations` 사본 | `api/oauth/google/*`, `api/blogger/blogs` |
| 2-4 | 원고 만들기 — 주제·키워드·참고 주소 → 회원 본인 Claude 키로 구글 검색용 원고(제목·메타 설명·슬러그·소제목·태그/라벨) → 편집 → 이미지 0~N장(공용 `gemini-image-client` 사본, 회원 키) | `/write`, `api/posts/generate`, `api/posts/[id]/images` |
| 2-5 | 발행 — 원고마다 방식 고르기(발행 전까지=초안 / 바로 발행 / 예약 시각 한국 시간). 발행 전에 원고를 「발행 중」으로 잠그고 결과(글 주소·예약 시각·실패 사유)를 기록. **응답이 불확실하면 다시 보내지 않고 「확인 필요」로 둠.** 예약 취소 버튼 | `api/posts/[id]/publish`, `api/posts/[id]/cancel` |
| 2-6 | 보관함·오늘의 발행 — 원고·결과 목록, 플랫폼 글로 바로 가기, 확인 필요 줄 강조 | `/posts`, `/dashboard` |
| 2-7 | 매뉴얼 `/guide` — 8대 템플릿(워드프레스 응용 비밀번호 만들기, 구글 앱·블로그 연결, 세 가지 발행 방식, FAQ) | `/guide` |
| 2-8 | 30일 정리 크론(Vercel cron → `wba_cleanup`, 열외 회원·발행 글 이미지 제외) | `api/cron/cleanup`, `vercel.json` |
- 검수: 경로마다 모의 시험(권한·본인 확인·잠금·불확실 재발행 금지), `tsc`, 로컬 `npm run build`.

### 3단계 — 첫 배포 (빌드 1회, 비공개)
- Vercel 새 프로젝트 `wp-blogger-auto` + 도메인 `wp-blogger-auto.buylife.xyz`, 환경변수(공용 Supabase 키, `CRON_SECRET`). 배포 전 팀 빌드 대기 확인.

### 4단계 — 실물 시험 (맥미니 요청, 주인님 지시 「테스트는 맥미니」)
- 요청서 `docs/REQUEST_<날짜>_MACMINI_TEST.md`로 맥미니 ego에서: 워드프레스(카페24 시험 사이트) 연결 → 초안 1건 → 예약 1건(확인 뒤 취소) → 공개 1건(삭제는 주인님 승인) / 구글 시험 블로그 같은 순서.
- 맥미니가 찾은 문제는 윈도우가 고침 → 2차 배포(빌드 1회).

### 5단계 — 공개
- 소개 문안(`description`·`short_desc`·`detail_sections`), 썸네일, 공개 전환은 주인님 확인 뒤. 프로그램 비교표·블로그 기능 비교표·카테고리 지도 갱신.

## 2. 자동화 수치(목표)
처음 설정: 워드프레스 3단계 · 구글 블로그 4단계 / 매일 조작: 원고 확인 뒤 발행 1번(예약이면 0번) / 동의: 구글 연결 1번.

## 3. 비용
| 항목 | 횟수·금액 | 상태 |
|---|---|---|
| Vercel 빌드 | 2~3회(첫 배포 + 실물 시험 수정 1~2회) | 결정 6 승인 범위 |
| 시험 AI 원고·이미지 | 원고 2~3건 + 이미지 1~2장, 합계 약 0.2달러 이하(관리자 Claude 크레딧·관리자 키) | 결정 6 승인 범위 |
| 썸네일 | 상위 이미지 모델 1~2장 | 공개 직전 여쭘 |
| 워드프레스·Blogger API | 없음(회원 본인 계정) | – |

## 5. 진행 기록
- **2026-11-10 1단계 완료** — 주인님 승인 「운영 DB 적용 승인(eefe9433)」. ego lite Supabase SQL 편집기에서 운영(ref `esgxyikcnnvmlhygjkth`)에 `20261110120000_wba_init.sql` + `20261110120100_register_program.sql` 실행(편집기 내용과 파일 글자 단위 일치 확인 뒤, 새 객체에만 걸린 「파괴적 작업」 경고 확인 후 실행). 읽기 확인: `wba_posts` RLS 켜짐·정책 2개(본인 읽기·지우기), 버킷 `wba-images` 공개, `wba_cleanup` 실행 권한 `postgres`·`service_role`만, 연동 항목 `wordpress`·`blogger`, 프로그램 v1.01 비공개·블로그 카테고리, 요금제 3개. 보관 지정은 TOP_RULE §8에 이미 있음.
- **2026-11-10 결정** — 구글 시험 블로그: **새로 만듦**(4단계 실물 시험 때 주인님 구글 계정으로, 맥미니). 디자인: **시안 2~3개를 보고 결정**(2단계 화면 작업 전에 시안을 먼저 보여 드림). 원고 기본 AI: 질문만 다시 보내 주셔서 권장안(Claude 중가 기본·회원 변경 가능)으로 진행, 다르면 바꿈.

- **2026-11-10 디자인 시안 3개(주인님 「진행해」)** — `D:\Antigravity\Design`의 88 글로벌 프레스 뉴스룸 · 89 듀얼 런치패드 미션 · 90 서프 가든 스튜디오(추천). 각 폴더 `wp-blogger-auto/`에 4대 화면 HTML·PNG·README·`showcase_12views.html`. 보기: http://localhost:3800/showcase.html · http://localhost:3800/comparison.html (이전 카페 쇼케이스는 `showcase_naver-cafe-poster_20261110.html`로 보관). 캡처는 ego가 창이 앞에 있을 때만 찍혀 막혀서, 시안 그림만 임시 프로필 헤드리스 크롬(1440px)으로 떴음(검수 증거 아님). 주인님 선택 뒤 DESIGN.md 카탈로그·현황판 등록.

- **2026-11-10 디자인 결정 = 2안 89 듀얼 런치패드 미션**(주인님 「2안으로 해」). DESIGN.md 현황판 91번 줄·자산화 절 등록.
- **2026-11-10 2-1 완료(로컬, 미배포)** — 상단 가로 메뉴 `src/components/layout/TopNav.tsx`(휴대폰 ☰, 다른 프로그램 보기, 계정·로그아웃), 디자인 색 `globals.css`(`lp-*` 클래스), 「오늘의 발행」 `dashboard/page.tsx`(발사대 카드 2개·숫자 4개·발사 순서·최근 결과), 계산 `src/lib/dashboard.ts`, 연결 읽기 `src/lib/connections.ts`(토큰 칸은 읽지 않음), 형식 정의에 `wba_posts`. 나머지 메뉴 5개는 안내 화면. 옛 좌측 메뉴 `Sidebar.tsx` 삭제. tsc 통과·시험 20개 통과. 다음: 2-2 워드프레스 연결.

- **2026-11-10 2-2 완료(로컬, 미배포)** — 워드프레스 연결: `src/lib/wordpressConnect.ts`(연결 확인→발행 권한→카테고리→공용 표 저장·읽기·끊기), API `src/app/api/connect/wordpress/route.ts`(GET 현재 연결·카테고리 / POST 연결 / DELETE 끊기, 쓰기는 같은 사이트 요청만), 화면 `components/connect/WordpressConnectCard.tsx`(3칸 입력·연결 확인·카테고리·끊기·401 때 .htaccess 한 줄 안내). 공용 사본 2개 등록(`memberIntegrations`·`safe-fetch`, 내부망 차단), `undici` 7.30.0. tsc·시험 27개·로컬 빌드 통과. 다음: 2-3 구글 블로그 연결.

- **2026-11-11 2-3 완료(로컬, 미배포)** — 구글 블로그 연결: `src/lib/googleConnect.ts`(회원 본인 구글 앱 키만, 동의 주소·코드 교환·블로그 권한 확인·공용 표 저장·토큰 갱신·앱 바뀌면 다시 연결 표시·블로그 목록·고르기·끊기), 경로 `api/oauth/google/start`(무작위 상태값+보안 쿠키)·`callback`(상태값·로그인 회원 대조)·`api/connect/blogger`, 화면 `BloggerConnectCard.tsx`(4단계·리디렉션 주소 복사·결과 안내). 콜백 주소 고정 `https://wp-blogger-auto.buylife.xyz/api/oauth/google/callback` — **회원이 구글 콘솔에 이 주소 추가·Blogger API 켜기 필요(매뉴얼 2-7에 넣을 것)**. tsc·시험 35개·로컬 빌드 통과. 다음: 2-4 원고 만들기.

- **2026-11-11 2-4 원고 만들기(글) 완료(로컬, 미배포)** — `src/lib/draft/`(모델 3개·HTML 정리·참고 주소 읽기(내부망 차단)·Claude 구조화 출력 생성·흐름 서비스), 경로 `api/posts/generate`(본인 키만·생성 중 중복 막기·실패 시 빈 원고 삭제·재시도 0)·`api/posts/[id]`(고치기·지우기), 화면 `/write`·`/posts/[id]`(검색 미리보기·HTML 고치기). Anthropic SDK 1.7.0·sanitize-html. tsc·시험 43개·로컬 빌드 통과, 실제 생성 2회 성공(분량 80% — IMPROVEMENTS). 이미지는 2-4b로 분리. 다음: 2-4b 이미지 → 2-5 발행.

- **2026-11-11 2-4b 이미지 완료(로컬, 미배포)** — 장면 설명 `src/lib/image/plan.ts`(회원 Claude 키·Haiku 5.5·이 프로그램 고유 프롬프트·IMAGE_PROMPT_RULES), 생성·저장·넣기·빼기 `service.ts`(회원 Gemini 키·재시도 0·`wba-images` 버킷·n번째 소제목 아래), 공용 사본 `geminiImage`·`nanoBananaModels`, API `api/posts/[id]/images`, 편집 화면 이미지 패널(장면 기획→한 장씩/모두 만들기→다시 만들기·빼기, 저장 안 한 글이면 막음). tsc·시험 49개·로컬 빌드 통과, 실제 생성 1회 양호. 다음: 2-5 발행.

- **2026-11-11 2-5 발행 완료(로컬, 미배포)** — `src/lib/publishFlow.ts`(조건부 잠금 publishing·이미 올라간 원고 재전송 금지·워드프레스: 이미지 미디어 업로드·주소 교체·대표 미디어·태그·카테고리 / 구글 블로그: 토큰 확인·대표 이미지 본문 맨 위·예약 일부 실패는 초안 기록 / 보내기 전 실패는 원래 상태로·보낸 뒤 불확실은 uncertain·재시도 없음 / 결과(글 주소·예약 시각·blog_ref·keep_images) 기록 / 예약 취소), API `api/posts/[id]/publish`(POST 발행·DELETE 예약 취소), 편집 화면 발행 패널(세 방식·한국 시간 예약·카테고리·확인 창·결과·블로그에서 열기). tsc·시험 57개·로컬 빌드 통과. 실제 블로그 발행은 4단계(맥미니). 다음: 2-6 보관함·2-7 매뉴얼·2-8 30일 정리.

## 4. 결정 항목 (주인님)
1. **운영 DB 적용 승인** — 요청함 `eefe9433`.
2. **구글 시험 블로그** — 원 플랜 결정 5에서 미정. 주인님 구글 계정에 시험 블로그 1개를 새로 만들지, 기존 블로그를 쓸지.
3. **디자인 템플릿** — 기존 카탈로그에서 고를지, 시안 2~3개를 먼저 보고 고를지.
4. **원고 기본 AI** — 기본 = Claude 중가 균형 모델(AI 모델 선택표), 회원이 OpenAI·Gemini로 바꿀 수 있게. 그대로 진행해도 될지.
