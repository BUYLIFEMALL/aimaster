# 플랜 — 이커머스 자동화 흐름 잇기 (트렌드 → 상품 → 상세페이지 → 검토 → 스마트스토어 자동 등록)

> 2026-10-27 주인님 정의: 「소싱할 상품을 트랜드를 분석하고 그이후 상품 소싱이나 내가 상품을 정하고 그걸 가지고 상세페이지 자동화로 만들고 최종 사용자가 검토후 스마트스토어 자동 포스팅 하는 흐름」 / 「지금 작업 안되어 있거나 빠져 있는 부분이 있다면 기능 추가 확장해야되」
> 원칙(주인님): 「각각의 개별 프로그램이지만 전체적으론 하나의 흐름으로 자동화가 이어져 나가는 거야」 — 프로그램은 각자 독립 배포, 회원에게는 끊기지 않는 한 흐름. 앞 단계 결과를 다시 입력받지 않고 이어받고, 버튼·흐름 띠로 다음 단계로 간다. 핵심 지침: [`docs/ECOMMERCE_COMPLETION_POLICY.md`](../../docs/ECOMMERCE_COMPLETION_POLICY.md) 맨 위.
> 작성: Claude Code 윈도우 `claude-win-sdp` · 역할 `ecommerce-image`. 대상: `trending-product-finder`·`shop-detail-page`·`smartstore-register`(+ 흐름 띠 공용 기준 코드 사본들).

## 1. 현재 상태 (코드 확인, 2026-10-27)
| 흐름 | 상태 | 근거 |
|---|---|---|
| 1. 트렌드 분석 | ✅ | `trending-product-finder/app/(dashboard)/dashboard`·`sourcing` |
| 2-① 소싱 → 상세페이지 | ✅ 상품명·판매가 / ⚠️ 카테고리 안 넘어감 | `trending-product-finder/lib/shopDetailLink.ts`(price·flow만), `shop-detail-page/app/(dashboard)/products/new/page.tsx`(`from=sourcing`) |
| 2-② 직접 상품 | ✅ | 상세페이지 「새 상품」 |
| 3. 상세페이지 생성 | ✅ | — |
| 4. 최종 검토 | ❌ 상태 없음 | `shop_products.status` = draft·analyzing·analyzed·generating·completed·error |
| 4 → 5 이동 | ❌ 버튼 없음 | `shop-detail-page`에 `smartstore-register` 링크 없음 |
| 5. 자동 등록 | ✅ v1.07 | 세 방식 실제 성공 |
| 5 → 4 결과 | ❌ | 상품번호가 `smartstore_register_jobs`에만 |
| 흐름 띠 | ⚠️ | `shopFlow.ts` 단계 = 소싱·상세페이지·주문 리포트·발송 라벨(등록 없음). 상세페이지·등록 프로그램에는 띠 없음 |

## 1-1. 마켓 확장 구조 (2026-10-27 주인님: 「일단 스마트스토어 기준인데」「이후 쿠팡 을 추가할꺼고」)
- 추가할 마켓(주인님 2026-10-27): **쿠팡 → 11번가 → G마켓 → 옥션 등**. 지금은 스마트스토어 기준. 상세페이지의 등록 영역은 「🛒 마켓 등록」 하나에 **마켓 목록 설정**(`id`·이름·등록 화면 주소·결과 표)을 두고 지금은 스마트스토어 1개 — 쿠팡 등록기가 생기면 목록에 1줄 추가로 버튼·결과 표시가 함께 생기게 한다.
- 흐름 띠 단계 이름은 「🛒 마켓 등록」(지금은 `smartstore-register`로 연결).
- 결과 표시는 마켓별로 나란히(「스마트스토어 등록됨 · 상품번호」).

## 2. 추가·확장할 기능
| # | 기능 | 프로그램 | 내용 |
|---|---|---|---|
| A | **「검토 완료」** | `shop-detail-page` | 상품 상세 화면에 「✅ 검토 완료」 버튼(되돌리기 가능). DB `shop_products.reviewed_at timestamptz`(null=검토 전). 상세페이지 내용·가격·이미지가 바뀌면 검토 완료를 풀지 않고 「검토 뒤 수정됨」 표시만(회원이 다시 누름) |
| B | **「스마트스토어에 등록」 버튼** | `shop-detail-page` | 검토 완료 상품에만 버튼 → `https://smartstore-register.buylife.xyz/products/<id>`(그 상품이 골라진 등록 화면)로 이동. 검토 전이면 「먼저 검토 완료를 눌러 주세요」 |
| C | **등록 목록에 검토 상태** | `smartstore-register` | 「등록할 상품」에 「검토 완료」 배지·기본 정렬(검토 완료 먼저), 「검토 전」 상품은 보내기 전에 「상세페이지에서 검토 완료 뒤 보내기 권장」 안내(막지는 않음 — 회원 선택) |
| D | **등록 결과 돌려주기** | `shop-detail-page` | 상품 카드·상세 화면에 「🟢 스마트스토어 등록됨 · 상품번호 ○○ · 날짜」(회원 본인 `smartstore_register_jobs` 중 `registered` 최신 1건 읽기). 「임시저장됨」도 표시 |
| E | **카테고리 넘기기** | `trending-product-finder` → `shop-detail-page` → `smartstore-register` | 소싱 「상세페이지 만들기」 링크에 `category` 추가 → 새 상품 화면 카테고리 칸 미리 채움 → 등록 화면 카테고리 검색어 기본값(이미 상품 카테고리 마지막 단계를 씀) |
| F | **흐름 띠에 「등록」 단계** | 공용 기준 `shop-order-report/src/lib/shopFlow.ts` + 사본 | 단계: 🔎 소싱 → 📄 상세페이지 → **🛒 스마트스토어 등록** → 📊 주문 리포트 → 🏷 발송 라벨. 상세페이지·등록 프로그램에도 띠 사본 붙이기 |

## 3. 순서 (하나씩, 프로그램마다 로컬 검사 → 배포는 한 번에 하나)
1. DB: `shop_products.reviewed_at` 추가(마이그레이션 파일 + 크롬 SQL 편집기, 운영 ref `esgxyikcnnvmlhygjkth`) — **DB 스키마 변경이라 주인님 승인 필요**
2. 흐름 띠 기준 코드 수정(F) → `node scripts/check-shared-modules.mjs --sync`
3. `shop-detail-page`: A·B·D·E(받는 쪽)·띠 → tsc·build → 배포
4. `smartstore-register`: C·띠 → 시험·tsc·build → 배포
5. `trending-product-finder`: E(보내는 쪽)·띠 단계 → 배포
6. 띠 사본만 바뀐 `shop-order-report`·`seller-label-docs`는 급하지 않은 변경 → 미배포 대기(다음 배포 때)
7. 실제 흐름 시험(크롬): 소싱에서 상품 → 상세페이지 생성 → 검토 완료 → 등록 버튼 → 「입력만」 → 상세페이지에 결과 표시

## 4. 주의
- `shop-detail-page`는 작업 중 표에 agy(디자인, v1.38 완료 표시)가 남아 있음 → 착수 전 미커밋 변경·담당 확인, 디자인 영역(버튼 모양)은 기존 「이커머스 셀러 스튜디오 스타일」 컴포넌트 재사용.
- 회원 본인 데이터만(RLS·`user_id`), 다른 프로그램 표 읽기는 회원 세션으로.
- 공용 기준 코드 규칙: 띠는 기준만 고치고 sync, 사본 직접 수정 금지.

## 5. 비용
| 항목 | 횟수 | 비고 |
|---|---|---|
| Vercel 빌드 | 3회(상세페이지·등록·상품소싱) | 실행 직전 승인. 띠 사본만 바뀐 2개 프로그램은 다음 배포 때 |
| DB | 0원 | 칸 1개 추가 |
| AI 호출 | 없음 | — |

## 6. 버전
`shop-detail-page` v1.38→v1.39(또는 다음 번호), `smartstore-register` v1.07→v1.08, `trending-product-finder` +0.01.

## 7. 결과 (2026-10-27)
| # | 상태 |
|---|---|
| A 검토 완료 | ✅ 배포(상세페이지) |
| B 마켓 등록 버튼 | ✅ 배포 — 마켓 목록 `shop-detail-page/lib/markets.ts` |
| C 등록 목록 검토 상태 | ✅ v1.08 |
| D 결과 돌려주기 | ✅ 배포(등록됨·임시저장됨·상품번호) |
| E 카테고리 넘기기 | 받는 쪽만(분석 우선). 상품소싱에는 상품별 카테고리가 없어 보내는 쪽은 보류 |
| F 흐름 띠 | ✅ 상세페이지·등록 프로그램 / 주문 리포트·셀러 라벨·상품소싱 사본은 미배포 대기 |
- 빌드 2회 사용(승인 3회). 상세페이지 버전 숫자 v1.39는 다음 배포 때.
