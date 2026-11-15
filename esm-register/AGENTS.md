# AI G마켓·옥션 상품 자동등록기 (`esm-register`) — 에이전트 인수인계

> 루트 `../CLAUDE.md`(메인 지침)를 함께 읽는다. 한국어 진행 안내·회원 본인 계정/키·비용 사전 승인·경로 지정 커밋 규칙이 그대로 적용된다.
> 담당 역할: `ecommerce-image`(Claude Code 윈도우 `claude-win-sdp`).
> 플랜: [`../docs/PLAN_20261115_ESM_EXTENSION.md`](../docs/PLAN_20261115_ESM_EXTENSION.md)(트랙 1 확장) · 상위 [`../docs/PLAN_20261115_ESM_REGISTER.md`](../docs/PLAN_20261115_ESM_REGISTER.md)(2트랙) · 화면 분석 [`../docs/ESM_FORM_ANALYSIS_20261115.md`](../docs/ESM_FORM_ANALYSIS_20261115.md) · 공통 [`../docs/MARKETPLACE_REGISTER_ANALYSIS_GUIDE.md`](../docs/MARKETPLACE_REGISTER_ANALYSIS_GUIDE.md)

## 1. 사용 목적·대상
AI 상세페이지 자동화(`shop-detail-page`) 상품을 **회원 본인 크롬의 확장이 회원 본인 ESM+ 「상품등록 2.0」 화면에 채워** G마켓·옥션에 한 번에 올린다. 2트랙: 지금은 확장(트랙 1), 판매자 본인 ESM Trading API 키 승인 답장이 오면 API(트랙 2) 검토(주인님 2026-11-15, 신청 메일 발송).

## 2. 기술·도구
Next.js 16(App Router, `src/proxy.ts`) · React 19 · Tailwind 4 · Supabase 공용 DB(ref `esgxyikcnnvmlhygjkth`) · 시험 `npm test`(node:test + tsx). **뼈대는 `smartstore-register` v1.28 복사**(권한·로그인·사이드바·확장 연결·작업 전달·결과 보고·화면 점검·30일 정리·발행 표시) — 스마트스토어 전용(옵션 엑셀·상품속성 AI·혜택·연속 보내기)은 뺐다.

## 3. 핵심 구조
| 부분 | 파일 | 하는 일 |
|---|---|---|
| 칸 값 만들기(핵심) | `src/lib/esm/fields.ts` | 상품 + 기본값 → 확장이 위에서부터 실행할 `FillStep[]`(구역 제목 `section` + 칸 이름 `target` + 동작 `action`). **카테고리 먼저**(옵션·인증·고시 칸이 그 뒤에 생김). 상품명 한글 50자/영숫자 100자, 판매가 10원 단위(할인가가 있으면 할인가), 상품이미지 최대 15장 |
| 화면 점검 표 | `src/lib/esm/health.ts` | 「구역\|칸」 목록 — `fields.ts`를 바꾸면 여기도(시험이 확인) |
| 발행 표시 | `src/lib/esm/posted.ts`·`src/lib/postedFiles.ts` | 「바로 등록」 성공 = 발행 → 사진 `markPosted`(G마켓 상품 주소) |
| 데이터 | `src/lib/data.ts` | 회원 세션으로 `shop_products`·`shop_product_images` 읽기(RLS 본인), 기본값·작업 기록 |
| 쓰기 | `src/lib/actions/register.ts` | 기본값 저장, 작업 만들기(진행 중 작업·이미 등록한 상품 막기, 「바로 등록」 확인 상자 필수), 취소 |
| 확장 API | `src/app/api/extension/{auth,task,finish,me,version,health-task,health-result}` | 토큰 해시·작업 한 번만 넘기기·결과(상품번호 「G:…,A:…」·수수료 `fee_note`) |
| DB | `supabase/migrations/20261115_esm_register_v1_01.sql` | `esm_register_{defaults,jobs,ext_tokens,health}` + 프로그램 등록(검수 전 비공개 카테고리 `backup`) |

### ESM+ 화면 특징(확장 구현 때)
- 양식은 `https://item.esmplus.com/goods/new`(바깥 `www.esmplus.com` 안의 틀) — 확장은 이 주소를 **직접** 새 탭으로 연다.
- React 앱: 입력칸 id가 매번 바뀜(`:r0:`) → 구역 제목(h2/h3에서 「필수」「도움말」 뺀 글자) → 칸 이름 → input. 값은 네이티브 setter + `input`/`change` 이벤트. 고르기 대부분은 **버튼 글자**, 목록은 `role=option`.
- 상세설명은 **「이미지 업로드」 탭**(HTML 탭은 공개 https 이미지 주소가 필요한데 우리 사진은 비공개 서명 주소라 금방 만료) — 탭 구조는 2단계에서 실물 확인.
- 배송비·출고지·반품지는 ESM+ 「배송정보관리」에서만 만들 수 있음 → 확장은 고르기만.

## 4. 버전·이력
- v1.01 (2026-11-15, **미배포** — 웹 뼈대): 기본값·상품 목록·칸 미리보기·보내기·기록·매뉴얼·화면 점검·30일 정리. tsc 0·시험 15·로컬 build. 확장(`extension/`)은 아직 스마트스토어 코드 그대로 → **2단계에서 ESM용으로 다시 쓴 뒤 웹과 함께 첫 배포**(빌드 1회 절약).

## 5. 남은 일 (다음 첫 단계)
1. **2단계 확장**: `extension/manifest.json`(이름 「AI G마켓·옥션 상품 자동등록기」, 허용 주소 `item.esmplus.com`·`www.esmplus.com`), `background.js`를 ESM 동작(`sites`·`type`·`category`·`choose`·`list_pick`·`images`·`detail_images`·`option_simple`·`notice_fill`·`submit`)으로 다시 쓰기. ego에서 주인님 ESM+ 로그인 → 「입력만」으로 보정(저장 안 함).
2. DB 마이그레이션 적용(주인님 승인 받음) → Vercel 프로젝트·도메인 `esm-register.buylife.xyz`·환경변수(Supabase 4개·`CRON_SECRET`, `smartstore-register`와 같은 값) → 첫 배포(빌드 승인 범위 3~4회 중 1회).
3. 임시저장 1건·실제 등록 1건(등록 직후 판매중지) 시험(주인님 승인 받음) → 등록 결과 화면에서 상품번호 읽기.
4. 상세페이지 `lib/markets.ts`에 G마켓·옥션 버튼, 공개 때 카테고리 `ecommerce`로.

## 6. 디자인
스마트스토어 등록기의 「스토어 등록 워크벤치 스타일」 그대로(초록). G마켓 색으로 다듬기는 디자인 담당(agy)에게.
