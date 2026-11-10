# 11번가 Seller API 명세 정리 (0단계, 2026-11-11)

> 읽은 방법: 주인님 11번가 판매자 계정 로그인 뒤 ego에서 OPEN API 센터 「개발 가이드」(판매자용 `apiSpecType=1`)와 「API 관리」를 **읽기만** 함. 아무것도 신청·수정하지 않음. [역할: ecommerce-image] `claude-win-sdp`.
> 원문 저장(저장소 밖): `C:/Users/Administrator/ego/11st-spec-20261111/` — `02-guide-81.txt`(상품등록 전체 35,919자), `guide-38/42/43.txt`, `api-manage.txt`(키 값 가림).
> 출처 화면: `https://openapi.11st.co.kr/openapi/OpenApiGuide.tmall?categoryNo=<번호>&apiSpecType=1` (38 카테고리 · 39 상품조회 · 81 상품관리 · 42 판매중지 · 43 배송), 「API 관리」 `OpenApiServiceRegister.tmall`.

## 1. 공통
| 항목 | 내용 |
|---|---|
| 주소 | `http://api.11st.co.kr/rest/...` (명세·샘플 모두 `http`. `https` 지원 여부는 연결 시험 때 확인) |
| 인증 | 요청 헤더 `openapikey: <키>` (등록 API 명세: 「API KEY는 HttpHeaders에서 읽습니다. 반드시 header에」) |
| 본문 | XML, `<?xml version="1.0" encoding="EUC-KR"?>`, `Content-Type: text/xml` EUC-KR. HTML·특수문자는 `<![CDATA[ ]]>` |
| 응답 | XML. 등록 성공 `resultCode` 200(일반상품)·210(신규상품), `productNo`(상품번호), `message` 「상품등록이 정상적으로 진행 되었습니다. 상품번호 : …」. 실패는 500 + 한글 메시지 |
| 한도 | **상품 등록 하루 500개**(오류 400 문구). 그 밖 호출 수 한도 숫자는 명세에 없음(공통 오류 004 「일 호출 횟수 초과」만) |
| 개발 지침 | 「초기 개발시에는 반드시 Seller Office 상품등록과 병행」 — 같은 상품을 셀러오피스 화면과 대조하며 개발 |

## 2. 키·접속 권한 (주인님 계정 실측)
- API 키 **이미 발급됨**, 만료일 **2026-12-27**(만료 전 갱신·재발급 필요). 키 값 보기는 2차 인증 뒤.
- 키 화면이 하나뿐 → 조회용 Open API 키와 Seller API가 **같은 키로 보임**(공용 `elevenst_api_key` 재사용 가능성 높음, 첫 연결 시험으로 확정).
- 「접속권한」: 셀링툴 업체 선택(최대 5개) **또는** 「IP 직접 입력」. **지금은 둘 다 미설정(IP 직접 입력 = 미사용)** → 이 상태로는 서버 호출이 거절될 것으로 봄.
- IP 칸 3개: 개발환경 API 호출 IP · 11번가 테스트서버 접속 개발 PC IP · **실서버 IP(세미콜론으로 여러 개)**. → 회원 본인 Fixie 고정 IP 2개를 실서버 칸에 넣는 방식(쿠팡 운영과 같음).
- 「개발환경·테스트서버」 칸이 있으므로 11번가 시험 서버가 따로 있을 수 있음 — 주소·사용법은 명세에 안 보여 미확인.
- 개발자 이메일(장애·정책 안내 수신) 칸 있음.

## 3. 이번 프로그램에 쓰는 API
| 용도 | 방식·주소 | 비고 |
|---|---|---|
| 상품 등록 | `POST /rest/prodservices/product` | 아래 4절 |
| 상품 수정 | 상품관리 「상품수정/신규상품수정」 | 주소는 구현 때 확인 |
| 전시중지 | `PUT /rest/prodstatservice/stat/stopdisplay/{prdNo}` | 첫 실제 시험: 등록 직후 바로 중지 |
| 전시중지 해제 | `PUT /rest/prodstatservice/stat/restartdisplay/{prdNo}` | |
| 전체 카테고리 | `GET /rest/cateservice/category` | |
| 하위 카테고리 | `GET /rest/cateservice/category/{dispCtgrNo}` | 등록은 **최하위(세/소) 카테고리만** |
| 출고지 주소 | `GET /rest/areaservice/outboundarea` | 주소 순번 → `addrSeqOut` |
| 반품·교환지 주소 | `GET /rest/areaservice/inboundarea` | 주소 순번 → `addrSeqIn` |
| 발송마감 템플릿 | `GET /rest/prodservices/sendCloseList` | → `dlvSendCloseTmpltNo`(필수) |
| 상품 조회 | 다중상품조회 `POST /rest/prodmarketservice/prodmarket`, 셀러상품조회 | 등록 결과·상태 확인용 |
| 판매기간 연장·가격·옵션·상세 수정 | 상품관리 하위 화면에 있음 | 2차 범위 |

## 4. 등록 본문 — 국내 일반 상품 기준 필수 칸
| 칸 | 뜻 | 우리 값(안) |
|---|---|---|
| `selMthdCd` | 판매방식 | `01` 고정가판매 |
| `dispCtgrNo` | 카테고리(최하위) | 카테고리 찾기로 회원이 고름 |
| `prdTypCd` | 서비스 상품 코드 | `01` 일반배송상품 |
| `prdNm` | 상품명 | 상세페이지 상품명 |
| `brand` | 브랜드 | 회원 입력(없으면 처리 방식 구현 때 확인) |
| `orgnTypCd` (+원산지) | 원산지 | 상세페이지/기본값 |
| `suplDtyfrPrdClfCd` | 과세/면세 | 기본 과세 |
| `forAbrdBuyClf` | 해외구매대행 여부 | 기본 아님 |
| `prdStatCd` | 상품상태 | 새상품(신규상품은 반품·스크래치 불가, 주문제작은 쓰지 않음) |
| `minorSelCnYn` | 미성년자 구매 가능 | 기본 가능 |
| `prdImage01` | 대표 이미지 **URL** | 11번가가 내려받아 600×600으로 줄임. jpg·jpeg·png·webp만, **응답 `Content-Type`이 이미지여야 함** → 쿠팡 운영 `/i/[id]` 짧은 주소 방식 재사용 |
| `htmlDetail` | 상세설명 HTML | 상세페이지 섹션 이미지, CDATA, 일부 태그·외부 링크 제한 |
| `ProductCertGroup` | KC 인증 정보 | 대상 아님/면제 유형 선택 |
| `selPrc` | 판매가 | 상세페이지 가격 |
| `prdSelQty` | 재고수량 | 기본 99 |
| `dlvCnAreaCd`·`dlvWyCd`·`dlvSendCloseTmpltNo`·`dlvCstInstBasiCd`·`bndlDlvCnYn`·`dlvCstPayTypCd`·`jejuDlvCst`·`islandDlvCst`·`dlvClf` | 배송 조건 | 「스토어 기본값」 화면에서 한 번 저장 |
| `addrSeqOut`·`addrSeqIn` | 출고지·반품지 순번 | 조회 API로 고름(생략하면 기본 주소, 수정 때 바뀌는 문제 → 넣기 권장) |
| `rtngdDlvCst`·`exchDlvCst` | 반품·교환 배송비 | 기본값 |
| `asDetail`·`rtngExchDetail` | A/S·반품교환 안내 | 기본 문구(**반품교환 안내 빠지면 등록 실패** 예시 있음) |
| `ProductNotification` | 상품정보제공고시(유형코드 + 항목) | 쿠팡처럼 「상품상세 참조」로 채움 |

조건부 필수(쓸 때만): 옵션 묶음(`colTitle`·`colValue0`·`colOptPrice`·`colCount` 등, 특수문자 `[ & ; " % < > # † ]` 금지, 멀티옵션은 API에서 옵션별 재고 불가), 추가구성상품, 사은품, 의료기기·축산물·원재료, 해외배송(`hsCode` 등).

판매기간: `selTermUseYn=N`이면 즉시 영구 판매(최대 3년). **쿠팡의 「임시저장」 같은 판매 전 저장 상태는 없음** → 등록하면 바로 판매 시작.

## 5. 플랜에 미치는 영향
1. 「저장만」이 없으므로 첫 실제 시험은 **등록 → 바로 전시중지(PUT)** 순서로 하고, 두 결과를 함께 기록한다. 중지 실패 시 화면에 크게 알리고 셀러오피스에서 직접 중지하도록 안내.
2. 회원 처음 설정에 **11번가 「API 관리 › IP 직접 입력 › 실서버 IP」에 내 고정 IP 2개 넣기**가 들어간다(가이드 STEP으로).
3. 본문이 EUC-KR XML이라 인코딩 변환(`iconv-lite` 등)과 CDATA 처리 공용 함수가 필요하다. 한글 깨짐 시험을 먼저 만든다.
4. 키 만료(1년)가 있으므로 연결 화면에 만료일 안내를 둔다.
5. 확인 남은 것: `https` 지원, 키 하나로 Seller API가 되는지, 시험 서버 존재, 상품수정·조회 상세 칸 — 모두 고정 IP 등록 뒤 첫 연결 시험(읽기만)에서 확정.
