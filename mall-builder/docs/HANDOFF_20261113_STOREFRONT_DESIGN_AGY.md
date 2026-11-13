# 인수인계 — 쇼핑몰 손님 화면(가게 앞) 디자인 → agy (2026-11-13)

- 보내는 쪽: [역할: mall-builder] Claude Code(윈도우) `claude-win-20261025-workspace`
- 받는 쪽: Antigravity CLI(`agy`) — 주인님 지시(2026-11-13): 「쇼핑몰 외형 디자인은 agy한테 시킬테니 인수인계 문서와 전달할 내용을 만들어줘」
- 프로그램: AI 쇼핑몰 빌더 `mall-builder/` (운영 v1.06) — https://mall-builder.buylife.xyz
- 샘플몰(운영): https://mall-builder.buylife.xyz/s/aimaster-b2b · 분양 안내(공개): https://mall-builder.buylife.xyz/resale

## 1. 왜 지금 디자인인가
- 2026-11-13 주인님 결정으로 **손님 화면과 분양 안내가 로그인 없이 누구나·검색엔진에 공개**됐다(`src/lib/platform.ts` `isOpenPath`, 최상위 규칙 문서 §8 「쇼핑몰 손님 화면 예외」).
- 기능은 모두 동작하지만 겉모습은 **「기능 위주 기본 모양」**(흰 바탕·회색 글자·검정 단추). 외부 손님이 보는 「완성된 쇼핑몰」 느낌이 필요하다.
- 같은 손님 화면을 **세 몰**이 함께 쓴다: ① B2B 입점몰(지금 샘플몰) ② 분양몰(분양자 이름의 몰, 2026-11-13 운영 반영) ③ 독립몰(나중). 몰 이름·로고·첫 화면 블록은 몰마다 다르다.

## 2. 먼저 읽을 것
1. 루트 `CLAUDE.md` 디자인 관련 최상위 원칙(최상위 불변 원칙 0 — 프로그램 성격 분석 후 디자인, 디자인 템플릿 명명·기록 의무, Edge 포그라운드 검수, 모바일 767px)
2. 루트 `DESIGN.md`(템플릿 카탈로그·현황판) · `docs/PROGRAM_DESIGN_STANDARD.md`
3. `mall-builder/docs/DESIGN_HANDOFF.md`(지금 상태·주의) · `mall-builder/AGENTS.md`
4. 세 몰 성격: `mall-builder/docs/PLAN_20261111_THREE_MALLS.md` §8, 분양몰: `docs/PLAN_20261113_T2_RESALE_MALL.md`

## 3. 디자인 범위

| 화면 | 파일 | 할 일 |
|---|---|---|
| 손님 공통 틀(머리글·검색·카테고리 줄·바닥글 사업자 정보·장바구니 숫자·모바일 메뉴) | `src/app/s/[store]/(shop)/layout.tsx` | 쇼핑몰다운 머리글·바닥글, 모바일 접는 메뉴 |
| 첫 화면 + 블록(배너·카테고리·추천 상품·공지 등, 관리자가 편집) | `(shop)/page.tsx`, `src/app/s/[store]/home-blocks.tsx` | 블록별 보기 좋은 모양(블록 종류·데이터 구조는 그대로) |
| 상품 카드 | `(shop)/product-card.tsx` | 사진 비율·이름·가격·품절·사업자가 표시 |
| 상품 목록·카테고리·검색 | `(shop)/c/[category]/page.tsx`, `(shop)/search/page.tsx` | 격자·정렬 줄·빈 결과 안내 |
| 상품 상세 | `(shop)/p/[id]/page.tsx`, `product-detail.tsx`, `product-boards.tsx` | 사진·옵션·수량·담기 단추·후기/문의 탭 |
| 장바구니·주문서 | `(shop)/cart/*`, `(shop)/order/*` | 합계·배송비 줄·단추 정리 |
| 주문 내역·상세·마이페이지·공지·FAQ·문의·견적·빠른 주문·가입 | 해당 폴더 | 같은 테마로 맞춤(구조 변경 최소) |
| 분양 안내(공개) | `src/app/resale/page.tsx` | 이미 소개 블록이 있음 — 테마에 맞춰 다듬기 |

**범위 밖(손대지 않음)**: 몰 관리 화면 `src/app/s/[store]/admin/**`, 공급사 화면 `src/app/s/[store]/supplier/**`, 처음 화면 `src/app/page.tsx`, 문서 `src/app/s/[store]/doc/**`.

## 4. 반드시 지킬 것
1. **화면 모양만** 바꾼다. 서버 동작(`*actions.ts`)·`src/lib/**` 계산·DB(`supabase/**`)·폼 칸 이름(`name=`)·`data-*` 표시는 그대로 둔다.
2. **가격 표시 문구를 바꾸지 않는다**: 정가·등급가·「사업자 가격」·「최저 판매가 보호」 줄, 옵션 「(+1,300원)」 표기, 배송비 안내 문장, 폐쇄몰 안내 문구 — 자동 시험이 문구로 확인한다.
3. 몰마다 다른 것(몰 이름·로고·첫 화면 블록)은 데이터에서 읽는다. 특정 몰 이름·색을 코드에 박지 않는다. 몰별 대표 색을 쓰고 싶으면 먼저 담당(mall-builder)에게 요청(설정 칸 추가는 DB 작업).
4. 전체 손님 화면 **한 가지 테마로 통일**(페이지마다 배경·글자 대비가 다르면 안 됨). 다크 배경이면 흰 글자 대비 지침(DESIGN.md White-on-White 방지 헌장) 준수.
5. 모바일 **390px에서 가로 스크롤 없음**, 누르는 칸 40~44px 이상, 767px 이하 접는 메뉴.
6. 다른 쇼핑몰(프로셀 등) 디자인을 복제하지 않는다(2026-11-03 중단 결정). 사람 사진을 넣으면 한국인으로(핵심 원칙 3), 저작권 없는 이미지.
7. 공개 화면이므로 `noindex`를 넣지 않는다(검색엔진 허용 — 0번 규칙 예외). `public/robots.txt`는 그대로.
8. 저작권 고지(`NOTICE`·`public/ai.txt`)는 지우지 않는다.

## 5. 작업·검수 방법
- 로컬: `cd mall-builder && npm run dev`(Lab DB 환경 `.env.local`) → 브라우저 `http://localhost:3000/s/<Lab 샘플몰>` — Lab 몰 주소는 Lab DB `mall_builder_stores`에서 확인. 운영 모양 확인은 `NEXT_PUBLIC_MALL_PLATFORM=aimaster npm run build` 통과로.
- 시험: `node --test tests/*.test.mjs`(지금 255개 통과) · `npx tsc --noEmit` · 운영 모드 빌드 — 모두 통과해야 한다.
- 화면 검수: **Microsoft Edge 실제 창(포그라운드)**에서 데스크톱·390px. 손님 흐름 한 바퀴(첫 화면 → 카테고리 → 상품 상세 옵션 고르기 → 장바구니 → 주문서까지, 결제 버튼은 누르지 않음).
- 버전: 배포할 때 한 번 `src/lib/version.ts` +0.01 + DB `programs.version`(운영 `esgxyikcnnvmlhygjkth`, `update programs set version='vX.YY' where slug='mall-builder'`).
- 배포: 운영 배포는 빌드 비용 — **주인님 승인 뒤** `node mall-builder/scripts/deploy-prod.mjs`(팀 빌드 대기 확인·환경변수 확인 포함). 배포 전 mall-builder 담당과 겹치지 않는지 `docs/ACTIVE_WORK.md` 확인.
- 커밋: `node scripts/commit-paths.mjs "<메시지>" <내가 고친 경로>... --as <세션>`(경로 지정만, `git add -A` 금지).

## 6. 같은 폴더 동시 작업 약속
- mall-builder 담당(Claude Code)은 디자인 작업 동안 **위 §3 파일을 고치지 않는다**(분양몰 실제 흐름 검수·DB·관리자 화면만). agy는 §3 범위 밖 파일을 고치지 않는다.
- 시작할 때 `docs/ACTIVE_WORK.md`에 「`mall-builder/` 손님 화면 디자인 — agy」 줄을 넣고, 끝나면 지운다.
- §3 파일 중 기능 수정이 필요한 것(예: 상품 카드에 새 정보)을 발견하면 고치지 말고 `docs/IMPROVEMENTS.md`에 「mall-builder 담당께」로 적는다.

## 7. 끝나면 남길 것
- `mall-builder/docs/DESIGN_HANDOFF.md`: 템플릿 이름(「○○ 스타일」), 색·글자 토큰, 구조, 모바일 대응, 주의사항
- 루트 `DESIGN.md` 현황판·템플릿 카탈로그에 이 프로그램과 템플릿 이름 기록
- `mall-builder/docs/IMPROVEMENTS.md`(발견한 개선점), `mall-builder/AGENTS.md` 버전 기록, 루트 `docs/HANDOFF.md` 맨 위 항목
- 데스크톱·모바일 화면 캡처 몇 장(`mall-builder/docs/evidence/`)

## 8. 참고 — 지금 운영 샘플몰 자료
- 자체 상품 2개, 공급사 시험 상품 1개(「[시험] 옵션 티셔츠」), 카테고리 2개(사무용품·생활용품). 샘플 자료 채우기(S1)는 mall-builder 담당이 따로 한다 — 디자인은 상품이 많을 때·적을 때 모두 보기 좋게.

## 9. 추가 전달 (2026-11-13 오후, mall-builder 담당 → agy)
- **확인 상자 변경(기능, 커밋됨)**: 브라우저 확인 창(`window.confirm`) 6곳을 화면 안 확인 상자로 바꿨다 — 공용 `src/app/inline-confirm.tsx`(`useInlineConfirm`). 손님 화면 범위에서는 `src/app/order-status-buttons.tsx`(주문 취소·구매 확정 등)와 `(shop)/guest/orders/[id]/status-button.tsx` 두 곳. **agy가 소스를 고치기 전에 넣은 변경**이므로 최신 HEAD에서 시작하면 된다. 확인 상자의 모양(지금 노란 안내 칸 + 「확인」「아니요」)은 테마에 맞게 다듬어도 되지만, `data-inline-confirm`·`data-confirm-yes`·`data-confirm-no` 표시와 「상자의 확인 단추로 보낼 때만 통과」 동작은 그대로 둔다.
- **요청 — 샘플몰 안내 띠(S3)**: 손님 화면 틀(`(shop)/layout.tsx`) 맨 위에, 그 몰이 샘플몰(`store.slug === SAMPLE_MALL_SLUG`, `@/lib/platform-admin`)일 때만 한 줄 안내를 넣어 달라 — 문구: 「이 몰은 샘플입니다 · 실제 결제·배송은 없습니다 · 사업자 신청을 하면 사업자 가격을 볼 수 있습니다」. 틀 파일이 디자인 범위라 mall-builder 담당은 직접 넣지 않았다.
- 이후 mall-builder 담당은 손님 화면 파일을 고치지 않는다(약속 그대로).

## 10. 추가 요청 (2026-11-13 저녁, mall-builder 담당 → agy) — 상품 「상세 그림」 표시
- **새 기능(0064, Lab DB 적용·운영 미적용, 코드 커밋됨)**: 상품마다 `detail_images`(모양은 `images`와 같은 `[{url, path}]`, 최대 40장)가 생겼다. 프로셀 등 다른 몰에서 옮겨 오는 상품의 상세 설명이 대부분 「긴 사진 여러 장」이라 만든 칸이다. 관리자 상품 화면에 「상세 그림」 올리기 칸이 있고, 엑셀에도 「상세 그림」 칸이 있다.
- **데이터는 이미 손님 화면까지 온다**: `PRODUCT_COLUMNS`(`src/lib/store.ts`)와 가격 비공개용 함수 `mall_builder_shop_products` 결과에 `detail_images`가 들어 있다(`Product` 타입에도 추가).
- **요청**: 상품 상세(`(shop)/p/[id]/page.tsx`)의 「상세 설명」 글 **아래**에 `product.detail_images`를 순서대로 **세로로 이어 붙여** 보여 달라.
  - 사진 사이 간격 0(한 장의 긴 상세 페이지처럼), 너비는 본문 폭 100%·최대 860px 정도 가운데, `height:auto`, `loading="lazy"`, `alt=""`.
  - 상세 설명 글이 없고 상세 그림만 있어도 「상세 정보」 영역이 보여야 한다(지금은 `product.description &&`로 감싸져 있음).
  - 빈 배열이면 아무것도 그리지 않는다. 데이터 처리·서버 코드는 바꾸지 않는다(표시만).
- 시험용 상품: Lab 시험 몰에 프로셀 상품 9개를 상세 그림과 함께 넣을 예정(mall-builder 담당, 넣으면 몰 주소를 이 절에 적음).
