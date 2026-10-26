# 이커머스 자동화 완성 기준

> **상태: ✅ 담당 확인(2026-10-26, [역할: ecommerce-image] `claude-win-sdp`)** — 2026-10-24 초안(`claude-win-dotori` [역할: analysis-planning])을 코드·배포 기록과 대조해 확정했다. 이후 이커머스 작업은 이 문서를 기준으로 쓰고 같은 작업에서 고친다.

- 적용 범위: ① AIMaster 운영(DB ref `esgxyikcnnvmlhygjkth`)의 「이커머스」 카테고리 — `shop-detail-page`(AI 상세페이지 자동화), `trending-product-finder`(상품소싱 자동화), `seller-label-docs`(셀러 라벨·QR·서류), `shop-order-report`(주문·매출 리포트), 병합됨 `detail-page-12p`·`auto-detail-page`(이동 안내만). 앞으로 만드는 상세페이지·상품 분석·소싱 프로그램(기획만 있는 `coupang/`·`sourcing/` 포함)에도 적용한다.
- 관계 문서: [이커머스 기능 상세 비교표](ECOMMERCE_FEATURE_MATRIX.md) · [이커머스 통합 작업표](ECOMMERCE_CONSOLIDATION_TASKS.md) · [이커머스 통합 분석 보고서](analysis-ecommerce-consolidation-20261021/REPORT.md) · [카테고리 지침 지도](CATEGORY_GUIDE_MAP.md) · [이미지 생성 프롬프트 규칙](IMAGE_PROMPT_RULES.md) · [회원 본인 계정·키 최상위 규칙](TOP_RULE_PERSONAL_ACCOUNT_API.md).
- `video-to-gif`(상세페이지 GIF 자동화)는 카테고리 지도에서 「영상」 줄에 있다. 상세페이지와 GIF 받기로 연결돼 있으므로 연결 부분만 이 기준을 따른다.

## 1. 완성 흐름 (목표)

이커머스 자동화의 완성 목표는 아래 흐름이 **회원 본인 키·본인 데이터로 끊기지 않고** 이어지는 것이다.

**팔 상품 찾기(데이터) → 상품 정보 채우기(사진·사양서·상품명) → 회원 확인·수정 → 상세페이지 이미지·HTML 생성 → 섹션별 수정(재생성·문구 고치기·순서) → 마켓 규격 내보내기(긴 이미지·섹션 ZIP·HTML) → 홍보 연계(쓰레드·인스타) → 결과 보관(30일)과 정리 기록**

- 상품소싱 쪽 완성 흐름: 키워드·카테고리 등록 → 실측 데이터(쇼핑인사이트·검색광고·11번가·YouTube·도매매·알리) 기반 기회 점수 → AI 추천 사유 → 마진 계산 → 알림·정기 리포트(회원이 고른 실행 방식) → 「📄 상세페이지」로 넘기기.
- 판매 후 흐름(2026-10-25 추가): 마켓 주문 엑셀 → 주문 리포트(현황·순이익·재고·리뷰) → 발송 전 주문을 셀러 라벨로 넘겨 라벨 인쇄. 「🛒 쇼핑몰 흐름」 띠(공용 `shop-flow-bar`)로 단계를 잇되, **각 프로그램은 혼자서도 쓸 수 있어야 한다**.
- 마켓에 실제로 상품을 등록하는 단계는 **크롬 확장 「마켓 등록기」(EC-W8, 스마트스토어 먼저 → 쿠팡)로 개발 예정**이다. 상세페이지에서 완성한 결과를 확장이 판매자센터 등록 화면에 채우고, 등록은 회원이 고른 방식(입력만·바로 등록·판매대기)으로 한다. 완성되기 전까지 완성 보고에 「마켓 등록: EC-W8 단계별 상태」를 밝힌다.

## 2. 「끝났다」고 말할 조건

아래를 모두 만족해야 그 기능·프로그램을 「완료」로 보고한다. 하나라도 빠지면 빠진 단계를 「미완료」·「미검수」로 적는다.

1. **회원 본인 키로 동작**: 유료 AI(Gemini·OpenAI)와 외부 데이터 API(네이버 HUB·검색광고·11번가·도매매·알리·YouTube·cron-job.org)는 모두 회원 `user_api_keys`의 본인 값만 쓴다. 키가 없으면 실행하지 않고 등록 안내를 띄운다.
2. **회원 데이터 격리·비공개**: 상품 원본·생성 이미지·내보내기 파일은 회원 본인 폴더(`{user_id}/products/...`)의 **비공개 버킷**에 두고, 화면은 서명 주소로만 보여 준다(기준: `shop-detail-page/app/api/image/route.ts`, `lib/storageImage.ts`). 공개 버킷·공개 주소로 회원 상품 이미지를 두지 않는다.
3. **30일 자동 정리와 기록**: 생성 자료는 생성일 기준 30일 뒤 자동 삭제(예약 작업 `cleanup-generated`)되고, 지운 건수를 회원별 정리 기록(`cleanup-usage-log` 공용 사본)으로 남긴다. 유예가 있으면 끝나는 날을 문서에 적는다.
4. **사실과 추정 구분**: AI가 채운 사양·인증·수치는 「AI 추정 — 확인 필요」로 보이고, 근거 없는 가격·할인·특가·후기·판매량·재구매율 문구를 만들지 않는다(기준: `shop-detail-page/lib/actions/images.ts` `NO_PRICE_PROMOTION_GUIDE`, `lib/ai/htmlDetailPrompt.ts`).
5. **마켓 규격 결과물**: 회원이 고른 규격(15섹션·쿠팡 12단·스마트스토어 9단)대로 860px 폭 결과를 내려받을 수 있고, 큰 파일은 서버 응답 한도(4.5MB)에 막히지 않게 저장 후 서명 주소로 내려받는다(기준: `lib/exportDownload.ts`).
6. **검수 증거**: 로컬 검사(tsc·시험) → 배포 Ready → 시험 계정(`buylifemall@naver.com`) 실제 화면 확인을 각각 기록한다. 유료 생성 시험은 승인된 횟수만 하고, 누르지 않은 버튼은 「미검수」로 적는다.
7. **문서 갱신**: 같은 작업에서 [이커머스 기능 상세 비교표](ECOMMERCE_FEATURE_MATRIX.md)의 칸·변경 이력, 프로그램 `AGENTS.md`·`docs/IMPROVEMENTS.md`, [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md) 카드·버전을 고친다.

## 3. 회원이 고르는 항목

회원이 고르지 않은 값으로 생성·발송·과금하지 않는다.

| 항목 | 선택지 | 프로그램 | 근거 |
|---|---|---|---|
| 상세페이지 규격 | 기본 15섹션 / 쿠팡 12단 / 스마트스토어 9단(저장 후 변경 불가) | 상세페이지 | `shop-detail-page/lib/layoutPresets.ts` |
| 이미지 모델·화질 | 나노바나나 2.1 / 3 Pro 등(공용 기준 사본 목록), 단가 표시 | 상세페이지 | `lib/ai/imageModels.ts`, `lib/ai/nanoBananaModels.ts` |
| 생성 범위 | 남은 섹션만 / 섹션 하나(✨ 생성) / 전체 다시 생성(두 번 눌러 확인) | 상세페이지 | `lib/generatePlan.ts`, `components/products/SectionImageGrid.tsx` |
| 정보 채우기 방식 | 사진 분석 / 사양서(PDF·TXT·MD) / 사진 없이 상품명으로 먼저 채우기(입력칸만) | 상세페이지 | `components/products/ProductAnalyzeForm.tsx`, `lib/actions/products.ts` |
| 섹션 순서·버전 | 섹션 ↑↓·기본 순서로, 섹션별 이미지 버전 선택 | 상세페이지 | `lib/sectionOrder.ts` |
| 내보내기 형식 | 긴 PNG / 섹션별 860px ZIP / HTML(쿠팡·스마트스토어·프리미엄 스타일) | 상세페이지 | `app/api/products/[id]/export*`, `components/products/HtmlExportPanel.tsx` |
| 가격 표기 | 할인가를 넣었을 때만 가격 문구 허용(비우면 가격·혜택 문구 금지) | 상세페이지 | `lib/actions/images.ts` |
| AI 제공사 | OpenAI 또는 Gemini(회원 등록 키) | 상품소싱 | `trending-product-finder/lib/ai/opportunity.ts` |
| 알림 채널 | 이메일(회원 SMTP)·텔레그램·문자/알림톡(회원 SOLAPI) | 상품소싱 | `lib/email/transport.ts`, `lib/telegram/client.ts`, `lib/solapi/client.ts` |
| 정기 실행 방식 | 운영 예약 / 내 cron-job.org(회원 키) | 상품소싱 | `components/settings/SchedulerModePicker.tsx`, `lib/schedulerMember/` |
| 알림 주기 | 1·3·6·12시간·매일(예약 소싱 알림) | 상품소싱 | `lib/sourcingAlert.ts`, `components/watchlist/SourcingAlertControls.tsx` |
| 판매할 마켓·카테고리 요율·배송 방식 | 직접 입력 / 5개 마켓, 무료·선결제·착불 | 상품소싱 | 공용 `market-fees`, `MarketSalesSection.tsx` |
| 외화 원가·환율 | 달러·위안·엔·유로, 관세청 과세환율(없으면 직접 입력) | 상품소싱 | `lib/customs/fxRate.ts` |
| 기회 점수 알림 기준 | 끔 / 60·70·80·90점 이상 | 상품소싱 | `ScoreAlertControl.tsx` |
| 주문 저장 위치 | 회원 PC 브라우저(A안, 주인님 결정) | 주문 리포트 | `src/lib/browser/store.ts` |
| 마켓 등록 방식(예정) | 입력만(기본) / 바로 등록 / 판매대기 | 상세 + 확장 | EC-W8 플랜 |

## 4. 하지 않을 것

- **운영자·다른 회원의 키나 계정으로 대신 처리하지 않는다.** 무료 API라도 계정당 호출 한도가 있으면(네이버 검색·데이터랩 등) 회원 본인 키를 쓴다.
- **사진 없이 상품 이미지를 만들지 않는다.** 상품명만으로는 입력칸만 채우고, 섹션 이미지는 실제 대표이미지가 있어야 만든다(구매자 오해 위험, 2026-10-22 주인님 A안).
- **지어낸 후기·판매량·만족도·재구매율·인증·가격 혜택·카운트다운 스크립트를 넣지 않는다.** HTML 결과에서 `<script>`·`on*` 속성은 지운다(`sanitizeGeneratedHtml`).
- **이미지 생성 프롬프트를 다른 프로그램과 공유·복사하지 않는다.** 공용으로 쓰는 것은 모델·주소·호출·대기 시간·이미지 받기까지다([IMAGE_PROMPT_RULES.md](IMAGE_PROMPT_RULES.md)). 공용 사본(`geminiImage.ts`·`nanoBananaModels.ts`·`zip.ts`·`gifHandoff.ts` 등)은 직접 고치지 않고 기준을 고친 뒤 `node scripts/check-shared-modules.mjs --sync`.
- **유료 이미지 생성을 자동 재시도하지 않는다**(시간 초과 이중 과금 방지, `retries: 0`).
- **회원 확인 없이 외부에 게시·발송하지 않는다.** 쓰레드·인스타로 넘길 때는 초안과 이미지 위치만 넘기고 게시는 받는 프로그램에서 회원이 한다.
- **의료기기·건강기능식품·화장품 효능을 단정하는 문구를 권하지 않는다**(사용 안내 꿀팁 4번, `components/guide/CommerceUsageGuide.tsx`).
- 병합된 원본(`detail-page-12p`·`auto-detail-page`)에 새 기능을 넣지 않는다. 옛 주소는 지우지 않고 이동 안내로 둔다.
- **회원의 마켓 판매자 키를 받아 우리 서버가 대신 상품을 등록·수집하지 않는다** — 네이버는 「내 스토어 애플리케이션」을 판매자 직접 연동용으로만 허용(2026-10-26 확인). 마켓 연동은 회원 브라우저의 확장으로 하거나, 정식 파트너(커머스솔루션·API대행사) 등록을 주인님이 결정한 뒤에만 한다.
- **주문 파일의 구매자 이름·주소·전화 열은 읽지 않고, 주문은 서버로 보내지 않는다**(주문 리포트 A안).

## 5. 회원 본인 키 규칙 (이커머스 적용)

- 상세페이지는 `gemini` provider 하나만 쓴다(상품 분석·HTML 작성·나노바나나 이미지). 키 원문은 브라우저로 보내지 않고 서버에서 머리글(`x-goog-api-key`)로만 보낸다.
- 상품소싱은 네이버 HUB·검색광고·알리·도매매·11번가·YouTube·OpenAI/Gemini·cron-job.org 키를 회원이 등록한다(이름표: `trending-product-finder/lib/apiKeyLabels.ts`). 키가 많으므로 설정 화면 「📖 연동 매뉴얼」에서 키마다 발급 방법을 안내한다.
- 예외(무료 공공 데이터): 관세청 과세환율은 운영자 키 `CUSTOMS_FX_SERVICE_KEY`로 하루 1~2번 받아 공용 참고 표에 저장해 함께 쓴다(`docs/TOP_RULE_PERSONAL_ACCOUNT_API.md` §8, 2026-10-26).
- 새 외부 플랫폼 키가 필요하면 프로그램 전용 저장소를 만들지 않고 공용 `user_api_keys`·[회원 연동 정보](MEMBER_INTEGRATIONS.md) 구조에 항목을 추가한다.
- 키가 없거나 한도가 소진되면 다른 키로 폴백하지 않고 「본인 키를 등록해 주세요」로 안내한다.

## 6. 한국인 인물 묘사 원칙

- 상세페이지 섹션 이미지에 사람이 나오면 **기본은 한국인(동아시아인)으로 묘사**한다. 현재 구현: 조립 단계에서 모든 템플릿에 붙는 `KOREAN_DEFAULT_PEOPLE_GUIDE`(`shop-detail-page/lib/actions/images.ts`)와 12단·9단 시스템 템플릿의 「인물이 나오면 한국인으로 묘사」 지시(`supabase/migrations/20261021_layout_presets_v1_16.sql`).
- 해외 배경이 상품 정보상 꼭 필요하거나 회원이 명시한 경우에만 다르게 묘사한다.
- 새 규격·새 템플릿을 추가할 때도 위 공통 지시가 붙는지 확인한다(템플릿 행에 빠져도 조립 단계 지시는 붙는다).

## 7. 상세페이지 UI 및 이커머스 화면 3D 버튼 표준 (2026-10-25 주인님 지시)

- **상세페이지 UI 및 에디터의 핵심 액션 버튼은 3D 엠보싱 버튼으로 탑재한다**:
  1. **적용 대상**:
     - 상세페이지 스튜디오의 「✨ 섹션 이미지 일괄 생성」, 「🚀 12단/9단 상세페이지 자동 완성」, 「💾 마켓 규격 내보내기(긴 이미지·ZIP·HTML)」
     - 상품소싱 자동화의 「🔎 기회 키워드 발굴 시작」, 「📄 상세페이지로 넘기기」
     - 사이드바의 「⬇ 확장 프로그램 받기」 및 API 키 등록 화면의 「🔗 API 키 발급/생성하기」
  2. **스타일 규격**:
     - 고채도 2단 수직 그라데이션, 하단 2단 입체 엠보싱 그림자(`box-shadow: 0 5px 0 [더 진한 테마색], 0 9px 18px rgba(...)`), 호버 시 부유(`translateY(-2px)`), 클릭 시 4px 눌림 모션(`translateY(4px)` + 그림자 밀착).
     - 기준 구현 및 상세 규격: 루트 [`DESIGN.md`](../DESIGN.md) 원칙 21 및 [`docs/PROGRAM_DESIGN_STANDARD.md`](PROGRAM_DESIGN_STANDARD.md) §6.6.

## 8. 완성 보고 양식(이커머스)

완성 보고에는 아래를 따로 적는다: 규격 3종별 생성 확인 여부 / 내보내기 3종(긴 PNG·ZIP·HTML) 확인 여부 / 비공개 저장·30일 정리 영향 / 회원 본인 키 확인 / 연계(상품소싱 → 상세페이지, 상세페이지 → 쓰레드·인스타, GIF → 섹션) 확인 여부 / 마켓 등록: EC-W8 단계별 상태 / 비용 리포트(빌드·AI 호출·누구 키).
