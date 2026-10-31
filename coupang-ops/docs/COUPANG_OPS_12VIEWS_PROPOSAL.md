# 🚀 쿠팡 WING 셀러 자동화 스튜디오 (`coupang-ops`) — 4대 화면 3시안 비교 제안서

> **📌 작업 완료 결과 확인 링크 및 영구 자산 경로 안내 (최우선 필수 표기 세트)**
> 1. 🌐 **공식 운영 도메인**: [`https://coupang-ops.buylife.xyz`](https://coupang-ops.buylife.xyz)
> 2. ⚡ **Vercel 프로덕션 보조 링크**: [`https://coupang-ops.vercel.app`](https://coupang-ops.vercel.app)
> 3. 📮 **관리자 dev-docs 결과함 링크**: [`https://www.buylife.xyz/admin/dev-docs/requests`](https://www.buylife.xyz/admin/dev-docs/requests)
> 4. 🖥️ **브라우저 쇼케이스 HTML (표준 포트 3800)**: [`http://localhost:3800/showcase.html`](http://localhost:3800/showcase.html) *(또는 [`file:///D:/Antigravity/Design/showcase.html`](file:///D:/Antigravity/Design/showcase.html))*
> 5. 📁 **로컬 영구 자산 폴더 경로**:
>    - 추천 1안: `D:\Antigravity\Design\39_쿠팡_로켓_셀러_윙_레드_블루_스튜디오_스타일`
>    - 2안: `D:\Antigravity\Design\40_쿠팡_로켓_배송_옐로우_네이비_물류_대시보드_스타일`
>    - 3안: `D:\Antigravity\Design\41_쿠팡_아이템위너_알고리즘_데이터_인텔리전스_랩_스타일`

---

## 📸 1. 단일 통합 쇼케이스 풀페이지 조감도 및 1440px 라이트박스 검증

네이버 웨일 실브라우저(1920×1080 뷰포트) 환경에서 `http://localhost:3800/showcase.html`을 로드하여 4대 화면 × 3대 시안 (총 12개 뷰)의 전체 조감도와 카드 클릭 시 1440px 고화질 원본 라이트박스 팝업 확대를 철저히 검증하였습니다.

````carousel
![단일 통합 쇼케이스 12뷰 풀페이지 조감도](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/07fcc352-f8eb-42d2-b89d-e045a6909967/cpg_showcase_fullview.png)
<!-- slide -->
![1440px 고화질 라이트박스 팝업 확대 검증 (ESC/배경 클릭 닫기 지원)](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/07fcc352-f8eb-42d2-b89d-e045a6909967/cpg_verified_lightbox.png)
````

---

## 🎨 2. 3대 차별화 디자인 시안 개요 및 컨셉

쿠팡 고유의 시각적 아이덴티티와 셀러 자동화(WING API, 상품 대량등록, 아이템위너 매칭, 로켓배송 주문/반품 관제)의 실용성을 결합하여 서로 완전히 다른 3개의 독창적 시안을 설계하였습니다.

| 구분 | 1안 (추천 1순위) 🏆 | 2안 🚚 | 3안 🧠 |
|---|---|---|---|
| **템플릿명** | **39. 쿠팡 로켓 셀러 윙 레드·블루 스튜디오 스타일** | **40. 쿠팡 로켓 배송 옐로우·네이비 물류 대시보드 스타일** | **41. 쿠팡 아이템위너 알고리즘 데이터 인텔리전스 랩 스타일** |
| **비주얼 컨셉** | **쿠팡 WING 공식 셀러 센터 감성 일체화**<br>퓨어 화이트 & 쿨 그레이 바탕 + 아이코닉 쿠팡 로켓 레드 & 로켓 블루 | **로켓배송·풀필먼트 물류 센터 감성**<br>볼드 로켓 옐로우 & 딥 로켓 네이비 + 실시간 배송/입고 관제 인포그래픽 | **아이템위너 쟁탈 알고리즘 데이터 랩**<br>스마트 클린 슬레이트 화이트 & 인디고 블루 + 실시간 10원 인하/마진 시뮬레이터 |
| **핵심 배색** | • 배경: `#FFFFFF` / `#F8FAFC`<br>• 레드: `#E31A22` / `#ED1C24`<br>• 블루: `#0073E9` / `#0056B3`<br>• 텍스트: `#1E293B` | • 배경: `#F8FAFC` / `#0F172A`<br>• 옐로우: `#FFB800` / `#F59E0B`<br>• 네이비: `#0F172A` / `#1E293B`<br>• 그린: `#10B981` | • 배경: `#F8FAFC` / `#FFFFFF`<br>• 인디고: `#1D4ED8` / `#2563EB`<br>• 에메랄드: `#059669` / `#10B981`<br>• 슬레이트: `#334155` |
| **3D 입체 버튼** | `.btn-3d-coupang-red` (5px 입체 그림자, 4px 눌림 모션) | `.btn-3d-rocket-yellow` (5px 입체 그림자, 4px 눌림 모션) | `.btn-3d-indigo` (5px 입체 그림자, 4px 눌림 모션) |
| **핵심 위젯** | • 4대 WING 매출/위너 매칭률 KPI 덱<br>• 긴급 위기 알림 덱 (반려 상품 AI 수정, 10원 인하 탈환) | • 로켓 물동량 입출고 게이지<br>• 4단계 배송/반품 패스트 트래커 | • 24시간 실시간 최저가 매칭 차트<br>• 마진 하한선 실시간 수식 제어 콘솔 |
| **추천 이유** | 쿠팡 공식 WING 셀러 센터를 사용하는 셀러들에게 가장 친숙하고 신뢰감 높은 프로덕션 레퍼런스 | 대량 배송·밀크런 입고 및 풀필먼트 물류 속도감을 극대화하려는 셀러에게 최적 | 최저가 위너 쟁탈전과 정밀 마진 수식 분석을 중시하는 파워 셀러에게 최적 |

---

## 🖥️ 3. 4대 화면별 3시안 상세 대조 캐러셀

### 📱 화면 1: 메인 관제 대시보드 (`01_main`)
쿠팡 WING 연동 상태, 오늘의 로켓/일반 주문, 아이템위너 매칭 현황, 실시간 매출 집계를 조망하는 홈 화면입니다.

````carousel
![시안 1: 39. 쿠팡 로켓 셀러 윙 레드·블루 스튜디오 (추천 1순위)](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/07fcc352-f8eb-42d2-b89d-e045a6909967/cpg_main_c1.png)
<!-- slide -->
![시안 2: 40. 쿠팡 로켓 배송 옐로우·네이비 물류 대시보드](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/07fcc352-f8eb-42d2-b89d-e045a6909967/cpg_main_c2.png)
<!-- slide -->
![시안 3: 41. 쿠팡 아이템위너 알고리즘 데이터 인텔리전스 랩](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/07fcc352-f8eb-42d2-b89d-e045a6909967/cpg_main_c3.png)
````

---

### 📦 화면 2: 상품 대량 등록 & 위너 매칭 스튜디오 (`02_detail`)
네이버 스마트스토어/타오바오 상품을 쿠팡 카테고리/옵션/마진 공식에 맞춰 대량 등록하고 10원 단위 최저가 위너를 쟁탈하는 상세 작업 화면입니다.

````carousel
![시안 1: 39. 쿠팡 로켓 셀러 윙 레드·블루 스튜디오 (추천 1순위)](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/07fcc352-f8eb-42d2-b89d-e045a6909967/cpg_detail_c1.png)
<!-- slide -->
![시안 2: 40. 쿠팡 로켓 배송 옐로우·네이비 물류 대시보드](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/07fcc352-f8eb-42d2-b89d-e045a6909967/cpg_detail_c2.png)
<!-- slide -->
![시안 3: 41. 쿠팡 아이템위너 알고리즘 데이터 인텔리전스 랩](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/07fcc352-f8eb-42d2-b89d-e045a6909967/cpg_detail_c3.png)
````

---

### 📖 화면 3: WING 오픈API 연동 가이드 (`03_guide`)
쿠팡 WING 셀러 센터에서 Access Key / Secret Key를 발급받고, 출고지/반품지 주소지를 세팅하는 단계별 매뉴얼 화면입니다.

````carousel
![시안 1: 39. 쿠팡 로켓 셀러 윙 레드·블루 스튜디오 (추천 1순위)](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/07fcc352-f8eb-42d2-b89d-e045a6909967/cpg_guide_c1.png)
<!-- slide -->
![시안 2: 40. 쿠팡 로켓 배송 옐로우·네이비 물류 대시보드](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/07fcc352-f8eb-42d2-b89d-e045a6909967/cpg_guide_c2.png)
<!-- slide -->
![시안 3: 41. 쿠팡 아이템위너 알고리즘 데이터 인텔리전스 랩](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/07fcc352-f8eb-42d2-b89d-e045a6909967/cpg_guide_c3.png)
````

---

### ⚙️ 화면 4: API키 & 배송/마진 환경설정 (`04_settings`)
WING Vendor ID, Access Key, Secret Key 및 기본 택배사, 출고소요일, 자동 위너 매칭 마진 하한선(%)을 관리하는 환경설정 화면입니다.

````carousel
![시안 1: 39. 쿠팡 로켓 셀러 윙 레드·블루 스튜디오 (추천 1순위)](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/07fcc352-f8eb-42d2-b89d-e045a6909967/cpg_settings_c1.png)
<!-- slide -->
![시안 2: 40. 쿠팡 로켓 배송 옐로우·네이비 물류 대시보드](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/07fcc352-f8eb-42d2-b89d-e045a6909967/cpg_settings_c2.png)
<!-- slide -->
![시안 3: 41. 쿠팡 아이템위너 알고리즘 데이터 인텔리전스 랩](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/07fcc352-f8eb-42d2-b89d-e045a6909967/cpg_settings_c3.png)
````

---

## 🗂️ 4. 템플릿 카탈로그 등록 및 비선택 시안 100% 영구 자산화 완료

| 템플릿 번호 | 템플릿 명칭 | 보존 경로 | 상태 |
|---|---|---|---|
| **39** | **쿠팡 로켓 셀러 윙 레드·블루 스튜디오 스타일** | `D:\Antigravity\Design\39_쿠팡_로켓_셀러_윙_레드_블루_스튜디오_스타일` | 🏆 **추천 1순위** (`01_main` ~ `04_settings`, `README.md`, `showcase_12views.html` 보존 완료) |
| **40** | **쿠팡 로켓 배송 옐로우·네이비 물류 대시보드 스타일** | `D:\Antigravity\Design\40_쿠팡_로켓_배송_옐로우_네이비_물류_대시보드_스타일` | 📦 **자산화 보존** (`01_main` ~ `04_settings`, `README.md`, `showcase_12views.html` 보존 완료) |
| **41** | **쿠팡 아이템위너 알고리즘 데이터 인텔리전스 랩 스타일** | `D:\Antigravity\Design\41_쿠팡_아이템위너_알고리즘_데이터_인텔리전스_랩_스타일` | 🧠 **자산화 보존** (`01_main` ~ `04_settings`, `README.md`, `showcase_12views.html` 보존 완료) |

- `DESIGN.md` 및 `docs/DESIGN_TEMPLATE_CATALOG.md`에 39, 40, 41번 상세 스펙 공식 등재 완료.
- `D:\Antigravity\Design\showcase.html` 통합 쇼케이스 웹서버(포트 3800) 상시 운영 중.

---

## 💡 5. 추천 의견 및 사용자 선택 요청

> **에이전트 권장안**: **1안 — 39. 쿠팡 로켓 셀러 윙 레드·블루 스튜디오 스타일**
> - 쿠팡 WING 공식 셀러 센터를 이용하는 판매자들에게 가장 익숙하고 신뢰감을 주는 **쿠팡 로켓 레드(`#E31A22`) & 로켓 블루(`#0073E9`)** 고채도 배색과 3D 엠보싱 버튼이 탑재되어 있습니다.
> - 긴급 판매 위기 알림 덱(반려 상품 AI 즉시 수정, 위너 뺏김 10원 인하 탈환 버튼)이 직관적으로 배치되어 셀러의 매출 방어에 가장 실용적입니다.

주인님께서 검토 후 원하시는 시안(1안, 2안, 3안)을 선택해 주시면, 채택안을 바탕으로 `coupang-ops` 실제 프로덕션 UI 구현 및 연동 작업에 즉시 착수하겠습니다!
