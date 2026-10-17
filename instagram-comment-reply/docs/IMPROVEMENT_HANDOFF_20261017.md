# 개선 인수인계 — INSTA 댓글자동화 (2026-10-17, Claude Code 맥미니)

## 한 일 (v1.14) — 주인님 승인 후 구현
스튜디오 댓글 콘솔 — 인스타 라이트 변형. 플랜 [PLAN_20261017_DESIGN_RENEWAL.md](PLAN_20261017_DESIGN_RENEWAL.md) · 디자인 [DESIGN_HANDOFF.md](DESIGN_HANDOFF.md) · 원장 [IMPROVEMENTS.md](IMPROVEMENTS.md)

## 바뀐 파일
- 신규: `app/(dashboard)/dashboard/page.tsx`, `app/(dashboard)/guide/page.tsx`, `components/ui/{IgLogo,StudioHeader}.tsx`
- 수정: `tailwind.config.ts`(`ig-*`), `app/globals.css`, `app/layout.tsx`, `app/(auth)/*`, `app/(dashboard)/layout.tsx`(대기 수), `components/layout/Sidebar.tsx`, 댓글·게시물·이력·설정 화면, 모든 컴포넌트 색 치환, `next.config.mjs`(`/`→`/dashboard`), `lib/version.ts` v1.14
- 서버 액션·API·DB·Cron 변경 없음

## 확인한 것 / 못 한 것
- 확인: `tsc --noEmit` 오류 0, 옛 색 0건, 흰 바탕 위 흰 글자 없음, 매뉴얼 문구를 버튼 이름·기존 IMPROVEMENTS(Invalid platform app)와 대조.
- 못 한 것: 빌드·배포·화면 검수(맥미니 원칙 18-④).

## 다음 첫 단계 (윈도우 CLI)
1. `cd instagram-comment-reply && npm run build`
2. `vercel deploy --prod --yes` → `update programs set version='v1.14', updated_at=now() where slug='instagram-comment-reply';`
3. `buylifemall@naver.com` 1440·375px: 로그인, `/`→`/dashboard`, ☰, 게시물·댓글·이력·설정(Meta 주소 카드), `/guide`. **답변승인·새 댓글 확인·동기화 금지.**
4. `DESIGN.md` 47번 ✅, `DESIGN_HANDOFF.md` §4 기록, ACTIVE_WORK 줄 삭제.
