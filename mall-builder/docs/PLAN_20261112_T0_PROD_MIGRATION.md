# 플랜 — T0 운영 이전(① B2B 입점몰 샘플몰) (2026-11-12)

- 근거: 주인님 「쇼핑몰 3가지 … AIMaster에 샘플몰 형태로 이커머스 카테고리에서 실행」(11-11, Lab 지침 §4-4의 명시 지시), 「T1 → T0 진행해」(11-11), 「진행해」(11-12)
- 이미 정한 것([3몰 인수인계 §0](../../docs/mall/HANDOFF_THREE_MALLS.md)): 코드 하나 + 배포 둘(Lab `dev-mall-builder`는 시험용으로 남김) · 운영 주소 `mall-builder.buylife.xyz` · 구경·주문 시험은 로그인 회원, 몰 만들기·공급사 초대·분양은 관리자만 · 운영 DB = AIMaster(`esgxyikcnnvmlhygjkth`)

## 1. 지금 상태(조사 결과)
- 코드는 서비스 키 없이 로그인한 사람 권한 + DB 보안 규칙만으로 동작(서버가 남의 데이터를 대신 읽는 곳 없음).
- 마이그레이션 65개(0001~0057c). 공용 영역에서 하는 일: 저장소 버킷 2개 추가, 확장 `http` 켜기, 새 스키마 `mall_builder_private`, `auth.users`는 참조·이메일 읽기만(변경 없음). 모든 표·함수 이름이 `mall_builder_` 접두어라 기존 운영 표와 겹치지 않음.
- 몰 만들기 함수(`mall_builder_create_store`)는 로그인한 누구나 가능 → 운영에서는 관리자만으로 막아야 함.
- Lab 전용 가정: 로그인 화면이 자체(이메일 링크), 프로그램 권한 판정 없음, 버전 표시 없음.

## 2. 단계와 승인 지점

| 단계 | 내용 | 운영 영향 | 승인 |
|---|---|---|---|
| A 코드(운영 영향 없음) | 1) 폴더 `labs/mall-builder` → `mall-builder`(Lab 배포 연결 `.vercel` 그대로 옮김) 2) 플랫폼 스위치 `MALL_PLATFORM=aimaster`일 때만: `requireProgramAccess()`(slug `mall-builder`, 판정 순서 정지→관리자→핸드폰→FREE→구독→등급+기간, DB 조회는 서버 키), 로그인은 메인 사이트(`www.buylife.xyz/login?redirect=`)·쿠키 `.buylife.xyz` 공유, 몰 만들기 화면은 관리자만 3) DB 0058: 몰 만들기를 「`profiles` 표가 있으면 `is_admin`만」으로(운영에서만 걸리고 Lab은 그대로) 4) `v1.01` 표시, 0번 규칙 고지(NOTICE·ai.txt·robots), 저장공간 위젯 한 줄, 인수인계 문서 6종 | 없음 | 이 플랜 승인으로 진행 |
| B 운영 DB | 마이그레이션 66개(0058 포함) 순서대로 운영 DB에 적용 → 표·함수·보안 규칙 점검 쿼리, 기존 운영 표 변화 0 확인 | **운영 DB 쓰기** | **단계 승인 1** |
| C 운영 배포 | Vercel 새 프로젝트 `mall-builder`(동시 빌드 끔·Basic) + `mall-builder.buylife.xyz` 연결, 환경변수(Supabase 주소·공개 키·서버 키·`MALL_SECRET_KEY`·`MALL_PLATFORM`·`MALL_ROOT_DOMAIN`) — **비밀값은 주인님이 직접 입력** → 빌드 1회 | 새 프로젝트·빌드 비용 | **단계 승인 2** |
| D 프로그램 등록 | `programs`(이커머스, `v1.01`, `app_url`, 상세 소개 표준 형식, 요금제 기본 3단계) | 운영 DB 쓰기(1줄+요금제 3줄) | **단계 승인 3** |
| E 샘플몰 ① | 관리자 계정으로 몰 `aimaster-b2b` 만들기, 시험 상품·시험 공급사(시험 계정 naver), 등급 할인·폐쇄몰 설정, 실제 결제 없음(토스 예제 키) → 회원 흐름 화면 시험(ego) | 운영 DB에 샘플 데이터 | 단계 승인 4(화면에서) |

## 3. 비용
| 항목 | 횟수 | 금액 |
|---|---|---|
| Vercel 빌드(운영 새 프로젝트) | 1~2회 | 빌드 1회분(팀 Basic) |
| 운영 DB | 표·함수 추가, 저장 용량 작음 | 추가 요금 없음(기존 요금제 안) |
| 유료 AI·문자 | 0회(샘플몰 알림은 끈 상태로) | 없음 |
| Lab | 이번에 Lab 배포 안 함(T1 미배포분은 다음 Lab 배포 때) | 없음 |

## 4. 결정 항목
1. 폴더 이동: (추천) `AIMaster/mall-builder`로 옮기고 Lab 배포도 같은 폴더에서 / `labs/`에 그대로 두고 운영도 거기서 배포
2. 프로그램 이용 자격: (추천) FREE 배지로 등록해 로그인 회원 누구나 샘플몰 구경 — 배지는 주인님이 관리 / 배지 없이 등록하고 주인님이 회원별 권한 부여
3. 로그인: (추천) 운영에서는 메인 사이트 로그인 공유(`.buylife.xyz` 쿠키, 따로 로그인 없음) / 몰 자체 로그인 유지
4. 몰 만들기 막기: (추천) 화면 + DB(0058) 둘 다 관리자만 / 화면만

## 5. 검수
- A: 자동 시험·tsc·`npm run build`(내 PC), Lab 모드(스위치 끔)에서 기존 화면 그대로인지 ego 확인
- B: 적용 뒤 `mall_builder_%` 표 수·보안 규칙 켜짐·운영 기존 표 변화 없음 쿼리
- C·D·E: 운영 주소 응답, 비로그인 → 메인 로그인으로, 시험 계정(naver)으로 구경·주문, 관리자만 몰 만들기, 390px

## 6. 답 기록
- 2026-11-12 주인님 승인: B 운영 DB 적용 — 방법은 「이 세션에 운영 Supabase 연결 추가」(연결되면 사전 점검 → 묶음 적용 → 검증).
- 2026-11-12 주인님 선택(질문 창): 폴더 `AIMaster/mall-builder`로 옮김 · FREE 배지로 등록 · 메인 사이트 로그인 공유 · 몰 만들기는 화면 + DB 둘 다 막기 — 모두 추천안.

## 7. 진행 기록
- **A 완료(2026-11-12, 운영 영향 없음)**: 폴더 이동(추적 파일 387개, 이름 바꾸기로 커밋), `lib/platform.ts`(스위치·공개 경로), `lib/platform-gate.ts`(운영 관문), `proxy.ts`(운영일 때만 관문 — 갱신된 로그인 쿠키를 요청·응답 모두에 넘김), `lib/programAccess.ts`(elevenst-register 사본), `lib/supabase/{admin,cookieDomain}.ts`, `env.ts`(운영 스위치일 때만 운영 DB 주소 허용), 로그인 화면(운영이면 메인 로그인으로), 첫 화면(관리자만 몰 만들기·일반 회원은 샘플몰 바로가기·버전 표시), 몰 만들기 서버 동작 관리자 확인, DB **0058**(Lab 적용 — Lab은 이름표 없는 표를 막는 장치가 있어 `profiles`가 생길 수 없음 → Lab 몰 만들기 통과 확인, 운영 흉내 시험은 B에서), 저작권 고지 3개, 저장공간 위젯(운영만), `v1.01`, 인수인계 문서(AGENTS·IMPROVEMENTS·BACKLOG·DESIGN_HANDOFF). 시험 247개·tsc 0·내 PC 빌드 2번(Lab 모드·운영 모드). 내 PC 응답 확인: Lab 모드는 예전과 같음, 운영 모드는 비로그인 화면 → `www.buylife.xyz/login?redirect=<원래 주소>`, 서버 동작 401, 앱 파일·예약 실행은 열림.
- **B 준비(2026-11-12)**: `scripts/build-prod-bundle.mjs` → `supabase/prod-bundle/T0_prod_bundle.sql`(커밋 안 함, 파일 66개·9,648줄, 한 트랜잭션 — 실패하면 전부 되돌아감, 0001의 Lab 전용 줄은 「lab_admin이 있을 때만」으로 바꿈). 점검: 만드는 개체는 모두 `mall_builder` 이름표(표·함수·스키마 `mall_builder_private`·버킷 `mall-builder-*`·저장소 규칙 `mall_builder_*`), `auth` 트리거 없음, 공용 변경은 `http` 확장(`extensions` 스키마)뿐. 사전 점검(읽기만) `scripts/prod-preflight.sql`. **적용 뒤 기대값(Lab과 같아야 함)**: 표 55 · 함수 176 · 저장소 규칙 8 · 버킷 2.
- 이 세션의 DB 도구는 Lab용뿐 → 운영 적용 방법은 주인님 선택(운영 Supabase 연결 추가 / SQL 편집기에서 직접 실행 / 운영 DB 도구가 있는 세션에 요청).
- **B 완료(2026-11-12, 운영 DB `esgxyikcnnvmlhygjkth`)** — 담당 인계받은 `claude-win-20261025-workspace`. 사전 점검(쇼핑몰 개체 0·http 없음·profiles.is_admin 있음) → SQL 편집기 실행 2번 실패(① `0043` 주석이 `end if;`를 삼킴 ② CRLF 줄바꿈으로 함수 본문 바꾸기가 문구를 못 찾음, 편집기도 CRLF로 보냄 — 둘 다 문법·검사 단계에서 멈춰 운영 변화 없음 확인) → 고침(`0043` 줄·묶음 스크립트 LF·편집기 줄바꿈 LF) + 로컬 전체 실행 검사 `scripts/check-prod-bundle-local.mjs` 통과 → 주인님이 Run → **검증: 표 55·함수 176·저장소 규칙 8·버킷 2(public·private)·`mall_builder_private` 스키마·http 1.6(extensions)·RLS 꺼진 쇼핑몰 표 0, 몰 만들기 관리자 검사·주문 특가·초대 이메일 가림 들어감, profiles 293행 그대로.** 보안 점검(advisors) 쇼핑몰 관련: ⓘ 정책 없는 표 3개(초대 2·예약 비밀값 — 함수로만 접근하도록 일부러 막음), ⚠ 보안 정의자 함수를 anon 125·authenticated 145개가 부를 수 있음(함수 안에서 로그인·권한 검사하는 설계, Lab과 같음 — 로그인 필요한 함수의 anon 실행 권한 거두기는 개선 후보로 IMPROVEMENTS에). 다음: C(Vercel 운영 프로젝트·도메인·환경변수·programs 등록·빌드 1회).
- **C 완료(2026-11-12)** — Vercel 운영 프로젝트 `mall-builder`(`prj_TBwDVEc6vBveDSuv8pquHLEuBHDD`, Next.js·Basic 고정·서울 icn1, 배포 보호는 사용자 도메인 제외) + `mall-builder.buylife.xyz`(인증됨). 환경변수 7개: 공개 5(`scripts/prod-env-setup.mjs`)·`MALL_SECRET_KEY`(스크립트가 무작위 생성, 값 기록 없음)·`SUPABASE_SECRET_KEY`(주인님 입력, 운영 새 키 `aimaster_2026_1009` — 24시간 접속 기록상 서버 요청 전부 이 키, 노출됐던 옛 키 `aimaster` 사용 0번). 배포 `scripts/deploy-prod.mjs`(Lab 연결 파일 그대로, 프로젝트 번호 지정, 대기·변수 확인) → `dpl_EUZrhxX7DWPMGVf1FaevucfLU2ou` READY(빌드 1회). 확인: 비로그인 화면 → `www.buylife.xyz/login?redirect=…`(307), 비로그인 API 401 「로그인이 필요합니다.」, ego 관리자 계정 로그인 공유·관리자만 몰 만들기·샘플몰 바로가기·v1.01·💾 위젯. 실패·수정: 환경변수 배열 전송 「Invalid JSON」→ 하나씩, 윈도우 shell이 주소의 `&`를 자름 → 따옴표. 다음: D `programs` 등록 → E 샘플몰 ①.
