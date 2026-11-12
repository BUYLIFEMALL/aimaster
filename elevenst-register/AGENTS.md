# AI 11번가 상품 자동등록기 (`elevenst-register`)

> 운영 주소: https://elevenst-register.buylife.xyz (Vercel 프로젝트 `elevenst-register`, 팀 `buylife`) · 현재 **v1.05 비공개**(`programs.is_active=false`, 관리자만 열림)
> 담당 역할: `ecommerce-image` (`docs/roles/ecommerce-image.md`) · 플랜: `docs/PLAN_20261111_ELEVENST_REGISTER.md`(루트) · 명세: `docs/API_SPEC_NOTES.md`
> 작업 전 반드시: 11번가 기능은 **11번가 OPEN API 센터 판매자용 명세(로그인 필요)를 먼저 읽고** 구현한다 — 정리본 `docs/API_SPEC_NOTES.md`.

## 1. 사용 목적·대상
쇼핑몰 흐름 「1 소싱 → 2 상세페이지 → **3 마켓 등록** → 4 주문 리포트 → 5 발송 라벨」의 세 번째 마켓(스마트스토어·쿠팡 다음). AI 상세페이지 자동화에서 검토 완료한 상품을 11번가 공식 Seller API로 등록한다. 대상: 여러 오픈마켓에 같은 상품을 올리는 판매자.

## 2. 기술·도구
Next.js 16(App Router, `src/`), Tailwind 4, Supabase(AIMaster 운영 공용 DB), `iconv-lite`(11번가 본문 EUC-KR XML). 뼈대(로그인·권한·사이드바·Supabase 연결·`proxy.ts`)는 `coupang-ops`에서 복사(2026-11-11). 고정 IP(Fixie)는 쓰지 않는다 — 11번가가 해외 IP를 막아 서울 지역(icn1)에서 직접 부른다(v1.03).

## 3. 핵심 기능·구조·장단점
- v1.01(1단계 뼈대): 대시보드 「처음 설정 3단계」(11번가 키·고정 IP를 공용 저장소에서 읽어 준비됨 표시, 11번가 IP 등록 안내) · 연동&사용 매뉴얼 `/guide` · 11번가 본문 도우미 `src/lib/elevenst/xml.ts`(EUC-KR 인코딩·CDATA·EUC-KR에 없는 글자 찾기·응답 태그 읽기, 시험 7개).
- 권한: `src/lib/access.ts`(`THIS_PROGRAM_SLUG = "elevenst-register"`) + `src/lib/programAccess.ts`(루트 판정 사본). 레이아웃·라우트에 `force-dynamic`·`force-no-store`.
- DB: 등록 기록 표 `elevenst_register_jobs`(본인 읽기 RLS, 쓰기는 서버 키만) — `supabase/migrations/20261111_elevenst_register_v1_01.sql`(운영 적용 완료 2026-11-11).
- 장점: 공식 API라 화면 변경에 흔들리지 않음, 쿠팡 운영 컴포넌트 재사용. 한계: 11번가는 「임시저장」이 없어 등록 즉시 판매 → 등록 직후 전시중지로 보호 예정, 회원이 11번가 「API 관리」에 고정 IP를 직접 넣어야 함.

## 4. 버전 이력
- **v1.01 (2026-11-11)** — 1단계 뼈대. 운영 DB 등록(비공개·이커머스 카테고리·요금제 3단계)·기록 표, Vercel 새 프로젝트·도메인·환경변수 3개(`scripts/add-elevenst-register-vercel-env.mjs`), 첫 배포 `elevenst-register-30emmusx3` Ready(빌드 1회). 시험 7/7·tsc·로컬 build 통과. [역할: ecommerce-image] `claude-win-sdp`.

- **v1.02 (2026-11-11)** — 2단계 배포 `elevenst-register-kcgko1l6z` Ready(빌드 1회, 주인님 승인), DB `programs.version` v1.02.  `/connect` 「API키등록·플랫폼연동」: 11번가 키·고정 IP 저장/지우기(공용 `elevenst_api_key`·`fixed_ip_proxy_url`, 다른 프로그램도 같이 쓴다는 안내), 「연결 시험(읽기만)」 = 출고지 `GET /rest/areaservice/outboundarea` + 반품/교환지 `GET /rest/areaservice/inboundarea`(거절이면 나가는 IP 표시). 요청 함수 `src/lib/elevenst/client.ts`(undici ProxyAgent, 헤더 `openapikey`, EUC-KR, 재시도 0), 주소 응답 `areas.ts`. 시험 11/11·tsc·build 통과. 실제 연결 시험은 주인님 11번가 IP 등록 + 관리자 계정 키·고정 IP 저장 뒤(미확인).
- **v1.03 (2026-11-11)** — 연결 시험 500 진단: 11번가가 해외 IP(Fixie 미국)를 막음, 한국에서 직접 부르면 키로 조회 성공(`docs/API_SPEC_NOTES.md` §6). 주인님 결정 「1안」: `vercel.json` `regions: ["icn1"]`(서울), 11번가는 Fixie 없이 직접 `https://api.11st.co.kr` 호출, 고정 IP 입력 칸·단계 제거(처음 설정 2단계: 키 → 연결 시험), `undici` 제거. 배포 `elevenst-register-kuna0l35h` Ready(빌드 1회 승인), DB v1.03. ⚠ 서울 서버 IP는 고정이 아님 — 쓰기 API가 등록 IP를 요구하면 국내 고정 IP 방안 재결정.

- **v1.04 (2026-11-11)** — 3단계 등록 화면 배포 `elevenst-register-luyqz0am1` Ready(빌드 1회, 주인님 승인), DB v1.04. 메뉴 「📦 상품 등록」 `/products` → `/products/[id]` `RegisterForm`: 카테고리(`CategoryPicker` — 상품명 후보 찾기·직접 찾아보기·번호, 맨 아래만) · 가격·재고·한 가지 기준 옵션 · 과세·KC(대상 아님/면제 2종)·미성년자 · 배송(출고지·반품지·발송마감 템플릿 11번가에서 읽어 미리 채움, 배송비 무료/고정/조건부) · 고시(40개 유형) → 「🧪 검사하기(보내지 않음)」. 전체 카테고리는 키 없는 공개 조회를 서버 메모리에 12시간 보관, 배송·안내 문구는 브라우저에 기억. 레이아웃에 💾 저장공간 위젯 한 줄. 운영 검수(ego, 관리자 계정): 출고지 #2·반품지 #3·발송마감 템플릿 불러오기, 「남성 백팩」 후보 → 「남성가방 › 백팩 › 백팩」, 검사 통과(본문 4,275바이트)·10원 단위 오류 표시, 💾 위젯 표시 확인. [역할: ecommerce-image] `claude-win-sdp`.
- **v1.05에 포함 (2026-11-11 작업)** — 카테고리 후보 찾기 보조 검색: 운영 검수에서 상품명 「스위스톤 확장형 여행백팩 (ST4D18)」이 0건이었음(「여행백팩」이 카테고리 이름 「백팩」보다 긴 합성어). 일반 검색이 0건일 때만 「낱말이 카테고리 이름 조각으로 끝나는가」로 다시 찾음(`category.ts` `scoreLeaves`, 「스테인리스」→「리스」 우연 일치는 그대로 막힘). 시험 24/24·tsc 통과. 다음 배포 때 함께.

- **v1.05에 포함 — 상세페이지 연계 (2026-11-11 작업)** — 플랜 `docs/PLAN_20261111_DETAIL_PAGE_LINK.md`(주인님 「진행해」 = 추천안). 상세페이지 카테고리로 11번가 카테고리 자동 추천(`suggestCategory`·`suggestCategoryAction`, 마지막 이름이 같으면 미리 고르고 「확인해 주세요」 표시, 해외직구·수입명품·중고·렌탈·브랜드관 갈래는 감점) · 상품 정보(`specs`)로 브랜드·원산지·고시 유형·고시 항목 미리 채움(`src/lib/elevenst/prefill.ts`, AI 없음, 못 찾은 항목만 「상품상세설명 참조」) · 정가>판매가면 기본즉시할인 선택(기본 끔, `cuponcheck`·`dscAmtPercnt`, 명세 §8) · 쇼핑몰 흐름 띠(공용 `shop-flow`·`shop-flow-bar` 사본) · 상세페이지 「🟠 11번가」 버튼·결과 배지(`shop-detail-page/lib/markets.ts`). 시험 29/29·tsc·build 통과(상세페이지 tsc·build 통과).

- **v1.05에 포함 — 4단계 「11번가에 보내기」 (2026-11-12, 플랜 `docs/PLAN_20261111_STAGE4_SEND.md`)** — 주인님 승인(채팅 「진행해」): 운영 DB 표 `elevenst_register_image_links` 생성(ego SQL 편집기, RLS 켬·정책 없음 = 서버만, `supabase/migrations/20261112_elevenst_register_image_links.sql`) · Vercel 환경변수 `CRON_SECRET`(production, `scripts/add-elevenst-register-cron-secret.mjs`, 값 출력 안 함). 코드: 짧은 이미지 주소 `src/lib/imageLinks.ts`·`src/app/i/[id]/route.ts`(쿠팡 운영 사본, 확대 뺌) · 응답 읽기·중복 막기·글 상세설명 `src/lib/elevenst/register.ts` · `sendProductAction`(`src/lib/actions/send.ts`: 다시 검사 → 마지막 기록이 보내는 중/확인 필요/등록됨이면 막음 → `sending` 기록(동시 두 번이면 나중 것 멈춤) → 대표·추가 이미지 주소 → 등록(재시도 0) → 바로 전시중지 → `stopped`/`registered`/`failed`/`unknown`) · 등록 화면 「7. 11번가에 보내기」(검사 통과 + 검사 뒤 값 그대로일 때만, 화면 안 확인 단계) · 목록 결과 배지 · 30일 정리 `src/app/api/cron/cleanup/route.ts` + `vercel.json` crons `40 18 * * *`(`retention_exempt` 제외). **상세설명 방식 = 주인님 결정 「3안」(2026-11-13: 「서버 보관 비용이 드니 유료 사용자에게만, 관리자·시험 계정은 예외」)** — 보관 연장 회원(`profiles.retention_exempt` = 저장 구독 회원은 매일 자동, 관리자·시험 계정은 항상)만 상세페이지 섹션 사진(최대 20장)을 상세설명에 넣고, 그 밖은 글(핵심 특징·상품 정보 표·사용법·추천 대상). 판정 `detailImageMode`(`register.ts`)·`isRetentionExempt`(`retentionExempt.ts`), 보내기·검사 둘 다 같은 판정. 짧은 이미지 주소 `/i/<id>`는 30일이 지나도 보관 연장 회원이면 계속 보여 주고 구독이 끝나면 404(정리 예약 작업이 지움), CDN 하루 보관(`s-maxage`)으로 서버 호출을 줄임. 화면(검사 결과 「상세설명: …」, 7번 안내)·매뉴얼 FAQ·메인 설명 SQL(`supabase/migrations/20261113_elevenst_register_v1_05.sql`, **배포 때 적용**)에 같은 안내. 시험 38/38·tsc·build 통과. 실제 보내기는 5·6단계(주인님 승인 1건).

- **v1.05 (2026-11-13)** — 묶음 배포(주인님 「진행해」, 빌드 2회): `elevenst-register-43pl7coxp` Ready + 상세페이지 `shop-detail-page-4iuntur7m` Ready(v1.43, 11번가 버튼·저장공간 위젯 한 줄). 위 「v1.05에 포함」 3건(합성어 검색·상세페이지 연계·4단계 보내기 + 상세 사진은 보관 연장 회원만)이 함께 나감. DB `programs` v1.05 + 메인 설명·한 줄 요약 갱신(`20261113_..._v1_05.sql` 내용, 이전 값 백업 확인). 운영 확인(ego, 관리자): 사이드바 v1.05, 매뉴얼 새 FAQ, 상품 화면 「7. 11번가에 보내기」·저장 구독 안내, 없는 사진 주소 404. 메인 상세 페이지는 비공개라 404(정상). [역할: ecommerce-image] `claude-win-sdp`.
- **실제 보내기 시험 1건 (2026-11-13, 주인님 「진행해」)** — 관리자 계정, 상세페이지 상품 「스위스톤 확장형 여행백팩 (ST4D18)」(카테고리 #1011552 자동 추천, 56,000원·재고 99·무료배송·고시 「가방」 자동 채움, 브랜드 빈칸 → 알수없음) → 검사 통과(본문 4,198바이트, 상세설명 = 상세 사진 12장) → **11번가 상품번호 9752929791 등록 + 전시중지 성공**(기록 `stopped`, 「판매상태가 수정되었습니다 [STAT : 105]」). 확인: IP 등록 요구 없음(서울 지역 직접 호출 그대로 됨), KC 「대상 아님」 그룹 통과, 대표 사진은 11번가 CDN에 복사됨(`9752929791_B.webp`), **상세설명 사진은 11번가가 복사하지 않고 우리 `/i/` 주소를 그대로 띄움**(11번가 상품 페이지를 연 순간 우리 서버에 12장 요청, 일부는 CDN 캐시 응답) → 3안 판단 근거 확인. 시험 상품은 11번가에 전시중지 상태로 남아 있음(셀러오피스에서 삭제 가능). ego 주의: 화면 아래 버튼은 `scrollIntoView` 뒤에 눌러야 함(「not visible in the viewport」), 11번가 사이트는 알림 허용 창을 띄워 조작권이 사람에게 넘어감.

## 5. 남은 일
`docs/IMPROVEMENT_BACKLOG.md` — 4단계 v1.05 배포 완료(2026-11-13). 남은 것: 비공개 안내 화면(백로그), 공개 시점 결정(주인님), 시험 상품 9752929791 정리(셀러오피스), 비공개 안내 화면.

## 6. 연계·아이디어
- `shop-detail-page/lib/markets.ts`에 11번가 한 줄(5단계) → 상세페이지 「11번가에 등록하기」.
- 이후 11번가 주문·송장(주문 API)도 이 프로그램에 붙일 수 있음(쿠팡 운영처럼).

## 7. UI/UX
쿠팡 운영의 슬레이트·인디고 화면(84번 미니멀 커머스 아틀리에 계열)을 그대로 씀. 11번가 색(레드)을 포인트로 쓰는 개편은 디자인 담당 몫 — `docs/DESIGN_HANDOFF.md`.
