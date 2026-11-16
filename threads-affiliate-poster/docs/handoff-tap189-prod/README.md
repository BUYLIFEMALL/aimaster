# Threads 쇼핑제휴 자동화 v1.89 — 운영 DB 수동 적용 안내(주인님 직접 실행용) · TAP-20261117-03

> 왜 직접 실행하나: 같은 운영 DB의 다른 적용(B2B 0100)에서 에이전트 적용 확인 창이 0.2~0.3초 만에 자동 취소된 일이 3번 있었습니다. 이 묶음은 에이전트로 시도하지 않았으므로 같은 문제가 날지는 **가능성**일 뿐 확인된 것은 아닙니다. Master 지시로 공식 SQL 편집기에서 한 번 실행하는 묶음을 준비했습니다. 에이전트는 운영 DB에 쓰지 않습니다.

## 대상
- **Supabase 프로젝트 「AIMaster」 — ref `esgxyikcnnvmlhygjkth`(운영)**
- 주소: https://supabase.com/dashboard/project/esgxyikcnnvmlhygjkth/sql/new
- ⚠️ Lab(`rjjtjakljjxsgjelqgek`)에서 실행하지 마세요. 주소의 ref가 `esgxyik…`인지 먼저 봅니다.

## 파일
| 파일 | 하는 일 | 쓰기 |
|---|---|---|
| `precheck.sql` | 실행 전 확인 7줄 — 모두 OK여야 진행 | 읽기만 |
| `apply.sql` | **한 트랜잭션**: 사전 점검(대기열 표 있음·이번 묶음 미적용) → 마이그레이션 원문(그 안의 기존 중복 점검 포함) → 적용 기록 1줄 | 씀(1번만) |
| `verify.sql` | 실행 뒤 확인 8줄 + 「전체」 | 읽기만 |
- `apply.sql` 안의 원문 = 커밋 `d89f5d2be`의 `supabase/migrations/20261117100000_tap_collect_queue_atomic.sql` 그대로(LF sha256 `22b95ccdd740d99a6a537d580503ae05895d61f402e5b580ac39f65bfdbd09cc`). 원문은 바꾸지 않았고 앞뒤 점검·기록만 감쌌습니다.
- 적용 기록은 이 프로그램의 기존 기록과 같은 꼴: `version` = UTC 시각 14자리, `name` = `tap_collect_queue_atomic`(번호 없이 이름만).
- 각 파일 sha256(LF)은 `.ai/results/TAP-20261117-03-CC-B2B-BACK-01.md`에 적음.

## 순서(약 3분)
1. 위 주소로 SQL 편집기 새 쿼리를 엽니다.
2. `precheck.sql` 붙여 넣고 **Run** → 7줄 모두 「OK」인지 봅니다. 「멈춤」이 있으면 여기서 멈추고 알려 주세요(중복이 있으면 정리 결정이 먼저).
3. 비우고 `apply.sql` 전체를 붙여 넣고 **Run** 한 번. 편집기가 확인 창을 띄우면 승인합니다.
   - 성공: 「Success」.
   - 「[멈춤] …」: 사전 점검이 막은 것 — 아무것도 바뀌지 않았습니다. 문구를 알려 주세요.
   - 그 밖 오류: 한 트랜잭션이라 **전부 취소**됩니다. 오류 문구를 알려 주시고 다시 실행하지 마세요.
4. 비우고 `verify.sql` → **Run** → 마지막 줄 「전체 8/8 OK」.
5. 채팅에 「TAP 실행했어」(또는 결과)를 알려 주시면, 에이전트가 읽기로 다시 확인한 뒤 Master 승인에 따라 빌드 1번으로 넘어갑니다.

## 그다음(이 묶음 밖, 따로 진행)
1. Vercel 빌드 1번(운영 `threads-affiliate-poster`, 릴리스 커밋 `0761447f1` 이후 소스) → Ready 확인. **이 묶음보다 먼저 배포하면 네이버 상품 등록이 「함수 없음」 오류.**
2. **배포 Ready 뒤에만** programs 갱신(지금 실행 금지):
   ```sql
   update public.programs
      set version = 'v1.89', extension_version = 'v1.89',
          extension_download_url = 'https://threads-affiliate-poster.buylife.xyz/downloads/threads-affiliate-poster-extension-latest.zip',
          updated_at = now()
    where slug = 'threads-affiliate-poster';
   ```
3. `node scripts/check-extension-release.mjs threads-affiliate-poster` → OK.

## 되돌리기(영향 구분)
- **코드 배포 전**(이 묶음만 들어간 상태): 지금 운영 v1.88 코드는 이 함수·인덱스를 쓰지 않으므로 그대로 두어도 영향 없음. 꼭 빼야 하면 `drop function public.tap_register_collected(jsonb); drop index public.tap_collect_queue_user_url_uniq; drop index public.tap_collect_queue_product_uniq; delete from supabase_migrations.schema_migrations where name = 'tap_collect_queue_atomic';` — 회원 데이터 변경 없음. Master 판단 뒤.
- **코드 배포 뒤**(v1.89 운영): 함수를 지우면 네이버 등록이 바로 실패합니다 → **먼저 v1.88로 코드를 되돌린 뒤**에만 위 문장 실행. 인덱스는 v1.88에서도 해가 없어 남겨도 됩니다.
- 데이터 정리(중복·섞인 줄)는 되돌리기와 별개로 회원 확인 뒤 결정.

## 검증 근거(로컬 격리 DB `qa_tap_h_*`, 운영과 같은 기록 표 구조, 13/13)
- 정상: precheck 7/7 → apply 성공 → 인덱스 2·함수 1·기록 1 → verify 8/8 → 기록 version UTC 14자리 → 두 번째 apply 「[멈춤] 이미 적용」·변화 0 → 적용 뒤 등록 함수 동작
- **부분 실패**: 마지막 기록 단계를 일부러 실패시킴 → apply 오류 → 인덱스·함수·기록 **모두 0**(전부 되돌림)
- 기존 중복: precheck가 「멈춤」 표시, apply 「[멈춤] … 중복」·변화 0·중복 줄 그대로
- 대기열 기록 없는 DB: 「[멈춤] 대기열 표…」·변화 0
- 운영 읽기(precheck만, **2026-11-17 00:34:57~00:35:00 KST**): 7줄 모두 OK.
