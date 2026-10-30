# 쿠팡 상품 생성 API 명세 정리 (2026-10-28 공식 문서 확인)

- 원문: https://developers.coupang.com/hc/ko/articles/360033877853 (옛 주소 developers.coupangcorp.com → 302)
- `POST /v2/providers/seller_api/apis/api/v1/marketplace/seller-products` (호스트 `api-gateway.coupang.com`, 서명은 `src/lib/coupang/sign.ts`)
- 이미지 실제 크기 검사: `src/lib/coupang/imageRules.ts`(v1.03).
- 이 문서는 요약이다. 원문 예시 JSON·오류 코드 표는 원문에서 확인한다. 코드 기준: `src/lib/coupang/product.ts`.

## 최상위 필수 필드
| 필드 | 값·규칙 | 우리 값 출처 |
|---|---|---|
| `displayCategoryCode` | 노출 카테고리 코드(없으면 자동 매칭될 수 있음) | C1-7 카테고리 추천·선택 |
| `sellerProductName` | 최대 100자, 발주서에 쓰임 | 상세페이지 상품명 |
| `displayProductName` | (선택) 노출 상품명 100자 | 상품명 |
| `vendorId` | 업체코드 | 회원 키 |
| `saleStartedAt` / `saleEndedAt` | `yyyy-MM-dd'T'HH:mm:ss` | 지금 / `2099-01-01T23:59:59`(원문 예시값) |
| `brand`·`manufacture` | 브랜드는 띄어쓰기·특수문자 없이, 없으면 `GENERIC`(2026-10-31 명세 `/ko/api/products/product-creation` 확인) | 상품 입력 |
| `deliveryMethod` | `SEQUENCIAL`(일반)·`COLD_FRESH`·`MAKE_ORDER`·`AGENT_BUY`·`VENDOR_DIRECT` | 기본값 화면 |
| `deliveryCompanyCode` | 택배사 코드 | C1-5 |
| `deliveryChargeType` | `FREE`·`NOT_FREE`·`CHARGE_RECEIVED`·`CONDITIONAL_FREE` | 기본값 |
| `deliveryCharge` | 편도 기본 배송비 | 기본값 |
| `freeShipOverAmount` | 조건부 무료 기준(무료면 0) | 기본값 |
| `deliveryChargeOnReturn` | 초도 반품배송비 | 기본값 |
| `returnCharge` | 편도 반품배송비 — **`deliveryChargeOnReturn`의 100~150%** | 기본값(검사) |
| `remoteAreaDeliverable` | `Y`/`N` | 기본값 |
| `unionDeliveryType` | `UNION_DELIVERY`/`NOT_UNION_DELIVERY` | 기본값 |
| `returnCenterCode`·`returnChargeName`·`companyContactNumber`·`returnZipCode`·`returnAddress`·`returnAddressDetail` | 반품지 | C1-5 반품지 조회 결과 |
| `outboundShippingPlaceCode` | 출고지 코드 | C1-5 |
| `vendorUserId` | WING 로그인 ID | 회원 키 |
| `requested` | `false` = 저장만, `true` = 승인 요청까지 | 회원 선택(C1-13) |
| `items[]` | 최대 200개 | C1-10 |

## `items[]` 필수 필드
| 필드 | 값·규칙 |
|---|---|
| `itemName` | 옵션명, 상품 안에서 중복 불가, 최대 150자 |
| `originalPrice` / `salePrice` | 정가 / 판매가(정수) |
| `maximumBuyCount` | 판매 가능 수량(재고) 최대 99999 |
| `maximumBuyForPerson` / `maximumBuyForPersonPeriod` | 인당 최대 구매 수(0 = 제한 없음) / 기간(일, 제한 없으면 1) |
| `outboundShippingTimeDay` | 기준 출고일(정수, 원문에 범위 없음) |
| `unitCount` | 단위 수량(보통 1) |
| `adultOnly` | `EVERYONE`(기본)/`ADULT_ONLY` |
| `taxType` | `TAX`(기본)/`FREE` |
| `parallelImported` | `NOT_PARALLEL_IMPORTED`(기본)/`PARALLEL_IMPORTED`(수입신고필증 필요) |
| `overseasPurchased` | `NOT_OVERSEAS_PURCHASED`(기본)/`OVERSEAS_PURCHASED`(인보이스 필요, `pccNeeded` "true") |
| `pccNeeded` | 문자열 `"true"`/`"false"` |
| `images[]` | `imageOrder`·`imageType`(`REPRESENTATION` 필수 / `DETAIL` 최대 9 / `USED_PRODUCT` 최대 4)·`vendorPath`(우리 주소) 또는 `cdnPath` |
| `attributes[]` | 구매옵션 `attributeTypeName`·`attributeValueName`(·`exposed`) — 카테고리 메타 이름과 같아야 함 |
| `contents[]` | `contentsType`(`IMAGE`·`IMAGE_NO_SPACE`·`TEXT`·`IMAGE_TEXT`·`TEXT_IMAGE`·`IMAGE_IMAGE`·`TEXT_TEXT`·`TITLE`·`HTML`) + `contentDetails[]`(`content`, `detailType` `IMAGE`/`TEXT`) |
| `notices[]` | `noticeCategoryName`·`noticeCategoryDetailName`·`content` — 카테고리 메타의 고시 항목과 정확히 같아야 함(원문 예시에 「상세페이지 참조」 사용, 허용 여부 명시 없음) |
| 선택 | `externalVendorSku`(판매자 코드 → `AIM-…`), `barcode`/`emptyBarcode`/`emptyBarcodeReason`(100자), `modelNo`(명세 표기는 선택이나 신규 키 판매자 정책상 필요 — 코드는 옵션마다 바코드나 모델번호 중 하나를 요구), `searchTags[]`, `certifications[]`, `offerCondition`(`NEW` 기본, 생성 뒤 변경 불가) |

## 이미지 규격과 주소
- JPG·PNG, 3MB 이하, 정사각형, 500×500~5000×5000px.
- `vendorPath`는 80·443 포트, **최대 200자**. 쿠팡이 내려받지 못하면 승인 반려.
- ⚠️ 상세페이지 이미지는 비공개 저장소(`shop-detail-images`) 서명 주소라 200자를 넘는다 → C1-11에서 **우리 도메인의 짧은 이미지 주소**(예: `https://coupang-ops.buylife.xyz/i/<짧은 번호>`, 등록 작업 동안만 열림)가 필요하다. 그래서 실제 등록은 배포 뒤에만 가능하다(로컬 주소는 쿠팡이 못 받음).

## 응답
- `code`·`message`·`data`(성공 시 `sellerProductId`)·`details`·`errorItems[]`(`itemIndex`·`itemName`·속성별 `message`).
- 성공이어도 `details`·`errorItems`에 경고가 올 수 있다 → 등록 기록에 함께 남긴다.
