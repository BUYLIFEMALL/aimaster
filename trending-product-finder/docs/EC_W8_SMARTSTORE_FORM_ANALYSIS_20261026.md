# EC-W8 0단계 — 스마트스토어센터 「상품 등록」 화면 구조 분석

작성: 2026-10-26 Claude Code(윈도우) `claude-win-sdp` [역할: ecommerce-image]
자료: 주인님이 로그인한 크롬에서 「상품관리 → 상품 등록」 화면을 「웹페이지, 전체」로 저장한 파일(`D:\PDS\Program_dev\smartstore_create\`, 저장소 밖). 스크립트를 실행하지 않는 해석기(cheerio)로 칸 구조만 읽었고, 파일 안의 판매자 정보는 옮기지 않았다.
배경: Claude 크롬 확장은 `sell.smartstore.naver.com`을 안전 제한으로 열지 못한다(이동·읽기·캡처 모두 거절). 그래서 직접 화면 분석 대신 저장본 분석으로 진행했다. **우리가 만들 확장은 회원 크롬에 따로 설치되는 프로그램이라 이 제한과 상관없다.**

## 1. 화면의 성격 — 확장 만들기에 유리함
| 항목 | 결과 | 확장 설계에 주는 뜻 |
|---|---|---|
| 화면 기술 | AngularJS 1.x(`ng-app`, `ng-model`, `vm.*`) | 칸마다 `ng-model`·`name`이 고정 이름 → **이 이름으로 칸을 찾는다**(위치·글자 기준 아님). 값을 넣은 뒤 `input`·`change` 이벤트를 보내야 화면 값이 바뀜 |
| iframe | 등록 화면 본문에 없음(0개) | 한 문서 안에서 모두 채울 수 있음 |
| 선택 상자 | 상당수가 selectize(검색형 선택 상자) — 카테고리·상품군·태그·최근 상품 | 숨은 `<select>`가 아니라 **보이는 입력칸에 글자를 넣고 목록에서 고르는** 방식으로 처리 |
| 섹션 | 접기/펼치기 상자 | 칸을 채우기 전에 그 섹션을 펼쳐야 함 |
| 저장 버튼 | 아래 고정 줄 「미리보기」「임시저장」(`vm.createTempSave()`)「저장하기」「취소」 | **「임시저장」이 있음** → 시험·「입력만」 방식 마무리에 사용 가능(실제 상품이 생기지 않음) |

## 2. 칸별 대응표 (1차 범위)
| 섹션 | 칸 | 찾는 기준(`ng-model` / `name`) | 입력 방식 | 우리 값 |
|---|---|---|---|---|
| 카테고리 ● | 검색 방식 라디오 | `name=category` 라디오 「카테고리명 검색」 | 클릭 | — |
| | 카테고리명 입력 | `vm.category`(selectize, ph 「카테고리명 입력」) | 글자 입력 → 목록에서 **최종 단계** 고르기 | 패널의 카테고리 검색어/저장된 경로 |
| | (확인) 선택된 카테고리 | `vm.selectedCategory.id`(hidden) | 읽기만 — 비어 있으면 실패 보고 | — |
| 상품명 ● | 상품명 | `name=product.name` / `vm.product.name` | 글자 입력(100자) | `shop_products.name` |
| 판매가 ● | 판매가 | `name=product.salePrice` (`#prd_price2`) | 숫자 | 정상가 |
| | 즉시할인 | `vm.viewData.isEnableImmediateDiscountPolicy` 라디오 | 할인가 있을 때만 「설정함」 | `sale_price` |
| | 과세 | `vm.product.detailAttribute.taxType` 라디오 | 기본 「과세상품」 그대로 | — |
| 재고수량 ● | 재고 | `name=product.stockQuantity` | 숫자 | 패널(기본 99) |
| 옵션 | 선택형/직접입력형 | `vm.isChoiceType`, `choiceOptionInput.*` | 2차 | — |
| 상품이미지 ● | 대표·추가 이미지 | 링크 「이미지 등록」 → `vm.openUploadModal()` | **올리기 창 안 구조 미확인**(저장본에 창이 열려 있지 않았음) | 원본 사진·섹션 첫 장 |
| 상세설명 ● | 작성 방식 | 「직접 작성」(`changeEditorType(SEONE)`) / **「HTML 작성」**(`changeEditorType(NONE)`) | **HTML 작성 선택 → HTML 붙여 넣기** | E3의 HTML(블록 편집 결과) |
| | 스마트에디터 ONE | 버튼 `vm.func.openEditor($event,false)` | 별도 편집 창 — 1차에서는 쓰지 않음 | — |
| 상품 주요정보 | 브랜드·제조사 | selectize(ph 「브랜드를 입력해주세요」「제조사를 입력해주세요」) | 있으면 입력 | 패널 |
| | KC 인증 | `vm.viewData.kcCertificationTargetExcludeContent.*` | 2차(대상 품목이면 회원이 직접) | — |
| | 원산지 | `vm.viewData.originAreaInfo.originAreaExposureType`·`firstSubOriginAreaType`·`secondSubOriginAreaType`(select), `importer`(수입사) | 단계별 선택 | 패널 기본값 |
| | 상품 상태 | `vm.product.saleType`(신상품) | 기본 그대로 | — |
| | 미성년자 구매 | `vm.product.detailAttribute.minorPurchasable` | 기본 그대로 | — |
| 상품정보제공고시 ● | 상품군 | `vm.selectizeType`(selectize, 「상품군을 선택하세요」) | 글자 입력 → 고르기 | 패널(품목 유형) |
| | **상품상세 참조로 전체 입력** | `vm.reference` 체크 | 클릭 1번 | 기본 켬 |
| | 템플릿 | `vm.savedTemplate['PRODUCT_INFO_PROVIDED_NOTICE']` | 회원 템플릿이 있으면 그것 사용 | — |
| 배송 ● | 배송 템플릿 | `vm.savedTemplate['DELIVERY']` | **회원 판매자센터 템플릿 사용 권장** | 패널(템플릿 이름) |
| | 배송 방법·택배사 | `vm.modelData.deliveryType`, `vm.modelData.deliveryCompany.id`(select) | 템플릿 없을 때만 | 패널 |
| | 배송비 | `vm.modelData.deliveryFee.deliveryFeeType`(select), `name=product.deliveryInfo.deliveryFee.baseFee`·`freeConditionalAmount` | 숫자 | 패널 |
| 반품/교환 ● | 반품·교환 배송비 | `name=product.deliveryInfo.claimDeliveryInfo.returnDeliveryFee`·`exchangeDeliveryFee` | 숫자 | E3 배송 안내 카드 값과 연결 가능 |
| | 반품 택배사 | `vm.modelData.claimDeliveryInfo.returnDeliveryCompany.id` | 선택 | 패널 |
| A/S ● | 전화번호 | `name=product.detailAttribute.afterServiceInfo.afterServiceTelephoneNumber` | 글자 | 패널(E3 카드의 문의처) |
| | 안내 | `name=product.detailAttribute.afterServiceInfo.afterServiceGuideContent`(textarea) | 글자 | 패널 |
| | 템플릿 | `vm.savedTemplate['AS']` | 있으면 사용 | — |
| 검색설정 | 태그 | `vm.product.detailAttribute.seoInfo.sellerTags` / 직접 입력 `vm.viewData.isDirectInput`(최대 10개) + `vm.directInputTag`(selectize) | 태그마다 입력+Enter | E2(보류) 뒤 — 1차는 비움 |
| | 페이지 제목·설명 | `seoInfo.pageTitle`, `seoInfo.metaDescription` | 선택 | — |
| 판매자 코드 | 관리 코드 | `vm.sellerCodeInfo.sellerManagementCode` | **우리 상품 ID를 넣어 중복 등록 확인에 사용** | `shop_products.id` 앞부분 |
| 노출 채널 | 전시 상태 | `vm.singleChannelProductMap[...].channelProductDisplayStatusType` 라디오(전시중/전시중지) | 「판매대기 등록」 방식은 전시중지로 | 등록 방식 |

## 3. 플랜이 바뀌는 점
1. **상세설명은 「HTML 작성」으로 넣는다.** 스마트에디터 ONE(별도 편집 창에서 이미지를 하나씩 끌어 넣기)보다 훨씬 단순하고 안정적이다. E3에서 만든 블록 편집 HTML을 그대로 쓴다.
   - **확인할 것(0-2단계)**: HTML 작성 칸이 받는 HTML 범위(스타일·`<table>` 허용 여부), **이미지 주소 조건**. 지금 우리 HTML은 이미지를 `data:` 주소로 품고 있고 저장소는 비공개라, 스마트스토어가 외부 주소만 받으면 이미지를 ① 네이버 「사진 보관함」에 먼저 올리거나 ② 짧은 기간 공개 주소를 만들어야 한다. 주인님 결정이 필요할 수 있다.
2. **「입력만」 방식의 끝은 「임시저장」이 아니라 회원 확인**이 기본이다. 다만 시험(2단계)은 실제 상품이 생기지 않는 **「임시저장」**으로 한다(플랜의 「판매대기 등록 → 삭제」보다 안전).
3. **판매자 관리 코드에 우리 상품 ID**를 넣어, 같은 상품을 두 번 등록하려 하면 확장이 미리 경고할 수 있다.
4. 배송·반품·A/S·고시는 **회원이 판매자센터에 저장해 둔 템플릿을 고르는 방식을 기본**으로 한다(칸을 하나하나 채우는 것보다 실패가 적다). 템플릿이 없으면 패널 값으로 채운다.

## 4. 아직 모르는 것 (0-2단계로 확인)
| 항목 | 왜 필요한가 | 확인 방법 |
|---|---|---|
| 이미지 올리기 창 구조 | 대표·추가 이미지 파일을 넣는 칸(`input[type=file]`)이 창 안에 있음 | 「이미지 등록」을 눌러 창이 열린 상태에서 다시 저장(올리지는 않음) |
| HTML 작성 칸 | 붙여 넣을 칸의 이름, 허용 태그·이미지 주소 조건 | 상세설명에서 「HTML 작성」을 누른 상태에서 다시 저장 + 네이버 HTML 작성 도움말 |
| 카테고리 검색 결과 목록 | 최종 단계를 고르는 목록의 구조 | 카테고리 칸에 「텀블러」를 입력해 목록이 보이는 상태에서 다시 저장(고르지 않음) |
| 저장 뒤 결과 | 상품번호·오류 문구 위치 | 2단계 임시저장 시험 때 |

## 5. HTML 작성 규칙 조사 (2026-10-26, 공개 자료)
- 네이버 커머스API 기술지원 답변: 상세설명(`detailContent`)에 HTML 문자열을 넣을 수 있으나 **보안·화면 변경 위험 태그·속성은 걸러짐(예: HTML·META·SCRIPT·STYLE·BODY·HEAD)** — 세부 목록은 스마트스토어 고객센터 FAQ(faqId=4414). https://github.com/commerce-api-naver/commerce-api/discussions/2216
- 다른 자료: iframe·네이버 단축 주소 자동 삭제. **외부 이미지 주소·`data:` 이미지 허용 여부는 공개 자료로 확인되지 않음.**
- 뜻: E3 HTML이 `<style>`에 기대면 모양이 깨짐 → 확장으로 넣을 HTML은 **칸 안 스타일(`style=""`)만** 쓰도록 바꿔야 할 수 있음.
- 확인 방법: 주인님이 「HTML 작성」에 시험 HTML(`D:\PDS\Program_dev\smartstore_create\html_test.txt` — 외부 주소 이미지 A·품은 이미지 B·`<style>` C·칸 안 스타일 D·표 E)을 붙여 넣고 **「미리보기」만**(저장 안 함) 눌러 A~E 중 보이는 것을 알려 주면 결정.

## 6. HTML 작성 붙여 넣기 시험 결과 (2026-10-26, 주인님 미리보기 캡처)
| 시험 | 결과 |
|---|---|
| A 외부 `https` 주소 이미지 | ✅ 미리보기에 보임 |
| B `data:` 품은 이미지 | ❌ 깨짐 |
| C `<style>` 태그 | ❌ 글자로 노출 |
| D 칸 안 `style=""`(배경·둥근 모서리) | ✅ |
| E 표 | ✅ |
- 화면 안내: 「http 이미지가 제대로 표시되지 않을 수 있습니다. https 이미지로 등록」, 「**네이버 이외의 외부링크, 일부 스크립트 및 태그는 자동 삭제될 수 있습니다**」, 「상세설명 권장 크기: 가로 848px」, 「SmartEditor ONE으로 변환하기(1회성)」 버튼 있음.
- 결론: 확장이 넣을 HTML은 ① 칸 안 스타일만 ② 이미지는 `https` 주소 ③ 폭 848px. 외부 이미지는 저장 때 지워질 위험이 있어 **네이버 쪽 이미지 주소(사진 보관함 등)를 쓰는 방식이 안전**(주인님 결정 대기).

## 7. 상품이미지 올리기 창 (2026-10-26, 저장본 `네이버 스마트스토어센터_상품이미지등록.html`)
- 「이미지 등록」(`vm.openUploadModal()`) → 작은 창 「내 사진 불러오기 · 최대 20MB」(`div.modal.seller-layer-modal`), 버튼 두 개: **「내 사진」** · **「사진보관함」**(`vm.uploadImagesFromPhotoStorge()`).
- 「내 사진」 안 `label` 속 숨은 칸: `input[type=file]` · `ngf-select="vm.uploadImagesFromDevice($files, $invalidFiles)"` · `accept="image/jpeg, image/gif, image/png, image/bmp"` · `ngf-multiple="vm.isMultiple"` · `ngf-max-size="20MB"` · `ngf-max-total-size="20MB"`.
- 확장 방법: 그 칸에 `DataTransfer`로 파일을 넣고 `change` 이벤트 → 화면이 네이버로 올림(파일 선택 창 안 띄움). 블로그 확장 `naver-blog-agent/extension/editor.js`의 파일 넣기 방식과 같음. 대표 1장 → 추가 최대 9장(권장 1000×1000, 저장본 화면 안내).
- 남은 확인: 올린 뒤 이미지 주소(네이버 이미지 서버 주소인지)와, 상세설명용 이미지를 「사진 보관함」에 올려 주소를 받는 방법(사진보관함 화면 저장본 필요).
