# 📈 AI 소싱 트렌드 발굴 (trending-product-finder)

잘 팔리는 상품, 사람들이 많이 검색하는 상품, 지금 시즌/트렌드에 맞는 상품을 자동으로 발굴·추천해주는 AIMaster 서브프로젝트입니다.

## 핵심 흐름

1. 회원이 관심 카테고리 + 추적할 키워드(최대 10개)를 등록
2. "지금 리포트 생성"을 누르면:
   - 네이버 데이터랩(쇼핑인사이트)으로 키워드별 관심도 지수 추이 조회
   - 네이버쇼핑 검색 API로 키워드별 등록 상품 수(경쟁도)·가격대 조회
   - 코드로 결정적인 "기회 점수" 계산 (관심도 + 상승폭 − 경쟁도)
   - 등록된 OpenAI/Gemini 키로 추천 사유 문장 생성
3. 트렌드 리포트 페이지에서 기회 점수 순으로 랭킹 확인

## 설계 배경 — Phase 1 범위를 좁힌 이유

원래는 "카테고리 내 인기검색어 TOP500을 자동으로 스캔해서 상승 키워드를 발굴"하는 것까지
생각했지만, 조사 결과 그 TOP500 랭킹은 데이터랩 **웹사이트 UI 전용 기능**이고 공식 Open API로는
노출되지 않는다(공식 API는 "카테고리 트렌드"와 "카테고리+키워드 트렌드" 두 엔드포인트만 제공).
그래서 Phase 1은 "회원이 직접 지정한 키워드를 추적"하는 방식으로 정확하게 구현했다 — 존재하지
않는 API를 있는 것처럼 설계하지 않는다.

## 사용 가능한 API 소싱 매트릭스 (전체 조사 결과)

| 소스 | 용도 | 상태 |
|---|---|---|
| 네이버 데이터랩 쇼핑인사이트 | 카테고리+키워드별 관심도 지수(상대값) | **Phase 1 구현** — 일 1,000회 한도 |
| 네이버 검색 API(쇼핑) | 키워드별 등록 상품 수(경쟁도)·가격대 | **Phase 1 구현** — 일 25,000회 |
| 쿠팡파트너스 상품검색 API | 실제 판매 중인 상품 매칭, 제휴링크 생성 | Phase 2 예정 — `threads-affiliate-poster`의 client 재사용 |
| 알리익스프레스 Affiliate API | 해외 소싱 원가 비교 | Phase 3 예정 — 동일 재사용 |
| Google Ads API(Keyword Planner) | 영문/글로벌 키워드 검색량 | Phase 4 예정 — 회원 본인 Google Ads 계정+개발자 토큰 필요 |
| Google Trends 공식 API | 실시간 급상승 검색어 | 2026년 현재 신청제 알파, 일반 발급 불가 — 승인되면 추가 |
| Google Merchant Center Best Sellers | 카테고리별 글로벌 베스트셀러 랭킹 | 자격요건(기존 쇼핑몰 운영) 필요 — 후순위 선택 기능 |

## Phase 로드맵

| Phase | 내용 | 상태 |
|---|---|---|
| 1 | 관심 키워드 등록, 데이터랩+쇼핑검색 기반 기회 점수 리포트 | ✅ 구현 완료 |
| 2 | 쿠팡파트너스 결합 → 실제 판매 가능 후보 상품 매칭, `threads-affiliate-poster` 원클릭 연동 | ⏳ 예정 |
| 3 | 알리익스프레스 원가 비교 + 마진 시뮬레이션 | ⏳ 예정 |
| 4 | Google Ads API(선택 연동) 글로벌 검색량 추가, Vercel Cron으로 활성 관심목록 정기 자동 리포트 | ⏳ 예정 |

## 환경변수 (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_MAIN_SITE_URL=https://buylife.xyz
```
(전부 AIMaster 공용 Supabase 프로젝트 값 그대로 재사용 — 이 프로젝트만의 별도 키 없음)

## 회원이 직접 연동해야 하는 것 (설정 페이지)
- 네이버 개발자센터 Client ID/Secret — 애플리케이션 등록 시 "검색"과 "데이터랩(쇼핑인사이트)"
  API를 함께 선택해야 두 기능 모두 사용 가능
- OpenAI 또는 Gemini 중 1개 — 추천 사유 생성용 (없어도 기회 점수 계산 자체는 동작)

## 명령어
```bash
npm install
npm run dev     # http://localhost:3000
npm run build
```
