# 스마트스토어 상품등록 자동화 (`smartstore-register`) — 에이전트 인수인계

> 루트 `../CLAUDE.md`(메인 지침)를 함께 읽는다. 한국어 진행 안내·회원 본인 계정/키·운영/Lab 분리·비용 사전 승인·경로 지정 커밋 규칙이 그대로 적용된다.
> 플랜: [`../trending-product-finder/docs/PLAN_20261026_EC_W8_SMARTSTORE_EXTENSION.md`](../trending-product-finder/docs/PLAN_20261026_EC_W8_SMARTSTORE_EXTENSION.md) · 0단계 화면 분석: [`../trending-product-finder/docs/EC_W8_SMARTSTORE_FORM_ANALYSIS_20261026.md`](../trending-product-finder/docs/EC_W8_SMARTSTORE_FORM_ANALYSIS_20261026.md)
> **📘 상세 인수인계(2026-10-27, 먼저 읽기)**: [`docs/IMPROVEMENT_HANDOFF_20261027.md`](docs/IMPROVEMENT_HANDOFF_20261027.md) — 현재 상태·시험 경과표·에러별 원인과 해결·시험하는 법·남은 일.
> **마켓 등록기 공통 레퍼런스**: [`../docs/MARKETPLACE_REGISTER_ANALYSIS_GUIDE.md`](../docs/MARKETPLACE_REGISTER_ANALYSIS_GUIDE.md) — 분석 기법·실측 보정 순서·화면 변경 대응·새 마켓 점검표(2026-10-27).
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

## 2026-10-27 v1.04 — 배송 칸 자동 입력, 「입력만」 18칸 전부 성공 (Claude Code 윈도우 `claude-win-sdp`)
- 배송 칸 자동 입력 — 템플릿 이름이 있으면 「배송비 템플릿」 목록 창에서 「선택」, 없으면 택배사·배송비 종류·기본 배송비·무료 조건 금액 직접 입력(기본값 화면 칸 4개 추가). 예전 코드가 노리던 `vm.savedTemplate['DELIVERY']`는 고르는 칸이 아니라 「템플릿 추가」 체크 상자였음을 저장본으로 확인. 확장이 `X-Ext-Version`을 보내고 서버는 새 동작이 든 작업을 v1.04 미만 확장에 넘기지 않음. **실제 「입력만」 시험: 18칸 전부 자동 입력, 멈춘 칸 0**(택배사·배송비는 selectize라 화면 목록을 열어 정확히 같은 보기를 누르도록 보정 — 이 보정은 미배포 대기).
- 시험 경과: 1회차(v1.04 배포본) 택배사·배송비 「고른 값이 반영되지 않았습니다」 — 두 칸 모두 `select.selectized`(진짜 select를 화면 밖에 숨기고 selectize 목록을 덮음)라 숨은 값을 바꾸면 되돌려짐 → 화면 목록을 열어 글자가 정확히 같은 보기를 누르고 화면 값으로 확인(택배사 목록에 「CJ대한통운(새벽배송)」·「CJ대한통운」이 함께 있음). 2회차 멈춘 칸 0.
- 주인님 판매자센터에는 배송비 템플릿이 0개(목록 창 저장본으로 확인) → 템플릿 고르기 방법은 템플릿을 하나 만든 뒤 시험해야 함.
- 검수: 시험 9개·tsc·build, 운영 배포 `smartstore-register-c2zo2h21x` Ready, DB·확장·ZIP v1.04(`check-extension-release` OK), 크롬에서 기본값 화면 저장·새로고침 확인, 「입력만」 실제 시험(작업 기록 18칸 통과).
- 미배포 대기: selectize 고르기 보정(`extension/background.js`), 기본값 저장 직후 배송비 상자 표시 보정(`DefaultsForm.tsx`). 주인님 PC 확장은 저장소 폴더에서 바로 로드돼 이미 적용됨. 다음 배포(v1.05) 때 ZIP에 함께.
- 남은 일: 템플릿 고르기 실제 시험(템플릿 1개 필요), 「임시저장까지」·「바로 등록」 실제 시험, 추가 이미지·옵션, 쿠팡용.

## 2026-10-27 v1.05 — 세 방식 실제 시험 통과, 중복 등록 막기 (Claude Code 윈도우 `claude-win-sdp`)
- 실제 시험 세 방식 모두 통과 — 「입력만」 18칸, 「임시저장까지」 임시저장 완료, 「바로 등록」 등록 완료(전시중지). 시험 중 찾은 보정 6건(배송 selectize 칸은 화면 목록에서 정확히 같은 보기 고르기, PC 임시저장 버튼은 `progress-button` 속성, 에디터 「등록」 뒤 닫힘 대기 45초·재클릭, 첫 화면 15초에 상품 등록 주소로 재이동·실패 시 실제 화면 기록, 전시 상태 라디오 실제 이름 `vm.singleChannelProductMap[channelServiceType].channelProductDisplayStatusType`, 기본값 저장 직후 표시) + **같은 상품 「바로 등록」 중복 막기**(「등록 완료」 기록이 있으면 「한 번 더 등록합니다」 체크가 있어야 보냄).
- **사고 직전 기록**: 「바로 등록」 보내기 클릭이 자동 실행 안전 검사로 「거부」 안내를 받았지만 실제로는 클릭이 먼저 들어가 작업이 만들어졌음(10:50). 이를 모르고 주인님께 다시 눌러 달라고 해 같은 작업이 하나 더 생김(11:00) → 확장이 가져가기 전에 「취소」로 막음, 중복 등록 없음. 교훈: 도구가 막혔다고 해도 **다시 부탁하기 전에 기록부터 확인**. 이 일로 중복 막기를 서버에 넣음.
- 「바로 등록」 결과에 상품번호가 남지 않음(결과 「—」) → 대기 목록(완료 화면 저장본 필요).
- 검수: 시험 9개·tsc·build, 운영 배포 `smartstore-register-kjp25qgzv` Ready, DB·확장·ZIP v1.05(`check-extension-release` OK), 운영 상품 화면에서 「바로 등록」 고르면 확인 상자 표시 확인(보내지 않음).
- 남은 일: 상품번호 기록, 템플릿 고르기 실제 시험(판매자센터에 배송비 템플릿 0개), 추가 이미지·옵션, 쿠팡용.
- **정정(2026-10-27)**: 「바로 등록」 10:50 작업은 실제로 등록되지 않았음(판매자센터 상품 목록 98개에 없음, 주인님 캡처). 확장이 「저장하기」를 **누르기만 하면 성공으로 보고**했기 때문 — 「임시저장까지」도 같은 이유로 저장 여부 미확인. DB 기록 두 줄 정정(registered→failed, temp_saved→filled). **수정(미배포 대기)**: 저장 버튼을 누른 뒤 「상품 등록」 주소를 벗어나거나 완료 안내가 뜨면 성공, 오류·칸 오류 문구가 보이면 그 문구로 실패, 둘 다 아니면 「결과를 확인하지 못했습니다」로 회원 확인(`extension/background.js` submit·runJob). 「바로 등록」·「임시저장까지」 실제 성공은 **아직 확인되지 않음**.

## 2026-10-27 v1.06 — 「바로 등록」 첫 실제 성공 (Claude Code 윈도우 `claude-win-sdp`)
- **「바로 등록」 첫 실제 성공(14:03, 판매자센터 「상품저장이 완료되었습니다」 주인님 화면 확인)**. 그 전까지 막던 원인을 차례로 해결: 숫자 서식 칸이 화면만 바뀌고 내부 값이 비던 문제(AngularJS 모델에 직접 넣고 모델 값으로 확인, 운영 모드라 `injector`로 `$rootScope`), 저장 결과를 확인 없이 성공 처리하던 문제(주소 변화·완료 문구=성공, 새 오류 문구=실패, 불분명하면 `ng-invalid` 칸 이름 기록), 고시 「A/S 책임자 또는 소비자 상담 관련 전화번호」(라벨 글자로 찾기), 「어린이제품인증」(기본값에서 회원이 「인증대상 아님」 선택), 「상품속성 미입력 확인」 창(「다음에 할래요」), 새 창 대신 기존 판매자센터 탭을 닫고 같은 자리에 새 탭.
- 배포 `smartstore-register-mcvppashp` Ready, DB·확장·ZIP v1.06 검증 OK(승인 빌드). 기본값 「어린이제품인증 = 인증대상 아님」 설정(시험 상품 성인용 백팩).
- 미배포 대기: 「다음에 할래요」 자동 클릭, 완료 창 링크에서 상품번호 읽기(주인님 확장은 저장소 폴더 로드라 이미 적용).
- 남은 일: 다음 배포(v1.07), 시험 상품·임시저장본 정리(주인님), 템플릿 고르기 시험, 추가 이미지·옵션, 쿠팡용.

## 2026-10-27 v1.07 — 상품속성 창 자동 넘기기·상품번호 자동 기록 배포
- 배포 `smartstore-register-7iiza23u6` Ready, DB·확장·ZIP v1.07 검증 OK(승인 빌드). 미배포 대기 없음. 대기 목록 정리(끝난 1·2단계 [x]).
