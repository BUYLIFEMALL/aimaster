# 설계 — 메이커 M2 「사진 제안 저장」 (2026-11-19, 읽기 설계만)

- 담당: [역할: mall-builder] Claude(B2BBackend) `CC-B2B-BACK-01` · 배정 Master msg_8bc03c47698d
- 기준: [메이커 검토](IMPROVEMENT_HANDOFF_20261113_MAKER.md) §2~§5, M1 수락 `d81238310`(보내기만, 결과 무저장 고정 응답), 공용 약속 `product-photo-handoff`(결과 PNG/JPG ≤10MB, `resultId`·`settingsVersion`)
- 이 문서는 설계다. 기존 사진 변경·운영/Lab SQL·쓰기·코드·빌드·배포 0. 착수는 Master 승인 뒤.

## 1. 읽은 현재 상태(근거)
| 항목 | 지금 | 근거 |
|---|---|---|
| 상품 사진 | `images` 최대 5장 `{url, path}`, 첫 장 = 대표, 공개 버킷 `mall-builder-public` | 0003 |
| 공개 버킷 올리기 | 직원 = `<몰>/…`(`mall_builder_is_store_staff`), 공급사 = `<몰>/supplier/<공급사>/…`(활성 본인 공급사) | 0003 `mall_builder_public_insert`, 0054 `mall_builder_public_supplier_insert` |
| 비공개 버킷 | `mall-builder-private`(5MB, pdf·jpg·png·webp). 올리기 = 손님 본인 폴더 `<몰>/<본인 uid>/…`만, 읽기 = 본인 또는 그 몰 직원 | 0010 |
| 공급사 상품 사진 변경 | 공급사가 사진을 바꾸면 「승인 대기」(바로 판매 공급사 예외), 운영자 수정은 승인 유지 | 0057 `mall_builder_supplier_product_save` |
| 분양몰 거울 | `source_product_id` 있음 = 본사 사진 자동 복사, 직접 사진 금지 | 0062 |
| 보관 | 쇼핑몰 사진 자동 삭제 없음(11-14) + 실제 등록 상품 사진 최소 1년(11-19 주인님). 0066 `mall_builder_expired_photos`는 중앙 정리에서 부르지 않음 | 요청 문서 2026-11-14·11-19 |

## 2. 핵심 결정(안)
1. **제안 사진은 공개 버킷에 두지 않는다** — 공개 버킷은 주소만 알면 누구나 읽으므로 「적용 전 노출 0」을 지키려면 **비공개 버킷**에 둔다. 적용(M3) 때만 공개 버킷으로 복사해 상품 사진이 된다.
2. **제안은 상품 사진이 아니다** → 1년 보관 대상이 아님. 적용 안 된 제안(거절·만료)은 정리 대상. **적용된 사진(공개 버킷 복사본)부터 상품 사진 = 최소 1년·자동 삭제 없음**. 이 경계를 정책 문서에 한 줄로 남긴다.
3. **확인 응답(ACK)은 DB 기록이 끝난 뒤에만 ok:true** — 파일 올리기만 성공하고 기록 실패면 ok:false + 올린 파일 지우기.
4. 바꾸지 않는 것: 판매가·공급가·옵션 추가금·배송비·승인·판매 상태·공개 범위·재고·카테고리(제안 저장 단계에서는 상품 표 쓰기 0).

## 3. 새 표 `mall_builder_photo_proposals`(마이그레이션 1개, 번호는 착수 때 확정 — 지금 0106 후보)
| 칸 | 뜻 |
|---|---|
| `id uuid pk` | 제안 번호 |
| `store_id`·`product_id`(FK, on delete cascade) | 몰·상품 |
| `supplier_id uuid null` | 제안 때 상품의 공급사(자체 상품 null) |
| `origin text` | `operator` / `supplier`(누가 받았나 — 적용 규칙이 다름) |
| `job_id uuid`, `result_id uuid null`, `settings_version text` | 바나나 작업·결과 번호(정확 ACK·중복 판별) |
| `role text check ('main')` | 1차는 대표 1장만(바나나가 합성 대표 1장을 돌려줌) |
| `base_revision text` | 보낼 때 상품 `updated_at`(묵은 작업 판별) |
| `file_path text`, `file_sha256 text`, `file_bytes int` | 비공개 버킷 경로·내용 지문·크기 |
| `status text check ('proposed','applied','rejected','expired','reverted')` | 상태 |
| `prev_images jsonb null`, `applied_path text null` | 적용 직전 사진 목록(되돌리기)·공개 버킷 복사 경로(M3) |
| `created_by`, `created_at`, `decided_by`, `decided_at` | 기록 |
- 고유: `(store_id, product_id, result_id) where result_id is not null` → **같은 결과 번호는 한 번만**(다시 와도 기존 행 반환 = 멱등). `(store_id, product_id, file_sha256) where status = 'proposed'` → 같은 내용 중복 제안 막기.
- 쓰기는 함수로만(표 직접 insert/update 정책 없음).

## 4. 권한(RLS·저장소)
| 누구 | 제안 읽기 | 제안 만들기 | 적용·거절(M3) |
|---|---|---|---|
| 몰 대표·「상품」 권한 직원 | 이 몰 전부 | 이 몰 자체·공급사 상품 | 적용 = 승인 유지 |
| 「상품」 권한 없는 직원 | 0 | 0 | 0 |
| 공급사(활성, 본인) | 자기 공급사 상품의 `origin=supplier` 제안 | 자기 상품만 | 적용 = 기존 공급사 저장 함수 경유 → 승인 대기(바로 판매 예외) |
| 손님·비로그인 | 0 | 0 | 0 |
- 저장소(비공개 버킷) 새 정책 2개: 직원 `<몰>/proposals/<제안 id>.jpg`(올리기·읽기·지우기 = 그 몰 「상품」 권한 직원), 공급사 `<몰>/supplier-proposals/<공급사>/<제안 id>.jpg`(본인 활성 공급사). **기존 손님 폴더 규칙은 그대로**(두 번째 폴더 이름이 uid가 아니어서 겹치지 않음 — 시험으로 확인).
- 크기: 비공개 버킷 한도 5MB·상품 사진 한도 5MB에 맞춰, 바나나 결과(≤10MB)를 **브라우저에서 JPG로 다시 줄여 5MB 이하**로 저장(1000×1000 합성은 보통 1MB 안팎). 줄여도 넘으면 ok:false 고정 문구. 버킷 한도는 바꾸지 않는다.

## 5. 흐름과 정확한 ACK
1. 결과 수신(M1 검사 그대로: 바나나 주소·현재 작업·그 창·보낸 상품·`resultId`).
2. 브라우저에서 파일 검사(JPG/PNG, 줄이기 ≤5MB) → SHA-256.
3. `rpc mall_builder_photo_proposal_begin(store, product, job, result_id, settings_version, base_revision, sha, bytes)` — 잠금 아래 검사: 몰 일치·상품 소속·거울 거절·공급사 일치(공급사 화면은 본인 상품만)·같은 `result_id` 있으면 그 행 반환(멱등, ok:true)·같은 내용 제안 있으면 그 행 반환. 통과하면 `status='pending_upload'` 아님 — **행을 만들지 않고** 올릴 경로(`<몰>/proposals/<새 id>.jpg`)와 1회용 id만 돌려줌.
4. 브라우저가 로그인 세션으로 그 경로에 올림(저장소 정책이 다른 몰·공급사 폴더 차단).
5. `rpc mall_builder_photo_proposal_commit(id, …)` — 저장소에 그 경로 객체가 실제로 있고 크기·지문 일치일 때만 행 insert(`proposed`) → 이때만 **ok:true** ACK(같은 `resultId`).
6. 4·5 실패 → 브라우저가 올린 파일 지우기(정책상 본인 직원·공급사만) → **ok:false 고정 문구** ACK. 같은 결과 번호 재수신 시 3단계 멱등으로 처리.
- 묵은 작업: 저장은 하되 상품 `updated_at > base_revision`이면 목록에 「그사이 상품이 바뀜」 표시, M3 적용 기본값 = 건너뜀(사람이 「그래도 적용」).

## 6. 실패 정리·만료(1년 정책 경계)
- 고아 파일: commit 없이 남은 `proposals/` 파일 → 화면 「제안 정리」가 `rpc mall_builder_photo_proposal_orphans(store)`(행 없는 경로 목록, 직원만) → 브라우저가 삭제. 서버 키 0.
- 거절·만료: 적용 안 된 제안은 30일 뒤 `expired`(목록 숨김) → 같은 정리로 파일 삭제. **상품 사진(공개 버킷)은 이 정리의 대상이 아님** — 함수가 비공개 버킷 `proposals/`·`supplier-proposals/` 경로만 돌려주도록 경로 접두어 고정.
- 관리자·시험 몰(`retention_exempt`)도 제안 정리는 같은 규칙(제안은 상품 사진이 아님) — 다르게 할지 주인님 확인 필요(결정 항목 3).

## 7. 최소 로컬 시험안(격리 Docker, 운영·Lab 0)
1. RLS 표: 대표·상품 권한 직원·권한 없는 직원·공급사 본인/남·손님·비로그인 × 읽기·begin·commit.
2. 저장소 정책: 직원 `proposals/` 올리기 허용·다른 몰 거절, 공급사 본인 폴더만, 손님 기존 서류 폴더 규칙 회귀(그대로 됨).
3. begin 거절: 다른 몰·지워진 상품·거울·공급사 불일치. 멱등: 같은 `result_id` 두 번 → 같은 행·ok. 내용 중복 → 같은 행.
4. commit: 객체 없음·크기/지문 다름 → 행 0. 정상 → `proposed` 1행, 상품 표·공급가·승인 변화 0.
5. 정리: 고아 경로만 반환, 공개 버킷·적용된 사진 경로 반환 0. 30일 만료 표시.
6. 브라우저 순수 함수: ACK 매핑(commit 성공만 ok:true, 실패 고정 문구·resultId 그대로), 줄이기 한도, 지문.
7. M1 시험 12개 회귀.

## 8. 결정 항목(주인님·Master)
1. 제안을 비공개 버킷에 두기(추천) vs 공개 버킷 임시 폴더(노출 위험).
2. 결과 줄이기(5MB) vs 비공개 버킷 한도 10MB로 올리기(서류 버킷 설정 변경).
3. 관리자·시험 몰의 제안 정리 30일 적용 여부.
4. 운영 DB 표 1개·저장소 정책 2개 — 운영 적용은 M3와 함께 한 번에(빌드 1회).

## 9. 결정 기록(2026-11-19 주인님, 채팅) — 네 항목 모두 추천안 확정
1. 제안 사진은 **비공개 저장소**(`mall-builder-private`) — 적용 전 손님·비로그인 노출 0.
2. 바나나 결과가 5MB를 넘으면 **브라우저에서 5MB 이하로 줄이기**(저장소 한도 변경 0).
3. 관리자·시험 몰도 **적용 안 된 제안은 30일 뒤 정리**(제안은 상품 사진이 아님 — 상품 사진 최소 1년·자동 삭제 없음과 별개).
4. 운영 반영은 **M3(적용·되돌리기)와 한 번에**(DB 표 1개·저장소 규칙 2개 이상·빌드 1회).

## 10. 경계 보완(Master msg_d7ccf525cd20, 근거: Lab `rjjtjakljjxsgjelqgek` 카탈로그 읽기 2026-11-19)
### 10-1. 기존 서류 버킷 정책과 새 접두어의 행렬(권한 합집합)
지금 비공개 버킷 정책(모두 authenticated, permissive = OR): 올리기 `mall_builder_private_insert_own`(폴더[2] = 본인 uid + 그 몰 손님), `mall_builder_private_insert_supplier_apply`(폴더[2] = 본인 uid + 이름에 `/<uid>/supplier-apply-`), 읽기 `mall_builder_private_read`(폴더[2] = 본인 uid **또는 그 몰 직원 전부**). **지우기·고치기 정책 없음.**

| 경로 \ 사람 | 손님 | 공급사 신청자 | 직원(상품 권한) | 직원(상품 권한 없음) | 공급사(활성 본인) |
|---|---|---|---|---|---|
| `<몰>/<uid>/…`(서류, 지금) | 본인 것 올리기·읽기 | 본인 `supplier-apply-` 올리기·읽기 | 읽기(지금 그대로) | 읽기(지금 그대로) | 0 |
| `<몰>/proposals/<id>.jpg`(새) | **0** — 폴더[2] `proposals`는 uid가 될 수 없음 | **0** | 새 정책으로 올리기·지우기, 읽기는 기존 직원 읽기 | **읽기 가능(기존 직원 읽기 규칙)**·올리기 0 | 0 |
| `<몰>/supplier-proposals/<공급사>/<id>.jpg`(새) | 0 | 0 | 기존 직원 읽기 | 기존 직원 읽기 | 새 정책으로 본인 공급사 폴더만 올리기·읽기·지우기 |
- 결론: **손님·비로그인 접근은 넓어지지 않는다**(새 정책은 폴더[2]가 고정 낱말일 때만 맞고, 기존 손님 정책은 폴더[2] = uid일 때만 맞음 — 서로 겹치지 않음). 넓어지는 쪽은 「상품 권한 없는 직원도 같은 몰 제안 파일을 경로로 읽을 수 있음」 — 기존 직원 읽기 규칙이 몰 폴더 전체를 열어 두었기 때문. 기존 규칙을 좁히면 서류 읽기 화면에 영향이 있어 1차는 **바꾸지 않고 한계로 기록**(제안은 적용되면 어차피 공개 사진). 좁히는 안(기존 읽기에 `폴더[2] not in ('proposals','supplier-proposals')` + 제안 전용 읽기 정책)은 결정 항목 5.
- 경로 첫 폴더는 반드시 몰 id(uuid) — 기존 정책들이 폴더[1]을 uuid로 바꾸므로 다른 낱말을 첫 폴더에 두면 그 버킷 읽기가 형 변환 오류로 깨질 수 있음.

### 10-2. 브라우저 해시를 믿지 않는다 — 서버가 확인할 수 있는 것과 비용
- DB 함수가 직접 확인 가능한 것: `storage.objects`의 **경로(예약 경로 그대로)·소유자(`owner_id` = 호출자)·크기(`metadata.size` ≤ 5,242,880)·형식(`metadata.mimetype` = image/jpeg)·저장소 지문(`metadata.eTag`)**. 파일 바이트는 DB에서 읽을 수 없다.
- 보안 판단은 위 메타데이터로만. **브라우저 SHA-256은 참고용**(고유 제약에 쓰지 않음 — §3의 sha 고유는 뺀다). 저장된 내용 동일성은 commit 때 기록한 **저장소 eTag**(브라우저가 정할 수 없는 값).
- 서버가 바이트를 직접 해시하려면 Next 서버 경로가 회원 세션으로 파일을 내려받아 계산해야 함 — 결과 1건당 함수 호출 1번·최대 5MB 내려받기(Vercel 함수 비용·시간). 그 값을 DB에 넘겨도 DB가 「그 경로를 거쳤는지」 증명할 수 없어 이득이 작음 → **1차 하지 않음**.

### 10-3. 정확한 ACK·동시 재수신·남의 파일을 지우지 않는 정리
- begin은 **예약 행**을 만든다: `status='reserved'`, `created_by`=호출자, `reserved_until`=지금+10분, 경로 `<몰>/proposals/<id>.jpg`. 고유 `(store_id, product_id, result_id)`로 동시 begin은 한 행만, 다른 쪽은 그 행을 받는다.
- 같은 `result_id`로 begin이 다시 오면: 이미 `proposed` → 업로드 없이 ok:true(아래 내용 확인 통과 때) / 같은 사람 예약 중 → 같은 경로 반환(이미 올라가 있으면 바로 commit, 덮어쓰기 0) / 다른 사람 예약 중·기한 안 → ok:false 고정 문구(처리 중), 파일 손대지 않음 / 예약 기한 지남 → 그 예약을 버리고 새로 예약.
- commit은 **예약한 본인만**(`created_by = auth.uid()`), 객체가 예약 경로에 있고 `owner_id`=본인·크기·형식 맞을 때만 `proposed` + eTag 기록 → 이때만 **ok:true**.
- 업로드 뒤 commit 실패 → 브라우저는 **자기가 예약한 경로의 자기 파일만** 지운다. 새 지우기 정책: 비공개 버킷·폴더[2] ∈ (`proposals`,`supplier-proposals`)·`owner_id = auth.uid()`·**그 경로를 가리키는 `proposed`·`applied` 행이 없음** → 남이 성공시킨 파일·이미 제안으로 저장된 파일은 지울 수 없다.
- **같은 `resultId`에 다른 내용 → 성공 금지**: 받은 원본(재인코딩 전) 브라우저 지문을 `source_fingerprint`로 begin에 넘겨 기록. 같은 `resultId`인데 지문이 다르면 ok:false 고정 문구(「같은 결과 번호에 다른 사진」). 브라우저 계산값이라 보안 장치가 아니라 바나나 쪽 오류 탐지용임을 명시.

### 10-4. 재인코딩 전후 해시·5MB·ZIP 한계(결정 2 반영)
- 바나나 결과(PNG/JPG ≤10MB)를 브라우저에서 같은 크기 JPG로 재인코딩(품질 0.92 → 0.85 → 0.75), 5MB 이하만 저장. 세 번 다 넘으면 ok:false 고정 문구(「사진이 커서 저장하지 못했습니다」). 이미 5MB 이하 JPG면 다시 인코딩하지 않음.
- 지문 두 가지: `source_fingerprint`(받은 원본, 같은 resultId 내용 확인용) / 저장소 eTag(올린 최종 바이트, 서버 관찰값). 재인코딩 바이트는 브라우저마다 다를 수 있어 **같은 결과를 다시 받아도 다시 올리지 않는다**(resultId로 끝냄).
- ZIP·작업표 올리기(대체 경로)는 M2 1차 범위 밖(원본 ZIP 크기 상한·압축 해제 검사 별도 설계).

### 10-5. 정리(결정 3 반영)
- 사람이 누르는 거절 + 예약 기한 지난 자기 파일 지우기 + **적용 안 된 제안 30일 정리(관리자·시험 몰 포함)**. 정리 함수는 비공개 버킷 `proposals/`·`supplier-proposals/` 경로만 돌려주게 접두어 고정 — 공개 버킷 상품 사진·`applied` 제안 경로는 반환 0(시험 항목). 서버 키가 없어 실제 삭제는 직원 화면에서 브라우저가 한다(자동 예약 작업 0 — 화면을 열 때 정리).

### 10-6. 추가 결정 항목
5. ~~기존 직원 읽기 규칙을 좁혀 「상품 권한 없는 직원」의 제안 파일 읽기를 막을지~~ → **§11-1로 대체**(Master msg_d5aebd7ca4f8: 구현 전에 닫아야 함 — 전용 버킷으로 닫는다).

## 11. 2차 보완(Master msg_d5aebd7ca4f8) — §10의 해당 부분을 이 절이 대신한다
### 11-1. 제안 파일 접근: 전용 버킷 vs 기존 버킷 정책 분리
| 안 | 하는 일 | 기존 서류 접근 영향 | 위험 |
|---|---|---|---|
| **A. 전용 비공개 버킷 `mall-builder-proposals`(추천·최소안)** | 버킷 1개 추가(비공개, 5MB, `image/jpeg`만) + 이 버킷 전용 정책 4개(올리기·읽기·지우기·고치기 없음) | **0** — 기존 3개 정책은 모두 `bucket_id = 'mall-builder-private'` 조건이라 새 버킷에 적용되지 않음. 기존 정책 수정 0 | 사용량 집계(`member_storage_usage.by_bucket`)에 새 버킷이 없음 → 제안은 상품 사진이 아니라 30일 정리 대상이므로 집계 제외로 기록(필요 시 저장공간 담당께 요청) |
| B. 기존 버킷에서 정책 분리 | `mall_builder_private_read`를 `alter policy`로 고쳐 `폴더[2] not in ('proposals','supplier-proposals')` 추가 + 제안 전용 정책 | 기존 읽기 정책 본문이 바뀜 → 사업자등록증·공급사 신청 서류 읽기 화면 회귀 시험 필요, 되돌리기도 정책 재작성 | 기존 정책 수정이 운영 묶음에 섞임 |
- **A 채택안**의 경로: `mall-builder-proposals/<몰 id>/<제안 id>.jpg`(공급사도 같은 모양 — 공급사 구분은 행의 `supplier_id`로 하고 경로로 하지 않음). 정책은 모두 **예약·제안 행을 조건으로** 판정(경로 낱말 판정 0):
  - 읽기: 그 경로를 `file_path`로 가진 행이 있고, 호출자가 그 몰 「상품」 권한 직원(`mall_builder_staff_can(store, 'products')`)이거나 행의 `supplier_id`가 호출자의 활성 공급사. → **상품 권한 없는 직원·손님·다른 공급사 읽기 0.**
  - 올리기: 행 `status = 'reserved'`·`created_by = auth.uid()`·`reserved_until > now()`·`name = file_path`일 때만(덮어쓰기 0 — 고치기 정책 없음).
  - 지우기: 행 `status in ('abandoned','rejected','expired')`이고 호출자가 그 행의 권한자(위 읽기 조건)일 때만. **`reserved`·`proposed`·`applied` 파일은 누구도 못 지움.**

### 11-2. 동시 실행 시나리오 — 확정 파일이 지워지지 않는 조건
상태 전이(모두 함수, 행 `for update` 잠금 아래): `reserved → proposed`(commit) · `reserved → abandoned`(abandon/재예약) · `proposed → rejected | applied | expired` · `applied → reverted`. 파일 삭제는 저장소 지우기 정책이 행 상태를 **커밋된 값**으로 보고 판정.
| 시나리오 | 결과 |
|---|---|
| S1 commit과 abandon이 동시 | 같은 행 잠금으로 직렬화. 먼저 끝난 쪽만 성공, 나중 쪽은 상태가 `reserved`가 아니라 거절. commit이 이기면 파일은 `proposed`라 삭제 불가 |
| S2 commit 중 다른 직원이 정리(삭제) | commit 트랜잭션이 끝나기 전 정리의 정책 하위 조회는 커밋된 `reserved`를 봄 → `reserved`는 삭제 대상 아님 → 삭제 거절. commit 뒤엔 `proposed` → 삭제 거절 |
| S3 업로드 직후 예약 만료 | 올리기는 정책이 `reserved_until > now()`일 때만 허용. 만료 뒤 commit은 `objects.created_at <= reserved_until`이고 아직 `reserved`일 때만 허용(제때 올린 파일은 살림) |
| S4 만료된 예약에 같은 resultId 재수신 | begin이 옛 행을 잠가 `abandoned`로 바꾸고 **새 제안 id·새 경로**로 재예약. 옛 업로더의 늦은 commit은 상태가 `abandoned`라 거절. 옛 파일은 `abandoned`라 그 뒤 정리 가능 |
| S5 같은 resultId 동시 begin 두 번 | 고유 `(store_id, product_id, result_id) where status in ('reserved','proposed','applied')` → 한 행만, 다른 쪽은 그 행을 받아 S6 규칙 |
| S6 같은 resultId 응답 권한 | ok:true는 ① 행이 `proposed`(또는 `applied`)이고 ② **호출자가 지금도 그 상품의 권한자**(begin마다 다시 판정: 상품 권한 직원 또는 그 상품 공급사 본인)이고 ③ 원본 지문 힌트가 같을 때만. 권한 없는 사람이 같은 resultId를 보내면 ok:false(행 내용 노출 0) |
| S7 다른 사람 예약 중 재수신 | ok:false 고정 문구(처리 중), 파일·행 변경 0 |
| S8 업로드 성공 뒤 브라우저 종료(commit 없음) | 행은 `reserved` 그대로 → 만료 뒤 다음 begin 또는 정리 화면이 `abandoned`로 바꾼 뒤 파일 삭제 |
- 경로 고유: 제안 id는 begin에서 DB가 만든다(`gen_random_uuid()`), 경로 = `<몰>/<제안 id>.jpg` → 재예약마다 경로가 달라 옛 파일과 새 파일이 겹치지 않음.

### 11-3. eTag·브라우저 해시의 자리
- **무결성·권한 판정에 쓰지 않는다.** 권한은 행·정책, 상태는 잠금·전이로만 판정. eTag·원본 지문은 「같은 결과를 또 받았나」「이미 같은 사진 제안이 있나」 화면 표시·중복 안내용 힌트.
- 같은 resultId에 원본 지문 힌트가 다르면 성공시키지 않는 것(§10-3)은 유지 — 단 힌트이므로 이를 근거로 다른 행을 고치거나 지우지 않음.

### 11-4. M3 적용 전 서버 바이트 검증 위치
- 적용은 브라우저가 공개 버킷에 직접 올리지 않고 **쇼핑몰 서버 경로(Next 서버 액션 또는 `/s/[store]/admin/products/proposals/apply` 라우트)가 회원 세션으로** 한다: ① 적용 함수 1단계(잠금·권한·`proposed` 확인·묵은 작업 판정)로 적용 예약 ② 서버가 제안 파일을 내려받아 **바이트 검사**(JPEG 시그니처·크기 ≤5MB·디코드 가능 여부·가로세로 상한) + SHA-256 계산 ③ **서버가 같은 바이트를** 공개 버킷 `<몰>/products/<새 id>.jpg`(공급사는 `<몰>/supplier/<공급사>/…`)에 회원 세션으로 올림 ④ 적용 함수 2단계에 공개 경로·서버 SHA-256 전달 → 공개 객체가 있고 소유자=호출자·크기가 제안 객체와 같을 때만 `images` 교체·`applied`·`prev_images` 기록.
- 검사와 게시가 같은 서버 실행 안에서 같은 바이트로 이뤄지므로 「검사한 파일과 다른 파일이 공개되는」 틈이 없다. DB는 여전히 바이트를 못 보지만, 공개되는 파일은 서버가 검사한 바이트다.
- 비용: 적용 1건당 서버 함수 1회·최대 5MB 내려받기+올리기. 저장(M2)에는 서버 경로를 쓰지 않음(비용 0).

### 11-5. 바뀐 표·결정 요약
- 표 `mall_builder_photo_proposals`에 `status` 값 `reserved`·`abandoned` 추가, `reserved_until` 칸 추가, 경로는 전용 버킷 기준. `origin`·공급사 판정은 행 기준.
- 마이그레이션 범위(운영은 M3와 한 번에): 표 1 + 버킷 1 + 정책 3(읽기·올리기·지우기) + 함수(begin·commit·abandon·정리 목록, M3에서 적용 2단계·되돌리기).
- 결정 5는 A안으로 닫음(기존 정책 수정 0). 새 결정: 제안 버킷을 사용량 집계에 넣을지(추천: 넣지 않음 — 30일 정리 대상).

## 12. 구현 기록(M2 데이터 계층, Master msg_ad4382dd5bb2) — 격리 Docker만, Lab·운영 0
- 파일: `supabase/migrations/0106_photo_proposals.sql`, `scripts/scenario-0106-photo-proposals.sql`, `scripts/check-0106-local.mjs`.
- 실제 구현 = §11 A안: 전용 비공개 버킷 `mall-builder-proposals`(5MB, JPEG만), 표 `mall_builder_photo_proposals`(쓰기는 함수만, 회원 표 권한 select만), 저장소 정책 3개(읽기·올리기·지우기, 고치기 없음), 함수 begin·commit·abandon·cleanup_list. `result_id`는 필수(번호 없는 옛 바나나 결과는 받지 않음 → 화면에서 ok:false 고정 문구).
- 시험에서 잡아 고친 결함: 권한 판정 함수가 「권한 없음」일 때 NULL을 돌려줘 `not row_ok` 검사가 빠지는 바람에 상품 권한 없는 직원·손님·다른 공급사·다른 몰 대표가 제안 파일을 읽을 수 있었음(P08·P13 실패) → `coalesce(…, false)`로 고침 → 71/71.
- 중앙 사용량 반영·브라우저 통합·자동 정리 실행·M3는 아직 없음.

### 12-1. M3 적용이 서버 검증을 건너뛸 수 없게 하는 구조(계획)
- 문제: 쇼핑몰 서버에는 운영자 서버 키가 없어 회원 세션으로 일한다 → 적용 「2단계」 함수가 회원에게 열려 있으면 회원이 서버 경로를 거치지 않고 직접 불러 검사 안 된 바이트를 게시할 수 있다.
- 계획: 적용 2단계 함수는 **서버만 아는 비밀로 만든 서명**이 있을 때만 받는다.
  1. 몰 서버 비밀(`MALL_SECRET_KEY`, 이미 있는 서버 전용 환경변수)에서 파생한 적용 서명 열쇠를 DB 전용 비밀 표(`mall_builder_private`, 회원 읽기 0 — 기존 `store_scheduler_secrets`와 같은 방식)에 둔다.
  2. 서버 경로가 바이트 검사(JPEG 시그니처·≤5MB·디코드·가로세로 상한)와 SHA-256을 한 뒤, 같은 바이트를 공개 버킷에 올리고 `HMAC(열쇠, 제안 id | 공개 경로 | 크기 | sha256 | 만료 시각)`을 만들어 2단계 함수에 넘긴다.
  3. 2단계 함수는 같은 HMAC을 다시 계산해 맞고, 만료 전이며, 공개 객체의 경로·소유자·크기가 맞을 때만 `images`를 바꾼다. 회원이 직접 부르면 서명을 만들 수 없어 거절.
- 그 전까지 M3 2단계 함수는 만들지 않는다(M3 설계·승인 때 확정). 메타데이터만으로는 JPEG 바이트 검증을 대신하지 않는다.

### 12-2. P2 보완(Master msg_6eabad5da94d, Mac msg_b59905da566c) — 공급사 재지정·빈 지문
- 행 판정(`photo_proposal_row_ok`): 공급사는 「제안에 기록된 `supplier_id` = 지금 상품의 `supplier_id` = 호출자 본인의 활성 공급사」일 때만. 상품 공급사가 바뀌면 예전·새 공급사 모두 예전 제안의 행·파일·정리 목록·삭제·확정·포기에서 빠짐. 상품 권한 직원은 그대로.
- 예약(begin)의 기존 행 분기도 같은 판정으로 먼저 거름 → 권한 없으면 기존 행의 상태·경로·done 여부를 알려 주지 않고 forbidden(fail-closed).
- 원본 지문 힌트 필수: 빈 값이면 `invalid`(같은 결과 번호의 다른 사진 검사를 빈 값으로 빠져나가던 계약을 닫음). 같은 결과 번호 재수신은 힌트가 정확히 같을 때만 done, 다르면 conflict.
- 시험: P18(재지정 뒤 예전·새 공급사 행·파일·정리 목록·삭제·같은 결과 begin·commit·abandon 모두 0/forbidden, 직원 그대로, 새 공급사 새 제안 정상, 예전 공급사는 새 제안 못 봄) · P19(빈 힌트 invalid, 행 0). 고치기 전 판으로 돌리면 P18 2건·P19 실패(새 공급사가 예전 제안을 봄) → 고친 판 78/78.

### 12-3. 후속 전제(구현 0, 운영 적용 전 확인)
- **고아 파일**: 상품·몰이 지워지면 제안 행은 `on delete cascade`로 사라지지만 버킷 파일은 남는다. 저장소 정책이 행 기준이라 그 파일은 회원 누구도 읽기·지우기 불가(노출 0) — 정리는 관리자(서버 키) 작업이나 별도 함수가 필요. 운영 반영 전에 「행 없는 파일」 목록을 관리자 점검 SQL로 보는 방법을 M3 묶음에 넣는다.
- **같은 이름 버킷**: `insert … on conflict (id) do nothing`이라 이미 같은 이름 버킷이 다른 설정(공개·한도·형식)으로 있으면 그대로 남는다. 운영·Lab 적용 precheck에 「`mall-builder-proposals` 없음」을, verify에 「public false·5242880·{image/jpeg}」를 넣는다(어긋나면 멈춤).
- 공급사 계정이 `revoked`·`paused`로 바뀌어도 판정이 즉시 0(시험 P13-paused). 직원 `removed_at`도 `staff_can`이 이미 거름.
- 2026-11-19 P2 추가 보완(Master msg_5aec3c932e2a, Mac msg_611c47959bd0): begin에서 권한 확인 직후 **모든 살아 있는 상태(예약 중·기한 지남·확정·적용)**에서 원본 힌트가 다르면 경로·상태 없이 `conflict`. 같은 예약자라도 다른 사진이면 업로드 경로를 다시 받지 못하고, 기한이 지나도 다른 힌트로는 재예약 불가(같은 힌트로만). 시험 P20(8건) — 고치기 전 판 82/86, 고친 판 86/86.

## 13. 화면 연결 계획(Master msg_3291910227f2 — 계획만, 코드·스키마·DB·빌드 0)
전제: 데이터 계층 0106(`a7423ed90`, Mac 독립 수락). 운영·Lab 반영은 M3와 한 번에(결정 4). 고아·만료 정리와 M3 서버 검증(§12-1)은 별도 설계 유지.

### 13-1. 파일(점유 예정 — 착수 승인 때 등록)
| 파일 | 할 일 |
|---|---|
| `src/lib/mallPhotoSave.ts`(새) | 결과 1건 → 제안 저장 흐름 순수 함수 `saveResultAsProposal(ctx, deps)` — rpc·업로드·지우기·JPEG 변환·해시를 주입받아 단위 시험 가능. 화면 의존 0 |
| `src/lib/mallPhotoJob.ts` | `notReadyReply`를 `savedReply(jobId, got, ok, code)`로 일반화(고정 문구 표). M1 계약(작업 만들기·`sendMallJob`)은 그대로 |
| `src/app/s/[store]/admin/products/banana-send.tsx` | 결과 수신 시 `notReadyReply` 대신 `saveResultAsProposal`을 **한 건씩 차례로**(체인) 실행 → 끝나면 그 결과 번호로 응답 1회. 수신 검사(바나나 주소·현재 작업·`e.source === job.win`·보낸 상품)와 작업 1회 송신은 M1 그대로 |
| `src/app/s/[store]/supplier/products/page.tsx` | 공급사 「내 상품」에 같은 컴포넌트 연결(행 = 본인 공급사 상품만, 서버가 store·supplier로 읽음). 역할은 DB가 정함(operator/supplier) — 화면이 역할을 보내지 않음 |
| `src/app/s/[store]/admin/products/proposals/page.tsx`(새) | 직원용 제안 목록(M2는 보기만): 상품·상태·「그사이 상품이 바뀜」(상품 `updated_at` ≠ `base_revision`) 표시, 미리보기 = 그 행 파일의 짧은 서명 주소(`createSignedUrl`, 읽기 정책 통과자만). 적용·거절 버튼은 M3 |
| `tests/mallPhotoSave.test.mjs`(새) | 아래 13-3 응답 표 전부를 모의 rpc·업로드로 시험 + 화면 소스 계약 |

### 13-2. 결과 1건 저장 순서(브라우저, 회원 세션)
1. 결과 번호(`resultId`) 없음(옛 바나나) → 저장 0, ok:false 「바나나를 새로고침한 뒤 다시 보내 주세요」.
2. 원본 힌트 = 받은 원본 파일 SHA-256(WebCrypto, 재인코딩 전) — 같은 결과 번호 확인용 힌트일 뿐.
3. `begin(store, product, jobId, resultId, settingsVersion, baseRevision, 힌트)`.
4. `upload` 응답일 때만: JPEG 변환(§13-4) → 제안 버킷 경로에 `contentType image/jpeg`·`upsert false`로 올림. 「이미 있음」 오류 = 내가 앞서 올린 같은 예약 경로 → 그대로 5로. 그 밖 실패 → `abandon(id)` → ok:false.
5. `commit(id)` → `done`이면 ok:true. `no_file` → `abandon(id)` 뒤 그 경로 파일 지우기(정책상 abandoned만 지울 수 있음) → ok:false. `gone`·`forbidden` → ok:false(파일 손대지 않음).

### 13-3. 정확한 ACK 표(바나나 저장 응답, 결과 번호·판번호 그대로, 결과 번호당 1회)
| DB 결과 | ok | 고정 문구(번호·경로·원문 오류 없음) |
|---|---|---|
| begin `done` / commit `done` | true | (빈 문구) |
| begin `busy` | false | 「다른 사람이 같은 결과를 저장하는 중입니다」 |
| begin `conflict` | false | 「같은 결과 번호에 다른 사진이 왔습니다」 |
| begin `forbidden` | false | 「이 상품의 사진을 저장할 권한이 없습니다」 |
| begin `invalid` / 결과 번호 없음 | false | 「바나나를 새로고침한 뒤 다시 보내 주세요」 |
| 변환 실패·5MB 초과 | false | 「사진이 커서 저장하지 못했습니다」 |
| 업로드·commit 실패(`no_file`·`gone`·네트워크) | false | 「저장하지 못했습니다. 다시 보내 주세요」 |
- ok:true는 **DB 확정 뒤에만**. 같은 결과를 다시 받으면 begin이 `done` → 업로드 없이 ok:true(바나나가 응답을 못 받은 경우 복구).

### 13-4. 5MB JPEG 변환
- 받은 파일이 이미 JPEG이고 5,242,880바이트 이하면 그대로(바이트 변화 0).
- 아니면 `createImageBitmap` → 같은 가로세로 캔버스(흰 배경 — PNG 투명 영역) → JPEG 품질 0.92 → 0.85 → 0.75 순서로 5MB 이하가 나올 때까지. 가로세로 상한 6000px(넘으면 변환 거절 — 메모리 보호). 세 번 다 넘으면 ok:false(§13-3).
- 변환 결과의 지문은 힌트와 무관(재수신은 begin `done`으로 끝나 재업로드 0).

### 13-5. 실패·닫힘 경우
| 경우 | 동작 |
|---|---|
| 저장 중 바나나 창 닫힘 | 저장은 끝까지 진행(DB 일관). 응답은 못 보냄 → 바나나를 다시 열어 같은 결과를 보내면 begin `done` → ok:true |
| 저장 중 쇼핑몰 탭 닫힘·새로고침 | 예약이 reserved로 남음 → 10분 뒤 만료 → 같은 결과 재수신 시 재예약(같은 힌트) 또는 정리 목록이 abandoned 처리 |
| 새 작업 시작(버튼 다시 누름) | 옛 창 메시지는 `e.source !== job.win`으로 무시(M1). 이미 시작한 저장은 끝까지(그 결과의 DB 상태는 정확), 응답은 옛 창이 살아 있을 때만 그 창으로 |
| 같은 결과 동시 두 번 수신 | 체인으로 한 건씩 + DB begin 직렬화 → 두 번째는 done 또는 본인 같은 경로 → 중복 저장 0 |
| 제안 버킷이 아직 없는 환경(0106 미적용) | 업로드 실패 → abandon → ok:false 고정 문구(쇼핑몰 데이터 변화 0) |
| 공급사 정지·공급사 재지정 | begin forbidden → ok:false |

### 13-6. 시험(착수 때)
- `tests/mallPhotoSave.test.mjs`: 13-3 표 행마다 모의 rpc·업로드로 ok·문구·resultId 그대로, 업로드 「이미 있음」→ commit 진행, no_file → abandon 뒤 지우기 1회, gone·forbidden → 파일 손대지 않음, JPEG 그대로·변환·5MB 초과, 결과 번호 없음 저장 0.
- M1 시험 12개 회귀, 화면 소스 계약(저장 체인 1건씩, 응답은 `job.win`·바나나 주소로만, ok:true는 done일 때만).
- DB 계약은 0106 격리 시험(86/86) 그대로 재사용.
