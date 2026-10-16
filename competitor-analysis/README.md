# 🔎 Competitor Analysis — 경쟁사 키워드 분석 자동화

키워드를 입력하면 구글 검색결과(SerpApi)를 분석해서 경쟁사를 식별하고, AI가 경쟁사/USP/콘텐츠
아이디어 분석 리포트를 만들어주는 프로그램.

## 설계 배경

기존에 Make.com으로 운영하던 자동화 시나리오(`D:\PDS\00@🟣경쟁사 키워드분석-SERP-💰.blueprint.json`,
연동 Airtable `appzAYWz0W0j3xEZY`)를 AIMaster 서브프로젝트로 이식했다. 원본은 Airtable 1개
베이스 + 개인 API 키 + 고정 수신 이메일(nailnbody@naver.com) 하나로 동작하는 1인용 자동화라,
AIMaster의 멀티테넌시 원칙에 맞게 다시 설계했다.

### 원본 대비 바뀐 점

- **Airtable → Supabase**: 회원별 `user_id` + RLS로 완전히 격리
- **개인 API 키 → `user_api_keys`**: 본인 키만 쓰고 관리자 키로 폴백하지 않음
- **Google Docs 중간 저장 제거**: Make.com의 데이터 전달 한계를 우회하려던 임시방편이었을 뿐,
  실제 앱에선 DB에서 바로 조회해서 GPT에 전달
- **Discord 알림 + 고정 이메일 발송 제거**: 결과는 앱 화면에 바로 표시. 정기 이메일 발송은
  Phase 2 이후 `user_smtp_accounts`(공용 테이블) 재사용 검토
- **organic만 캡처하던 것 → organic/ad/PAA/local 전부 분류**: 원본 Airtable 스키마의
  `ResultType` 필드는 이미 이 4종을 예정하고 있었는데 실제 흐름은 organic만 구현되어 있었다.
  광고는 자본을 들여 경쟁하는 곳, PAA는 아직 다뤄지지 않은 콘텐츠 기회라 둘 다 의미가 크다.
- **경쟁사 조사도 회원별 격리**: 후보 v1.08의 `competitor_company_profiles`는 본인 조사만 저장·조회합니다. 본인의 30일 이내 자료만 재사용하며 다른 회원 자료는 사용하지 않습니다. 소유자 없는 옛 `competitor_profiles`는 복사하지 않고 회원 접근을 막는 전환안을 준비했습니다. 운영 DB 적용은 승인 대기입니다.

## 데이터 모델

- `competitor_keywords` — 추적 키워드(지역/구글도메인/언어, 모니터링 on/off)
- `competitor_serp_jobs` — 검색 1회 실행 기록
- `competitor_serp_results` — 검색결과 개별 항목(organic/ad/paa/local)
- `competitor_company_profiles` — 후보 v1.08의 회원 소유 회사 조사(30일 만료). 운영 적용 대기
- `competitor_profiles` — 옛 소유자 없는 저장소, 설계 폐기·회원 접근 차단 전환 대기
- `user_tracked_competitors` — "내 경쟁사로 표시"한 도메인
- `competitor_analyses` — 키워드/검색 단위 GPT 분석 + 선택적 Claude HTML 리포트

## 분석 흐름 (`lib/actions/analysis.ts`의 `runKeywordAnalysisAction`)

1. SerpApi로 구글 검색 (organic/ad/paa/local 분류)
2. 검색결과 저장 + 링크에서 도메인 추출
3. 이번에 등장한 도메인 중 본인의 30일 이내 조사(`competitor_company_profiles`)에 없는 것만 Perplexity로 리서치 →
   GPT-4o-mini로 회사명 추출 → 캐시에 저장 (병렬 처리)
4. GPT-4o로 키워드 단위 심층 분석(경쟁사/USP/콘텐츠 아이디어) 작성
5. (선택, 버튼) Claude로 분석 텍스트를 HTML 리포트로 변환

## Phase 진행 상태

[AGENTS.md](AGENTS.md)의 Phase 표 참고.

## 명령어

```bash
npm run dev       # 로컬 개발 서버
npm run build     # 프로덕션 빌드
```

## 환경변수 (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_MAIN_SITE_URL=
```


## 2026-10-16 DB 연동 변수 호환 — v1.05 (competitor-analysis)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.


## v1.07 스마트 매트릭스 Windows 인수

서비스: https://competitor-analysis.buylife.xyz

작업 전 루트 지침·ACTIVE_WORK·최신 HANDOFF와 이 폴더 AGENTS.md, [디자인 인수인계](docs/DESIGN_HANDOFF.md), [개선 인수인계](docs/IMPROVEMENT_HANDOFF_20261016.md), [개선 원장](docs/IMPROVEMENTS.md)을 읽습니다. 생성 데이터 공유 금지·30일 자동삭제가 최상위 정책입니다. 초기 전역 캐시 예외는 폐기됐습니다. #12의 v1.08 운영 전환은 승인 대기입니다.

검수: npm run build:verify(기존 루트 DB 변수를 빌드 프로세스에만 주입), npm run test:browser(합성 데이터/액션), node tests/local.mjs start 후 npm run test:runtime(실제 일반 회원·Edge). 운영은 CA_TEST_BASE=https://competitor-analysis.buylife.xyz로 런타임 검사를 실행합니다. 유료 SerpApi/AI 호출과 실제 회원 데이터 쓰기는 하지 않습니다. 운영 결과·배포 ID·미검수·남은 작업은 인수인계 문서에 기록합니다.

최신 운영: v1.07, dpl_2fSGbqZK3PrGWSSy85dyG8m2BmXt READY·DB 일치. 검수 소스 c80a44af, 합성 15개 및 실제 일반 회원 Edge 로컬/운영 각 12개 통과. [배포·검사 범위와 남은 일](docs/DESIGN_HANDOFF.md#7-배포db-최종-기록--2026-10-16-codexwindows)을 확인하세요. 기존 의존성/공유 캐시 권한 위험은 #11/#12로 남아 있습니다.

## 2026-10-16 회원 생성 데이터 격리·30일 자동삭제 — v1.08 적용 준비

**정책 확정, 수정안 검수 완료, 운영 DB 변경·만료 자료 삭제 승인 대기입니다. 운영은 v1.07입니다. 후보 코드를 먼저 배포하지 않습니다.**

주인님 재확정: 본인 계정·본인 API로 만든 자료는 본인만 사용하며 다른 회원과 공유·복사·재사용하지 않습니다. 공개 회사자료/비용 절감도 예외가 아닙니다. 공통 Supabase 기반 시설은 유지하고 회원별 `user_id`·RLS로 나눕니다.

후보 v1.08은 `competitor_company_profiles`에 회원별 조사를 새로 저장합니다. 소유자 없는 옛 `competitor_profiles`는 회원 읽기·쓰기를 차단하며 누구에게도 복사하지 않습니다. 생성 자료는 30일 시점부터 접근 차단하고 매시 07분(UTC) 정리합니다. 키워드 정의·추적 선택·계정·키·권한·결제·설정은 삭제 대상이 아닙니다. 분석 회차의 검색결과·리포트는 그 회차 생성일을 기준으로 함께 만료합니다.

재개 순서·검수 증거·승인 범위: [회원별 보관 정책 인수인계](docs/MEMBER_RETENTION_HANDOFF_20261016.md). 개발 플랜: [PLAN](docs/PLAN_20261016_MEMBER_DATA_RETENTION.md). 유료 외부 호출 0회입니다.
