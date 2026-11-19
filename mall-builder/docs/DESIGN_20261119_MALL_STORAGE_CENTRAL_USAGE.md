# B2B 쇼핑몰 사진 → 메인 중앙 용량 집계 연결 설계 (B2B-20261119-MALL-STORAGE)

- 작성: Claude(B2BBackend) `CC-B2B-BACK-01`, 2026-11-19, Master 지시 `msg_f995f8db2740`
- 범위: **저장소 코드·문서만 읽음.** 제품 코드·DB 조회/쓰기·운영 조회·빌드·배포·푸시 0. 실제 파일 수·영향 회원 수는 조회하지 않았으므로 미확인.
- 전제(유지): 등록 상품 사진 **최소 1년 보관**, 11-14 「30일 실제 삭제」 요청은 **취소** 상태 유지([요청 문서](REQUEST_20261114_MAIN_STORAGE_MALL_PHOTOS.md)). S70·M3 점유·우선순위는 그대로.
- 검수: Codex(Master) 설계 검수 → 구현은 메인 저장공간 담당(별도 배정·승인).

## 1. 지금 상태 (사실·근거)

### 1-1. 메인 집계는 「파일 이름에 회원 번호가 들어 있으면 그 회원 것」으로 셈
- `supabase/migrations/0066_member_storage_by_kind.sql` 16~60줄 `member_storage_measure` — 한 명: `o.name like '%' || uid || '%'`, 전체: 이름 속 UUID를 `profiles.id`와 맞춰 귀속.
- 위젯 `public/storage-widget.js` → `/api/storage/me` → `lib/storage/memberStorage.ts:104` `getStorageSummary`(정책 `member_storage_policy` + 캐시 `member_storage_usage`).
- 중앙 정리 `member_storage_expired_files`(최신 `0073`): 보관 연장 회원(`retention_exempt` 자동)의 파일 중 **이름에 회원 번호가 들어간 것**을 기간 지나면 지움. 제외 버킷은 `workspace-files` 하나뿐. `storage_posting_tracked_buckets`에 없는 버킷은 「포스팅 보관 기간」(라이트 90일·스탠다드 180일·프로 1년)이 적용됨.

### 1-2. 쇼핑몰 운영 DB = 메인 공유 DB
- `docs/PLAN_20261112_T0_PROD_MIGRATION.md:4·49` — 운영 DB는 AIMaster `esgxyikcnnvmlhygjkth`. 그러므로 위 집계·정리가 **운영 쇼핑몰 버킷에도 그대로 돈다.**

### 1-3. 쇼핑몰 버킷별 경로와 지금 집계 결과

| 버킷 | 경로(코드 근거) | 이름에 회원 번호? | 지금 집계 |
|---|---|---|---|
| `mall-builder-public` 상품 | `<몰>/products/<무작위>.<확장자>` (`admin/products/image-uploader.tsx:36`) | 없음 | **아무에게도 안 잡힘** |
| 〃 공급사 상품 | `<몰>/supplier/<공급사 id>/<무작위>` (`image-uploader.tsx:11`, 규칙 `0054d`) | 없음 | 안 잡힘 |
| 〃 첫 화면 배너·로고 | `<몰>/banners/…`, `<몰>/logo/…` (`home/block-editor.tsx:34`, `settings/logo-form.tsx:29`) | 없음 | 안 잡힘 |
| `mall-builder-private` 사업자등록증 | `<몰>/<손님 uid>/business-cert-<시각>` (`src/lib/business.ts:43`) | **손님 uid** | **손님 용량으로 잡힘(잘못된 귀속)** |
| 〃 리셀러 신청 통장·서류 | `<몰>/<신청자 uid>/reseller-apply-…` (`src/lib/reseller-apply.ts:55`) | **신청자 uid** | 신청자 용량으로 잡힘 |
| `mall-builder-proposals` 사진 제안 | `<몰>/<제안 id>.jpg` (`0106_photo_proposals.sql:164`) | 없음 | 안 잡힘 |
| `mall-builder-applied` 적용 사진 | `<몰>/<apply id>.<kid>.<sha256>.<서명>.jpg` (`src/lib/applySignature.ts:54`) | 없음 | 안 잡힘 |

### 1-4. 🚨 먼저 막아야 할 위험 (설계와 별개로 우선 처리 권장)
- `mall-builder-private`의 사업자등록증·리셀러 통장 사본은 손님 uid가 경로에 있어 **그 손님이 저장 구독(보관 연장) 회원이면 중앙 정리 대상**이 된다. 이 버킷은 포스팅 추적 버킷이 아니므로 포스팅 보관 기간(라이트 90일 등)이 지나면 **몰이 보관해야 할 거래처 서류가 지워질 수 있다.**
- 조치 제안: `member_storage_expired_files`의 `cand` 조건에 `0073`과 같은 방식으로 **한 줄** `and o.bucket_id not like 'mall-builder-%'` 추가(쇼핑몰은 자체 보관 규칙 — 상품 사진 최소 1년, 서류는 거래 보관 의무). 메인 함수 수정이므로 메인 저장공간 담당 + 운영 DB 쓰기 승인 필요.
- 실제 해당 파일·회원이 있는지는 DB 조회 금지 범위라 **확인하지 않았다.** 승인되면 읽기 조회 1회로 확인 권장.

### 1-5. 정책과 어긋나는 옛 함수
- `mall-builder/supabase/migrations/0066_*.sql:11` `mall_builder_expired_photos` — 기본 30일 「안 쓰는 몰 사진 후보」. 11-14 삭제 요청 취소·11-19 최소 1년 정책과 맞지 않음. **어디에도 삭제 작업으로 연결하지 않는다.** 후속 정리 후보(제거 또는 하한 365일) — 별도 승인.

## 2. 설계 제안 (최소 변경)

### 2-1. 귀속 규칙: 몰 파일의 주인 = 몰 대표 `mall_builder_stores.owner_id`
- 경로 첫 폴더가 몰 id이므로 `(storage.foldername(name))[1]` → `mall_builder_stores.id` → `owner_id`로 귀속(이미 `mall_builder_expired_photos`가 같은 조인을 씀).
- 직원·공급사가 올린 사진도 **그 몰 대표 용량**으로 센다(몰 운영 자료). — 결정 항목 첫째.
- 손님·리셀러 신청 서류(`mall-builder-private`)도 **몰 대표 귀속**을 추천(몰이 받아 보관하는 서류, 손님 용량을 몰 때문에 줄이지 않음). — 결정 항목 둘째.

### 2-2. 측정 함수 바꿀 곳 (메인 `member_storage_measure` 한 함수)
1. 기존 「이름 속 UUID」 경로에서 `bucket_id like 'mall-builder-%'`를 **뺀다**(손님 오귀속·이중 집계 방지).
2. 쇼핑몰 4버킷은 별도 묶음으로 `foldername[1]`이 UUID 형식일 때만(`~ '^[0-9a-f]{8}-…$'` 검사 뒤 캐스트 — 이상한 이름에서 오류 나지 않게) 몰 → 대표로 귀속해 같은 `per_user` 합계에 더한다.
3. 한 명 측정(`uid` 지정) 경로도 같은 규칙: 그 회원이 대표인 몰들의 `<몰 id>/` 접두 객체 합 + 기존 규칙(쇼핑몰 버킷 제외).
4. `by_bucket`에 버킷 이름 그대로 남으므로 위젯 내역에 쇼핑몰이 따로 보인다. `by_kind`는 mimetype 기준 그대로.
- 쇼핑몰 쪽 코드·경로·저장 규칙은 **바꾸지 않는다**(회원 화면·업로드 동작 변화 0).

### 2-3. 파일 중복·공유 이미지
- 분양몰 거울 상품은 `images` jsonb **주소만 복사**(`0062_resale_products.sql:72·124`) → 파일 1개, 원래 몰 대표에게만 1번 잡힘(분양자 0). 경로 기준이라 이중 집계 없음.
- 여러 상품·블록이 같은 파일을 참조해도 저장 객체는 1개 → 1번.
- 같은 사진을 두 번 올리면 무작위 이름의 객체 2개 → 2번(실제 저장량이므로 정상, 중복 제거는 하지 않음).
- `mall-builder-applied`는 sha256·서명 경로로 같은 적용 재시도가 같은 객체(변경 불가 버킷) → 중복 0.
- `mall-builder-proposals`(적용 전 임시 제안)는 실제 저장량이므로 포함을 추천. — 결정 항목 넷째. 정리는 M3 후속 「실패 파일 주 1회 점검 목록」과 연결.

### 2-4. 몰 이전(대표 변경)·여러 몰
- 경로가 몰 id 기준이라 대표가 바뀌어도 파일 이동 0, **다음 측정 때 새 대표로 자동 이동**.
- `member_storage_usage`는 캐시라서 이전 직후 옛·새 대표 둘 다 `member_storage_measure(uid)` 재측정이 필요(이전 처리 끝에 호출하거나, 위젯의 `remeasureIfStale` 주기에 맡김). 현재 대표 변경 화면은 없으므로 생기면 그때 넣는다.
- 대표당 몰 여러 개(`0051_multi_store.sql`, 최대 5)는 대표 한 명 합계로 더한다.

### 2-5. 위젯·추가 용량 안내 연결 지점
- 쇼핑몰 `src/app/layout.tsx:17`에 위젯이 이미 있음(`PLATFORM_AIMASTER`일 때) → 측정만 바뀌면 💾 사용량·80% 안내가 자동으로 몰 사진까지 반영.
- 메인 `lib/storage/memberStorage.ts:30` `bucketLabel`에 쇼핑몰 버킷 4개 한글 이름(「쇼핑몰 사진」「쇼핑몰 서류」「사진 제안」「적용 사진」) 추가 — 한 곳.
- 업로드 전 용량 확인(`member_storage_check`)은 **넣지 않는 것**을 추천: 몰 운영 중 상품 등록이 막히면 장사가 멈춤 → 초과해도 업로드는 되고 위젯·관리 화면에서 구독 안내만. — 결정 항목 셋째.

## 3. 합성 검증 목록 (격리 DB·합성 데이터, 운영 조회 0)
| 번호 | 준비 | 기대 |
|---|---|---|
| 1 | 대표 A의 몰에 public 사진 3장 | A `bytes` = 3장 합, `by_bucket`에 `mall-builder-public` |
| 2 | 직원 B가 같은 몰에 사진 1장 | A에 더해짐, B 0 |
| 3 | 공급사 S가 `<몰>/supplier/<S>/` 사진 | A에 더해짐(결정 따라), S 0 |
| 4 | 손님 C 사업자등록증(private) | C 0, A에 더해짐(결정 따라) |
| 5 | C가 보관 연장 회원 + 400일 전 서류 합성 | `member_storage_expired_files` 결과에 `mall-builder-%` **0건** |
| 6 | 분양몰 D가 A 상품을 거울 복사 | D 0, A 변화 없음 |
| 7 | 대표 A가 몰 2개 | 두 몰 합 |
| 8 | 몰 대표 A→E 변경 후 두 명 재측정 | A 0, E 합계 |
| 9 | 첫 폴더가 UUID 아닌 객체·없는 몰 id | 측정 오류 없이 무시 |
| 10 | 쇼핑몰 아닌 버킷의 기존 회원 파일 | 이전과 같은 값(회귀 0) |
| 11 | 전체 측정(`uid` null) 시간 | 기존 대비 큰 증가 없음(`0065` 빠른 측정 유지) |
| 12 | 위젯 `/api/storage/me` | 쇼핑몰 버킷이 한글 이름으로 표시 |

## 4. 역할·순서 제안
1. **우선(위험 차단)**: 1-4의 정리 제외 한 줄 — 메인 저장공간 담당, 운영 DB 쓰기 승인.
2. 2-2 측정 함수 변경 + 2-5 버킷 이름 — 메인 저장공간 담당, 합성 검증 3절 통과 뒤 승인 적용.
3. 쇼핑몰(B2BBackend) 쪽 변경 **없음**. 결정에 따라 몰 관리 화면에 사용량 한 줄 안내를 붙일지는 다음 묶음.
4. 1-5 옛 30일 후보 함수 정리 — 별도 승인.

## 5. 주인님·Master 결정 항목

> **확정(2026-11-19 주인님 채팅 「추천대로 진행해」)**: 넷 모두 추천안 — 공급사 사진 = 몰 대표 귀속, 손님·리셀러 신청 서류 = 몰 대표 귀속, 용량 초과 = 업로드 허용·안내만, 사진 제안 버킷 = 집계 포함. 구현은 4절 순서(정리 제외 한 줄 먼저)로 메인 저장공간 담당이 하고, 운영 DB 적용은 Master 승인 취합 뒤.
1. 공급사가 올린 사진 → 몰 대표 귀속(추천) / 공급사 본인 귀속
2. 손님·리셀러 신청 서류 → 몰 대표 귀속(추천) / 집계 제외 / 손님 귀속(지금)
3. 용량 초과 시 → 업로드는 허용하고 안내만(추천) / 업로드 막기
4. 사진 제안 임시 버킷 → 집계 포함(추천) / 제외

## 6. 하지 않은 것
- DB·운영 조회·쓰기 0, 제품 코드 변경 0, 빌드·배포·푸시 0. 실제 영향 파일·회원 수 미확인(승인 시 읽기 조회 1회로 확인 권장).

## 7. 0077 운영 적용 인수인계 (Master `msg_c2a22bc17a99`, 로컬 검수 수락 기준 `592b7484a`)

### 7-1. 무엇이 들어 있나
- `supabase/migrations/0077_storage_measure_mall_owner.sql` — 규칙 함수 `member_storage_object_owner`(기준·시험용) + `member_storage_measure` 집합 방식 교체(쇼핑몰 4버킷 → 몰 대표). 사용량 쓰기는 「더 새 측정이 있으면 덮어쓰지 않음」, 전체 측정 끝 0 처리는 「이번 실행 트랜잭션 시작 전에 잰 행만」.
- 시험 `supabase/tests/storage_measure_mall_owner.check.mjs`(127.0.0.1 전용 합성 fixture). 위젯 이름 `lib/storage/memberStorage.ts`(메인 사이트 다음 배포 때 함께).
- 0076(정리 후보에서 `mall-builder-private` 제외)은 별개 파일·별개 승인.

### 7-2. 검수가 보장하는 호출 방식 (이 범위 밖은 미검증)
- 지금 코드의 호출은 세 가지뿐이고, 각각 **자기 트랜잭션 하나에서 한 번** 부른다.
  - 매일 예약 `member-storage-daily`(0063): 전체 측정 1번
  - 위젯 `lib/storage/memberStorage.ts` `remeasureIfStale`: 본인 한 명 측정 RPC 1번
  - 정리 `app/api/cron/storage-retention/route.ts`: 지운 회원마다 한 명 측정 RPC 각각
- **지원하지 않는 절차**: 한 트랜잭션 안에서 전체 측정을 두 번 부르거나, 몰 대표 변경(양도)과 측정을 같은 트랜잭션에 넣는 것. 같은 트랜잭션의 `now()`가 같아서 「이번 실행 전에 잰 행」 판정이 의도와 달라진다.
- **몰 양도 절차(지금은 양도 화면·코드 없음, SQL로 할 때)**: ① `mall_builder_stores.owner_id` 변경을 **먼저 커밋** → ② 별도 호출로 옛 대표·새 대표 각각 `select public.member_storage_measure('<uid>');` 또는 별도 RPC로 전체 측정 1번. 나중에 양도 화면을 만들면 ②를 그 화면의 커밋 뒤 단계로 넣는다.

### 7-3. 적용 전 확인
- 적용 직전 실행 중인 측정이 없는지 확인한다: `pg_stat_activity`에서 `member_storage_measure`를 부르는 활성 쿼리 0, 매일 예약 시각(UTC 19:10) 근처 피함.
- **0066/0077 혼용 경합은 검증하지 않았다**: 적용 순간 0066 정의로 돌던 측정과 0077 측정이 겹치는 경우. 그래서 위 확인 뒤 적용하고, 적용 뒤 첫 측정은 겹치지 않게 한 번만 돌린다.
- `public.mall_builder_stores` 표가 없으면 0077은 실패하고 아무것도 바꾸지 않는다(fail-closed) — 운영 공유 DB에는 있음.
- 0077은 적용 때 전체 측정을 자동으로 돌리지 않는다. 값 갱신은 매일 예약 또는 Master가 따로 전체 측정 1번.

### 7-4. 되돌리기 (순서 고정, 세 단계 분리)
1. **정의·권한만 복원**: `0066_member_storage_by_kind.sql`에서 `member_storage_measure`의 `create or replace … end $$;`와 그 아래 `revoke`·`grant` 두 줄만 실행. 0066 파일 전체를 실행하지 않는다(끝의 `select public.member_storage_measure();`가 운영 전체 측정 = 쓰기).
2. **규칙 함수 삭제**: `drop function public.member_storage_object_owner(text, text);`
3. **재측정은 별도로**, 필요할 때만 전체 측정 1번.
- 주의: 0066으로 되돌리면 「1분」 조건도 돌아와서, 1분 안 재측정에선 몰 대표의 0077 값이 남을 수 있다(합성 시험에서 재현). 한 명 측정이나 1분 뒤 전체 측정으로 정리된다.
- 참고: 0077 파일 머리 주석의 되돌리기 설명은 규칙 함수 삭제를 먼저 적었지만, 새 측정 본체는 규칙 함수를 부르지 않으므로 어느 순서든 동작은 같다. 운영에서는 이 절의 순서를 따른다.

### 7-5. 남은 일
- 운영 적용 승인·실행: Master(0076과 별도). 맥미니 독립 검수 결과 반영.
- 운영 영향 확인(승인 시 읽기 1회): 이름에 회원 UUID가 2개 이상인 비몰 파일 수(한 명 측정 동작 변화 대상), 쇼핑몰 4버킷 파일 수·몰 대표별 합.
