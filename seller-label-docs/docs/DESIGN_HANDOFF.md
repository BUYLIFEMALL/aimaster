# 디자인 인계 — seller-label-docs (v1.02)

- 템플릿 이름: **셀러 워크벤치 스타일**(라이트) — 흰 바탕 카드 + 청록(teal-700 `#0f766e`) 강조, 단계 번호 원형 배지, 「🔒 파일은 내 PC 안에서만 처리」 배지. 전 화면 같은 바탕(`--bg #f5f7fa`).
- 토큰: `src/app/globals.css` `:root` (`--bg --surface --border --text --muted --accent --accent-hover --accent-soft`), 공용 클래스 `slw-card slw-primary slw-btn slw-field slw-label slw-drop`.
- 컴포넌트: `PageHeader`·`Notice`(`src/components/ui/PageHeader.tsx`), `Dropzone`, 좌측 메뉴 `Sidebar`(계정은 마지막 메뉴 바로 아래, 767px 이하 ☰ 드로어).
- 모바일: 모든 도구 격자는 `grid grid-cols-1 lg:grid-cols-[...]` — `grid-cols-1`이 빠지면 긴 선택 목록 글자 때문에 가로로 넘친다(v1.02 수정, 400px 틀 검수 371=371).
- 인쇄: 라벨 페이지는 `createPortal`로 body 바로 아래 `.label-print-root`, `@media print`에서 나머지 body 자식 숨김. 미리보기는 실제 mm 페이지를 `transform: scale`로 축소.
- 리뉴얼은 디자인 담당(agy) 몫. Claude Code는 기능 구현만 했다.
