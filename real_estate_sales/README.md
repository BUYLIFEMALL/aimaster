# 부동산 실거래 투자분석

관심 지역(서울 자치구)의 **실거래가**(국토부에 신고 완료된 거래 기록)를 자동으로
수집하고, AI로 투자 매력도를 분석해주는 마케팅 자동화 웹 애플리케이션입니다. 원래
Make.com 시나리오 + n8n(국내 IP 프록시) 조합으로 개인용으로 운영하던 자동화를,
AIMaster 정식 서브프로젝트(멀티테넌트 서비스)로 이식한 결과물입니다.

> **컨셉 정리 (2026-08-11)**: 처음엔 "실시간 매매정보"(현재 판매 중인 매물의 호가)를
> 다루는 서비스처럼 이름 붙였으나, 실제로 다루는 데이터(서울 열린데이터광장
> `tbLnOpendataRtmsV`)는 **이미 계약이 체결되고 정부에 신고 완료된 과거 거래 기록**
> (실거래가)이다. 한국 부동산 거래는 계약 후 30일 이내 신고 의무가 있어, 아무리
> 빨라도 계약 시점보다 데이터가 늦게 나온다. 현재 시장에 나온 매물의 호가(네이버부동산
> 등)와는 다른 데이터라, "실거래가 자동 알림 + AI 투자분석" 서비스로 이름과 문구를
> 정정했다. 매물 호가 데이터를 다루려면 공식 공공 API가 없어 별도의 크롤링/제3자 API
> 연동이 필요하다(추후 검토 과제).

## 기술 스택

- **Next.js 16** (App Router, Turbopack)
- **TypeScript**
- **Tailwind CSS 4** (루트 다크 럭셔리 테마 적용)
- **Supabase** (PostgreSQL + Auth + RLS)
- **서울 열린데이터광장 / 공공데이터포털 / VWorld** 공공 API
- **OpenAI / Perplexity API** (사용자 개인 키)
- **Telegram Bot API** (사용자 개인 봇)
- **Vercel** 배포 (서울 리전 고정)

## 핵심 아키텍처 결정

### 1. 국내 IP 전용 공공 API — n8n/Make 프록시 없이 직접 호출

서울 열린데이터광장/공공데이터포털/VWorld 3개 API가 전부 "국내 IP만 허용"이라, 기존엔
해외에 있는 Make.com 서버 대신 국내 서버(n8n)를 프록시로 거쳐야 했습니다.
`vercel.json`의 `"regions": ["icn1"]` 설정으로 이 프로젝트의 모든 서버리스 함수를
서울 리전에 고정하면, 프록시 없이 직접 호출해도 국내 IP로 인식됩니다(실제 3개 API
전부 검증 완료). 덕분에 n8n/Make를 완전히 제거하고 Next.js 하나로 통합했습니다.

> `export const preferredRegion = "icn1"` (Next.js 라우트 내부 선언 방식)은 최신
> Vercel/Fluid Compute 환경에서 무시되는 것을 확인했습니다. 반드시 `vercel.json`의
> `regions` 키를 쓸 것.

#### VWorld API 키 도메인 등록 주의

VWorld는 리전 고정과 별개로, API 키 자체에 **등록된 도메인**을 `domain` 파라미터로
같이 보내야 통과하는 방식입니다 (`src/lib/publicdata/client.ts`). 지금 등록된 도메인은
이 프로젝트의 실제 서비스 도메인이 아니라 **과거 n8n 서버가 쓰던 `n8n.buylife.xyz`**
입니다 — Phase 0 스파이크 당시 이미 그 도메인으로 등록되어 있던 키를 그대로 재사용
했기 때문입니다. 이 도메인의 DNS 레코드 자체가 없어져도(VWorld는 실시간으로 그
도메인에 접속해보는 게 아니라 문자열만 대조하는 것으로 보임 — 그래서 지금도 동작함)
당장 문제는 없지만, 나중에 n8n 관련 리소스를 정리하면서 VWorld 포털에서 이 도메인
등록 자체를 지워버리면 공시가격 조회가 막힙니다.

**개선 필요 시(권장)**: VWorld 개발자 포털(https://www.vworld.kr) 로그인 → **오픈API
> 인증키 > 인증키관리** 메뉴에서 이 프로젝트의 실제 서비스 도메인(예:
`real-estate-sales-delta.vercel.app` 또는 커스텀 도메인 연결 시 그 도메인)을 추가/변경한
뒤, Vercel 환경변수 `VWORLD_REGISTERED_DOMAIN`을 그 값으로 설정하면 코드 수정 없이
바로 반영됩니다 (설정 안 하면 기존 `n8n.buylife.xyz`를 그대로 씀). 이 작업은 VWorld
계정 로그인이 필요해 사용자가 직접 해야 합니다.

### 2. 데이터 격리 — 매물은 전역 공유, 개인 정보는 사용자별 분리

같은 자치구를 여러 사용자가 watch해도 매물 데이터(`real_estate_listings`)는 한 번만
수집·저장합니다(`dedup_key` UNIQUE 제약). 사용자별 관심 지역, 매칭 피드, AI 분석
결과, 텔레그램 연동 정보는 전부 `user_id` + RLS owner-only로 분리됩니다.

### 3. API 키·텔레그램 봇 — 전부 사용자 개인 것

이 프로그램은 개발자 전용 도구가 아니라 모든 구독자가 각자 계정으로 쓰는 서비스입니다.
- OpenAI/Perplexity 키: 설정 화면에서 본인 키 등록 (없으면 분석 기능 사용 불가)
- 텔레그램 알림: 공용 봇이 아니라 **사용자가 BotFather로 직접 만든 개인 봇**을 등록.
  OAuth 리다이렉트가 없는 대신, `getUpdates` API로 "방금 봇에게 보낸 메시지"에서
  chat_id를 읽어오는 방식(`src/lib/telegram/client.ts`의 `findChatIdFromUpdates()`).
  이 봇이 과거에 다른 서비스(예: Make.com)에서 웹훅으로 쓰이고 있었다면 `getUpdates`와
  충돌(409)하므로, 연동 시 자동으로 기존 웹훅을 해제합니다.

### 4. AI 분석은 설정에서 고른 모델로 자동 실행 (재호출 방지로 비용 관리)

설정 화면에서 선호 모델(GPT-5.6 계열 등)을 한 번 등록해두면, 매물 상세 화면을 열 때
또는 실시간 모니터링으로 새 매물이 잡힐 때 자동으로 분석되어 보입니다. 같은 사용자·
같은 매물 조합은 한 번만 분석하고 캐시하므로(`real_estate_analyses`) 반복 호출로
비용이 늘어나지 않습니다. 시장 분위기(Perplexity) 조회 결과도 자치구+날짜 단위로
캐싱해서 같은 날 여러 번 분석해도 중복 호출하지 않습니다.

**토지(대지) 정보 연계 (2026-08-11 추가)**: 매물이 깔고 앉은 PNU 기준으로 VWorld
개별공시지가(`getIndvdLandPriceAttr`)·토지이용계획(`getLandUseAttr`, 용도지역/지구/구역)을
조회해서 `real_estate_land_info`에 PNU 단위로 캐싱하고(공시지가는 연 1회 갱신이라 한 번
캐싱하면 충분, 같은 단지 여러 동/호가 같은 PNU를 공유), AI 분석 프롬프트에 함께 넘겨서
재건축 가능성·대지지분 가치·용도지역 규제(토지거래허가구역 등) 관점의 코멘트까지
받아볼 수 있습니다 (`src/lib/realestate/collect.ts`의 `ensureLandInfo`,
`src/lib/actions/analysis.ts`, `src/lib/ai/analyze.ts`). 매물 상세 페이지에도 "토지(대지)
정보" 섹션으로 노출됩니다.

### 5. 조회 방식 — 기본은 수동 "지금 조회하기", 예약 조회는 선택 사항

> **컨셉 정리 (2026-08-11, 2차)**: 처음엔 "관심 지역을 켜두면 자동으로 계속 감시한다"는
> 실시간 모니터링 중심 UX였는데, "실거래가 분석" 서비스로 컨셉을 바꾸면서 사용자가
> 원할 때 직접 버튼을 눌러 조회 + AI 분석 + 텔레그램 발송까지 한 번에 받아보는 방식을
> **기본 동작**으로 바꿨습니다. 기존에 만들어둔 주기/시간대 예약 기능은 버리지 않고,
> "예약 조회"라는 이름의 선택적 보조 기능으로 그대로 남겨뒀습니다 (둘 다 같은
> `src/lib/realestate/collect.ts` 공유 로직을 호출).

- **기본: 지금 조회하기** (`src/lib/actions/query.ts`의 `queryDistrictsAction` Server
  Action, `src/components/districts/QueryNowButton.tsx`) — `/districts`에서 버튼을
  누르면 그 자리에서 관심 지역 전체를 즉시 수집 → AI 분석 → 텔레그램 발송까지
  처리합니다. 같은 지역을 5분 이내 중복 조회하지 않도록(`REUSE_WINDOW_MINUTES`)
  `real_estate_district_collect_state`를 그대로 재사용해서, 예약 조회와 API 호출을
  이중으로 하지 않습니다. 수동 조회도 해당 지역의 `last_run_at`을 같이 갱신하므로,
  예약 조회를 켜둔 지역이라면 방금 수동으로 확인한 직후 cron이 또 처리하지 않습니다.
- **선택: 예약 조회** (구 "실시간 모니터링") — 관심 지역마다 켜고 끌 수 있고, 켜져
  있을 때만 정해둔 주기(1시간/3시간/6시간/12시간/24시간)·시간대에
  cron이 자동으로 수집 → AI 분석 → 텔레그램 발송을 대신 해줍니다
  (`src/app/(dashboard)/districts/page.tsx`, `src/components/districts/MonitoringSettings.tsx`).
  꺼두면 위 "지금 조회하기" 버튼으로만 동작하고 자동으로는 아무 것도 실행되지 않습니다.

buylife 팀 Vercel 계정이 **Pro 플랜**이라 `vercel.json`의 자체 cron을 5분 간격
(`*/5 * * * *`)으로 직접 등록해뒀습니다 (Hobby 플랜은 cron이 하루 1회로 제한되어
있었는데, 실제 배포 테스트로 거부되는 것까지 확인 후 Pro로 업그레이드하며 이 방식으로
전환함 — 외부 스케줄러 불필요). 다만 사용자별로 지역마다 고른 주기(1시간~24시간)와
시간대가 다를 수 있으므로, cron은 5분마다 `/api/collect/dispatch`를 깨우기만 하고
실제로 이번 틱에 수집/분석/알림을 처리할지는 라우트 내부에서 각 사용자-지역 조합의
`monitoring_enabled` / `collect_interval_minutes` / `active_hour_start` /
`active_hour_end` / `last_run_at`을 보고 다시 판단합니다(`src/lib/publicdata/schedule.ts`).
즉 cron 자체는 5분마다 깨어나지만, 24시간 주기로 설정한 사용자는 24시간에 한 번만
실제로 처리됩니다.

## 핵심 기능

- 이메일 회원가입 / 로그인 (Supabase Auth, AIMaster 계정 공유)
- 관심 지역(서울 25개 구) 설정
- 실거래가 조회: 기본은 "지금 조회하기" 수동 버튼, 선택적으로 지역별 예약 조회
  On/Off·주기·동작 시간대 설정 가능
- 수집 파이프라인: 실거래가 → 건축물대장 → 공시가격 → 전월세 비교
- 매물 목록 / 상세
- AI 투자 분석 (저평가지수 · 1년 상승예측률 · 투자매력도 점수, 설정에서 모델 선택)
- 텔레그램 알림 (신규 매물 발견 시 개인 봇으로 발송, AI 분석 결과 포함)

## 폴더 구조

```
src/
├── app/
│   ├── (auth)/                 # 로그인 / 회원가입
│   ├── (dashboard)/            # 대시보드 / 관심지역 / 매물목록·상세 / 설정
│   └── api/collect/dispatch/   # 자동 수집 엔드포인트 (CRON_SECRET, 외부 스케줄러가 호출)
├── components/
│   ├── ui/                     # 공용 UI 컴포넌트
│   ├── districts/               # 관심 지역 토글 + 지금 조회하기 버튼 + 예약 조회 설정
│   ├── listings/                 # 재분석 버튼
│   └── settings/                 # API 키 등록, AI 모델 선호, 텔레그램 연동
├── lib/
│   ├── supabase/                 # client / server / admin 클라이언트
│   ├── publicdata/                # 서울/공공데이터포털/VWorld API 래퍼 + 수집 주기 판정 (서버 전용)
│   ├── realestate/collect.ts      # 수집→AI분석→텔레그램 발송 공유 로직 (cron·수동 조회 공통)
│   ├── telegram/                  # 텔레그램 봇 API 래퍼 (서버 전용)
│   ├── ai/                        # 시장 분위기 캐시, 투자 분석 프롬프트, 모델 옵션
│   ├── actions/                   # Server Actions (query.ts = 지금 조회하기 등)
│   ├── access.ts                  # 프로그램 이용 권한 확인
│   └── apiKeys.ts                 # 사용자 개인 API 키 우선 사용
└── types/                         # Database 타입 (Supabase 생성)

supabase/migrations/    # 이 서브프로젝트가 추가한 테이블/정책 (버전 순서대로 적용)
```

## 시작하기

```bash
npm install
cp .env.local.example .env.local   # 값 채우기 (아래 환경변수 표 참고)
npm run dev
```

## 환경변수

| 변수 | 설명 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | AIMaster와 공유하는 Supabase 프로젝트 |
| `SEOUL_OPENDATA_API_KEY` | 서울 열린데이터광장 인증키 (앱 공용) |
| `DATA_GO_KR_SERVICE_KEY` | 공공데이터포털 건축물대장정보서비스 인증키 (앱 공용) |
| `VWORLD_API_KEY` | VWorld 공동주택 공시가격 API 키 (앱 공용) |
| `VWORLD_REGISTERED_DOMAIN` | (선택) VWorld 키에 등록된 도메인. 미설정 시 `n8n.buylife.xyz`(과거 n8n 서버 도메인) 사용. VWorld 개발자 포털에서 도메인을 실제 서비스 도메인으로 바꾸면 이 값도 같이 바꿔야 함 — [자세한 내용](#vworld-api-키-도메인-등록-주의) |
| `N8N_VWORLD_PROXY_URL` / `N8N_VWORLD_PROXY_TOKEN` | icn1 직접 호출이 막힐 경우의 폴백(현재 코드에서는 미사용, 참고용) |
| `OPENAI_API_KEY` / `PERPLEXITY_API_KEY` | 사용자가 개인 키를 등록하지 않았을 때의 앱 기본 폴백 키 |
| `CRON_SECRET` | `/api/collect/dispatch` 보호용 임의의 긴 문자열 |
| `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_MAIN_SITE_URL` | 배포 도메인 / AIMaster 메인 사이트 |

텔레그램 봇 토큰은 앱 전역 환경변수가 아니라 사용자별로 `user_telegram_links` 테이블에
저장됩니다 (설정 화면에서 등록).

## DB 마이그레이션 적용

`supabase/migrations/`의 파일을 **파일명(타임스탬프) 순서대로** Supabase 대시보드
SQL Editor에서 실행하거나 `supabase db push`로 적용합니다.

1. `20260810050751_real_estate_sales_init.sql` — 핵심 테이블 6개 + RLS
2. `20260810053653_real_estate_telegram_per_user_bot.sql` — 텔레그램 개인 봇 컬럼 추가
3. `20260810090459_fix_telegram_links_rls_insert_update.sql` — 텔레그램 연동 저장 안 되던 RLS 버그 수정
4. `20260810090538_fix_district_sentiment_rls_insert_update.sql` — 시장 분위기 캐시 저장 안 되던 RLS 버그 수정
5. `20260810110000_real_estate_user_preferences.sql` — 사용자별 선호 AI 분석 모델 저장 테이블
6. `20260810130000_real_estate_watch_monitoring.sql` — 관심 지역별 실시간 모니터링 On/Off·주기·동작 시간대 컬럼
7. `20260811040000_real_estate_watch_interval_minutes.sql` — 수집 주기 선택지에 5분/10분 추가
8. `20260811120000_real_estate_watch_interval_remove_short.sql` — 실거래(매매) 데이터 특성상 불필요한 5분/10분/30분 선택지 제거 (최소 1시간으로 상향)
9. `20260811150000_real_estate_land_info.sql` — 토지(대지) 개별공시지가·용도지역 캐시 테이블 추가

## Vercel 배포

```bash
npx vercel link       # 최초 1회
npx vercel env add <이름> production   # 환경변수 등록 (위 표 전부)
npx vercel --prod     # 배포
```

`vercel.json`에 `"regions": ["icn1"]`(서울 리전 고정)과 5분마다 실행되는
`crons`(`/api/collect/dispatch`)가 등록되어 있습니다 (buylife 팀 Vercel Pro 플랜
기준 — Hobby 플랜은 cron이 하루 1회로 제한돼서 이 주기로 설정할 수 없습니다). 실제
수집/분석/알림 빈도는 사용자가 관심 지역마다 설정한 주기·시간대를 따릅니다 (위
"실시간 모니터링" 절 참고).

## 스크립트

```bash
npm run dev     # 개발 서버
npm run build   # 프로덕션 빌드 + 타입체크
npm run start   # 프로덕션 서버 실행
npm run lint    # ESLint
```

## 현재 상태 / 남은 작업

- ✅ 수집 파이프라인, 관심지역 설정, 매물 목록/상세, AI 분석, 텔레그램 연동까지 전부
  실제 데이터로 동작 확인 완료
- ⏳ **가격 정책 미정** — `pricing_plans`가 아직 없어서 관리자가 개별 권한을 부여한
  계정 외에는 구독/결제해서 이용할 수 없음
- ⏳ **카테고리 / 썸네일 미설정** — `/programs` 목록 노출용 메타데이터 필요
- ⏳ 관심 지역은 현재 서울만 지원 (경기/인천 등 확장 시 `src/lib/publicdata/districts.ts`에
  자치구 코드 추가 + 서울 열린데이터광장 API를 다른 지자체 API로 교체 필요)
