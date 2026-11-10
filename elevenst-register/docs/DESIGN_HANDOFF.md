# 디자인 인계 — AI 11번가 상품 자동등록기

- 현재(v1.01): `coupang-ops`의 화면 틀을 그대로 복사 — 슬레이트 쿨 화이트 바탕 + 인디고 포인트(84번 미니멀 커머스 아틀리에 계열), `src/app/globals.css`·`src/components/layout/Sidebar.tsx`·`src/components/ui/PageHeader.tsx`.
- 사이드바: 「← 다른 프로그램 보기」(→ `https://www.buylife.xyz/programs`), 대시보드, (메뉴 묶음은 기능 출시 때 `src/lib/tools.ts`에 추가), 연동 & 사용 매뉴얼, 계정·로그아웃은 마지막 메뉴 바로 아래. 767px 이하는 위쪽 ☰ 메뉴.
- 디자인 담당께: 11번가 색(레드 계열)을 포인트로 쓰는 개편, 템플릿 이름 부여는 기능(3·4단계) 뒤에 해 주시면 됩니다. 등록 화면은 쿠팡 운영 `ProductForm` 구조를 따를 예정입니다.
