---
template: plan
version: 1.1
description: 네이버·카카오 플랫폼 연동 차세대 자동화 백로그 검수 및 아키텍처 보완 가이드
variables:
  - feature: naver-kakao-automation-review
  - date: 2026-08-30
  - author: buylifemall@gmail.com
  - project: ai-master
---

# naver-kakao-automation-review Guidance Document

> **Summary**: 본 문서는 `naver-kakao-automation-backlog.plan.md`에 대한 기술 검수 리포트이자, **에이전트(Claude Code, Antigravity, Codex 등)가 관련 자동화 서브프로젝트 개발에 착수하기 전 반드시 숙지해야 하는 기술 아키텍처 및 보완 지침**이다.
>
> **Project**: ai-master  
> **Author**: buylifemall@gmail.com  
> **Date**: 2026-08-30  
> **Target Backlog Document**: [`docs/01-plan/features/naver-kakao-automation-backlog.plan.md`](file:///d:/Claude%20Code/AIMaster/docs/01-plan/features/naver-kakao-automation-backlog.plan.md)

---

## 1. 에이전트 작업 필수 준수사항 (Crucial Technical Guidelines)

모든 에이전트는 네이버/카카오/부동산 공공데이터 관련 모듈 개발 시 다음 4가지 핵심 아키텍처 규칙을 준수해야 한다.

### 1) NCP HMAC-SHA256 서명 모듈 (Next.js 모듈화)
- **외부 n8n 의존 금지**: Ncloud 공통 API(SENS, Mailer 등)의 HMAC-SHA256 서명 생성은 n8n이 아닌 AIMaster 내부 모듈(`lib/ncp/signature.ts`)에서 Node.js `crypto` 모듈로 직접 처리한다.
- **5분 타임스탬프 오차 주의**: API 요청 시점과 NCP API Gateway 간 5분 이상 차이 시 401 오류가 발생하므로 서버 타임스탬프 동기화를 보장한다.

### 2) 공공데이터(국토부) XML ➔ JSON 파싱 파이프라인
- **XML 파싱 필수**: 국토교통부 실거래가 API 등 공공데이터포털 API는 XML 응답이 기본이다.
- **파서 표준화**: `fast-xml-parser` 라이브러리를 사용하여 백엔드 API Route(`app/api/real-estate/transaction/route.ts`) 내에서 JSON으로 정규화한 뒤 클라이언트에 전달한다.

### 3) 데이터랩 API (일 1,000회 제한) DB 캐싱
- **Supabase Caching 테이블 구축**: 키워드 트렌드/쇼핑 인사이트는 API 호출 한도가 낮다.
- **TTL 적용**: `trend_cache` 테이블을 Supabase에 구축하여 24시간 이내 동일 키워드/카테고리 요청 시 API를 재호출하지 않고 캐시 데이터를 반환한다.

### 4) NCP SENS 통합 래퍼 & 메시징 회복력 (Resilience)
- **단일 래퍼 구축**: `lib/ncp/sens.ts` 모듈 구축.
- **Fallback 무인 재발송**: 1차 카카오 알림톡 발송 실패 또는 수신 거부 발생 시, 자동으로 2차 SMS/LMS로 재발송하는 회복성 파이프라인을 필수 구현한다.

---

## 2. AIMaster 서브프로젝트 시너지 파이프라인

새 서브프로젝트 구축 시 기존 서브프로젝트의 자산과 통합하여 개발한다.

### ① 이커머스 소싱 + 어필리에이트 자동화 파이프라인
- **결합 대상**: `coupang` + `threads-affiliate-poster` + 네이버 API HUB
- **데이터 흐름**:  
  `네이버 API HUB (트렌드/쇼핑) 급상승 상품 감지` ➔ `쿠팡 파트너스/스마트스토어 최저가 매칭` ➔ `CLOVA Studio 홍보문구 생성` ➔ `threads-affiliate-poster 자동 게시`

### ② 부동산 지도 시각화 + 갭투자 위험 뱃지 + 알림 파이프라인
- **결합 대상**: `real_estate_sales` + 국토부 API + NCP SENS 알림톡
- **데이터 흐름**:  
  `국토부 실거래가 수집` ➔ `전세가율 계산 (전세가/매매가 > 80% 시 🚨 갭투자 위험 뱃지)` ➔ `VWorld/Kakao Map 시각화` ➔ `NCP SENS 알림톡 실거래 변동 통지`

### ③ 강의/음성 텍스트화 및 전자책 변환 파이프라인
- **결합 대상**: `music` (웹훅/폴링 패턴) + CLOVA Speech + CLOVA Studio
- **데이터 흐름**:  
  `대용량 오디오 업로드` ➔ `CLOVA Speech 비동기 STT` ➔ `CLOVA Studio 장문 요약 & 전자책 목차 구성` ➔ `PDF/Markdown 자동 변환`

---

## 3. Phase별 개발 추천 순서

```
Phase 1 (Quick Win MVP)
└─ real_estate_sales 서브프로젝트에 국토부 매매+전월세 실거래가 API 연결 
   ➔ 전세가율 및 갭투자 위험도 뱃지 산출 기능

Phase 2 (Commerce & Affiliate Synergy)
└─ 네이버 API HUB + 쿠팡 API + threads-affiliate-poster 
   ➔ 실시간 핫딜 소싱 & Threads/인스타 자동 포스팅 마케팅 엔진

Phase 3 (Enterprise Messaging & CRM)
└─ lib/ncp/sens.ts 통합 래퍼 구축 
   ➔ 카카오 알림톡 + SMS Fallback 메시징 엔진
```

---

## Version History

| 버전 | 날짜 | 변경 내용 |
|---|---|---|
| 1.1 | 2026-08-30 | Gemini 3.6 Flash 기술 검수 리포트 작성 — Next.js HMAC 모듈, XML 파서, DB 캐싱 및 3대 시너지 파이프라인 명시 |
