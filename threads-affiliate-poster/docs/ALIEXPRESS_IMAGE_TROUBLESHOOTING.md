# 알리익스프레스 상품 이미지가 저장되지 않는 문제 — 원인·조치·재발 방지

> 최종 갱신: 2026-09-29 (v1.05). 같은 증상이 다시 보고되면 **이 문서의 "점검 순서"부터** 따른다.

## 1. 증상

- `/products`에서 알리익스프레스 상품을 등록하면 "등록되었습니다"라고 나오는데, 목록에 상품 사진이 없다(`affiliate_products.image_url = null`).
- 2026-09-27에 한 번 "고쳤다"고 지침(AGENTS.md 트러블슈팅 1번, PLATFORM_PATTERNS §25)에 등록했는데, 2026-09-29 같은 증상이 다시 나왔다
  (회원 buylifemall@naver.com, 상품 "벤션 45W 10000mAh 보조 배터리", 링크 `s.click.aliexpress.com/e/_c3JyPKm1`).

## 2. 진짜 원인 (2026-09-29 실측으로 확인)

등록 한 번에 알리 공식 API를 **연달아 두 번** 부른다.

1. `aliexpress.affiliate.link.generate` — 제휴 링크 생성
2. 바로 이어서 `aliexpress.affiliate.productdetail.get` — 상품 이미지 조회

알리 제휴 API는 앱 키 단위로 호출 빈도를 제한하는데, 2번 호출이 **거의 매번**
`ApiCallLimit` ("Api access frequency exceeds the limit. this ban will last 1 seconds") 오류를 받는다.

- 실측: 링크 생성 → 이미지 조회를 연속 3회 실행하니 **3회 모두 이미지 조회가 제한**에 걸렸다(재시도 코드의 로그로 확인).
- 3초를 쉬고 이미지 조회 **한 번만** 호출해도 제한에 걸린 적이 있다 — 제한은 간헐적이고, 잠깐 기다렸다 다시 부르면 풀린다.

그런데 예전 코드는:

- `getProductDetails()`가 오류를 `catch`로 삼키고 빈 배열을 돌려줬다 → 화면에는 아무 표시 없음.
- 그다음 대안인 상품 페이지 긁어오기(`tryFetchOgImage`)는 Vercel 서버에서 알리가 막거나 엉뚱한 페이지를 주기 때문에 대부분 실패한다.
- 결국 `image_url = null`로 저장되고 "등록되었습니다"만 떴다.

### 예전 지침이 막지 못한 이유

2026-09-27 지침은 **"단축 URL(`s.click.aliexpress.com`)에서 상품 번호를 못 뽑아서"**가 원인이라고 보고
단축 URL 풀기·번호 추출을 고쳤다. 이 부분은 지금도 정상 동작한다(이번 건도 번호 `1005010626912441`을 정확히 뽑았다).
하지만 **API 호출 빈도 제한은 다루지 않았고**, 실패가 조용히 삼켜져서 "100% 보장"이라고 잘못 기록됐다.
즉 원인이 두 가지였는데 하나만 고친 것이다.

### 함께 발견한 것 (프로그램 오류 아님)

- 이름은 "HIFIMAN Edition XS 헤드폰"인데 사진은 마스크인 상품이 있었다 → 등록할 때 넣은 링크(`_c3YyVTJB`) 자체가
  **마스크 상품 링크**였다(공식 API로 확인). 제휴 링크도 마스크 상품으로 연결되므로 회원이 링크를 다시 등록해야 한다.

## 3. 조치 (v1.05)

| 파일 | 변경 |
|---|---|
| `src/lib/aliexpress/client.ts` | `callTopApi()`가 `ApiCallLimit`을 받으면 1.2초 → 2.5초 → 4초 기다리며 **최대 3번 다시 시도**. 오류에 코드를 담는 `AliexpressApiError` 추가 |
| `src/lib/actions/products.ts` | 이미지 찾기를 `findAliexpressImage()` 하나로 통일(공식 API → 이 상품 페이지의 메타 이미지). 페이지 긁기는 **그 페이지에 상품 번호가 있을 때만** 이미지를 인정(차단·안내 페이지의 공용 이미지를 상품 사진으로 저장하지 않게) |
| 같은 파일 | 끝내 이미지를 못 찾으면 조용히 넘어가지 않고 **"이미지를 가져오지 못했습니다" 경고**를 등록 결과에 표시 |
| 같은 파일 + `ProductList.tsx` | 사진이 없거나 깨진 알리 상품에 **"🖼 이미지 다시 가져오기"** 버튼 (`refreshAliexpressImageAction`) |
| 데이터 | 이미지가 비어 있던 보조 배터리 상품 1건에 공식 API 이미지 채움 → 알리 상품 7건 모두 이미지 있음 |

검증: 실제 API로 "링크 생성 → 이미지 조회"를 연속 3회 실행 → 매번 제한에 걸렸지만 재시도 후 **3회 모두 이미지 수집 성공**
(한 번은 3번째 재시도에서 성공, 총 9.4초).

## 4. 재발 방지 규칙 (이 프로그램과 알리 API를 쓰는 모든 코드)

1. **알리 TOP API는 반드시 `callTopApi()`를 통해 부른다.** 직접 `fetch`하면 빈도 제한 재시도가 빠진다.
2. **외부 API 실패를 `catch`로 삼키고 빈 값으로 넘기지 않는다.** 선택 항목(이미지 등)이면 저장은 하되
   화면에 경고를 띄우고, 나중에 다시 시도할 방법(버튼)을 둔다.
3. 한 동작에서 같은 API를 여러 번 부르면 **빈도 제한을 전제로** 설계한다(재시도 또는 호출 순서·간격 조정).
4. 상품 페이지 긁기로 얻은 이미지는 **그 상품 번호가 들어 있는 페이지일 때만** 쓴다.
5. "100% 보장" 같은 표현은 실측 없이 문서에 쓰지 않는다. 고쳤다고 기록할 때는 **어떤 입력으로 몇 번 확인했는지**를 같이 적는다.

## 5. 같은 증상이 다시 나오면 — 점검 순서

1. DB에서 해당 상품 확인: `select product_url, image_url from affiliate_products where platform='aliexpress' order by created_at desc limit 5;`
2. Vercel 로그에서 `[aliexpress] ... rate-limited` / `getProductDetails error` 확인
   (`vercel logs threads-affiliate-poster.vercel.app --scope buylife`)
3. 그 링크로 단축 URL 풀기 → 상품 번호 → `productdetail.get`을 직접 호출해 본다(조회만 하는 호출).
   - `ApiCallLimit`이 3번 재시도 뒤에도 계속되면 → 재시도 간격을 늘리거나, 이미지 조회를 링크 생성보다 먼저 호출하는 방식 검토
   - `current_record_count: 0`이면 → 제휴 대상이 아닌 상품(공식 API가 정보를 주지 않음). 회원이 이미지를 직접 올리게 안내
   - 번호가 안 뽑히면 → 새 형태의 단축 URL. `extractAliexpressProductId()` 정규식 보강
4. 회원에게는 상품 목록의 "이미지 다시 가져오기" 버튼을 안내한다.
