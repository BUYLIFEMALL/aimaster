# 디자인 인계 — shop-order-report (v1.02)

- 템플릿: **셀러 워크벤치 스타일**(라이트, `seller-label-docs`와 같은 토큰·컴포넌트) — `src/app/globals.css`, `PageHeader`·`Notice`·`Dropzone`, `src/components/report/Widgets.tsx`(`Stat`·`Bars`·`TrendChart`·`EmptyOrders`).
- 그래프: 라이브러리 없는 SVG(매출 막대 + 순이익 점, 음수는 빨강). 마켓 색은 `MARKETS[].color`.
- 모바일: 모든 격자 `grid-cols-1` 시작, 넓은 표는 `overflow-x-auto` 안에서만 넘김(400px 틀 8개 화면 가로 넘침 없음 확인).
- 인쇄: 좌측 메뉴·모바일 상단 `print:hidden`, 카드 그림자 제거.
- 리뉴얼은 디자인 담당 몫.
