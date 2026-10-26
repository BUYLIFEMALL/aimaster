# 스마트스토어 상품등록 자동화 (`smartstore-register`) — 에이전트 인수인계

> 루트 `../CLAUDE.md`(메인 지침)를 함께 읽는다. 한국어 진행 안내·회원 본인 계정/키·운영/Lab 분리·비용 사전 승인·경로 지정 커밋 규칙이 그대로 적용된다.
> 플랜: [`../trending-product-finder/docs/PLAN_20261026_EC_W8_SMARTSTORE_EXTENSION.md`](../trending-product-finder/docs/PLAN_20261026_EC_W8_SMARTSTORE_EXTENSION.md) · 0단계 화면 분석: [`../trending-product-finder/docs/EC_W8_SMARTSTORE_FORM_ANALYSIS_20261026.md`](../trending-product-finder/docs/EC_W8_SMARTSTORE_FORM_ANALYSIS_20261026.md)
> 담당 역할: `ecommerce-image`(Claude Code 윈도우 `claude-win-sdp`). 앞으로 마켓별(쿠팡 등) 등록 프로그램을 계속 만든다 — 주인님 「앞으로 스마트스토어용 쿠팡용 계속 만들어 나가야하거든」「우선은 스마트스토어 상품등록 자동화 로 해보자」(2026-10-26).

## 1. 사용 목적·대상
AI 상세페이지 자동화(`shop-detail-page`)로 상세페이지를 만든 셀러가, 그 상품을 스마트스토어센터 「상품 등록」 화면에 다시 옮겨 적지 않도록 **회원 본인 크롬의 확장이 칸을 대신 채운다.** 네이버는 남의 「내 스토어」 API 키로 대신 운영하는 것을 허용하지 않으므로(공식 답변) 서버 API가 아니라 회원 브라우저 입력 방식이다.

## 2. 기술·도구
Next.js 16(App Router, `src/proxy.ts`) · React 19 · Tailwind 4 · Supabase 공용 DB(ref `esgxyikcnnvmlhygjkth`) · 뼈대는 `shop-order-report` 복사(권한·로그인·사이드바·`slw-*` 스타일). 시험 `npm test`(node:test + tsx). 확장(다음 단계): Manifest V3, 블로그 확장 `naver-blog-agent/extension/` 구조 재사용 예정.

## 3. 핵심 기능·구조·장단점
| 부분 | 파일 | 하는 일 |
|---|---|---|
| 칸 값 만들기(핵심) | `src/lib/smartstore/fields.ts` | 상품 + 스토어 기본값 → 확장이 실행할 단계 목록(`FillStep[]`: 칸 이름 `ng-model`·동작·값·필수). 필수값 검사, 할인 금액 계산, 판매자 관리 코드 `AIM-…`, 등록 방식별 마지막 단계(입력만/임시저장/저장하기+전시중지) |
| 데이터 읽기 | `src/lib/data.ts` | 회원 세션으로 `shop_products`·`shop_product_images`(본인만, RLS) 읽기, 비공개 버킷 `shop-detail-images` 서명 주소, 기본값·작업 기록 |
| 쓰기 | `src/lib/actions/register.ts` | 기본값 저장, 작업 만들기(진행 중 작업 있으면 거절 — 중복 방지), 취소. 모두 `requireProgramAccess()` + `user_id` 조건 |
| 화면 | `/home` `/defaults` `/products` `/products/[id]` `/history` `/guide` | 대시보드·기본값·상품 고르기·칸 미리보기+보내기·기록·매뉴얼 |
| 정리 | `/api/cron/cleanup` + `vercel.json` | 작업 기록 30일 자동 삭제(매일 한국 04:20, `CRON_SECRET`) |
| DB | `supabase/migrations/20261026_smartstore_register_v1_01.sql` | `smartstore_register_defaults`(회원 1행 jsonb)·`smartstore_register_jobs` + 프로그램 등록·요금제·VIP·시험 계정 30일 |
- 장점: 상세페이지 상품을 그대로 씀, 칸을 이름으로 찾음(화면 위치 변화에 강함), 기본값 「입력만」, 결과가 불확실하면 재등록 안 함.
- 한계: 판매자센터 화면이 바뀌면 확장 수정 필요. **Claude 크롬 확장은 `sell.smartstore.naver.com`을 안전 제한으로 열지 못함** → 화면 확인은 주인님 캡처·저장본·확장 결과 기록으로 한다.

## 4. 버전·이력
- v1.01 (2026-10-26, ✅ 배포 `smartstore-register-ij7pvrsnr`, DB 적용·도메인·환경변수 완료): 뼈대 — 기본값·상품 불러오기·칸 미리보기·작업 만들기·기록·매뉴얼·30일 정리. 확장은 아직 없음(작업은 「확장 대기」로 쌓임). 시험 6개·tsc·build 통과.

## 5. 남은 일 (다음 첫 단계부터)
1. **주인님 승인 뒤**: 운영 DB에 마이그레이션 적용(크롬 SQL 편집기) → Vercel 새 프로젝트·도메인 `smartstore-register.buylife.xyz`·환경변수(Supabase 4개·`CRON_SECRET`, `shop-order-report`와 같은 값) → 배포 1회 → 시험 계정으로 화면 확인.
2. **0-2단계 자료(주인님)**: 「HTML 작성」 붙여 넣기 시험(`D:\PDS\Program_dev\smartstore_create\html_test.txt`, 미리보기만) 결과 · 「이미지 등록」 창·카테고리 목록이 열린 상태의 저장본 → 이미지 넣는 방식 확정.
3. 확장 `extension/`: 연결 코드 → 작업 받기(확장 전용 API, 회원 토큰) → `smartstore.js`가 `steps`를 위에서부터 실행 → 결과 보고(`status`·`failed_step`·`market_product_no`). 확장 운영 규칙(핵심 원칙 10) — ZIP·DB `extension_version` 함께.
4. 대기 목록: [`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md)

## 6. 연계·아이디어
상세페이지 자동화 → (이 프로그램) → 주문·매출 리포트로 이어지는 「쇼핑몰 흐름」(`shop-flow` 공용 띠)에 넣을 수 있다. 상품소싱 판매가를 상세페이지 정상가로 넘기는 기존 연결을 그대로 탄다. 쿠팡은 같은 구조로 `coupang-register`(가칭)를 만들 때 `fields.ts`·화면을 복사하고 칸 이름만 바꾼다.

## 7. 디자인
「스토어 등록 워크벤치 스타일」 — `shop-order-report`의 셀러 워크벤치(흰 바탕) 구조에 스마트스토어 초록(`--accent: #047857`). 상세: [`docs/DESIGN_HANDOFF.md`](docs/DESIGN_HANDOFF.md). 디자인 다듬기는 디자인 담당(agy)에게.

## 2026-10-26 v1.02 — EC-W8 2단계 크롬 확장 (Claude Code 윈도우 `claude-win-sdp`)
- 크롬 확장 v1.02 — 「확장 연결」 화면(ZIP 받기·설치 확인·버튼 한 번 연결, 토큰은 해시로만 저장), 30초마다 작업 받기(서버가 한 번만 넘김), 판매자센터 「상품 등록」 탭에서 카테고리·상품명·판매가·즉시할인·재고·대표 이미지·상세설명(스마트에디터 ONE에 섹션 이미지 순서대로)·고시·A/S·판매자 코드 입력, 칸 하나라도 실패하면 저장 버튼 안 누름, 결과·멈춘 칸 보고. 배송 템플릿 고르기·추가 이미지·옵션은 아직 수동.
- 서버: `src/lib/extension/token.ts`(sha256 해시·토큰→회원→이용 권한 재확인) · `/api/extension/auth`(GET 번호 10분·POST 토큰 교환·DELETE 끊기) · `/task`(「확장 대기」→「입력 중」으로 먼저 바꾼 작업만, 이미지 15분 서명 주소) · `/finish`(「입력 중」인 본인 작업만) · `/version`. DB `supabase/migrations/20261026_ext_tokens_v1_02.sql`(표 `smartstore_register_ext_tokens`, 회원 정책 없음 = 서버만).
- 확장 `extension/`: `manifest.json`(v1.02) · `background.js`(작업·칸 채우기 `pageCommand` — ng-model로 칸 찾기, selectize 고르기, 「내 사진」 파일 칸, 스마트에디터 ONE 사진은 블로그 확장 `editor.js` 방식) · `web-bridge.js` · `popup.*`. ZIP은 `npm run build` 앞에 `scripts/build-extension-archive.mjs`가 자동 생성(`public/downloads/`, 로그인 검사 제외 `proxy.ts`).
- 검수: tsc·시험 6·build, 운영 ZIP 검증 `check-extension-release` OK(DB·확장·ZIP v1.02), 서버 주소 토큰 없음·가짜 토큰·로그인 없음 401, 잘못된 번호 400. **실제 스마트스토어 입력 시험은 주인님 크롬에서**(Claude 크롬 확장은 판매자센터를 열 수 없음).
- 커밋 `bcab98b7c`·ZIP 경로 수정, 배포 `smartstore-register-q5ufh2eud`·`4cj06wxgp`, DB v1.02(확장 버전·다운로드 주소 포함).
- 다음: 주인님 설치·연결 → 시험 상품 「입력만」 1회 → 멈춘 칸 보고 보며 칸 찾기 보정(이름이 다른 칸, 카테고리 목록 고르기, 할인 금액 칸).

## 2026-10-27 v1.03 — 실제 「입력만」 시험으로 확장 보정, 상세설명 사진까지 성공 (Claude Code 윈도우 `claude-win-sdp`)
- 실제 「입력만」 시험 6회로 보정 — 접힌 섹션 먼저 펼치기, 「이전 작성 내용」 확인 창 처리, 스마트 에디터 팝업 창 찾기(팝업 허용 1회 안내), 에디터 사진은 파일 칸 click() 가로채기(MAIN)로 넣기, 판매자센터 창을 맨 앞 새 창으로, 상태 창 오른쪽 위 버전 알약·「연결됨」 표시·한국 시간. **6회째 결과: 배송 템플릿(원래 수동)만 남고 카테고리~판매자 코드·대표 이미지·상세설명 섹션 사진 12장까지 자동 입력 성공**.
- 시험 경과(등록 기록): 1회 7칸 실패(접힌 섹션·에디터 확인 창) → 3회 2칸(에디터 사진·배송) → 4회 에디터 화면 못 찾음(팝업 차단) → 주인님이 `https://sell.smartstore.naver.com` 팝업 허용 → 5회 에디터 사진 칸 못 찾음(드롭·DOM 칸 둘 다 안 됨) → **6회 배송 템플릿 1칸만**(에디터 안 사진 순서대로 들어간 것 주인님 캡처로 확인). 미리보기는 저장 전 에디터 내용을 보여 주지 않음.
- 알게 된 것: ① 판매자센터 섹션은 접히면 칸이 DOM에 없음 → `div.title-line`(ncp-click `vm.openMenuToggle()`) 클릭 ② 에디터는 `window.open` 팝업 → 확장 click은 사람 동작이 아니라 크롬이 차단 → 회원이 팝업 허용 1회 ③ 스마트 에디터 사진 버튼은 화면에 붙이지 않은 `input[type=file]`을 만들어 `click()` → MAIN에서 `HTMLInputElement.prototype.click`을 잠깐 바꿔 받아 파일 넣기 ④ 확장이 연 탭이 Claude 작업 창(뒤쪽)에 열려 안 보였음 → `chrome.windows.create({focused, maximized})`.
- 검수: tsc·시험 6·build, 운영 배포 `smartstore-register-isi1praid` Ready, DB v1.03·확장 v1.03(크롬 SQL 편집기), `check-extension-release` OK(zip v1.03), 운영 「확장 연결」 화면 크롬 확인(연결됨·팝업 안내·새 버전 알림).
- 남은 일: 배송 템플릿 고르기(템플릿 고르는 화면 저장본 필요), 「임시저장까지」·「바로 등록」 실제 시험, 추가 이미지·옵션, 시험 상품 기본값의 시험값(02-0000-0000·시험 배송 템플릿) 정리.
