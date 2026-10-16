# 개선 인수인계 — 구글폼 CRM 자동화 (2026-10-17, Claude Code 맥미니)

## 한 일 (v1.09)
스마트 매트릭스 라이트 변형 디자인. 플랜 [PLAN_20261017_DESIGN_RENEWAL.md](PLAN_20261017_DESIGN_RENEWAL.md), 디자인 [DESIGN_HANDOFF.md](DESIGN_HANDOFF.md), 원장 [IMPROVEMENTS.md](IMPROVEMENTS.md).

## 바뀐 파일
- 신규: `app/(dashboard)/dashboard/page.tsx`, `app/(dashboard)/guide/page.tsx`, `components/submissions/SubmissionMatrix.tsx`, `components/layout/PageHero.tsx`, `components/dashboard/KpiCard.tsx`, `components/ui/CopyButton.tsx`, `lib/format.ts`, `docs/*`
- 수정: `app/globals.css`, `tailwind.config.ts`, `app/layout.tsx`, `app/(dashboard)/layout.tsx`, `next.config.mjs`(`/` → `/dashboard`), `components/layout/Sidebar.tsx`, 페이지 4개(구글폼 연결·접수 내역·RCS·설정), `components/{sources,promotions,settings}/*`(색 클래스만 토큰으로), `lib/version.ts`(v1.09)
- 웹훅·발송·Cron·DB 변경 없음.

## 확인한 것 / 못 한 것
- 확인: 정적 검토, 남은 밝은 고정 색은 안내 박스(앰버)·코드 블록(검정)·빨강 hover뿐(의도).
- **못 한 것**: `npm run build`·배포·화면 검수(맥미니 빌드 금지). 실제 발송 없음.

## 다음 첫 단계 (윈도우 CLI)
1. `docs/ACTIVE_WORK.md` 줄 추가 → `cd crm-google-form && npm run build`.
2. `vercel deploy --prod --yes` → DB `update programs set version='v1.09', updated_at=now() where slug='crm-google-form';`
3. `buylifemall@naver.com` 1440px·375px: `/`→`/dashboard`, 발송 계정 칩, 구글폼 연결 카드(설정 펼치기·복사·매핑·채널 체크), 접수 내역(데이터 없으면 빈 화면 + 합성 검사로 필터·펼치기), RCS 화면(발송 버튼은 누르지 않음), 설정, `/guide`, ☰.
4. 루트 `DESIGN.md` 52번 「✅ 1차 작업완료 (`v1.09`, …)」, `DESIGN_HANDOFF.md` 기록, ACTIVE_WORK 줄 삭제.
5. (주인님 승인 시) 원장 #1·#2 웹훅 보강.
