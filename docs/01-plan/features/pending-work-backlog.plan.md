---
template: plan
version: 1.0
description: AIMaster 전체 남은 작업 리스트 — 다음 작업 요청 시 추천 리스트로 사용
variables:
  - feature: pending-work-backlog
  - date: 2026-09-04
  - author: buylifemall@gmail.com
  - project: ai-master
---

# pending-work-backlog Planning Document

> **Summary**: "남은 작업/다음 작업 뭐가 있지?"라고 물을 때마다 매번 새로 정리하지 않도록,
> 2026-09-04 시점까지의 전체 남은 작업을 한 곳에 모았다. 새 작업을 시작하거나 완료할 때마다
> 이 문서의 상태를 갱신할 것.
>
> **Project**: ai-master
> **Author**: buylifemall@gmail.com
> **Date**: 2026-09-04
> **Status**: 진행 중 — 상태는 각 항목별로 표시

---

## 🔴 사용자 액션 대기 중 (에이전트가 진행하려면 이게 먼저 필요)

| 항목 | 상태 | 다음 단계 |
|---|---|---|
| 결제 연동(포트원+토스페이먼츠) | Phase A(사업자 인증 신청) 진행 중 | 승인되면 Store ID/채널 키/API 시크릿 전달 → Phase B(코드 연동) 착수. 계획: `docs/01-plan/features/payment-integration.plan.md` |
| 카카오 알림톡 템플릿 승인 | 코드 완성(trending-product-finder, real_estate_sales), 템플릿 미승인 | Solapi 콘솔에서 발송문구 전체를 담는 변수 1개(`#{내용}`) 템플릿 만들어 승인받고, 각 프로젝트 설정 페이지에 템플릿 ID 등록 |

## 🟡 다음 착수 후보 (방향만 정하면 바로 진행 가능)

| 항목 | 비고 |
|---|---|
| threads-affiliate-poster(쓰레드 쇼핑제휴 자동화) 착수 | 계획서 있음(`C:\Users\Administrator\.claude\plans\imperative-sparking-flute.md`), 미착수. 쿠팡파트너스 API 미승인 상태 — 알리익스프레스부터 먼저 할지, 쿠팡 승인 기다릴지 결정 필요 |
| 카카오톡 자동화 백로그 나머지 | 카카오톡 공유(추천인 시스템과 결합, 프론트엔드 SDK만 필요해 가벼움), 카카오싱크(로그인 체계 확장, 큰 결정 필요) |

## 🟢 구현 완료, 실사용 검증 전

**trending-product-finder** (`AGENTS.md` Phase 표 참고)
- Phase 8: 11번가 경쟁도 지표가 리포트에 실제 반영되는지
- Phase 10: 이메일·카카오톡(친구톡) 알림 발송 테스트(텔레그램은 검증 완료)
- Phase 14/18: 가격·소싱 예약 알림 실제 도착 여부
- Phase 19: 프로모션 키워드+마진율 필터
- Phase 20: 워치리스트 키워드 개별 추가/삭제
- Phase 21: 카카오 알림톡 채널(템플릿 승인 후 테스트 가능)

**real_estate_sales**
- 신규 SOLAPI(문자·알림톡) 채널

**루트(AIMaster)**
- FAQ(`/support/faq`)·공지사항(`/support/notice`)·약관 3종(`/terms`,`/privacy`,`/refund`) — 화면 동작은 확인, 로그인 후 관리자 편집 등 브라우저 실사용 테스트는 아직

## ⚪ 백로그 (우선순위 낮음, 미착수)

- `docs/01-plan/features/naver-kakao-automation-backlog.plan.md`의 나머지 33개 항목 중 미착수분(부동산 상담 챗봇, 알림톡 CRM 자동화, AI 공동구매 상품 발굴 엔진 등)
- trending-product-finder Phase 4b(Google Ads), 12(환율 자동갱신), 13(관세율 참고표), 15(기회점수 즉시알림), 16(스마트스토어 자동등록), 17(쿠팡 Wing API)

## ✅ 이번 세션에서 완료된 것 (참고용, 재작업 불필요)

- 상품소싱 자동화 Phase 19(프로모션+마진율 필터), 20(키워드 개별수정), 21(카카오 알림톡)
- 루트 접근권한 로직 중앙화(`lib/access/checkProgramAccess.ts`) — blog "일반 등급인데 접근 안 됨" 버그 근본 수정
- `grade_program_access` RLS 정책 누락 수정
- blog 이미지 생성 fallback 경로에 한국인 기본 묘사 규칙 누락 수정
- blog·threads의 API 키 운영자 공용 폴백 로직 제거(BYOK 정책 준수)
- FAQ/공지사항/약관 3종 페이지 + 관리자 CRUD 신설
- real_estate_sales에 SOLAPI(문자·카카오톡) 연동 신규 추가

## 착수 시 진행 방식

1. 위 목록에서 사용자가 하나를 고른다(또는 "남은 작업 뭐가 있어" 질문에 이 문서 기반으로 추천).
2. 착수 직전 관련 코드/API 최신 상태 재확인(API/정책은 계속 바뀔 수 있음).
3. 착수하면 이 문서의 해당 항목을 상태 갱신하고, 완료되면 "완료된 것" 섹션으로 옮긴다.

## Version History

| 버전 | 날짜 | 변경 내용 |
|---|---|---|
| 1.0 | 2026-09-04 | 최초 작성 — 결제연동/카카오알림톡/threads-affiliate-poster 등 전체 남은 작업 취합 |
