# 개선 인수인계 — INSTA DM답변 자동화 (2026-10-17, Claude Code 맥미니)

## 한 일 (v1.13) — 주인님 승인 후 구현
인스타 라이트 (DM 대화 화면). 플랜 [PLAN_20261017_DESIGN_RENEWAL.md](PLAN_20261017_DESIGN_RENEWAL.md) · 디자인 [DESIGN_HANDOFF.md](DESIGN_HANDOFF.md) · 원장 [IMPROVEMENTS.md](IMPROVEMENTS.md)

## 바뀐 파일
- 신규: `app/(dashboard)/dashboard/page.tsx`, `app/(dashboard)/guide/page.tsx`, `components/ui/{IgLogo,StudioHeader}.tsx`(instagram-comment-reply와 같음)
- 수정: `tailwind.config.ts`(`ig-*`), `app/globals.css`, `app/layout.tsx`, `app/(auth)/*`, `app/(dashboard)/layout.tsx`(대기 DM 수), `components/layout/Sidebar.tsx`, DM 검토·이력·설정 화면, `components/conversations/ConversationReviewItem.tsx`(말풍선), 모든 컴포넌트 색 치환, `next.config.mjs`(`/`→`/dashboard`), `lib/version.ts` v1.13
- 서버 액션·웹훅·API·DB 변경 없음

## 확인한 것 / 못 한 것
- 확인: `tsc --noEmit` 오류 0, 옛 색 0건, 매뉴얼 문구를 화면 버튼 이름(「▶ 봇 활성화」·확인 토큰)과 AGENTS(고지·24시간·echo)와 대조.
- 못 한 것: 빌드·배포·화면 검수(맥미니 원칙 18-④).

## 다음 첫 단계 (윈도우 CLI)
1. `cd instagram-dm-reply && npm run build`
2. `vercel deploy --prod --yes` → `update programs set version='v1.13', updated_at=now() where slug='instagram-dm-reply';`
3. `buylifemall@naver.com` 1440·375px: 로그인, `/`→`/dashboard`, ☰, DM 검토(말풍선·24시간 배지), 이력, 설정(웹훅 안내), `/guide`. **「답변승인 · 발송」 금지.**
4. `DESIGN.md` 45번 ✅, `DESIGN_HANDOFF.md` §3 기록, ACTIVE_WORK 줄 삭제.
