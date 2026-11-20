# Next.js 보안 업그레이드 읽기 조사 — 고객관리·매물 알림 (RE-NEXT-UPGRADE-READBACK A1)

- 담당: CC-REALTY-01 Claude(RealEstate), 2026-11-20. 배정 Master `msg_f5aedec1915c`.
- 범위: 읽기만 — 설치·로컬 빌드·SQL·배포·파일 수정(이 문서 외) 0. 레지스트리 조회(`npm audit --omit=dev --json`, `npm view next`)만.
- 계기: C1 로컬 빌드 첫 실행이 `SecurityFatalError`(알려진 취약점 업그레이드 권고)로 멈추고 재실행 시 통과(`d9575a609` 무렵, Master 보고 `msg_d7a8422ffb3a`).

## 1. 현재 버전(파일 읽기)

| 프로그램 | package.json `next` | lockfile `next`·`@next/env` | `eslint-config-next`(선언/잠금) | react·react-dom | 운영 릴리스 기준 lockfile |
|---|---|---|---|---|---|
| 고객관리 `realty-client-desk` | `16.4.2`(고정) | 16.4.2 · 16.4.2 | 16.4.2 / 16.4.2 | 19.2.4 | v1.11 버전 커밋 `86955ace6`: **16.4.2**(lockfile 마지막 변경 `4be6ba487` 11-03, 이후 변경 없음) |
| 매물 알림 `realty-listing-alert` | `^16.3.5`(범위) | 16.4.3 · 16.4.3 | **16.2.10** / 16.2.10 | 19.2.4 | v1.46 버전 커밋 `3e9ed6c57`: **16.4.3**(lockfile 마지막 변경 `96eb30963` 10-24) |
| (참고) 실거래 `real_estate_sales` | 16.4.2 | 16.4.2 | — | — | v1.62 운영(오늘 배포)도 16.4.2 |
| (참고) 상가 `commercial-land-trade-alert` | — | 16.4.2 | — | — | — |

- Vercel 빌드는 lockfile로 설치하므로 운영 중인 배포도 위 버전으로 본다. 두 프로그램 모두 C1 커밋(`b6bb2c4ae`·`7cc7d5a3c`·`11d6b69ff`)에서 lockfile은 바뀌지 않았다(작업 트리 diff 0).

## 2. 해당 공지(npm audit, 운영 의존성만)

두 프로그램 결과가 같다 — `next` **moderate 1건(공지 7개), 범위 16.0.0~16.4.4, 고친 판 16.4.6**(메이저 변경 아님). `npm view next@16`: 16.4.2·16.4.3·16.4.4·16.4.5·**16.4.6**.

| 공지 | 내용 | 해당 조건 | 두 앱 코드 검색 |
|---|---|---|---|
| GHSA-mfr8-8qww-v76h | `use cache`를 `unstable_cache()`로 부를 때 root params 정보 노출 | `use cache`·`unstable_cache` | 0 / 0 |
| GHSA-vc7v-qv4w-wrv8 | 중첩 `use cache` 캐시 누출 | `use cache` | 0 / 0 |
| GHSA-7qx7-33qx-rqx2 | 이미지 최적화 SVG 거부 우회 | `next/image`·`images` 설정 | 0 / 0 |
| GHSA-f3mh-rxg3-f5g2 | Edge runtime 경로에서 HttpOnly 쿠키가 내부 응답 헤더로 노출 | `runtime = "edge"` | 0 / 0(`proxy.ts`는 Next 16 Node 프록시) |
| GHSA-pc58-hwjq-p385 | 가져온 응답을 그대로 넘기는 **자체 호스팅** 앱의 응답 주입·노출 | 자체 호스팅 | 해당 낮음(Vercel 호스팅) |
| GHSA-rhh4-g77r-r9qj | 이진 인자를 쓰는 `use cache`의 사용자 간 캐시 노출 | `use cache` | 0 / 0 |
| GHSA-vvgp-ww4w-46vf | Cache Components 공유 fallback shell 오염 | `cacheComponents` | 0 / 0 |

- 검색 범위: 고객관리 `src/`·`next.config.*`, 매물 알림 `app/`·`lib/`·`components/`·`next.config.*` — `"use cache"`·`'use cache'`·`unstable_cache`·`cacheComponents`·`from "next/image"`·`runtime = "edge"/'edge'`·`images:`·`dangerouslyAllowSVG` 모두 0건.
- 판단(추정, 실증 아님): 7개 공지가 문제 삼는 기능을 두 앱이 쓰지 않아 **현재 악용 경로는 확인되지 않는다**. 다만 빌드가 경고로 첫 실행을 멈추고 앞으로 같은 기능을 쓸 수 있어 패치 업그레이드를 권한다. 실제 공격 시험은 하지 않았다.

## 3. 공통 수정안(아직 하지 않음 — 승인·배정 뒤)

| 프로그램 | 바꿀 것 | 비고 |
|---|---|---|
| 고객관리 | `next` 16.4.2 → **16.4.6**, `eslint-config-next` 16.4.2 → 16.4.6, lockfile 재생성(`npm install next@16.4.6 eslint-config-next@16.4.6 --save-exact`) | 고정 표기 유지 |
| 매물 알림 | `next` `^16.3.5` → **`16.4.6`**(고정으로 바꿀지 결정), `eslint-config-next` 16.2.10 → 16.4.6(지금 Next와 계열 불일치 해소), lockfile 재생성 | 범위 표기라 다음 설치 때 버전이 바뀌는 문제 — 고정 권장 |
| (같은 공지) 실거래·상가 | 16.4.2 → 16.4.6 | 부동산 담당 범위지만 이번 배정 밖 — 각 프로그램 다음 배포 묶음 후보로만 기록 |

- 바뀌는 파일: 각 프로그램 `package.json`·`package-lock.json` 2개뿐(코드 변경 없음 예상). react 19.2.4는 그대로.
- 배포는 모아서: 고객관리 v1.12(C1·C-1a)·매물 알림 v1.47 묶음에 함께 실으면 빌드 추가 0(작은 수정 모아 배포 규칙).

## 4. 회귀 범위(업그레이드 뒤 확인할 것)

| 단계 | 고객관리 | 매물 알림 |
|---|---|---|
| 로컬(무료) | `npx tsc --noEmit`, `npm test`(지금 55), `npm run build` 2회(첫 실행 경고가 사라졌는지) | `npx tsc --noEmit`, `npm test`(지금 131), `npm run build` 2회 |
| 로그인·권한 | `src/proxy.ts` 로그인 리다이렉트, `/login`·`/listings`·`/clients`·`/dashboard` | `proxy.ts`, `/login`·`/dashboard`·`/results`·`/targets` |
| 서버 액션 | 매물 등록·후보 등록(의뢰 확인)·상태 변경 결과 표시·발송 화면 진입(실발송 0) | 설정 저장·지역 저장(제출 없이 화면만) |
| 창 사이 메시지(C1) | `/listings?from=listing-alert` 받기·ACK | 결과 표 「🏠 후보로」 보내기 |
| 확장 | — | 확장 web-bridge가 결과·통계를 돌려주는지(같은 계정), manifest·ZIP·DB 버전 맞춤(원칙 10) |
| 공통 | 저장공간 위젯, 응답 헤더에 COOP 없음(H1) | 같음 |

## 5. 한계
- 공지 본문(링크) 세부는 npm audit 요약만 읽었고 각 GitHub 공지 전문은 열지 않았다.
- 코드 검색은 문자열 기준이라 간접 사용(라이브러리 내부 사용)은 확인하지 못했다.
- 16.4.6 변경 내역(릴리스 노트)은 읽지 않았다 — 업그레이드 배정 때 확인.
