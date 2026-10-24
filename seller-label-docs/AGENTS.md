# 셀러 라벨·QR·서류 자동화 (`seller-label-docs`)

- 운영 주소: https://seller-label-docs.buylife.xyz · 소개: https://www.buylife.xyz/programs/seller-label-docs
- 현재 버전: **v1.02** (2026-10-25) · Vercel 프로젝트 `seller-label-docs` · 카테고리 이커머스 · 기본 프로그램(프리미엄 아님)
- 담당 역할: `ecommerce-image` (Claude Code 윈도우) · 플랜 [`docs/PLAN_20261025_SELLER_LABEL_DOCS.md`](docs/PLAN_20261025_SELLER_LABEL_DOCS.md) · 쇼핑몰 묶음 E6([인계](../docs/analysis-ecommerce-bundle-20261024/HANDOFF_20261024_ECOMMERCE.md) §5)

## 1. 사용 목적·대상
쇼핑몰 판매자가 출고·입점·홍보 때 반복하는 서류 작업 5가지(라벨 인쇄·QR·파일명 일괄 변경·PDF 정리·문서 서명)를 **브라우저 안에서만** 처리한다. 대상: 직접 출고하는 소규모 셀러, 식품 소분 판매자, 입점·견적 서류를 자주 내는 사업자.

## 2. 기술·도구
Next.js 16(App Router, `src/proxy.ts`) + Tailwind 4 + 공용 Supabase(권한 판정만). 라이브러리: `bwip-js` 4.11.4(바코드·QR·데이터매트릭스 SVG, `bwip-js/browser` 경로로 불러야 타입이 잡힘), `qr-code-styling` 1.9.2(꾸민 QR), `pdf-lib` 1.17.1(PDF 만들기·합치기·서명 찍기), `pdfjs-dist` 6.4.299(PDF 미리보기 — 작업자 파일을 `scripts/prepare-assets.mjs`가 빌드 전에 `public/pdf/`로 복사, 저장소 제외), SheetJS 0.20.3 공식 배포본(`file-merge`와 같음), `jszip`, `next/font` Nanum Pen Script(손글씨 서명). 뼈대·권한은 `image-convert-studio`에서 복사.

## 3. 기능·구조·장단점
| 화면 | 기능 | 핵심 파일 |
|---|---|---|
| `/home` | 도구 5개 카드 | `src/lib/tools.ts` |
| `/label` | A4 규격 16종(가운데 정렬 추정값)+직접 입력, `{열 이름}` 엑셀·붙여넣기 채우기, 바코드(Code128·EAN-13 검증)·QR·데이터매트릭스, 식품 한글표시사항 틀(항목 이름만), 시작 칸(미리보기 칸 클릭), 한 내용당 장수, 위치 보정 mm, 인쇄 전용 CSS(`@page A4 margin 0`, 인쇄 영역을 body 바로 아래로 옮겨 나머지 숨김) | `src/lib/label/*`, `src/components/label/*`, `src/lib/sheet.ts` |
| `/qr` | 점·모서리 모양, 색, 오류 정정, 로고, 대비 판정(반전 경고), PNG·JPG·SVG | `src/components/qr/QrTool.tsx`, `src/lib/qr/contrast.ts` |
| `/rename` | 공통 이름+순번(시작·자릿수·구분·위치), 순서 바꾸기·이름순, ZIP(무압축) | `src/lib/rename.ts` |
| `/pdf` | 사진→PDF(EXIF 회전 반영, A4 맞춤/원본), 여러 PDF 페이지 카드: 순서·돌리기·빼기·범위 고르기·n쪽씩 나누기 ZIP | `src/lib/pdf/ops.ts` `buildFromPages`, `src/lib/browser/*` |
| `/sign` | 손글씨 그리기·서명 사진(흰 바탕 투명화)·이름 글자(손글씨/고딕/명조), 끌어서 위치·크기, 지금 쪽/모든 쪽/고른 쪽, PDF·사진 저장, 「법적 전자서명 아님」 고정 안내 | `src/components/sign/*`, `src/lib/sign/alpha.ts` |
| `/guide` | 4단계 카드·라벨 위치 맞추기·팁·주의·FAQ | |
- 장점: 파일이 서버로 가지 않음(운영 비용 0, 개인정보 안전), 키·계정 불필요, 도구가 한곳에. 서버 DB 표 없음(설정은 localStorage `sld-*-v1`).
- 단점·한계: 라벨 규격 여백은 제조사 공식값이 아니라 가운데 정렬 추정값(공식 규격표는 제조사 PDF 안에만 있어 확인 못 함 — 직접 입력·위치 보정으로 대응). 인쇄 창 대화 상자는 자동 검수 못 함(실물 인쇄는 주인님 확인 대기). 암호 PDF 불가. HEIC 사진 불가. PDF 미리보기는 파일당 앞 400쪽.

## 4. 버전 기록
- **v1.02 (2026-10-25)**: 휴대폰 폭 라벨 화면 가로 넘침 수정(격자 `grid-cols-1`), 1차원 바코드를 고르면 「글자 아래·높이 12mm」 기본값+오른쪽 배치 경고, 90도 돌린 PDF 미리보기 축소. 배포 `seller-label-docs-ok99z0cps`.
- **v1.01 (2026-10-25)**: 첫 공개 — 도구 5개·매뉴얼·권한·DB 등록(요금제 3단계·VIP 등급 표·시험 계정 30일)·도메인·썸네일. 배포 `seller-label-docs-ke0dx1rvc`.

## 5. 남은 일
[`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md) — 1순위: 주인님 실물 라벨지 시험 인쇄 결과로 기본 규격 보정.

## 6. 다른 프로그램과 연계 아이디어
- 상품소싱(`trending-product-finder`)·주문 리포트(E7 `shop-order-report`)의 상품 표를 라벨 표로 바로 넘기기(쇼핑몰 흐름 E9).
- 상세페이지(`shop-detail-page`)·바나나 캔버스 결과 이미지 묶음을 파일명 일괄 변경으로 넘기기.
- 라벨 칸 배치 계산(`src/lib/label/layout.ts`)·PDF 조작(`src/lib/pdf/ops.ts`)은 공용 기준 코드 후보.

## 7. UI/UX 개선안
「셀러 워크벤치 스타일」(흰 바탕·청록 강조). 디자인 리뉴얼은 디자인 담당 몫. 후보: 라벨 미리보기 확대/축소, 사진 끌어서 순서 바꾸기, 자주 쓰는 라벨 틀 이름 붙여 저장.
