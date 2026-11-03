# AI 쇼핑몰 빌더 (`labs/mall-builder`) — Lab

회원마다 자기 쇼핑몰을 개설해 따로 운영하는 B2B 쇼핑몰 빌더(프로셀형). AIMaster_dev(Lab) 전용 — 운영 DB·운영 사이트와 연결하지 않는다.

- 기준 문서(먼저 읽기): [쇼핑몰 카테고리 총괄](../../docs/mall/README.md) · [공통 설계](../../docs/mall/ARCHITECTURE.md) · [1차 플랜 — 기능 F01~F19](../../docs/mall/PLAN_20261103_MALL_BUILDER_V1.md) · [버전 계열·로드맵](../../docs/mall/ROADMAP_AND_VARIANTS.md)
- 담당 역할: `mall-builder` ([역할 파일](../../docs/roles/mall-builder.md))
- DB: AIMaster_dev ref `rjjtjakljjxsgjelqgek`, 표 이름표 `mall_builder_`
- 배포: Vercel `dev-mall-builder` (아직 배포 안 함 — 점검 묶음 🚩에서만, 플랜 §3)
- 작업 방식: **기능 하나씩 구현 → 멈추고 보고 → 주인님 점검 후 다음 기능**

## 실행 방법 (내 PC)

```bash
cd labs/mall-builder
cp .env.example .env.local   # AIMaster_dev 주소와 공개 키(publishable)만 넣는다
npm install
npx next dev -p 3210         # http://localhost:3210  (같은 네트워크 기기: http://<PC 내부 IP>:3210)
node --test tests/           # 자동 시험
npx tsc --noEmit             # 타입 검사
```

DB 변경은 `supabase/migrations/*.sql`에 적고 AIMaster_dev에만 적용한다.

## 기능 진행 현황

| 번호 | 기능 | 상태 | 날짜 |
|---|---|---|---|
| F01 | Lab 뼈대 + 몰 개설·내 몰 목록 + 몰 분리 보안 규칙 | ✅ 구현·검수(주인님 점검 대기) | 2026-11-03 |
| F02 | 쇼핑몰 정보 설정 + 손님 화면 머리글·바닥글 | 대기 | — |
| F03~F19 | [플랜 §3-1](../../docs/mall/PLAN_20261103_MALL_BUILDER_V1.md) 순서대로 | 대기 | — |

## F01에서 만든 것

| 구분 | 내용 | 파일 |
|---|---|---|
| DB | `mall_builder_stores`(몰), `mall_builder_store_staff`(운영자), 운영자 판정 `mall_builder_is_store_staff()`, 몰 개설 `mall_builder_create_store()`(회원 1명당 1개·주소 형식·예약어·중복 검사), 주소·주인·상태 변경 막는 트리거(플랫폼 관리자 작업만 허용), 보안 규칙(영업 중 몰은 누구나 보기, 정지 몰은 운영자만, 수정은 운영자만, 생성·운영자 추가는 함수로만) | `supabase/migrations/0001_init.sql` |
| 화면 | 로그인·가입(로그인 뒤 원래 주소로 돌아감, 외부 주소는 막음), 내 쇼핑몰 목록·만들기·로그아웃, 손님 첫 화면 틀(`/s/<주소>`), 운영자 관리 화면(`/s/<주소>/admin`, 남의 몰은 「관리 권한이 없습니다」) | `src/app/` |
| 공용 코드 | 몰 주소 규칙(DB와 같은 예약어), 몰 조회·운영자 확인 | `src/lib/slug.ts`, `src/lib/store.ts` |
| 시험 | 몰 주소 규칙 5개 | `tests/slug.test.mjs` |

### F01 검수 결과 (2026-11-03)
- DB 몰 분리 시험 17개 통과(가짜 계정 3개, 끝에 전부 되돌림): 1인 1몰, 남의 몰 수정 0줄, 남의 몰 운영자 목록 0줄, 직접 생성·운영자 끼어들기 거부, 중복·예약어·잘못된 형식 거부, 회원은 자기 몰 상태 변경 불가, 관리자 정지 가능, 정지 몰은 다른 회원 0줄·운영자 1줄, 비로그인은 영업 몰 보기만·개설 거부
- 자동 시험 5개 통과, `tsc` 통과
- 크롬 실제 화면: 주인님 계정으로 가입 → 「AIMaster B2B」(`aimaster-b2b`) 개설 → 관리 화면 이동 확인, DB에 몰 1개·운영자 1줄
- 비로그인 확인: 손님 화면 200(운영자 링크 숨김), 관리 화면 → 로그인으로 이동(307), 없는 몰 404
- 보안 점검 경고 3건: 몰 개설·운영자 판정 함수 호출 가능(의도한 동작, 함수 안에서 검사하고 참·거짓만 돌려줌), 유출 비밀번호 차단 꺼짐(Lab 인증 전체 설정 — 이 프로그램이 바꾸지 않음)
- 고친 점: 상태 변경 막는 조건이 관리자 작업까지 막아 「DB 역할이 회원·비로그인일 때만 막기」로 수정

## 남은 일
- F01 주인님 점검 → F02(쇼핑몰 정보 설정·머리글·바닥글)
- 두 번째 계정으로 남의 몰 관리 화면이 막히는지 화면 확인(DB 시험으로는 확인 완료)
