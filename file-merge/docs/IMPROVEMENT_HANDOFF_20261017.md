# 개선 인수인계 — AI 엑셀·텍스트 합치기 자동화 (2026-10-17, Claude Code 맥미니)

## 한 일 (v1.07)
스마트 매트릭스 **라이트 변형** 디자인. 플랜 [PLAN_20261017_DESIGN_RENEWAL.md](PLAN_20261017_DESIGN_RENEWAL.md), 디자인 [DESIGN_HANDOFF.md](DESIGN_HANDOFF.md), 원장 [IMPROVEMENTS.md](IMPROVEMENTS.md).

## 바뀐 파일
- 수정: `src/app/globals.css`, `src/app/page.tsx`(`/` → `/dashboard`), `src/components/layout/Sidebar.tsx`(대시보드 메뉴), `src/app/(workspace)/{excel-merge,excel-split,text-merge,text-split,guide}/page.tsx`, `src/lib/version.ts`(v1.07), `package.json`(1.0.7)
- 신규: `src/app/(workspace)/dashboard/page.tsx`, `src/components/ui/PageHero.tsx`, `docs/*`
- 파일 처리 로직·Worker·테스트 대상 코드 변경 없음.

## 확인한 것 / 못 한 것
- 확인: 정적 검토, 라이트 토큰 대비 계산(전부 4.5:1 이상), 히어로로 옮긴 설명 문구에 따옴표 없음.
- **못 한 것**: `npm test`·`npm run build`·배포·화면 검수(맥미니 빌드 금지).

## 다음 첫 단계 (윈도우 CLI)
1. `docs/ACTIVE_WORK.md` 줄 추가 → `cd file-merge && npm test && npm run build`.
2. `vercel deploy --cwd <file-merge> --prod --yes --scope buylife`(먼저 `.vercel/project.json` projectName이 `file-merge`인지) → DB `update programs set version='v1.07', updated_at=now() where slug='file-merge';`
3. `buylifemall@naver.com` 1440px·375px: `/`→`/dashboard`, 도구 카드 4개, 각 도구 히어로·파일 끌어놓기 영역·미리보기 표·칩 눌림 색, 매뉴얼 흐름 그림, ☰ 메뉴. 샘플 엑셀 2개로 합치기 1회(브라우저 안 처리, 비용 없음).
4. 루트 `DESIGN.md` 65번 「✅ 1차 작업완료 (`v1.07`, …)」, `DESIGN_HANDOFF.md` 기록, ACTIVE_WORK 줄 삭제.
