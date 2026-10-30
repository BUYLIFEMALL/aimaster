# 개발 플랜 — RE-B4 경기·인천 지역 확장 (`real_estate_sales`)

- 작성: 2026-10-30 · [역할: realty] Claude Code(윈도우) · 세션 `claude-win-realty-docs`
- 근거: `docs/IMPROVEMENTS.md` #6, `docs/REAL_ESTATE_CONSOLIDATION_TASKS.md` RE-B4 · 주인님 「그다음 진행해」(2026-10-30)
- 운영 DB: ① AIMaster `esgxyikcnnvmlhygjkth`

## 1. 지금 구조와 문제
- 실거래 자료를 **서울 열린데이터 `tbLnOpendataRtmsV`**(서울 25개 구만)에서 받는다(`src/lib/publicdata/client.ts` `fetchSeoulTrades`). 감시 지역 목록도 서울 25개 고정(`districts.ts` `SEOUL_DISTRICTS`).
- 새 실거래 1건마다 건축물대장(전용면적)·공시가격(VWorld, PNU)·전월세 비교(서울 열린데이터)를 붙여 `real_estate_listings`에 저장 → AI 분석 → 텔레그램.

## 2. 무엇을 하나 (1차)
| # | 내용 | 바꾸는 곳 |
|---|---|---|
| 1 | 경기 시·군·구(일반구 포함)·인천 군·구 **법정동 앞 5자리 코드 목록** 추가, 지역마다 시·도 표시 | `districts.ts`(`SEOUL_DISTRICTS` 유지 + `CAPITAL_DISTRICTS`), 코드는 행정표준코드관리시스템 법정동코드 자료에서 뽑아 넣음(기억으로 쓰지 않음) |
| 2 | 서울 밖 지역은 **국토부 아파트 매매 실거래가 API**(`RTMSDataSvcAptTrade`, 공공데이터 15126469)로 받기 — `realty-listing-alert/lib/trades.ts`의 주소·요청 방식 가져옴. 이번 달·지난달 2번 조회 | `client.ts` `fetchMolitTrades` 새 함수 |
| 3 | 국토부 응답을 지금 서울 줄 모양(`SeoulRtmsRow`)으로 바꿔 넣기 — `sggCd→CGG_CD`, `umdCd→STDG_CD`, `umdNm→STDG_NM`, `landCd→LOTNO_SE`, `bonbun→MNO`, `bubun→SNO`, `aptNm→BLDG_NM`, 계약일, `dealAmount→THING_AMT`, `excluUseAr→ARCH_AREA`, `floor→FLR`, `buildYear→ARCH_YR`, 해제 거래(`cdealType`)는 버림 → **중복 키·PNU·건축물대장·공시가격·AI 분석·알림 코드는 그대로** | `client.ts` 변환 함수, `collect.ts`는 지역 코드 앞 2자리로 서울/국토부 고르기만 |
| 4 | 감시 지역 화면을 **서울 / 경기 / 인천** 묶음으로(지금 버튼 목록을 시·도 탭으로) | `app/(dashboard)/districts/page.tsx`, `lib/actions/districts.ts`(허용 목록) |
| 5 | 전월세 비교는 서울 전용 자료라 **경기·인천은 1차에서 「—」**(빈칸)로 두고 화면에 「서울만」 안내 | `collect.ts` |

- DB 구조 변경 없음(감시 지역·수집 상태 표가 이미 `sgg_cd` 글자 칸) — 확인 후 필요하면 다시 보고.
- 키: 회원 본인 `data_go_kr_service_key` → 없으면 운영자 공용 `DATA_GO_KR_SERVICE_KEY`(이미 주인님 결정 #8 「당분간 운영자 키」, 무료 공공 데이터 예외 §8 그대로).

## 3. 순서와 검수
1. **무료 사전 확인 1회**: 운영자 키로 국토부 API를 경기 1곳(고양 일산동구 41285)·인천 1곳에 한 번씩 불러 응답 칸(`umdCd`·`bonbun` 등)과 키 승인 상태 확인(공공 데이터, 무료)
2. 지역 코드 목록 + 변환 함수 + 시험(변환·중복 키·PNU가 서울 줄과 같은 모양인지, 해제 거래 버림)
3. `collect.ts` 분기 · 화면 시·도 탭
4. tsc·시험·로컬 빌드 → 버전 **v1.23**(미배포 대기 `zod` 등 함께) → 배포 1회 → DB 버전 → 크롬(시험 계정)으로 경기 1곳 감시 추가·「지금 조회하기」로 실제 수집·알림 확인
5. 인수인계·비교표·작업 표 갱신

## 4. 하지 않는 것 / 2차로 미룸
- 경기·인천 전월세 비교(국토부 전월세 API는 별도 활용신청 필요) → 2차
- 오피스텔·연립 등 아파트 밖 거래 → 범위 밖
- 매물 알림(`realty-listing-alert`) 코드는 고치지 않음(코드만 참고해 복사, 각자 독립 배포 규칙)

## 5. 비용
| 항목 | 횟수 | 비고 |
|---|---|---|
| 공공데이터 API(국토부·건축물대장·VWorld) | 사전 확인 2회 + 실물 시험 수십 회 | 무료(일일 한도 안) |
| Vercel 빌드(실거래) | 1회 | **사전 승인 필요** |
| AI 분석 | 실물 시험 때 회원 본인 키로 몇 건 | 시험 계정 본인 키 — 「지금 조회하기」 때 알림 AI 분석이 켜져 있으면 발생, 꺼서 시험 가능 |

## 6. 위험
- 국토부 API가 운영자 키로 승인 안 돼 있으면(403) 1번에서 바로 드러남 → 주인님께 공공데이터포털 15126469 활용신청 요청
- 경기 일반구 코드 실수 → 공식 법정동코드 자료에서만 뽑고, 사전 확인 때 몇 곳 실제 호출로 대조
- 수집 시간: 지역마다 국토부 2번 호출이 늘어 예약 수집 시간이 길어짐 → 지역당 상한(`MAX_NEW_LISTINGS_PER_DISTRICT` 20) 그대로, 300초 안 계산 후 진행
