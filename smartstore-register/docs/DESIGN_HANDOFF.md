# 디자인 인수인계 — 스마트스토어 상품등록 자동화

- **스타일 템플릿**: 「스토어 등록 워크벤치 스타일」 — `shop-order-report`의 셀러 워크벤치(라이트) 구조를 그대로 쓰고 강조색만 스마트스토어 초록으로 바꿈.
- **색 토큰**(`src/app/globals.css`): 바탕 `--bg #f5f7fa`, 카드 `--surface #fff`, 강조 `--accent #047857`(호버 `#065f46`, 연한 `#ecfdf5`). 모든 화면 같은 바탕(지침 ⑪).
- **컴포넌트**: `components/layout/Sidebar.tsx`(계정·로그아웃은 마지막 메뉴 바로 아래, 767px 이하 ☰), `components/ui/PageHeader.tsx`(제목 줄·`Notice`), `slw-card`·`slw-btn`·`slw-primary`·`slw-field`·`slw-label`.
- **모바일**: 메뉴 ☰ 전환, 칸 미리보기 표는 카드 안 가로 스크롤, 등록 기록 표는 최소 640px + 가로 스크롤.
- **다듬을 곳(디자인 담당)**: 칸 미리보기 표의 섹션 묶음 표시, 등록 방식 카드, 대시보드 단계 카드에 그림 추가.
