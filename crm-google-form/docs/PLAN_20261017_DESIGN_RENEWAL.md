# 디자인 리뉴얼 개발 플랜 — 구글폼 CRM 자동화 (2026-10-17, v1.08 → v1.09)

- **작업자**: Claude Code(맥미니) · **주인님 지시**: 「crm-google-form 이거 진행하자」
- **적용 템플릿**: **스마트 매트릭스 — 라이트 변형**(현황판 권장 배경 라이트). 뼈대가 기준 구현 `longtail-keyword-expander`와 같아(Next 14 + Tailwind v3) 클래스·부품을 가져오고 색 값만 `file-merge` 라이트 토큰으로.

## 1. 사전 분석 (지침 8번)
| 항목 | 현재 상태 |
|---|---|
| 라우트 | `/`(→ 접수 내역) · `/sources` · `/submissions` · `/promotions` · `/settings` · API `webhooks/form-submit/[token]`(Apps Script 수신) · `cron/followup`(CRON_SECRET) |
| 데이터 흐름 | 구글폼 → 응답 시트 Apps Script → 웹훅(토큰으로 폼 확인) → `crm_submissions` 저장 → 이메일·SMS·알림톡·친구톡·텔레그램 발송(`lib/crm/dispatch.ts`) · 팔로우업 규칙은 Cron |
| 계정 | 회원 본인 SMTP·SOLAPI(공용 테이블)·텔레그램(프로그램별) — 폴백 없음 |
| 디자인 | 흰 배경 카드, **휴대폰 ☰ 없음(원칙 19)**, 대시보드·매뉴얼 없음, 접수 내역 검색·필터 없음, 시각 UTC |
| 웹훅 위험(이번 범위 밖, 원장 기록) | `response_id` 중복 미검사(재전송 시 이중 발송·이중 요금), 크기·횟수 제한 없음(주소 유출 시 가짜 접수 → 회원 SOLAPI 요금) |

## 2. 구현 순서
| 단계 | 내용 |
|---|---|
| 1 | 롱테일 `globals.css`·`PageHero`·`KpiCard`·`format.ts`·`CopyButton` 이식 + 라이트 토큰, Tailwind `mx` 색 |
| 2 | 사이드바(🏠·스텝 2개·📢 RCS·🔑·📖, 휴대폰 ☰), `/dashboard` 신설(`/` → `/dashboard`): KPI(연결 폼·전체 접수·7일 접수·발송 실패), 발송 계정 3종 상태, 작업 흐름, 최근 접수 |
| 3 | `/submissions`: KPI + 검색(이름·연락처·이메일)·상태·폼 필터 표 + 행별 원본 응답 펼치기 · 기존 화면(구글폼 연결·RCS·설정)은 히어로 + 회색·파랑 클래스를 토큰으로 일괄 치환 |
| 4 | `/guide` 신설: 캐릭터, 4단계, 채널별 필요한 연결 표, TIP/주의, 계정 매뉴얼, FAQ |
| 5 | 문서·버전 v1.09·현황판 🟠 |
- **비용**: 없음(실제 발송 안 함). **빌드·배포**: 윈도우 CLI 요청.
