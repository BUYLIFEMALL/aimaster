# 개선·인수인계 — 웹 크롤링 자동화 v1.07 디자인 리뉴얼 · 2026-10-17 Claude Code(맥미니)

## 한 일
- 스마트 매트릭스(다크) 적용: 색 토큰·히어로·KPI 카드 이식, 화면 15개 파일 색 일괄 치환, 로그인 다크.
- 사이드바 교체(스텝퍼 + 📖 매뉴얼 + 휴대폰 ☰), 대시보드 재구성, `/guide` 신설.
- 버전 `webapp/src/lib/version.ts` v1.06 → **v1.07**. 서버 로직·파이썬 수집 서비스·DB 변경 없음.
- 검수: 맥미니 `tsc --noEmit` 오류 0. 비용 없음.

## 윈도우 CLI 다음 첫 단계
1. `cd web-crawler/webapp && npm run build`
2. `vercel deploy --prod --yes` (기존 프로젝트, 도메인 web-crawler-saas.buylife.xyz)
3. DB: `update programs set version='v1.07', updated_at=now() where slug='web-crawler-saas';`
4. 크롬(시험 계정 buylifemall@naver.com) 데스크톱·390px 검수 — 「새 작업 시작」·「우회해서 계속 진행」은 누르지 않음
5. `DESIGN.md` 42번 → ✅ 1차 작업완료 (`v1.07`, 스마트 매트릭스)

## 남은 일 (IMPROVEMENTS.md)
- #5 30일 자동 삭제(최상위 규칙) 미적용 — DB 예약 작업이 필요해 주인님 승인 후 진행.
- #6 진행 중 자동 새로고침, #7 결과 미리보기·타 프로그램 연결.
