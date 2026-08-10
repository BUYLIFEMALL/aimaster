# 부동산 실시간 매매정보

관심 지역(서울 자치구)의 실거래가를 매일 자동으로 수집하고, AI로 투자 매력도를 분석해주는
마케팅 자동화 웹 애플리케이션입니다. 원래 Make.com 시나리오 + n8n(국내 IP 프록시)
조합으로 개인용으로 운영하던 자동화를, AIMaster 정식 서브프로젝트(멀티테넌트 서비스)로
이식한 결과물입니다.

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

### 4. AI 분석은 사용자가 수동으로 트리거 (비용 관리)

수집 단계에서는 AI 분석을 자동 실행하지 않습니다. 매물 상세 화면에서 사용자가 직접
"AI 분석하기"를 눌러야 실행되며, 이때 본인이 고른 모델(GPT-5.6 계열 등)과 본인 API
키가 사용됩니다. 시장 분위기(Perplexity) 조회 결과는 자치구+날짜 단위로 캐싱해서
같은 날 여러 번 분석해도 중복 호출하지 않습니다.

## 핵심 기능

- 이메일 회원가입 / 로그인 (Supabase Auth, AIMaster 계정 공유)
- 관심 지역(서울 25개 구) 설정
- 매일 자동 수집(cron): 실거래가 → 건축물대장 → 공시가격 → 전월세 비교
- 매물 목록 / 상세
- AI 투자 분석 (저평가지수 · 1년 상승예측률 · 투자매력도 점수, 모델 선택 가능)
- 텔레그램 알림 (신규 매물 발견 시 개인 봇으로 발송)

## 폴더 구조

```
src/
├── app/
│   ├── (auth)/                 # 로그인 / 회원가입
│   ├── (dashboard)/            # 대시보드 / 관심지역 / 매물목록·상세 / 설정
│   └── api/collect/dispatch/   # 매일 자동 수집 cron 엔드포인트 (CRON_SECRET)
├── components/
│   ├── ui/                     # 공용 UI 컴포넌트
│   ├── districts/               # 관심 지역 토글
│   ├── listings/                 # AI 분석 버튼
│   └── settings/                 # API 키 등록, 텔레그램 연동
├── lib/
│   ├── supabase/                 # client / server / admin 클라이언트
│   ├── publicdata/                # 서울/공공데이터포털/VWorld API 래퍼 (서버 전용)
│   ├── telegram/                  # 텔레그램 봇 API 래퍼 (서버 전용)
│   ├── ai/                        # 시장 분위기 캐시, 투자 분석 프롬프트, 모델 옵션
│   ├── actions/                   # Server Actions
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
| `N8N_VWORLD_PROXY_URL` / `N8N_VWORLD_PROXY_TOKEN` | icn1 직접 호출이 막힐 경우의 폴백(현재 코드에서는 미사용, 참고용) |
| `OPENAI_API_KEY` / `PERPLEXITY_API_KEY` | 사용자가 개인 키를 등록하지 않았을 때의 앱 기본 폴백 키 |
| `CRON_SECRET` | `/api/collect/dispatch` 보호용 임의의 긴 문자열 |
| `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_MAIN_SITE_URL` | 배포 도메인 / AIMaster 메인 사이트 |

텔레그램 봇 토큰은 앱 전역 환경변수가 아니라 사용자별로 `user_telegram_links` 테이블에
저장됩니다 (설정 화면에서 등록).

## DB 마이그레이션 적용

`supabase/migrations/`의 4개 파일을 **파일명(타임스탬프) 순서대로** Supabase 대시보드
SQL Editor에서 실행하거나 `supabase db push`로 적용합니다.

1. `20260810050751_real_estate_sales_init.sql` — 핵심 테이블 6개 + RLS
2. `20260810053653_real_estate_telegram_per_user_bot.sql` — 텔레그램 개인 봇 컬럼 추가
3. `20260810090459_fix_telegram_links_rls_insert_update.sql` — 텔레그램 연동 저장 안 되던 RLS 버그 수정
4. `20260810090538_fix_district_sentiment_rls_insert_update.sql` — 시장 분위기 캐시 저장 안 되던 RLS 버그 수정

## Vercel 배포

```bash
npx vercel link       # 최초 1회
npx vercel env add <이름> production   # 환경변수 등록 (위 표 전부)
npx vercel --prod     # 배포
```

`vercel.json`에 `"regions": ["icn1"]`(서울 리전 고정)과 매일 1회 실행되는
`crons`(`/api/collect/dispatch`, 06:00 KST)가 이미 등록되어 있습니다.

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
