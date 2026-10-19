# 개발 플랜 — 회원 연동 정보 공용 저장(한 번 연결 → 모든 프로그램 재사용) · 2026-10-20

- 대상: ① AIMaster 운영 공용 DB ref `esgxyikcnnvmlhygjkth` + 메인 사이트 + 연동을 쓰는 서브프로그램
- 작성: Claude Code(윈도우) · 상태: **⓪·① 승인(2026-10-20 「진행해」)·적용** → ②부터 단계별 보고 후 승인. 현황: [`MEMBER_INTEGRATIONS.md`](MEMBER_INTEGRATIONS.md) §6
- 근거 지시: 루트 `CLAUDE.md` 최상단 「회원 연동 정보 공용 저장·재사용 규칙」(2026-10-19), `docs/HANDOFF.md` 2026-10-19 대기 항목
- 확정 후 결과 정리 문서: `docs/MEMBER_INTEGRATIONS.md`(카탈로그·저장 구조·쓰는 법)

## 1. 문제 — 지금 상태 (2026-10-20 조사, 운영 DB 건수는 키 값 없이 세기만 함)

### 1-1. 이미 공용인 것 (잘 되고 있음 → 그대로 유지)
| 저장소 | 무엇 | 쓰는 프로그램 |
|---|---|---|
| `user_api_keys` (199행, 회원 36명, 키 종류 37개) | AI·서비스 키, Meta/Threads 앱 ID·시크릿, 네이버·쿠팡·토스 등 | 거의 전부 |
| `user_solapi_accounts` | 솔라피 키·발신번호 | CRM·예약 알림·카카오·트렌드·부동산·메인(비밀번호 찾기) |
| `user_smtp_accounts` | 회원 메일 발송 계정 | 스텝메일·CRM·예약 알림·카카오·트렌드 |
| `newsblur_accounts` | 뉴스블러 계정 | threads·shots·INSTA·네이버 카페 |
| `personal_access_tokens` | 확장·앱 연결용 토큰 | 네이버 블로그 계열·Threads 운영 |

### 1-2. 같은 플랫폼을 프로그램마다 따로 저장 (중복 연결의 원인)
| 플랫폼 | 프로그램별 표 | 칸 구성 | 운영 실측 |
|---|---|---|---|
| **Threads** | `threads_accounts`(threads 9) · `tap_accounts`(쇼핑제휴 6) · `tco_threads_accounts`(운영 자동화 6) · `th_accounts`(댓글 3) | 4개 모두 `threads_user_id·username·access_token·token_expires_at` 거의 동일 | 연결 회원 12명 중 **6명이 2곳 이상 중복 연결** |
| **Instagram** | `insta_accounts`(INSTA 2, 카드뉴스가 이미 재사용) · `instagram_accounts`(shots 1) · `ig_accounts`(댓글 2) · `dm_accounts`(DM 2) | 계정 ID·토큰·만료 동일, 이름만 다름 | 2명 **전원** 중복 |
| **YouTube** | `youtube_accounts`(shots) · `ytreply_accounts`(자동답글) | 채널 ID·토큰·refresh_token | 1명 중복 |
| 카카오·네이버 | `user_kakao_accounts` · `ncafe_accounts` · `nba_accounts`(블로그 ID, 토큰 아님) | 각 1개 프로그램 | 중복 없음(아직) |

### 1-3. ~~같은 값의 이름이 섞임~~ → 정정(2026-10-20 착수 때 확인)
- `meta_app_id`(Instagram 앱) · `facebook_app_id`(Facebook 앱, 0037 마이그레이션) · `threads_app_id`(Threads 앱)는 **서로 다른 앱의 값을 일부러 나눈 것**이다. 별칭으로 합치지 않는다. 카탈로그에는 항목별로 어떤 키 이름을 쓰는지만 적는다.

### 1-4. 그냥 합칠 수 없는 이유 — **권한 범위(scope)가 프로그램마다 다르다**
| 플랫폼 | 프로그램 | 요청 권한 |
|---|---|---|
| Threads | threads · 쇼핑제휴 · 운영 자동화 | `threads_basic, threads_content_publish` |
| Threads | 댓글 자동화 | 위 + `threads_read_replies, threads_manage_replies` |
| Instagram | INSTA(인스타 로그인) | `instagram_business_basic, instagram_business_content_publish` |
| Instagram | 댓글 / DM | `…basic` + `…manage_comments` / `…manage_messages` |
| YouTube | 자동답글 | `youtube.force-ssl` (shots는 업로드 권한) |

→ 게시 권한만 받은 토큰을 댓글 프로그램이 쓰면 실패한다. **토큰과 함께 「받은 권한 목록」을 저장하고, 모자라면 「권한 추가 연결」로 합집합 권한을 다시 받는** 구조가 필요하다.

## 2. 설계

### 2-1. 새 표 2개 (기존 표는 하나도 바꾸거나 지우지 않음)
**① `integration_catalog` — 플랫폼 항목 목록(카탈로그), 읽기 전용 공개 목록**
| 칸 | 뜻 | 예 |
|---|---|---|
| `key` (PK) | 항목 이름 | `threads`, `instagram`, `youtube`, `kakao`, `naver_login`, `openai`, `solapi` |
| `kind` | `oauth_account`(연결형) / `api_key`(키 입력형, 실제 값은 `user_api_keys`) / `account_set`(솔라피·SMTP처럼 전용 표) | |
| `label`, `description` | 화면 표시 이름·설명 | 「Threads 계정」 |
| `key_names` | 이 항목이 `user_api_keys`에서 쓰는 키 이름들 | `{threads_app_id, threads_app_secret}` |
| `scope_sets` | 권한 묶음 이름 → 권한 목록 | `{"publish":[…], "replies":[…]}` |
| `guide_id` | 연동 매뉴얼 글(`platform_guides`) | |
| `connect_program` | 「여기서 한 번 연결해 주세요」 안내할 대표 프로그램 주소 | |

**② `member_platform_accounts` — 회원별 연결 계정(연결형 공용 저장)**
| 칸 | 뜻 |
|---|---|
| `id`, `user_id`(→ auth.users, cascade) | 소유자 |
| `platform` (→ catalog.key) | `threads` / `instagram` / `youtube` / `kakao` / `naver_login` |
| `external_id`, `username` | 플랫폼 계정 ID·이름 |
| `access_token`, `refresh_token`, `token_expires_at`, `refresh_expires_at` | 토큰 |
| `granted_scopes text[]` | **실제로 받은 권한** |
| `auth_method` | 예: 인스타 `facebook_login` / `instagram_login` |
| `extra jsonb` | 플랫폼별 추가값(페이지 ID 등) |
| `needs_reconnect`, `last_checked_at`, `connected_via`(어느 프로그램에서 연결했는지), `created_at`, `updated_at` | 상태·기록 |
- 고유 조건 `(user_id, platform, external_id)` — 한 회원이 같은 플랫폼 계정 여러 개도 가능(Threads 운영 자동화처럼), 기본 계정은 `is_default`.
- RLS: **본인 행만**. 화면용 조회는 토큰 칸을 빼는 보기(`member_platform_accounts_public`)만 회원에게 열고, 토큰은 서버(서비스 키)에서만 읽는다(지금 프로그램별 표보다 한 단계 안전).

### 2-2. 공용 읽기 부품 (기준 코드 1개 → 사본, `docs/SHARED_MODULES.md` 등록)
- `getMemberAccount(userId, platform, { needScopes })` → 계정 있음 / **권한 부족(추가 연결 필요)** / 없음(「○○에서 한 번 연결해 주세요」) 세 가지로 돌려줌.
- `saveMemberAccount(...)` — OAuth 콜백에서 저장. 권한은 이번 연결에서 요청한 것만 기록(2026-10-20 정정, 합치지 않음).
- 키 입력형(`api_key`)은 지금처럼 각 프로그램의 `resolveApiKey()`로 `user_api_keys`를 읽는다(본인 키만, 폴백 없음). 카탈로그는 화면 표시·안내용.
- 토큰 갱신(60일 Threads 등)은 이 부품 한 곳에서 → 모든 프로그램이 갱신된 토큰을 함께 씀.

### 2-3. 기존 프로그램은 「이중 기록 → 공용 우선 읽기」로 천천히 전환 (깨지지 않게)
1. OAuth 콜백: 지금 표에도 쓰고 **공용 표에도 함께 쓴다**.
2. 읽을 때: 공용 표 먼저(권한 충분하면 사용) → 없으면 지금 표(같은 회원 본인 값이라 규칙 위반 아님).
3. 기존 데이터 옮기기(백필): 4개 Threads 표에서 회원별 **가장 최근에 갱신된 유효 토큰**을 공용 표로 복사(원본 유지). 권한 목록은 그 표를 만든 프로그램의 권한으로 채움.
4. 모든 프로그램 전환·안정화 확인 후에야 옛 표 정리 여부를 주인님께 따로 여쭘(이번 플랜 범위 아님).

### 2-4. 회원 화면
- 메인 사이트 `/api-settings`(기존 「API 설정」) 아래 **「내 연동 정보」**: 카탈로그 항목마다 연결 여부·계정 이름·만료일·받은 권한·연결한 프로그램 표시, 「연결 해제」. 토큰 값은 절대 표시 안 함.
- 각 프로그램 설정 화면: 이미 연결돼 있으면 「다른 프로그램에서 연결한 계정을 사용 중입니다(@이름)」, 권한이 모자라면 「권한 추가 연결」 버튼.

## 3. 진행 순서 (한 단계씩, 단계마다 배포·검수·보고)
| 단계 | 내용 | 바뀌는 곳 | 승인 |
|---|---|---|---|
| **0** | 표 2개 + RLS + 화면용 보기 + 카탈로그 첫 항목(연결형 5개 + 기존 공용 항목) | 운영 DB(크롬 SQL Editor로 직접 실행), `supabase/migrations/0039_member_integrations.sql` | **이번에 요청** |
| 1 | 기준 부품 `lib/memberIntegrations.ts` + 메인 「내 연동 정보」(읽기·해제) | 메인 사이트 | 0 승인에 포함 |
| 2 | **시범: Threads** — threads(v1.21) → 댓글 자동화 순서로 이중 기록·공용 우선 읽기 + Threads 백필 | 2개 프로그램 | 단계 1 끝나고 결과 보고 후 |
| 3 | 나머지 Threads(쇼핑제휴·운영 자동화) | 2개 | 시범 결과 보고 후 |
| 4 | Instagram(INSTA·카드뉴스·댓글·DM·shots), 인플루언서·웹툰 인스타 게시는 처음부터 이 구조로 | 5~7개 | 〃 |
| 5 | YouTube·카카오·네이버 | 〃 | 〃 |

## 4. 검수
- 단계 0: 운영 DB에서 표·RLS 확인 — 시험 계정(`buylifemall@naver.com`) 세션으로 **남의 행 0건**, 토큰 칸 직접 조회 거부 확인.
- 단계 1·2: `npx tsc --noEmit`·테스트·`npm run build` → 한 프로그램씩 배포 → 크롬 실검수: threads에서 연결 → 「내 연동 정보」에 표시 → 댓글 자동화에서 **다시 연결 없이** 「권한 추가 연결」만으로 동작. 실제 게시·댓글은 하지 않거나 주인님 허락 후 1건.
- 이미 연결한 회원이 아무것도 안 해도 지금처럼 동작하는지(이중 기록·옛 표 폴백) 확인.

## 5. 비용
| 구분 | 내용 |
|---|---|
| 개발·시험 | 없음(DB 표·코드만, 유료 API 호출 없음) |
| 운영자 인프라 | 없음(공용 DB에 작은 표 2개). 배포는 단계마다 한 프로그램씩 순차 |
| 회원 부담 | 없음(오히려 연결 횟수 감소) |

## 6. 위험과 대책
| 위험 | 대책 |
|---|---|
| 권한이 적은 토큰으로 덮어써 다른 프로그램이 멈춤 | ~~저장 시 권한 합집합~~ → **정정(2026-10-20)**: 새 토큰에 이전 권한이 있다고 보장할 수 없어 「이번 연결에서 요청한 권한만」 기록. 권한이 모자라면 그 프로그램은 자기 표 토큰으로 돌아감(이중 기록 기간) |
| 한 프로그램에서 「연결 해제」 → 다른 프로그램도 끊김 | 프로그램 화면의 해제는 「이 프로그램에서 사용 안 함」, 완전 해제는 「내 연동 정보」에서만(안내 문구로 구분) |
| 회원 본인 Meta 앱이 프로그램마다 다를 수 있음 | 토큰에 `app_ref`(어느 앱 ID로 받았는지) 기록, 다르면 공용 사용 대신 기존 방식 유지 |
| 옛 표와 공용 표 값이 어긋남 | 전환 기간엔 공용 우선 + 콜백 이중 기록, 갱신도 양쪽 |
| 토큰 평문 저장 | 지금과 같은 수준 + 토큰 칸은 서버만 읽게 강화. 암호화 저장은 별도 개선 과제로 기록 |

## 7. 인수인계 산출물
`docs/MEMBER_INTEGRATIONS.md`(확정 구조·카탈로그·쓰는 법), `docs/SHARED_MODULES.md`·`docs/SHARED_FEATURE_MAP.md` 기준 코드 등록, `docs/PROGRAM_IDEA_BACKLOG.md` 항목, 각 프로그램 `AGENTS.md`·버전 +0.01, `docs/HANDOFF.md`, 발견 사항은 `docs/ERROR_LESSONS.md`.
