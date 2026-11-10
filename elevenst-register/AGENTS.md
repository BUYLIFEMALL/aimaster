# AI 11번가 상품 자동등록기 (`elevenst-register`)

> 운영 주소: https://elevenst-register.buylife.xyz (Vercel 프로젝트 `elevenst-register`, 팀 `buylife`) · 현재 **v1.01 비공개**(`programs.is_active=false`, 관리자만 열림)
> 담당 역할: `ecommerce-image` (`docs/roles/ecommerce-image.md`) · 플랜: `docs/PLAN_20261111_ELEVENST_REGISTER.md`(루트) · 명세: `docs/API_SPEC_NOTES.md`
> 작업 전 반드시: 11번가 기능은 **11번가 OPEN API 센터 판매자용 명세(로그인 필요)를 먼저 읽고** 구현한다 — 정리본 `docs/API_SPEC_NOTES.md`.

## 1. 사용 목적·대상
쇼핑몰 흐름 「1 소싱 → 2 상세페이지 → **3 마켓 등록** → 4 주문 리포트 → 5 발송 라벨」의 세 번째 마켓(스마트스토어·쿠팡 다음). AI 상세페이지 자동화에서 검토 완료한 상품을 11번가 공식 Seller API로 등록한다. 대상: 여러 오픈마켓에 같은 상품을 올리는 판매자.

## 2. 기술·도구
Next.js 16(App Router, `src/`), Tailwind 4, Supabase(AIMaster 운영 공용 DB), `iconv-lite`(11번가 본문 EUC-KR XML). 뼈대(로그인·권한·사이드바·Supabase 연결·`proxy.ts`)는 `coupang-ops`에서 복사(2026-11-11). 고정 IP는 쿠팡 운영과 같은 회원 본인 Fixie 주소(`user_api_keys.fixed_ip_proxy_url`)를 재사용한다.

## 3. 핵심 기능·구조·장단점
- v1.01(1단계 뼈대): 대시보드 「처음 설정 3단계」(11번가 키·고정 IP를 공용 저장소에서 읽어 준비됨 표시, 11번가 IP 등록 안내) · 연동&사용 매뉴얼 `/guide` · 11번가 본문 도우미 `src/lib/elevenst/xml.ts`(EUC-KR 인코딩·CDATA·EUC-KR에 없는 글자 찾기·응답 태그 읽기, 시험 7개).
- 권한: `src/lib/access.ts`(`THIS_PROGRAM_SLUG = "elevenst-register"`) + `src/lib/programAccess.ts`(루트 판정 사본). 레이아웃·라우트에 `force-dynamic`·`force-no-store`.
- DB: 등록 기록 표 `elevenst_register_jobs`(본인 읽기 RLS, 쓰기는 서버 키만) — `supabase/migrations/20261111_elevenst_register_v1_01.sql`(운영 적용 완료 2026-11-11).
- 장점: 공식 API라 화면 변경에 흔들리지 않음, 쿠팡 운영 컴포넌트 재사용. 한계: 11번가는 「임시저장」이 없어 등록 즉시 판매 → 등록 직후 전시중지로 보호 예정, 회원이 11번가 「API 관리」에 고정 IP를 직접 넣어야 함.

## 4. 버전 이력
- **v1.01 (2026-11-11)** — 1단계 뼈대. 운영 DB 등록(비공개·이커머스 카테고리·요금제 3단계)·기록 표, Vercel 새 프로젝트·도메인·환경변수 3개(`scripts/add-elevenst-register-vercel-env.mjs`), 첫 배포 `elevenst-register-30emmusx3` Ready(빌드 1회). 시험 7/7·tsc·로컬 build 통과. [역할: ecommerce-image] `claude-win-sdp`.

## 5. 남은 일
`docs/IMPROVEMENT_BACKLOG.md` — 다음은 2단계(연동 화면·연결 시험), 그 전에 주인님이 11번가 「API 관리 › IP 직접 입력 › 실서버 IP」에 Fixie 고정 IP 2개 등록.

## 6. 연계·아이디어
- `shop-detail-page/lib/markets.ts`에 11번가 한 줄(5단계) → 상세페이지 「11번가에 등록하기」.
- 이후 11번가 주문·송장(주문 API)도 이 프로그램에 붙일 수 있음(쿠팡 운영처럼).

## 7. UI/UX
쿠팡 운영의 슬레이트·인디고 화면(84번 미니멀 커머스 아틀리에 계열)을 그대로 씀. 11번가 색(레드)을 포인트로 쓰는 개편은 디자인 담당 몫 — `docs/DESIGN_HANDOFF.md`.
