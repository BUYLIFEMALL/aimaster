# AI 쿠팡 운영 자동화(`coupang-ops`) — 인수인계 (2026-10-28, Claude Code 윈도우 `claude-win-sdp`, 역할 `ecommerce-image`)

> 다음 세션은 이 문서 → [`../AGENTS.md`](../AGENTS.md) → [`IMPROVEMENT_BACKLOG.md`](IMPROVEMENT_BACKLOG.md) → [`PLAN_20261028_COUPANG_OPS.md`](PLAN_20261028_COUPANG_OPS.md) 순서로 읽는다.
> **멈춘 이유: 주인님 쿠팡 판매자 계정이 장기 미사용으로 「판매정지」 상태라 쿠팡이 모든 Open API(조회 포함)를 막는다.** 판매 재개(주인님) 뒤 이어서 시험한다.

## 1. 한 줄 요약
쿠팡 공식 WING Open API(판매자 본인 키, 「자체개발」, 우리 서버 Fixie 고정 IP)로 상품 등록부터 운영까지 처리하는 새 프로그램. 오늘 뼈대·키 등록·호출 컴포넌트·연결 시험·기본값 화면·등록 본문 만들기를 만들었고, **운영 DB 등록은 적용**, **Vercel 배포는 안 함**(1단계 완성 때 1회 — 주인님 「모았다가 하자」).

## 2. 지금 되는 것 / 안 되는 것
| 항목 | 상태 | 근거 |
|---|---|---|
| 웹 뼈대·대시보드(출시 순서)·매뉴얼 `/guide` | ✅ 로컬 화면 확인 | 크롬 `http://localhost:3078` |
| 관리자 미리 쓰기(비공개 상태) | ✅ | `programAccess.ts` — 공개 전 프로그램은 관리자만, 일반 회원은 not_found |
| 키 등록 `/connect` | ✅ 주인님이 실제 키 저장 | 업체코드 `A00222419`, WING ID `buylife`(공용 표 `user_api_keys`) |
| 쿠팡 서명·호출 | ✅ 서명 통과 확인 | 쿠팡 응답이 「IP 불허」→ IP 반영 뒤 「계정 상태 제한」으로 바뀜(서명·키 오류였다면 401) |
| 허용 IP(WING 「자체개발」) | ✅ 반영됨 | WING 연동 정보: 바이라이프 / `52.87.82.133, 52.5.155.132, 210.178.96.91` / `www.buylife.xyz` |
| 출고지·반품지 실제 조회 | ⛔ 판매정지로 막힘 | 403 「API access is restricted due to account status change」 |
| 배송·반품 기본값 `/defaults` | ✅ 화면·저장 코드, 실제 목록 불러오기는 판매 재개 뒤 | — |
| 카테고리 추천·메타, 상품 등록 | 코드(정리 함수·본문 만들기·검사)만, 화면·실호출 없음 | 시험 23개 |
| Vercel 배포·도메인 | ❌ 안 함(1단계 완성 때) | — |

## 3. 운영 DB에 적용한 것(ref `esgxyikcnnvmlhygjkth`, 2026-10-28, 주인님 「운영 DB SQL 실행 승인」, 크롬 SQL 편집기)
1. `supabase/migrations/20261028_coupang_ops_v1_01.sql` — `programs`(비공개 `is_active=false`, v1.01, `app_url` https://coupang-ops.buylife.xyz), 요금제 3개, VIP 부여(자동 부여로 이용 권한 147건), 테스트 계정 14일.
2. `20261028_coupang_wing_keys_c1_2.sql` — `user_api_keys_provider_check`에 `coupang_wing_vendor_id·access_key·secret_key·user_id` 추가(현재 목록을 읽어 덧붙임, 기존 이름 보존), `integration_catalog` `coupang_wing`.
   - **함정**: 운영 DB 제약은 `ANY ('{a,b,c}'::text[])`(배열 한 덩어리) 모양이라 따옴표마다 나눠 읽는 정규식은 1개만 읽음 → 첫 실행은 안전장치(10개 미만이면 멈춤)로 중단, `[{]([^}]*)[}]`로 읽게 고쳐 재실행.
3. `20261029_coupang_ops_tables.sql` — `coupang_ops_defaults`(회원 1행 jsonb, 본인만), `coupang_ops_image_links`(짧은 이미지 주소, 서버만), `coupang_ops_jobs`(등록 기록, 본인 읽기만·쓰기 서버만).

## 4. 코드 지도
| 파일 | 하는 일 |
|---|---|
| `src/lib/coupang/sign.ts` | HMAC 「CEA」 서명(경로와 조건 사이 `?` 없음) |
| `src/lib/coupang/client.ts` | `wingRequest` — `FIXIE_URL` 있으면 고정 IP, 없으면 개발 PC 직접(운영에선 막음), 429는 GET만 1회 재시도, 오류 문구(키·IP·**계정 상태**·한도) |
| `src/lib/coupang/keys.ts`·`actions/connection.ts`·`data.ts` | 키 4개 검사·저장·삭제(끝 4자리만 표시), 기본값 읽기·저장 |
| `src/lib/coupang/logistics.ts`·`actions/wing.ts` | 출고지(`/v2/providers/marketplace_openapi/apis/api/v2/vendor/shipping-place/outbound`)·반품지(`/v2/providers/openapi/apis/api/v5/vendors/{vendorId}/returnShippingCenters`) 조회·정리, 연결 시험 |
| `src/lib/coupang/category.ts` | 추천 `POST /v2/providers/openapi/apis/api/v1/categorization/predict`, 메타 `GET …/meta/category-related-metas/display-category-codes/{code}` 정리, 고시 채우기(빈 칸 「상세페이지 참조」), 필수 안내 |
| `src/lib/coupang/product.ts` | 상품 생성 본문 `buildCreateBody`·검사 `checkDraft`(명세 `API_PRODUCT_CREATE_SPEC.md`) |
| `src/lib/coupang/defaults.ts` | 기본값 정리·검사, 택배사 목록 |
| `src/lib/shop.ts` | 상세페이지 상품·이미지 읽기(본인 폴더만) |
| 화면 | `/home` `/connect`(`WingKeyForm`·`ConnectionTest`) `/defaults`(`DefaultsForm`) `/guide` |
| 시험 | `npm test`(23개: 서명 2·본문 7·물류 4·카테고리 6·기본값 4) |

## 5. 로컬 실행
- `coupang-ops/.env.local`(커밋 안 됨)에 Supabase 3개 — 저장소 루트 `.env.local`에서 복사(`vercel env pull`은 보호 값이 `[SENSITIVE]`로 내려와 못 씀).
- `npm run dev` → `http://localhost:3078/login`(로컬 주소라 따로 로그인). 개발 서버가 바뀐 권한 코드를 안 읽은 적이 있음 → 이상하면 서버 재시작.
- `FIXIE_URL`은 Vercel에만 있어 로컬에선 고정 IP 경로 시험 불가(이 PC IP `210.178.96.91`로 직접 호출).

## 6. 알게 된 함정
1. **판매정지 = 모든 API 막힘**(조회 포함). 응답 원문 「API access is restricted due to account status change」.
2. WING 「연동 정보 수정」 창: IP는 쉼표가 아니라 **하나씩 넣고 「추가」**, URL은 `https://` 없이(`www.buylife.xyz`). 판매정지 중에도 수정은 됨. 반영은 수 분~수십 분.
3. 크롬이 키 입력 칸에 사이트 로그인 정보(이메일·비밀번호)를 자동으로 채움 → `autoComplete="new-password"`/`off`로 막음.
4. 이미지 `vendorPath` 최대 200자 → 비공개 저장소 서명 주소 불가, 우리 도메인 짧은 주소(`/i/<id>`, 표 `coupang_ops_image_links`) 필요 → **실제 상품 등록은 배포 뒤에만 시험 가능**.
5. `next dev`가 `AGENTS.md` 끝에 Next.js 안내 문단을 덧붙임(그대로 둠).
6. 주인님 키가 오늘 캡처로 두 번 노출됨 → 판매 재개 뒤 **재발급** 후 `/connect` 「새 키로 바꾸기」.

## 7. 다음 첫 단계
1. (주인님) WING 「온라인 문의하기」로 판매 재개 → 재발급 → 새 키 입력.
2. `/connect` 「🔌 연결 시험」 → `/defaults` 「쿠팡에서 불러오기」로 출고지·반품지 고르고 저장.
3. 카테고리 추천·메타를 실제 응답으로 확인(메타에 고를 수 있는 값 목록이 오는지, `inputValues` 유무).
4. 키 없이 할 수 있는 남은 것: 상품 화면(C1-6·C1-7·C1-10·C1-12 화면), 짧은 이미지 주소 `/i/<id>`(C1-11), 등록 실행·기록(C1-13·C1-14).
5. 1단계 완성 → 배포 승인 → Vercel 새 프로젝트 `coupang-ops`·도메인·환경변수(Supabase 4개·`FIXIE_URL`)·빌드 1회 → 실제 「저장만」 등록 시험 → 공개 여부 주인님 결정.

## 8. 커밋
`3056388a7`(뼈대) · `a525acd8e`(호출) · `660a95c51`(상품·본문) · `67dba730e`(연결 시험) · `77bec0e29`(카테고리) · `7d65ba4d5`(SQL 적용) · `4c7c794af`(관리자 미리 쓰기·자동 채우기 막기) · `c57ba6a86`(WING 안내) · `56d8b79e3`(기본값 화면) · `6139f4462`(계정 제한 문구).
