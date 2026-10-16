# 개선사항 기록 — 부동산 실거래 투자분석 자동화 (`real-estate-sales`, 폴더 `real_estate_sales/`)

## 2026-10-17 Claude Code(맥미니) — 디자인 리뉴얼 사전 분석 중 발견

| # | 내용 | 근거·영향 | 우선순위 | 상태 | 관련 파일 | 다음 첫 단계·검수 |
|---|---|---|---|---|---|---|
| 1 | 휴대폰 ☰ 없음 | 원칙 19 — 좁은 화면에서 메뉴가 본문 위에 쌓임 | 높음 | 플랜 포함(승인 대기) | `src/components/layout/Sidebar.tsx` | 375px 검수 |
| 2 | 사용 매뉴얼 없음 | 원칙 9 — 실거래가·공시가·점수 읽는 법 안내 없음 | 중간 | 플랜 포함 | `src/app/(dashboard)/guide` | 화면 |
| 3 | 실거래 목록 검색·필터·정렬 없음, 50건 제한 | 여러 자치구를 보면 비교 어려움 | 중간 | 플랜 포함(검색·필터·정렬) / 페이지 나눔은 제안 | `listings/page.tsx` | 정렬·필터 검수 |
| 4 | 상세 화면을 열기만 해도 AI 분석이 자동 실행 | 회원 본인 키 비용이 "열람"만으로 발생(캐시로 1회) — 의도는 맞지만 안내 없음 | 중간 | 미구현(제안) | `listings/[id]/page.tsx`, `lib/actions/analysis.ts` | 설정에 「열 때 자동 분석」 켜기/끄기 + 화면에 비용 안내 |
| 5 | 「안 본 새 실거래」가 열어 봐도 줄지 않음 | 상태가 분석·알림 때만 바뀌고 "열람"은 기록 안 함 → 대시보드 숫자가 계속 남음 | 중간 | 미구현(제안) | `real_estate_user_matches.status` | 상세 열람 시 `new → seen` 표시(스키마 값 추가 필요할 수 있음) |
| 6 | 서울만 지원 | 서울 열린데이터 API 한정 | 낮음 | 기존 과제 | `lib/publicdata/districts.ts` | 국토부 실거래 API로 경기·인천 확장 검토 |
| 7 | VWorld 등록 도메인이 옛 `n8n.buylife.xyz` | 포털에서 지우면 공시가격 조회 중단 | 중간 | 기존 과제(주인님 VWorld 로그인 필요) | `VWORLD_REGISTERED_DOMAIN` | 포털에 `real-estate-sales.buylife.xyz` 추가 후 환경변수 변경 |
| 8 | 공공데이터 키 회원별 전환 여부 | v1.04 남은 결정 | 낮음 | 주인님 결정 대기 | `lib/publicdata/memberKeys.ts` | 결정 후 진행 |
| 9 | 옛 금색 테마 이름(`gold`·`dark-*`)에 흰색 값 | 이름과 실제 색이 달라 유지보수 혼란 | 낮음 | 플랜 포함(토큰으로 교체) | `src/app/globals.css` | 남은 `gold`/`dark-` 클래스 0건 |
