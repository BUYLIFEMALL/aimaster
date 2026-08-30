---
template: plan
version: 1.0
description: PortOne(포트원) + 토스페이먼츠 결제 연동 작업 계획
variables:
  - feature: payment-integration
  - date: 2026-08-26
  - author: buylifemall@gmail.com
  - project: ai-master
---

# payment-integration Planning Document

> **Summary**: 현재 페이앱(PayApp)으로 구현된 1회성 결제 링크 방식을, **포트원(PortOne) + 토스페이먼츠** 조합의
> 빌링키 기반 자동 정기결제로 전환한다. 사업자등록증이 있어 정식 PG 계약이 가능하다는 전제로 결정했다.
>
> **Project**: ai-master
> **Author**: buylifemall@gmail.com
> **Date**: 2026-08-26
> **Status**: 대기 중 — 사용자가 포트원 가입/전자결제 신청(사업자 서류 제출)을 완료한 뒤 API 키를 전달하면
> 개발 착수

---

## 1. 배경 (왜 바꾸나)

- 현재 `lib/payapp/client.ts`는 **1회성 결제 링크(`payreq`)만 구현**되어 있고 자동 갱신(정기결제)이 없다.
  구독 만료 시마다 사용자가 직접 다시 결제해야 하는 구조라, `pricing_plans`의 `monthly`/`biannual`/`annual`
  플랜 취지와 맞지 않는다.
- 페이앱은 개인도 가입 가능하지만, **누적 거래액 2,400만원 초과 시 거래가 제한**되고, 보증보험 요구 기준도
  더 낮다(건당 50만원 또는 월매출 500만원 초과 시 요청받을 수 있음).
- 사업자등록증이 있으므로 정식 PG사 계약이 가능 → 더 안정적이고 확장 가능한 구조로 전환.

## 2. 조사 결과 요약 (PG사 비교)

| | 페이앱(현재) | 페이플(Payple) | 포트원(PortOne)+토스페이먼츠 |
|---|---|---|---|
| 사업자등록 | 불필요(개인 가능) | 필수 | 필수 |
| 자동 정기결제 | 지원(단, 현재 코드는 1회성 링크만 구현됨) | 지원(빌링키) | 지원(빌링키, 여러 PG 통합 관리) |
| 개인 한도 | 누적 2,400만원 초과 시 거래 제한 | 해당없음 | 해당없음 |
| 보증보험 없이 시작 가능 기준 | 건당 50만원 또는 월매출 500만원 이하 | 계약별 상이 | **월 정산한도 1천만원 미만**은 신규 가맹점 면제(토스페이먼츠 기준) |
| 카드 수수료 | 개인 기준 상대적으로 높음 | 계약별 상이(멤버십 월 5.5만원, D+1정산) | 월 거래 5천만원 미만 이용료 무료, 카드 약 3.4%(협상 가능) |
| 확장성 | 낮음 | 중간 | 높음 — 카카오페이/네이버페이/삼성페이를 코드 수정 없이 추가 가능 |

**결론**: 포트원(통합 레이어) + 토스페이먼츠(기본 PG) 조합으로 결정. 필요 시 나중에 PG를 바꿔도 포트원의
"슈퍼빌링키" 기능으로 빌링키 재등록 없이 이전 가능.

### 참고 자료
- [포트원 PG 비교 2026](https://blog.portone.io/opi_pg-comparison2026/)
- [토스페이먼츠 vs 포트원 비교](https://www.easyspark.io/ideas/tosspayments-vs-portone-which-to-choose-complete-comparison-2026)
- [포트원 이용요금](https://www.portone.io/pricing)
- [포트원 정기·구독결제 시작하기](https://docs-global-kr.portone.cloud/integration/subscribe/pay-billkey)
- [포트원 빌링키 API 문서](https://portone.gitbook.io/docs/v2-payment/unauthpay/billing-key/1/api)
- [포트원 정산한도·보증보험 기준](https://blog.portone.io/opi_settlement-limit/)
- [포트원 가입~승인 절차 가이드](https://www.ganatoday.kr/2026/01/portone-1-2.html)
- [페이플 1인 개발자 가이드](https://agentic30.app/blog/payple-guide)

## 3. 정기결제 동작 방식

빌링키(Billing Key) 기반 — 카드 정보를 암호화해 발급받은 키로, 이후 결제 시 구매자 재인증 없이 서버에서
바로 청구 가능. 두 가지 발급 방식 중 결제창 인증 방식을 기본으로 채택(카드 정보를 우리 서버가 직접 다루지
않아도 됨):

1. 결제창에서 카드 등록(1회) → 포트원이 PG(토스페이먼츠)를 통해 빌링키 발급
2. 빌링키를 DB에 저장
3. 구독 갱신 시점마다 Cron이 저장된 빌링키로 자동 청구
4. 청구 성공/실패는 웹훅으로 수신해 `subscriptions`/`payment_records` 갱신

## 4. 작업 절차

### Phase A — 가입·계약 (사용자 직접 진행, 서류 필요)
1. [포트원 관리자콘솔](https://console.portone.io) 가입 (이메일/구글/네이버) + 휴대폰 인증
2. 콘솔 좌측 상단 **"전자결제 신청"** → 사업자등록증 업로드 + 회사/대표자 정보 + 담당자 연락처 + 정산 계좌 제출
   (심사 1~2영업일)
3. 결제 서비스로 **토스페이먼츠** 선택 → "신청하러 가기" → 토스페이먼츠 상점관리자 페이지에서 추가 본인인증
   + 신청서 제출
4. 승인 완료 이메일 수신 또는 콘솔 "상점·계정관리"에서 상태 확인 → **Store ID / 채널 키 / API 시크릿** 발급
5. (참고) 콘솔 "결제 연동 → 채널 관리 → 채널 추가"에서 토스페이먼츠 채널·CID 확인(대부분 3단계에서 자동 세팅됨)

### Phase B — 기술 연동 (API 키 전달 후 개발 착수)
1. `/api/payment/initiate`를 빌링키 발급 요청 방식으로 재작성 (카드 등록 → 빌링키 수신 → 저장)
2. 빌링키 저장 위치 결정: `subscriptions` 테이블에 컬럼 추가 또는 신규 `billing_keys` 테이블 신설
3. 결제/자동갱신 웹훅 처리 라우트 추가 — 기존 `payment_records`/`subscriptions` 스키마 재사용
4. 만료 시점마다 저장된 빌링키로 자동 청구하는 Vercel Cron 신규 추가
5. 실결제 테스트로 전체 흐름(카드 등록 → 첫 결제 → 자동 갱신 → 웹훅 반영) 검증
6. 기존 페이앱(`lib/payapp/client.ts`, `/api/payment/initiate` 페이앱 분기) 코드 정리

## 5. 현재 상태

Phase A 시작 전. 사용자가 포트원 가입 + 전자결제 신청(사업자 서류 제출)을 완료하고 Store ID / 채널 키 /
API 시크릿을 전달하면 Phase B 착수.

## Version History

| 버전 | 날짜 | 변경 내용 |
|---|---|---|
| 1.0 | 2026-08-26 | 최초 작성 — PG사 조사 결과, 결정 사유, 절차 정리 |
