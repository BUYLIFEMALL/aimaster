# 부동산 프로그램 보강·기능 확장 순차 작업목록

> **상태: 초안(2026-10-24, 작성 claude-win-dotori [역할: analysis-planning]) — 담당 세션 확인 전.** 부동산은 담당 역할이 아직 없다. 담당 세션(또는 주인님이 지정한 세션)이 확인하기 전까지는 참고 자료로만 쓴다. 이 문서 작성으로 운영 코드·DB·키·회원 권한·버전·배포는 바뀌지 않았다.

대상은 **AIMaster 운영**이다. 공통 DB ref `esgxyikcnnvmlhygjkth`. 프로그램: 부동산 실거래 투자분석 자동화 `real-estate-sales`(폴더 `real_estate_sales/`) v1.18. 서울 리전(icn1)·Cron 2개(`/api/collect/dispatch` 5분, `/api/cron/cleanup-sentiment` 매일)를 유지한다.

## 현재 위치와 읽는 순서

1. [부동산 자동화 완성 기준](REAL_ESTATE_COMPLETION_POLICY.md) — 공공 데이터 키 예외(§4), 비공식 데이터 수집 금지(§5).
2. [부동산 기능 상세 비교표](REAL_ESTATE_FEATURE_MATRIX.md) — 지금 코드에 있는 기능·기준 코드.
3. [매물 수집기 분석 보고서](analysis-naver-realty-collector-20261024/REPORT.md) §6, [외부 프로그램 개발분석표](EXTERNAL_PROGRAM_ANALYSIS_REGISTRY.md) EXT-RE-01(N1~N5).
4. 프로그램 기록: `real_estate_sales/AGENTS.md`(「Windows 인수 주의」 먼저)·`docs/IMPROVEMENTS.md`·`docs/CHANGELOG.md`·`README.md`.

**2026-10-24 요약:** 병합할 다른 프로그램은 없다. 외부 원본 EXT-RE-01에서 위험 없는 기능 2개(N1·N2)만 가져오는 안이 주인님 결정 대기다. 회원에게 영향이 갈 수 있는 빈칸 3개가 있다 — 아래 「우선 처리」.

## 우선 처리 — 회원 피해 가능 (코드 확인 근거 포함)

상태는 **대기 → 플랜 제시 → 구현 중 → 로컬 검수 → 운영 검수 → 완료**.

| ID | 문제 | 근거(경로) | 영향 | 제안 첫 단계 | 상태 |
|---|---|---|---|---|---|
| RE-P1 | **AI 분석 결과 30일 자동 삭제 없음** — 지역 분위기만 정리되고 매물 분석은 기한 없이 남음 | `real_estate_sales/src/app/api/cron/cleanup-sentiment/route.ts`(`real_estate_district_sentiment`만 삭제), `real_estate_analyses`를 지우는 코드 없음(`src/` 검색), `vercel.json` Cron 2개 | 최상위 규칙(회원 생성 데이터 30일 삭제) 미충족 | 같은 정리 라우트에 `real_estate_analyses` 30일 삭제 + 회원별 정리 기록(`cleanupUsageLog.ts`의 다른 항목 이름) 추가 — 삭제 시작은 주인님 승인 | ✅ 코드 완료(1년 정리로 변경 — 주인님 지정, `4768f4286`) · v1.20 배포 완료(2026-10-26) |
| RE-P2 | **예약 수집·알림이 회원 사용기간·정지를 확인하지 않음** — 핸드폰만 확인 | `src/app/api/collect/dispatch/route.ts` `phoneRegisteredUserIds`(관리자·핸드폰만), `src/lib/`에 `programAccess.ts` 없음 | 사용기간이 끝난 회원도 알림을 계속 받고, 알림 AI 분석이 켜져 있으면 회원 본인 AI 키 요금이 계속 나감(카카오 뉴스레터 v1.22에서 같은 문제를 고친 사례) | 공용 판정 사본 `programAccess.ts`(카카오 `kakao_auto_poster/src/lib/programAccess.ts`와 같은 판정)로 실행 직전 `checkProgramAccess(…, "real-estate-sales")` | ✅ 코드 완료(`f4509b896`, 만료 회원 1명 제외 확인) · v1.20 배포 완료(2026-10-26) |
| RE-P3 | **매물 분석 프롬프트에 현재 연도 지시 없음** — 「제공 데이터 수집일」만 넣음 | `src/lib/ai/analyze.ts`(사용자 프롬프트 110행 「제공 데이터 수집일」, `getFullYear` 주입 없음). 지역 분위기 `sentiment.ts`는 오늘 날짜 있음 | 「최근 3년 상승률」 같은 추정의 기준 연도를 모델이 과거로 착각할 수 있음(핵심 원칙 8) | 시스템 프롬프트에 `[기준 연도 엄수: 현재 연도는 ${new Date().getFullYear()}년…]` 추가(분석 1회 비용은 회원 키 — 품질 시험은 승인 횟수만) | ✅ 코드 완료(`e35eecdf0`) · v1.20 배포 완료(2026-10-26) |

운영자 키 폴백: AI 키는 회원 본인 것만(`src/lib/apiKeys.ts`, 2026-10-09 폴백 삭제) — 이상 없음. 공공 데이터 공용 키는 승인된 예외(완성 기준 §4) 안이다. 생성 캐시 공유: 지역 분위기 v1.12부터 회원별, 매물 분석은 `user_id` 표이고 옛 재사용 칸 `used_fallback_key`는 `false`만 저장 — 공유 없음.

## EXT-RE-01에서 가져올 기능 (주인님 결정 대기)

| ID / 순서 | 대상과 범위 | 위험·비용 | 근거 | 상태 |
|---|---|---|---|---|
| RE-N1 | 실거래 상세 화면에 「이 단지 네이버 부동산에서 보기」 바로가기(새 창) | 위험·비용 없음(링크만, 수집 없음) | REPORT §5, IDEA-REALTY-01 | ✅ 코드 완료(주인님 진행 지시, `ae0e35ce5`) · 미배포 대기(v1.21) |
| RE-N2 | 실거래 목록 엑셀(또는 CSV) 내보내기 | 공공 데이터라 문제 없음, 엑셀 라이브러리는 카카오 v1.06의 SheetJS 공식 CDN 0.20.3 방식 참고 | REPORT §5, IDEA-REALTY-02 | ✅ 코드 완료(CSV, `ae0e35ce5`) · 미배포 대기(v1.21) |
| RE-N3 | 회원이 직접 연 네이버 부동산 화면의 매물만 확장으로 소량 읽어 실거래와 비교 | 약관·권리 판단 필요 | REPORT §5, IDEA-REALTY-03 | **보류 — 주인님·법률 확인 전 진행 안 함** |
| (N4) | 서버 비공식 내부 주소 반복 수집·1분 자동 | — | 완성 기준 §5 | ❌ 하지 않음 |

## 순차 작업 표 — 보강 (우선 처리 다음)

| ID | 대상과 범위 | 근거 | 상태 |
|---|---|---|---|
| RE-B1 | 실거래 목록 페이지 나눔(현재 50건) | `src/app/(dashboard)/listings/page.tsx` `.limit(50)`, `IMPROVEMENTS.md` #3 | ✅ 코드 완료(`ae0e35ce5`) · 미배포 대기(v1.21) |
| RE-B2 | 상세 열람 시 「안 본 새 실거래」 줄이기(`new → seen`) | `IMPROVEMENTS.md` #5 | ✅ 코드 완료(DB 변경 없이 new→notified, `ae0e35ce5`) · 미배포 대기(v1.21) |
| RE-B3 | 브이월드 등록 도메인 새 주소로 | `src/lib/publicdata/client.ts` 18행 기본값 `n8n.buylife.xyz`, `IMPROVEMENTS.md` #7 | 대기(주인님 브이월드 로그인) |
| RE-B4 | 서울 외 지역(국토부 실거래 API) | `IMPROVEMENTS.md` #6 | 기존 과제 |
| RE-B5 | 개발용 lint 도구 사슬 보안 경고 정리 | `IMPROVEMENTS.md` #11 | 대기 |

## 대기 중인 미배포 변경

- 텔레그램 사본 `linkButton`, 좁은 칸 버튼(`f0871e568`), 지역 분위기 정리 기록(`61142a909`), SOLAPI 사본 — 다음 배포 때 버전 +0.01.

## 주인님 결정이 필요한 것

1. RE-N1·RE-N2를 `real-estate-sales`에 넣을지, RE-N3 검토(법률 포함) 여부.
2. RE-P1 매물 분석 30일 자동 삭제 시작 승인(기존 30일 지난 분석이 한 번에 지워짐).
3. 회원별 매칭 표(`real_estate_user_matches`)를 30일 정리 대상으로 볼지.
4. 부동산 담당 역할 지정.
