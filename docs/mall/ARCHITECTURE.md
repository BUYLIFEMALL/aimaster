# 쇼핑몰 빌더 공통 코어 설계 (모든 버전 공통)

> 쇼핑몰 계열의 모든 버전(V-A~V-J, [로드맵](ROADMAP_AND_VARIANTS.md))은 이 코어 위에 모듈을 켜고 끄는 방식으로 만든다. 처음 작성 2026-11-03(`claude-win-20261103-mall-builder`) — **아직 구현 전 설계안**이다. 구현하면서 바뀐 점은 같은 커밋에서 이 문서를 고치고 맨 아래 변경 기록에 남긴다.

---

## 1. 사용자 3층 구조

| 층 | 누구 | 인증 | 할 수 있는 일 |
|---|---|---|---|
| 플랫폼 관리자 | 주인님(Lab에서는 Lab 관리자 계정) | 플랫폼 로그인 + 관리자 표시 | 몰 목록·상태(정지/재개), 모듈 허용 범위, 이용 현황(건수). **손님 개인정보는 보지 않음** |
| 몰 운영자 | 몰을 개설한 회원(+2차: 부계정 직원) | 플랫폼 로그인 | 자기 몰의 상품·주문·손님·거래처·첫 화면·설정 |
| 몰 손님 | 각 몰의 소비자·사업자 고객 | 같은 인증 시스템(Supabase Auth) 계정 + 몰별 가입 기록 | 그 몰에서 가입·장바구니·주문·견적·내 주문 보기 |

- 손님 계정은 인증 계정 하나로 여러 몰에 가입할 수 있다. 몰마다 `store_customers` 한 줄(등급·사업자 정보·승인 상태)이 따로 생긴다 — 몰 A의 등급·외상 한도가 몰 B에 섞이지 않는다.
- 몰 운영자가 다른 몰의 손님이 되는 것도 가능하다(역할은 몰 단위로 판정).
- 비로그인 방문자는 공개 상품 보기까지만 가능. 장바구니는 1차에서 로그인 필수(비회원 주문은 로드맵 2차).

## 2. 몰 주소(테넌트 찾기)

| 단계 | 주소 형태 | 몰 찾는 법 |
|---|---|---|
| 1차(Lab) | `dev-mall-builder.vercel.app/s/<몰주소>` | 경로의 `<몰주소>` → `stores.slug` |
| 2차 | `<몰주소>.<플랫폼 도메인>` | 하위 도메인 → slug (미들웨어에서 경로로 바꿔 같은 화면 사용) |
| 3차 | 운영자 개인 도메인 | `store_domains` 표(도메인 → store_id), Vercel 도메인 추가 API |

- 화면 코드는 처음부터 「현재 몰」을 경로 하나에서 받는 구조(`app/s/[store]/…`)로 만들어, 2·3차에서 미들웨어만 추가하면 되게 한다.
- `<몰주소>` 예약어: `admin`, `api`, `s`, `login`, `www` 등은 개설 불가.

## 3. 데이터 모델 (1차 초안)

Lab 표 이름표는 `mall_builder_`(아래에서는 생략). 모든 몰 데이터 표에 `store_id` + RLS. 시각은 `timestamptz`, 금액은 원 단위 정수(`bigint`).

### 3-1. 몰과 손님
| 표 | 주요 칸 | 메모 |
|---|---|---|
| `stores` | id, owner_id, slug(고유), name, status(active/suspended), business_info(jsonb: 상호·대표·사업자번호·통신판매업·주소·연락처·계좌), settings(jsonb), modules(jsonb: 켜진 모듈), created_at | 1인 1몰(1차), 여러 몰은 로드맵 |
| `store_staff` | store_id, user_id, role(owner/manager/staff), permissions | 1차는 owner 한 줄만 자동 생성, 부계정은 2차 |
| `customer_grades` | store_id, code, name, rank, is_business, auto_rule(jsonb) | 몰 개설 시 기본 등급 자동 생성: 일반(소비자)·사업자(승인 필요) |
| `store_customers` | store_id, user_id, grade_id, kind(consumer/business), business_no, company, ceo_name, cert_file_path, approval_status(pending/approved/rejected), credit_limit, phone, memo, created_at | (store_id, user_id) 고유. 사업자등록증 파일은 몰별 비공개 저장 경로 |
| `customer_addresses` | store_id, user_id, label, receiver, phone, zip, addr1, addr2, is_default | 손님 본인·그 몰 운영자만 |

### 3-2. 상품
| 표 | 주요 칸 | 메모 |
|---|---|---|
| `categories` | store_id, parent_id, name, sort, is_visible | 3단계까지 |
| `products` | store_id, name, status(draft/on_sale/sold_out/hidden), list_price(정가), base_price(판매가), cost(원가), tax_type(taxable/exempt), visibility(public/members/business_only), price_visibility(all/login/approved_business), moq(최소수량), order_unit(주문 단위), max_qty, stock_mode(none/product/option), stock, shipping_policy_id, images(jsonb), detail_html, created_at | `detail_html`은 저장 전 위험 태그 제거 |
| `product_categories` | product_id, category_id | 다중 카테고리 |
| `product_options` | product_id, option_names(jsonb: 최대 3단), combos: (values jsonb, extra_price, stock, sku, is_active) | 조합형 옵션 |
| `product_grade_prices` | product_id, grade_id, price 또는 discount_rate | 등급별 가격(없으면 기본 판매가) |
| `product_volume_tiers` | product_id, min_qty, discount_type(rate/amount/unit_price), value | 수량 구간 할인 |
| `shipping_policies` | store_id, name, type(free/fixed/conditional), base_fee, free_over, island_fee, jeju_fee, repeat_by_qty | 프로셀 「제주/도서 배송비 1회·반복 부과」 반영 |

### 3-3. 장바구니·주문·견적·외상
| 표 | 주요 칸 | 메모 |
|---|---|---|
| `carts` / `cart_items` | store_id, user_id / product_id, option_combo_id, qty | 금액은 저장하지 않음(보여 줄 때마다 엔진 계산) |
| `orders` | store_id, order_no, user_id, status, pay_method(bank/credit/card), pay_status, subtotal, discount_total, shipping_fee, total, receiver(jsonb 스냅숏), depositor, tax_invoice(jsonb: 요청 여부·사업자 정보), quote_id, memo, created_at | 주문번호 몰별 일련 |
| `order_items` | order_id, product_id, option_combo_id, name_snapshot, option_snapshot, unit_price, qty, discount, line_total, price_breakdown(jsonb) | 계산 근거를 함께 저장(나중 분쟁·정산용) |
| `order_events` | order_id, from_status, to_status, actor(user_id/role), note, created_at | 상태 이력 전부 |
| `quotes` / `quote_items` | store_id, user_id, status(requested/answered/accepted/rejected/expired), valid_until, answer_note / product_id, option, qty, requested_price, quoted_price | 승인 시 같은 금액으로 주문 생성 |
| `credit_ledger` | store_id, user_id, order_id, kind(charge/payment/adjust), amount, balance_after, note, created_at | 외상 사용·입금 기록. 현재 사용액 = 합계 |

### 3-4. 첫 화면·콘텐츠
| 표 | 주요 칸 | 메모 |
|---|---|---|
| `pages` | store_id, kind(home/custom), slug, draft_blocks(jsonb), published_blocks(jsonb), schema_version, updated_at, published_at | 편집은 draft, 「게시」 누르면 published로 복사 |
| `notices` | store_id, title, body, is_pinned, created_at | 공지 블록·공지 목록 |
| 파일 저장 | Storage 버킷 `mall-builder-public`(상품·배너 이미지, 공개), `mall-builder-private`(사업자등록증, 비공개·서명 주소로만) | 경로 첫 칸은 항상 `<store_id>/` |

## 4. 가격 계산 엔진 (가장 중요한 공용 코드)

장바구니·상품 상세·주문서·견적·운영자 수동 주문이 **모두 같은 함수**를 쓴다. 화면과 분리된 순수 함수로 만들고 자동 시험을 먼저 쓴다.

```
priceLine(product, optionCombo, qty, customer, context) →
  { visible, orderable, unitPrice, lineTotal, breakdown[], errors[] }
```

계산 순서(고정):
1. **보이기 판단** — `visibility`·`price_visibility`와 손님 상태(비로그인/소비자/승인 대기 사업자/승인 사업자)로 상품·가격·주문 버튼 노출 결정. 가격 비공개면 금액 대신 「사업자 승인 후 가격 공개」.
2. **기준가** — 판매가 + 옵션 추가금.
3. **등급가** — 손님 등급에 `product_grade_prices`가 있으면 그 값(금액 지정 또는 할인율)으로 대체.
4. **수량 구간 할인** — 해당 수량 이상인 구간 중 가장 큰 할인 1개만 적용(중복 적용 안 함).
5. **원 단위 처리** — 단가는 원 단위 내림, 합계 = 단가 × 수량.
6. **수량 규칙 검사** — 최소 수량·주문 단위·최대 수량·재고. 어기면 `errors`에 이유(「10개 단위로 주문해 주세요」).
7. **견적가 우선** — `context.quote`가 있고 유효하면 그 단가를 쓰고 3~4단계는 건너뜀.

주문 단위 계산(`orderTotals`): 줄 합계 + 배송비(정책별, 제주·도서 추가) − (2차: 쿠폰·포인트) = 결제 금액. 결제 수단이 외상이면 `한도 − 현재 사용액 ≥ 결제 금액`인지 검사.

- **서버가 다시 계산해 저장**: 주문 생성 API는 화면이 보낸 금액을 쓰지 않고 이 엔진으로 다시 계산한다. 다르면 「가격이 바뀌었습니다」로 다시 보여 준다.
- 계산 근거(`breakdown`)를 `order_items.price_breakdown`에 저장한다.

## 5. 주문 상태 흐름

```
입금대기(pending_payment) ─입금 확인─▶ 결제완료(paid) ─▶ 배송준비(preparing) ─▶ 배송중(shipping) ─▶ 배송완료(delivered) ─▶ 구매확정(confirmed)
      │                                   │                    │
      └─취소(cancelled)◀──────────────────┴─취소 요청/승인────┘
배송완료 ─반품 요청─▶ 반품요청(return_requested) ─승인─▶ 반품완료(returned)
외상 주문: 주문 즉시 결제완료(paid)로 보되 credit_ledger에 charge 기록, 입금 시 payment 기록
```

| 바꾸는 사람 | 허용 이동 |
|---|---|
| 손님 | 입금대기→취소, 결제완료→취소 요청, 배송완료→반품 요청, 배송완료→구매확정 |
| 운영자 | 모든 다음 단계, 취소·반품 승인/거절, 송장 번호 입력 |
| 자동(2차) | 배송중→배송완료(N일), 배송완료→구매확정(N일) — 프로셀 「자동 배송완료·자동 구매확정」 |

- 모든 이동은 `order_events`에 남긴다. 허용 표에 없는 이동은 서버에서 거절한다.
- 재고 차감 시점은 몰 설정: 주문 생성 시(기본) 또는 결제완료 시. 취소·반품 완료 때 되돌림. (프로셀은 「결제완료 시」 권장, 「결제버튼 클릭 시 선차감 + 10분 미결제 자동 취소」 선택 가능 — 우리 2차 후보)

## 6. 첫 화면 블록 구조 (위지위그 편집기의 바탕)

```json
{
  "schema_version": 1,
  "blocks": [
    { "id": "b1", "type": "topbar",        "visible": true, "settings": { "items": [{ "text": "가입 시 10% 쿠폰", "link": "/s/x/join", "bg": "#7a8fa6" }], "rotate_sec": 4 } },
    { "id": "b2", "type": "slider",        "visible": true, "settings": { "slides": [{ "image": "…", "mobile_image": "…", "link": "…" }], "height": 550, "autoplay_sec": 5 } },
    { "id": "b3", "type": "banner",        "visible": true, "settings": { "image": "…", "link": "…", "max_width": 1100 } },
    { "id": "b4", "type": "product_grid",  "visible": true, "settings": { "title": "할인특가전", "source": "manual|category|newest|best", "product_ids": [], "category_id": null, "columns": 4, "limit": 12, "show_badge": true } },
    { "id": "b5", "type": "html",          "visible": true, "settings": { "html": "<p>…</p>" } },
    { "id": "b6", "type": "notice_list",   "visible": true, "settings": { "limit": 5 } }
  ]
}
```

- **블록 등록표(레지스트리) 하나**에 블록 종류마다 ① 손님 화면 컴포넌트 ② 편집기 설정 폼 정의(칸 이름·종류·기본값) ③ 설정값 검사 규칙을 함께 둔다. 새 블록을 추가할 때 이 세 가지만 만들면 편집기와 손님 화면에 동시에 생긴다.
- 편집은 `draft_blocks`에만 저장 → 미리보기 → 「게시」로 `published_blocks`에 복사. 손님 화면은 `published_blocks`만 읽는다.
- `schema_version`으로 블록 모양이 바뀌어도 옛 데이터를 읽어 고쳐 주는 변환 함수를 둔다.
- 머리글·바닥글은 블록이 아니라 몰 설정(`stores.settings`·`business_info`)에서 그린다 — 전자상거래법 표시 항목(상호·대표·사업자번호·통신판매업 신고번호·주소·연락처·개인정보책임자)이 빠지지 않게 필수 칸으로 둔다.
- 디자인 테마는 블록과 분리: CSS 변수 묶음(색·글꼴·둥근 정도·간격)을 `stores.settings.theme`에 두고, 주인님이 줄 디자인은 테마 묶음으로 추가한다.
- `html` 블록은 저장 전 위험 태그·스크립트를 제거한다(다른 손님 화면에서 실행되지 않게).

## 7. 보안 규칙(RLS) 원칙

| 표 묶음 | 읽기 | 쓰기 |
|---|---|---|
| `stores` | 공개 칸(이름·slug·상태)은 누구나, 전체는 운영자 | 운영자 |
| 상품·카테고리·배송 정책·발행된 페이지·공지 | 몰이 active이고 공개 상태인 것은 누구나(가격 비공개 칸은 서버에서 가림), 전체는 운영자 | 운영자 |
| `store_customers`·주소 | 손님 본인 + 그 몰 운영자 | 손님 본인(가입·정보 수정, 등급·승인·한도 칸 제외), 운영자 |
| 장바구니 | 손님 본인 | 손님 본인 |
| 주문·견적·외상 장부 | 손님 본인(자기 것) + 그 몰 운영자 | **서버(서비스 키)만** — 상태 이동·금액은 서버 함수가 검증 후 기록 |

- 「운영자인가」 판정은 `store_staff`에 (store_id, auth.uid())가 있는지로 하는 SQL 함수 하나(`is_store_staff(store_id)`)를 모든 정책이 쓴다.
- 가격 비공개는 RLS만으로 칸 단위 숨김이 어려우므로 **손님 화면용 읽기는 서버에서 엔진을 거친 결과만 내려준다**(상품 표를 브라우저가 직접 읽지 않게).
- 서비스 키로 읽는 서버 코드도 반드시 `store_id` 조건을 붙인다.

## 8. 모듈(켜고 끄기) 구조 — 버전을 만드는 방법

`stores.modules`(몰별)와 플랫폼 설정(이 플랫폼에서 허용하는 모듈)으로 기능을 켠다.

| 모듈 키 | 내용 | 1차 |
|---|---|---|
| `b2b` | 사업자 가입·승인, 등급가, 가격 비공개, 최소수량·주문단위, 구간할인 | ✅ |
| `quotes` | 견적 요청·회신·주문 전환 | ✅ |
| `credit` | 외상(후불)·여신 한도·외상 장부 | ✅ |
| `block_editor` | 첫 화면 블록 편집기 | ✅ |
| `bank_transfer` | 무통장입금 | ✅(기본) |
| `card_pg` | 카드 결제(운영자 본인 PG) | 2차 |
| `closed_mall` | 승인·초대 회원만 입장 | 2차 |
| `group_buy` | 공동구매 | 2차 |
| `coupon_point` | 쿠폰·포인트 | 2차 |
| `messaging` | 문자·알림톡·메일 자동 발송(운영자 본인 계정) | 2차 |
| `tax_invoice` | 세금계산서 실제 발행 연동 | 2차 |
| `reseller` | 리셀러·제휴 판매 | 3차 |
| `marketplace` | 공급자 입점·정산 | 3차 |
| `subscription` | 정기배송 | 후보 |
| `i18n` | 다국어·다통화 | 후보 |
| `ai_assist` | AI 상품 등록·문구·첫 화면 자동 구성(운영자 본인 키) | 2차 후보 |

- 화면·API는 `hasModule(store, key)`로만 분기한다. 모듈이 꺼지면 메뉴·버튼·API가 함께 닫힌다.
- 수강생 키트판·단일 운영몰도 같은 코드에서 「몰 하나 고정 모드」 설정으로 만든다([로드맵](ROADMAP_AND_VARIANTS.md) V-G·V-H).

## 9. 폴더 구조 (1차 예정, Lab 뼈대 기준)

```
mall-builder/
  app/
    (platform)/          # 플랫폼: 로그인·몰 개설·내 몰 목록·플랫폼 관리자
    s/[store]/           # 손님 화면: 첫 화면·목록·상세·장바구니·주문·견적·마이페이지
    s/[store]/admin/     # 몰 운영자 관리 화면
    api/                 # 주문 생성·상태 이동·견적·외상 등 서버 검증 API
  lib/
    pricing/             # 가격 엔진(순수 함수) + 시험
    orders/              # 상태 흐름 표 + 이동 검사
    blocks/              # 블록 레지스트리(손님 컴포넌트·설정 폼·검사)
    modules.ts           # hasModule
    store.ts             # 현재 몰 찾기(slug → store)
  supabase/migrations/   # mall_builder_ 표·RLS
  docs/                  # 프로그램 폴더 플랜·인수인계
  tests/
```

## 변경 기록
- 2026-11-03 처음 작성 — 구현 전 설계안(`claude-win-20261103-mall-builder`). 근거: 프로셀 관리자 분석([PROSELL_ANALYSIS_20261103.md](PROSELL_ANALYSIS_20261103.md)), 주인님 결정([README.md](README.md) §4).
