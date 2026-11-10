# 개발 플랜 — 11번가 상품 자동등록기 (2026-11-11, [역할: ecommerce-image] `claude-win-sdp`)

> 상태: **플랜 — 주인님 결정 대기**(코드·DB 변경 없음). 결정을 받은 뒤 0단계부터 진행한다.
> 위치: 쇼핑몰 흐름 「1 소싱 → 2 상세페이지 → **3 마켓 등록** → 4 주문 리포트 → 5 발송 라벨」의 3단계에 스마트스토어·쿠팡 다음 세 번째 마켓으로 붙는다.

## 1. 지금 확인된 사실 (2026-11-11 공식 사이트)
| 항목 | 내용 | 근거 |
|---|---|---|
| 등록 권한 | 일반 Open API는 상품·카테고리 **조회만** 가능. 상품 등록·주문·배송은 **Seller API** 권한이 있어야 함 | [OPEN API 센터 안내](https://openapi.11st.co.kr/openapi/OpenApiOperationGuide.tmall?operationType=SERVICE_METHOD) |
| 키 발급 | 11번가 판매자 가입 → Seller 회원 전환 → OPEN API 센터 「API 신청」에서 서비스 등록 | [이용법](https://openapi.11st.co.kr/openapi/OpenApiOperationGuide.tmall?operationType=OPERATION_METHOD) |
| IP 등록 | Seller API는 **호출하는 서버의 IP를 등록해야 키 승인**이 됨 → Vercel처럼 IP가 바뀌는 서버는 그대로 못 씀 | 같은 페이지, 「Seller API 설정」 |
| 형식 | 조회 API는 XML, `EUC-KR` 응답. PUT·DELETE·multipart 미처리 문구 있음(등록 API에도 해당하는지는 미확인) | [카테고리 검색 가이드](https://openapi.11st.co.kr/openapi/OpenApiGuide.tmall?commonGuideNo=2) |
| 카테고리 | `apiCode=CategoryInfo` 공개 조회 가능(코드·이름·하위) | 같은 페이지 |
| **미확인** | 등록 주소·필수 필드(출고지/반품지 코드, 고시, 옵션, 이미지 URL 방식)·응답의 상품번호 필드·수정/판매중지·호출 한도 숫자·별도 심사 여부 | 「API 신청」·Seller API 가이드가 **판매자 로그인 뒤에만** 보임 |

## 2. 원본(11번가) / AIMaster 비교 — 무엇을 가져다 쓰나
| 기능 | 11번가 쪽 요구 | AIMaster에 이미 있는 것 | 채택 |
|---|---|---|---|
| 고정 IP | Seller API IP 등록 필수 | `coupang-ops` 회원 본인 Fixie 주소 `user_api_keys.fixed_ip_proxy_url`(+ `validateProxyUrl`·`maskProxyUrl`·나가는 IP 보여 주기) | **AIMaster 그대로 재사용** — 쿠팡에 등록한 고정 IP를 11번가에도 등록만 하면 됨(다시 묻지 않음) |
| 키 저장 | Seller API 키 | 공용 `elevenst_api_key`(상품소싱기 조회용) | 같은 키에 Seller 권한이 붙는지 0단계에서 확인 → 붙으면 재사용, 아니면 공용 항목 `elevenst_seller_api_key` 추가 |
| 상품 원본 | 상품명·가격·이미지·상세 | `shop-detail-page` 상품(`shop_products`, 검토 완료) | 그대로 읽기만(RLS 본인 행) |
| 이미지 공개 주소 | 마켓이 URL로 받아 가는 방식이면 공개 주소 필요 | `coupang-ops` `/i/[id]` 짧은 주소 + `lib/shopImageCheck.ts` 크기 실측 | 재사용(11번가 이미지 규격은 0단계에서 확인해 규칙만 바꿈) |
| 등록 화면 | — | `coupang-ops` `ProductForm`(카테고리 → 옵션 표 → 검사 → 「저장만」), 스마트스토어 등록기의 칸 표 | 쿠팡 화면 구조 재사용 |
| 보내기 안전장치 | — | 쿠팡: 먼저 `sending` 기록 → 재시도 0 → `saved/failed/unknown`, 불확실하면 자동 재전송 금지 | 그대로 |
| AI 추천 | — | 쿠팡 C2-7: 회원 본인 Claude 키, 빈 칸만 채움, 마켓 목록에 없는 값 버림 | 그대로(선택) |
| 결과 표시 | — | `shop-detail-page/lib/markets.ts` 마켓 한 줄 + `MarketRegisterPanel` | 한 줄 추가 |

## 3. 프로그램 형태 (결정 1)
- **추천 A: 새 프로그램** `elevenst-register`(자체 Vercel·`<이름>.buylife.xyz`) — 쿠팡 운영처럼 독립, 마켓마다 장애가 서로 번지지 않음. 이후 11번가 주문·송장도 이 프로그램에 붙일 수 있음.
- B: `coupang-ops`에 마켓 추가 — 빌드는 줄지만 쿠팡 전용 화면·이름과 섞여 유지보수가 어려워짐(비추천).

### 이름 후보 (결정 2)
| 순위 | 이름 | slug | 강조 |
|---|---|---|---|
| 1 (추천) | AI 11번가 상품 자동등록기 | `elevenst-register` | 스마트스토어 등록기와 같은 이름 틀 — 한눈에 기능이 보임 |
| 2 | 11번가 셀러 자동화 | `elevenst-ops` | 이후 주문·송장까지 넓힐 때 |
| 3 | AI 11번가 등록 도우미 | `elevenst-helper` | 사람 확인 강조 |
| 4 | 오픈마켓 11번가 등록 자동화 | `openmarket-11st` | 오픈마켓 묶음 |
카드 한 줄 예시: 「상세페이지에서 만든 상품을 11번가 공식 API로 바로 등록하는 판매자용 자동 등록기」

## 4. 구현 순서
0. **명세 확보(코드 없음, 주인님 손 필요)** — 주인님이 ego에서 11번가 셀러오피스 로그인 → 제가 같은 탭에서 OPEN API 센터의 Seller API 등록·카테고리·출고지/반품지·상태 조회 가이드를 읽어 `elevenst-register/docs/API_SPEC_NOTES.md`에 정리. 같은 키에 Seller 권한이 붙는지, 이미지 방식, 호출 한도, 심사 여부를 여기서 확정 → 결과에 따라 이 플랜 보정 후 다시 보고.
1. 뼈대: 새 폴더·로그인·`requireProgramAccess`/`checkProgramAccessApi`·버전 v1.01·사이드바·767px 메뉴·`/guide`·`programs` 등록(요금제 3단계, `app_url`).
2. 연동 화면: 11번가 키 + 고정 IP(쿠팡 것 재사용) 한 화면, 「연결 시험」(카테고리·출고지 조회, 읽기만).
3. 등록 화면: 상세페이지 상품 목록(검토 완료 먼저) → 카테고리 찾기 → 옵션·가격·재고 → 고시 → 「검사하기」(11번가에 보내지 않음).
4. 보내기: 「저장만/판매대기」에 해당하는 가장 안전한 방식으로 1건, 기록 표 `elevenst_register_jobs`(본인 RLS, 30일 정리·관리자 열외 `retention_exempt`).
5. 연결: `shop-detail-page/lib/markets.ts`에 11번가 한 줄 + 흐름 띠 사본(다음 배포 때 함께).
6. 검수: 시험 계정 ego 화면 + 주인님 승인 1건 실제 등록(판매 안 되는 상태) → 결과 기록.

자동화 숫자(목표): 처음 설정 3단계(키·고정 IP·기본 출고지) · 상품당 조작 2~3번(카테고리 확인·검사·보내기) · 동의 1번.

## 5. 비용
| 항목 | 예상 | 승인 |
|---|---|---|
| Vercel 빌드 | 새 프로젝트 첫 배포 포함 2~3회(1단계 뼈대 1, 4단계 1, 보정 1) + 상세페이지 연결은 다음 배포에 묶음 | 단계별 실행 직전 다시 여쭘 |
| 운영 DB | 새 표 1개(`elevenst_register_jobs`) 마이그레이션 + `programs`·`pricing_plans` 등록 | 승인 필요 |
| AI | 개발 중 0. AI 추천은 회원 본인 Claude 키(선택 기능) | — |
| 회원 부담 | 11번가 API 무료(확인 필요), Fixie 무료 월 500회(쿠팡과 같은 주소를 같이 쓰면 호출이 합쳐짐 → 많이 쓰면 Commuter $5) | 화면에 안내 |
| 운영자 인프라 | 없음(서버 IP는 회원 본인 Fixie) | — |

## 6. 결정 항목 (주인님)
1. 프로그램 형태: ✅ **A 새 프로그램으로 확정**(2026-11-11 주인님 「새 프로그램으로 만들기」)
2. 이름: ✅ **「AI 11번가 상품 자동등록기」(`elevenst-register`) 확정**(2026-11-11 주인님)
3. **11번가 판매자(Seller) 계정**: 시험에 쓸 판매자 계정이 있는지, 없으면 가입·Seller 전환을 해 주실지(0단계 전제)
4. 0단계 진행: ego에서 로그인만 해 주시면 명세를 읽어 정리(비용 없음)
5. 첫 실제 등록 1건 시험은 4단계 끝난 뒤 다시 승인받음(쿠팡과 같은 방식)

## 7. 하지 않는 것
- 확장으로 11번가 판매자 화면을 조작하는 방식(공식 API가 있으므로 쓰지 않음 — 블로그 지침의 「공식 API 예외」와 같은 판단)
- 운영자 IP·운영자 키로 회원 요청 처리(최상위 규칙)
- 여러 상품 자동 일괄 등록(쿠팡처럼 사람 확인 유지)
- G마켓·옥션(ESM)은 이번 범위 밖 — 11번가 끝난 뒤 별도 플랜
