# DB 설계 — Threads 쇼핑제휴 자동화 (독립 운영 복제본)

DB는 **Supabase(PostgreSQL) 프로젝트 1개**를 쓴다. 전체 스키마는 `supabase/schema.sql` 한 파일로 만들어지며
(`clone-kit/scripts/make-clone.mjs`가 생성), 아래 3부분을 순서대로 이어 붙인 것이다.

| 순서 | 원본 파일 | 내용 |
|---|---|---|
| 1 | `clone-kit/database/00_core_tables.sql` | 회원·권한·키 공용 테이블 (원래 AIMaster가 만들어 주던 부분의 최소 버전) |
| 2 | `supabase/migrations/0001` ~ `0007` | 이 프로그램 전용 테이블, 이미지 저장소 버킷 |
| 3 | `clone-kit/database/99_finalize.sql` | API 키 종류 제한을 이 프로그램이 쓰는 13종으로 정리 |

모든 회원 데이터 테이블은 `user_id`(→ `auth.users.id`, 회원 삭제 시 함께 삭제) + **RLS 본인 행만 접근** 원칙을 따른다.
서버에서 service role 키로 접근할 때(예약 게시·Meta 콜백·사용 기록)도 코드가 `user_id`로 직접 걸러낸다.

---

## 1. 관계도

```
auth.users (Supabase 로그인 계정)
  ├─ profiles            1:1  가입 시 트리거로 자동 생성 (등급, 정지 여부)
  │    └─ member_grades  N:1
  ├─ subscriptions       1:N  ─┐
  ├─ user_program_access 1:N  ─┼─ programs (slug = 'threads-affiliate-poster')
  ├─ usage_logs          1:N  ─┘
  ├─ user_api_keys       1:N  (user_id, provider) 유일
  ├─ tap_accounts        1:1  연결된 Threads 계정·토큰
  ├─ affiliate_products  1:N
  │    └─ tap_posts      N:1  (product_id, 상품 삭제 시 NULL)
  ├─ tap_posts           1:N
  ├─ tap_saved_posts     1:N  (user_id, post_id) 유일
  ├─ tap_personas        1:N  (회원당 최대 20개 — 코드에서 제한)
  └─ detail_pages        1:N  (선택, 읽기 전용 참고)

naver_trend_cache, naver_search_cache — 회원과 무관한 공용 캐시 (서버만 읽고 씀)
storage.buckets 'post-images' — 게시글 이미지·영상 공개 저장소
```

## 2. 이용 권한 판정 (`src/lib/access.ts`)

로그인한 회원이 아래 순서 중 하나라도 통과하면 프로그램을 쓸 수 있다.

1. `profiles.is_suspended = true` → **차단** (`/no-access?reason=suspended`)
2. `programs`에 `slug = 'threads-affiliate-poster'`, `is_active = true` 행이 없으면 → 차단
3. `subscriptions`에 `status = 'active'`이고 만료 전인 행 → 허용
4. `user_program_access`에 만료 전인 행 → 허용
5. `programs.required_grade_id`가 비어 있음 → **허용 (기본값: 가입한 모든 회원 사용 가능)**
6. 회원 등급 `sort_order` ≥ 요구 등급 `sort_order` → 허용

운영 방식별 설정:

| 원하는 운영 | 설정 |
|---|---|
| 가입하면 누구나 사용 | 기본값 그대로 (`required_grade_id = null`) |
| 운영자가 승인한 사람만 | `member_grades`에 `('승인회원','approved', 2)` 추가 → `programs.required_grade_id`를 그 id로 → 승인할 회원의 `profiles.grade_id`를 그 id로 변경 |
| 기간제(구독) | `required_grade_id`를 가장 높은 등급으로 두고, 이용자마다 `subscriptions`(status='active', expires_at) 또는 `user_program_access`(expires_at) 행 추가 |

## 3. 테이블 상세

### 공용(회원·권한) — `00_core_tables.sql`

| 테이블 | 주요 칸 | RLS |
|---|---|---|
| `member_grades` | name, slug(유일), sort_order | 누구나 조회 |
| `profiles` | id(=auth.users.id), email, name, grade_id, is_admin, is_suspended | 본인 조회·수정 |
| `programs` | name, slug(유일), is_active, required_grade_id, version | 활성 행 조회 |
| `subscriptions` | user_id, program_id, status, started_at, expires_at | 본인 조회 (쓰기는 service role) |
| `user_program_access` | user_id, program_id, granted_at, expires_at | 본인 조회 (쓰기는 service role) ※ "모두 허용" 정책 금지 |
| `user_api_keys` | user_id, provider, api_key / 유일(user_id, provider) | 본인 조회·추가·수정·삭제 |
| `usage_logs` | user_id, program_id, action, quantity, credits_used, metadata | 본인 조회 (쓰기는 service role) |
| `detail_pages` | user_id, product_name, html | 본인 조회 (선택 기능, 비어 있어도 됨) |

트리거 `on_auth_user_created` → `handle_new_user()`: 가입하면 `profiles` 행을 만들고 등급을 `basic`으로 둔다.

`user_api_keys.provider` 허용값(13종): `openai`, `gemini`, `anthropic`, `coupang_access_key`, `coupang_secret_key`,
`aliexpress_app_key`, `aliexpress_app_secret`, `aliexpress_tracking_id`, `toss_access_key`, `toss_secret_key`,
`toss_publisher_id`, `threads_app_id`, `threads_app_secret`

### 프로그램 전용 — `supabase/migrations/`

| 테이블 | 주요 칸 | 제약 |
|---|---|---|
| `tap_accounts` | user_id(유일), threads_user_id, username, access_token, token_expires_at | 회원당 Threads 계정 1개 |
| `affiliate_products` | platform(`coupang`·`aliexpress`·`naver`·`toss`), product_name, product_url, affiliate_url, price, image_url, input_mode(`url`·`manual`), description, key_selling_points[], detail_page_id | |
| `tap_posts` | product_id, content, image_url, video_url, status, scheduled_at, threads_post_id, threads_permalink, error_message | status: `draft`→`scheduled`→`publishing`→`published`/`failed` |
| `tap_saved_posts` | post_id, author_handle, author_name, content, category (likes/replies/reposts 칸은 미사용) | 유일(user_id, post_id). post_id 접두사: `th-` Threads 검색, `mn-` 직접 가져옴, `ai-` AI 예시 |
| `tap_personas` | name(≤40), tone_description(≤500), sample_writing(≤1000) (emoji_style/is_default 미사용) | |
| `naver_trend_cache` | cache_key, period_months, time_unit, groups, results, fetched_at | 24시간 캐시 |
| `naver_search_cache` | cache_key, search_type, query, items, fetched_at | 캐시 |

저장소: `post-images` 공개 버킷 — AI 생성 이미지와 업로드 영상을 여기에 올리고 공개 주소를 `tap_posts`에 저장한다.

## 4. 스키마를 바꿀 때

- 새 테이블·칸은 `supabase/migrations/00NN_설명.sql`로 추가하고, 운영 DB에 실행한 뒤 파일을 커밋한다.
- 회원 데이터 테이블은 반드시 `user_id` + RLS 본인 행 정책을 같이 만든다.
- API 키 종류를 늘리면 `user_api_keys_provider_check` 제약과 `src/types/database.types.ts`의 `ApiKeyProvider`를 함께 고친다.
