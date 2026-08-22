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
- **경쟁사 정보를 전역 공유 캐시로 전환**: `competitor_profiles`는 `user_id`가 없는 유일한
  테이블이다. 도메인 → 회사정보는 객관적 사실이라 여러 회원이 같은 도메인(예: 쿠팡, 네이버)을
  조회해도 Perplexity/GPT 리서치를 한 번만 하도록 설계했다 — 비용 절감이 핵심 목적. "이 도메인을
  내 경쟁사로 표시"만 `user_tracked_competitors`로 개인화했다.

## 데이터 모델

- `competitor_keywords` — 추적 키워드(지역/구글도메인/언어, 모니터링 on/off)
- `competitor_serp_jobs` — 검색 1회 실행 기록
- `competitor_serp_results` — 검색결과 개별 항목(organic/ad/paa/local)
- `competitor_profiles` — 도메인 → 회사정보 (전역 공유, user_id 없음)
- `user_tracked_competitors` — "내 경쟁사로 표시"한 도메인
- `competitor_analyses` — 키워드/검색 단위 GPT 분석 + 선택적 Claude HTML 리포트

## 분석 흐름 (`lib/actions/analysis.ts`의 `runKeywordAnalysisAction`)

1. SerpApi로 구글 검색 (organic/ad/paa/local 분류)
2. 검색결과 저장 + 링크에서 도메인 추출
3. 이번에 등장한 도메인 중 전역 캐시(`competitor_profiles`)에 없는 것만 Perplexity로 리서치 →
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
