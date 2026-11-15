# M5-1 몰 도메인 연결 · M5-2 분양몰 카드 결제 시험 — 개발 플랜 (2026-11-15)

- 대상: `mall-builder`(운영 `mall-builder.buylife.xyz`, 운영 DB `esgxyikcnnvmlhygjkth`, Lab DB `rjjtjakljjxsgjelqgek`)
- 담당: [역할: mall-builder] 세션 `claude-win-20261025-workspace`
- 마스터 플랜: `PLAN_20261114_B2B_MASTER.md` §4 M5 · 예전 계획: `PLAN_20261110_SUBDOMAIN.md`(하위 도메인 코드는 이미 있음, 운영 미사용)

## 1. 주인님 결정 (2026-11-15 채팅)
| 항목 | 결정 |
|---|---|
| 몰 주소 모양 | **`<몰>.buylife.xyz`** (`<몰>.mall.buylife.xyz` 아님) |
| Vercel 도메인 붙이기 | **몰을 열 때 백엔드 세션이 명령으로**(`vercel domains add <몰>.buylife.xyz mall-builder --scope buylife`) — 운영 앱에 Vercel 열쇠를 넣지 않음 |
| M5-2 테스트 키 | (답 대기) 토스 공개 테스트 키 / 주인님 계정 테스트 키 |

## 2. 지금 상태 (코드·운영 확인)
- `src/lib/host.ts`·`src/proxy.ts`: `<몰>.<MALL_ROOT_DOMAIN>` → `/s/<몰>/…` 바꿔 읽기 이미 있음. 운영에는 `MALL_ROOT_DOMAIN` 없음 → 동작 안 함.
- 로그인 쿠키: `cookieDomainForHost`가 `*.buylife.xyz`면 `.buylife.xyz`로 공유 → 하위 도메인에서도 로그인 이어짐.
- DNS: Cloudflare 와일드카드 `*` A 레코드(→ Vercel)가 이미 있음(루트 지침 핵심 원칙 11) → **DNS 작업 없음**.
- 운영 몰은 `aimaster-b2b` 하나, AIMaster 프로그램 주소 이름(114개)과 겹치지 않음(2026-11-15 운영 DB 읽기).
- **운영 관문**: 운영은 모든 요청이 AIMaster 로그인·프로그램 이용 권한을 먼저 지남(`platform-gate.ts`) → 하위 도메인 몰도 지금은 AIMaster 회원만. 공개 몰 전환은 이번 범위 밖(별도 결정).

## 3. 위험과 막는 법
| 위험 | 막는 법 |
|---|---|
| `MALL_ROOT_DOMAIN=buylife.xyz`를 넣으면 `mall-builder.buylife.xyz`가 「mall-builder 몰」로 읽혀 관리 사이트 전체가 깨짐 | `host.ts`가 플랫폼 주소(`mall-builder`)·예약어·AIMaster 프로그램 이름은 몰로 읽지 않음 + 시험 |
| 새 몰 이름이 AIMaster 프로그램 주소와 겹침(예: `insta`) | 몰 이름 예약어에 프로그램 주소 이름을 넣음(코드 `slug.ts` + DB 몰 만들기 검사 0092). 새 프로그램이 나중에 기존 몰 이름과 겹치면 Vercel이 같은 도메인을 두 프로젝트에 못 붙여 막힘 → 그때 알림 |
| 프로그램 목록이 늘면 예약어가 낡음 | 예약어 목록을 운영 `programs`에서 다시 만드는 스크립트(`scripts/sync-reserved-slugs.mjs`) — 새 몰을 열기 전에 실행 |

## 4. 구현 순서
### M5-1a 하위 도메인 켜기
1. `host.ts`: 플랫폼 주소 이름(`mall-builder`, 환경값 `MALL_PLATFORM_LABELS`로 더할 수 있음)은 몰로 읽지 않음. 시험 추가.
2. `slug.ts` 예약어 + AIMaster 프로그램 주소 이름 목록(`reserved-program-slugs.ts`, 스크립트로 생성) / DB **0092**: 몰 만들기·분양 신청의 이름 검사에 같은 목록.
3. S50: 휴대폰 주소창·앱 아이콘 색 = 게시 테마 `primary`(없으면 이름 해시) — `pwa.ts` 헬퍼, `(shop)/layout.tsx`(공용 파일, 한 목적·즉시 커밋).
4. 시험·`tsc`·빌드(무료) → 커밋.
5. 운영 DB 0092 → 운영 환경값 `MALL_ROOT_DOMAIN=buylife.xyz`(비밀값 아님) → 배포(빌드 1회) → `vercel domains add aimaster-b2b.buylife.xyz mall-builder` → `https://aimaster-b2b.buylife.xyz` 확인(관리 사이트 `mall-builder.buylife.xyz`가 그대로인지 먼저).
6. 운영사 화면에 하위 도메인 주소 표시(`mallSubdomainUrl`, 이미 있음) 확인.

### M5-1b 자기 도메인(예: `myshop.co.kr`)
1. DB **0093**: `mall_builder_stores.custom_domain`(고유, 소문자) + 운영사 저장 함수 + 주소 → 몰 이름 찾기 함수(공개 읽기, 몰 이름만 돌려줌).
2. `proxy.ts`: 하위 도메인이 아니고 플랫폼 주소도 아니면 자기 도메인으로 찾아 `/s/<몰>`(짧게 캐시).
3. 운영사 「쇼핑몰 정보」에 도메인 칸 + DNS 안내(CNAME `cname.vercel-dns.com` / 루트는 A `76.76.21.21`) + 「연결 요청」 → 백엔드 세션이 `vercel domains add` 실행(결정 1).
4. 로그인: 자기 도메인은 쿠키를 그 주소 전용으로 씀(메인과 공유 안 됨) — 비밀번호 로그인은 그대로 됨. 안내 문구에 밝힘.

### M5-2 분양몰 카드 결제 시험
- 내 PC 개발 서버(`localhost:3210`, Lab DB)에서 토스 **테스트 모드**로: 분양몰에서 주문 → 결제창 → 승인 → 원본 몰 「전달 주문」 → 부분 취소·취소 → 분양 마진 장부.
- 결정 5(분양몰 결제는 본사 계좌·본사 토스)대로 동작하는지 확인. 키 입력은 주인님(관리 화면), 운영 사이트 결제 시험은 하지 않음.

## 5. 비용
| 항목 | 비용 |
|---|---|
| M5-1a 운영 배포 | Vercel 빌드 1회(M5-1b와 묶으면 1회) |
| 도메인·DNS | 없음(기존 `buylife.xyz` 와일드카드) |
| M5-2 | 없음(토스 테스트 모드, 내 PC) |

## 6. 진행 기록
- 2026-11-15: 플랜 작성, 결정 1·2 받음. 다음: M5-1a 1~4(코드), 그 뒤 운영 적용은 M5-1b와 묶어 배포 1회.
- 2026-11-15: **M5-1a 코드 끝(미배포)** — `slug.ts` 예약어에 `mall-builder`·`dev-mall-builder`(하위 도메인 판정이 예약어를 거르므로 관리 사이트 주소가 몰로 안 읽힘, 시험 추가), DB **0092** 예약어 함수가 운영 `programs` 표(slug·`<이름>.buylife.xyz`)를 직접 봄(표 없으면 건너뜀 — Lab). 코드에 프로그램 목록을 적지 않기로 바꿈(§3 「스크립트」 대신 DB가 항상 최신). 로컬 시나리오 R1~R4 통과(`scripts/scenario-0092-*`), Lab 0092 적용. 커밋 `9f4b33888`.
- 2026-11-15: **S50 끝(미배포)** — 주소창·앱 설명 파일·앱 아이콘 색 = 게시 테마 포인트색(어둡게면 주소창 `#0c0a09`), 없으면 몰 이름 색. 아이콘 캐시 버전에 대표색 포함. 커밋 `0455c3d7d`. 시험 354개 통과.
- 다음: M5-1b(0093 자기 도메인) → 함께 배포 때 운영 0092·0093 → `MALL_ROOT_DOMAIN=buylife.xyz` → 배포 → `vercel domains add aimaster-b2b.buylife.xyz`.
