# AI 11번가 상품 자동등록기 (`elevenst-register`)

> 운영 주소: https://elevenst-register.buylife.xyz (Vercel 프로젝트 `elevenst-register`, 팀 `buylife`) · 현재 **v1.06 공개**(2026-11-13 주인님 「공개해」, `programs.is_active=true`)
> 담당 역할: `ecommerce-image` (`docs/roles/ecommerce-image.md`), `design` (agy, 107번 UI/UX 전담) · 플랜: `docs/PLAN_20261111_ELEVENST_REGISTER.md`(루트) · 명세: `docs/API_SPEC_NOTES.md`
> 작업 전 반드시: 11번가 기능은 **11번가 OPEN API 센터 판매자용 명세(로그인 필요)를 먼저 읽고** 구현한다 — 정리본 `docs/API_SPEC_NOTES.md`.

## 1. 사용 목적·대상
쇼핑몰 흐름 「1 소싱 → 2 상세페이지 → **3 마켓 등록** → 4 주문 리포트 → 5 발송 라벨」의 세 번째 마켓(스마트스토어·쿠팡 다음). AI 상세페이지 자동화에서 검토 완료한 상품을 11번가 공식 Seller API로 등록한다. 대상: 여러 오픈마켓에 같은 상품을 올리는 판매자.

## 2. 기술·도구
Next.js 16(App Router, `src/`), Tailwind 4, Supabase(AIMaster 운영 공용 DB), `iconv-lite`(11번가 본문 EUC-KR XML). 뼈대(로그인·권한·사이드바·Supabase 연결·`proxy.ts`)는 `coupang-ops`에서 복사(2026-11-11). 고정 IP(Fixie)는 쓰지 않는다 — 11번가가 해외 IP를 막아 서울 지역(icn1)에서 직접 부른다(v1.03). UI 테마: **107. 11번가 오리지널 레드 & 화이트 셀러 스튜디오 스타일** (`.btn-3d-red`, `.btn-3d-11st`).

## 3. 핵심 기능·구조·장단점
- v1.01(1단계 뼈대): 대시보드 「처음 설정 3단계」(11번가 키·고정 IP를 공용 저장소에서 읽어 준비됨 표시, 11번가 IP 등록 안내) · 연동&사용 매뉴얼 `/guide` · 11번가 본문 도우미 `src/lib/elevenst/xml.ts`(EUC-KR 인코딩·CDATA·EUC-KR에 없는 글자 찾기·응답 태그 읽기, 시험 7개).
- 권한: `src/lib/access.ts`(`THIS_PROGRAM_SLUG = "elevenst-register"`) + `src/lib/programAccess.ts`(루트 판정 사본). 레이아웃·라우트에 `force-dynamic`·`force-no-store`.
- DB: 등록 기록 표 `elevenst_register_jobs`(본인 읽기 RLS, 쓰기는 서버 키만) — `supabase/migrations/20261111_elevenst_register_v1_01.sql`(운영 적용 완료 2026-11-11).
- 장점: 공식 API라 화면 변경에 흔들리지 않음, 쿠팡 운영 컴포넌트 재사용. 한계: 11번가는 「임시저장」이 없어 등록 즉시 판매 → 등록 직후 전시중지로 보호 예정, 회원이 11번가 「API 관리」에 고정 IP를 직접 넣어야 함.

## 4. 버전 이력
- **v1.01 (2026-11-11)** — 1단계 뼈대. 운영 DB 등록(비공개·이커머스 카테고리·요금제 3단계)·기록 표, Vercel 새 프로젝트·도메인·환경변수 3개(`scripts/add-elevenst-register-vercel-env.mjs`), 첫 배포 `elevenst-register-30emmusx3` Ready(빌드 1회). 시험 7/7·tsc·로컬 build 통과. [역할: ecommerce-image] `claude-win-sdp`.
- **v1.02 (2026-11-11)** — 2단계 배포 `elevenst-register-kcgko1l6z` Ready(빌드 1회, 주인님 승인), DB `programs.version` v1.02.  `/connect` 「API키등록·플랫폼연동」: 11번가 키·고정 IP 저장/지우기(공용 `elevenst_api_key`·`fixed_ip_proxy_url`, 다른 프로그램도 같이 쓴다는 안내), 「연결 시험(읽기만)」 = 출고지 `GET /rest/areaservice/outboundarea` + 반품/교환지 `GET /rest/areaservice/inboundarea`(거절이면 나가는 IP 표시). 요청 함수 `src/lib/elevenst/client.ts`(undici ProxyAgent, 헤더 `openapikey`, EUC-KR, 재시도 0), 주소 응답 `areas.ts`. 시험 11/11·tsc·build 통과.
- **v1.03 (2026-11-11)** — 연결 시험 500 진단: 11번가가 해외 IP(Fixie 미국)를 막음, 한국에서 직접 부르면 키로 조회 성공(`docs/API_SPEC_NOTES.md` §6). 주인님 결정 「1안」: `vercel.json` `regions: ["icn1"]`(서울), 11번가는 Fixie 없이 직접 `https://api.11st.co.kr` 호출, 고정 IP 입력 칸·단계 제거(처음 설정 2단계: 키 → 연결 시험), `undici` 제거. 배포 `elevenst-register-kuna0l35h` Ready(빌드 1회 승인), DB v1.03.
- **v1.04 (2026-11-11)** — 3단계 등록 화면 배포 `elevenst-register-luyqz0am1` Ready(빌드 1회, 주인님 승인), DB v1.04. 메뉴 「📦 상품 등록」 `/products` → `/products/[id]` `RegisterForm`: 카테고리(`CategoryPicker`) · 가격·재고·옵션 · 배송 · 고시(40개 유형) → 「🧪 검사하기(보내지 않음)」. 레이아웃에 💾 저장공간 위젯 한 줄.
- **v1.05 (2026-11-13)** — 묶음 배포: `elevenst-register-43pl7coxp` Ready. 합성어 검색 보조, 상세페이지 연계 자동화, 4단계 보내기 + 상세 사진 보관 연장 회원 혜택 분기 탑재.
- **v1.06 (2026-11-13)** — 이미 등록된 상품 보내기 잠금 (`elevenst-register-7fl30qfbq` Ready).
- **v1.07에 포함 (미배포 대기)**:
  1. **정책**: 상세사진 `markPosted` 호출 + 확인 단계 및 매뉴얼 FAQ 보관 기간 안내 문구 탑재 (`claude-win-sdp`).
  2. **디자인 (2026-11-13 agy, 주인님 "1안으로 하고" 확정 승인)**:
     - **107. 11번가 오리지널 레드 & 화이트 셀러 스튜디오 스타일** 전면 구현
     - 로그인 화면의 과거 쿠팡 잔재 텍스트(`AIMASTER COUPANG OPS`) 완전 제거 및 5단계 표준 로그인 일체화
     - 대시보드 4단계 오픈 API 파이프라인 배너 및 4대 실시간 KPI 관제 카드(200 OK 통신, 등록대기, 누적등록, 30일 보관) 탑재
     - 2단 관제 덱 등록 폼(`RegisterForm`) 및 3D 엠보싱 11st 레드 버튼(`.btn-3d-red`, `.btn-3d-11st`) 탑재
     - 단위 테스트 39/39 전수 통과, `tsc --noEmit` 에러 0건, Next.js 16.4.6 프로덕션 빌드 완료
     - 1440px 데스크톱 및 390px 모바일 가로스크롤 0px(scrollWidth 390 === innerWidth 390) 실물 검증 완료 (`docs/evidence/` 보존)

## 5. 남은 일
- 배포 승인 후 운영 배포 (`node scripts/deploy.mjs elevenst-register --go`) 및 DB `programs.version = 'v1.07'` 동기화
- G마켓·옥션 등록기 플랜(`docs/REVIEW_20261111_GMARKET_AUCTION_REGISTER.md`) 진행 대기

## 6. UI/UX
**107. 11번가 오리지널 레드 & 화이트 셀러 스튜디오 스타일 (11st Iconic Vibrant Red Studio)**:
11번가 고유 비비드 레드(`#FA0050`)와 스노우 화이트 카드, 3D 엠보싱 레드 버튼(`.btn-3d-red`)을 적용하여 스마트스토어(78번 네이버 그린), 쿠팡(84번 로열 블루)과 함께 AIMaster 3대 오픈마켓 커머스 아틀리에를 완성. 상세 규격: `elevenst-register/docs/DESIGN_HANDOFF.md`.
