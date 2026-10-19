# 회원 연동 정보 공용 저장 — 확정 구조·쓰는 법

- 근거: 루트 `CLAUDE.md` 최상단 「회원 연동 정보 공용 저장·재사용 규칙」, 개발 플랜 [`PLAN_20261020_MEMBER_INTEGRATIONS.md`](PLAN_20261020_MEMBER_INTEGRATIONS.md)
- 대상: ① AIMaster 운영 공용 DB ref `esgxyikcnnvmlhygjkth` (② Lab은 해당 없음)
- 현재 단계: **⓪·①·② 완료(2026-10-20)** — 표·권한·공용 부품·메인 「내 연동 정보」 + Threads 시범 2개(threads v1.22·threads-comment-reply v1.13)가 이 표를 읽고 쓴다. ③부터 대기.

## 1. 저장 위치 한눈에
| 무엇 | 어디에 | 비고 |
|---|---|---|
| AI·서비스 키, 플랫폼 **앱** ID·시크릿 | `user_api_keys` (기존) | 각 프로그램 `resolveApiKey()` — 본인 키만, 폴백 없음 |
| 플랫폼 **연결 계정**(OAuth 토큰) | `member_platform_accounts` (신규, 0039) | 이 문서의 공용 부품으로만 읽고 쓴다 |
| 솔라피·SMTP·NewsBlur | `user_solapi_accounts` · `user_smtp_accounts` · `newsblur_accounts` (기존) | 이미 공용 |
| 항목 목록(카탈로그) | `integration_catalog` (신규, 0039) | 새 플랫폼은 여기 한 줄 추가부터 |

`meta_app_id`(Instagram 앱)·`facebook_app_id`(Facebook 앱)·`threads_app_id`(Threads 앱)는 **서로 다른 앱**이다. 합치지 않는다(0037 마이그레이션).

## 2. 표 구조 (상세: `supabase/migrations/0039_member_integrations.sql`)
- `integration_catalog(key PK, kind[oauth_account|api_key|account_set], label, description, key_names[], scope_sets jsonb, guide_id, connect_program_url, sort_order, is_active)` — 누구나 읽기, 쓰기는 서비스 키.
- `member_platform_accounts(user_id, platform→catalog.key, external_id, username, access_token, refresh_token, token_expires_at, refresh_expires_at, granted_scopes[], auth_method, app_ref, extra, is_default, needs_reconnect, last_checked_at, connected_via, …)`, 고유 `(user_id, platform, external_id)`.
- 권한(2026-10-20 운영 DB에서 `has_column_privilege`로 확인): 회원(authenticated)은 **토큰·extra를 뺀 칸만 SELECT**, 본인 행 DELETE만. INSERT·UPDATE는 서비스 키만. 비로그인(anon) 접근 없음. RLS 본인 행만.
  - 그래서 브라우저에서 이 표를 읽을 때는 **칸 이름을 직접 적어야 한다** — `select("*")`는 권한 오류.

## 3. 카탈로그 첫 항목 (2026-10-20)
| key | 종류 | 권한 묶음(`scope_sets`) | 연결 안내 프로그램 |
|---|---|---|---|
| `threads` | 연결형 | `publish`=basic+content_publish / `replies`=+read_replies+manage_replies | auto-threads-posting |
| `instagram` | 연결형 | `publish` / `comments` / `messages` (instagram_business_*) | auto-instagram-posting |
| `youtube` | 연결형 | `manage`=youtube.force-ssl | youtube-auto-reply |
| `kakao` | 연결형 | — | kakao-auto-posting |
| `naver_login` | 연결형 | — | naver-cafe-poster |
| `solapi`·`smtp`·`newsblur` | 전용 표 | — | — |
| `cronjob_org` | 키 입력형 | — | — |

## 4. 공용 부품 — 기준 코드 `lib/memberIntegrations.ts`
| 함수 | 쓰는 곳 | 동작 |
|---|---|---|
| `getMemberAccount(userId, platform, { needScopes })` | 게시·댓글 등 토큰이 필요할 때 | `ok` / `missing_scopes`(권한 추가 연결 안내) / `not_connected`(「○○에서 한 번 연결해 주세요」 + 카탈로그 주소) |
| `saveMemberAccount({...})` | OAuth 콜백 | 새 토큰으로 바꾸고 **이번 연결에서 요청한 권한만** 기록(합치지 않음 — 2026-10-20 정정: 새 토큰에 이전 권한이 있다고 보장 못 함), 같은 앱이면 refresh_token이 안 오면 기존 값 유지 |
| `updateMemberAccountToken(...)` | 토큰 갱신 | 권한·연결 정보는 그대로 |
| `markMemberAccountNeedsReconnect(...)` | 토큰 만료·폐기 감지 | 「다시 연결 필요」 표시 |

- 서브프로그램은 이 파일의 **사본**을 쓴다(서비스 클라이언트 import만 그 프로그램 것). 첫 사본이 생기는 ②단계에서 `docs/SHARED_MODULES.md`·`docs/SHARED_FEATURE_MAP.md`에 기준·사본을 등록하고 `scripts/check-shared-modules.mjs` 대상에 넣는다.

## 5. 프로그램을 전환하는 법 (②단계부터, 한 프로그램씩)
1. OAuth 콜백: 지금 쓰던 표에 저장 **+** `saveMemberAccount()` (이중 기록, `connectedVia`=프로그램 slug, `grantedScopes`=그 프로그램이 요청한 권한, `appRef`=회원 앱 ID).
2. 토큰을 읽는 곳: `getMemberAccount(…, { needScopes })` 먼저 → `ok`면 사용, 없으면 지금 쓰던 표(같은 회원 본인 값). `missing_scopes`면 「권한 추가 연결」 버튼(OAuth에 합집합 권한 요청).
3. 설정 화면: 공용 계정이 있으면 「다른 프로그램에서 연결한 계정 사용 중(@이름)」.
4. 백필(시범 플랫폼 단위): 기존 표에서 회원별 최근 유효 토큰을 공용 표로 복사(원본 유지) — 운영 DB 쓰기라 주인님 승인 후 크롬 SQL Editor.
5. 버전 +0.01, 이 문서 §6 현황표 갱신.

## 6. 적용 현황
| 단계 | 상태 | 날짜·증거 |
|---|---|---|
| ⓪ 표·권한·카탈로그 | ✅ 운영 DB 적용 | 2026-10-20, 크롬 SQL Editor 실행 `Success`, 권한 점검(카탈로그 9건·회원 토큰 읽기 false·삭제 true·쓰기 false·anon false) |
| ① 공용 부품·메인 「내 연동 정보」 | ✅ 배포·검수 | 2026-10-20, 커밋 `abe0e3ed`, 배포 `aimaster-qr1exmnyd`, 크롬 실화면 + 실제 세션 REST(토큰 칸 403·화면용 칸 200·직접 저장 403) |
| ② Threads 시범(threads → threads-comment-reply) | ✅ 배포·검수 | 2026-10-20 — threads v1.21(`b35cd3d2`, 배포 `threads-mek0znfgm`)→v1.22(`3e5595fc`, `threads-ay42ddvth`), 댓글자동화 v1.13(`threads-comment-reply-qu57ukuso`). 백필: threads 9건(만료 전 전부, `app_ref` 9건 채움), 댓글자동화 0건(3명 모두 이미 공용 행 있음 → 자기 표 토큰 계속 사용). 크롬: threads 설정·대시보드 연결 정상, 메인 「내 연동 정보」에 @계정·만료일·권한 표시, 댓글자동화 설정 연결 정상·「게시물 동기화」 3,965건 성공(대체 경로 `th_accounts`), 공용 행 변화 없음 |
| ③ 나머지 Threads(쇼핑제휴·운영 자동화) | ⚪ | — |
| ④ Instagram(INSTA·카드뉴스·댓글·DM·shots·인플루언서·웹툰) | ⚪ | — |
| ⑤ YouTube·카카오·네이버 | ⚪ | — |

## 7. 주의 (2026-10-20 ②단계에서 확인)
- **권한은 합치지 않는다**: 게시 프로그램이 다시 연결하면 공용 토큰이 게시 권한 토큰으로 바뀐다. 댓글 권한이 필요한 프로그램은 `missing_scopes`를 받고 자기 표 토큰으로 돌아간다(이중 기록 기간에는 그래서 안전). 옛 표를 없애기 전에 「권한 추가 연결」 버튼을 먼저 만들어야 한다.
- **계정 이름 필수 조건**: 댓글자동화는 자기 답글을 다시 수집하지 않도록 계정 이름으로 거른다 — 공용 계정에 이름이 없으면 쓰지 않는다(`getReplyAccount`).
- **연결 해제는 공용 계정까지 지운다**: 한 프로그램에서 해제하면 같은 Threads 계정을 쓰는 다른 프로그램도 공용 계정이 사라진다(그 프로그램 자기 표가 남아 있으면 그것을 씀). 설정 화면에 안내 문구 있음.
- **Meta 제거·삭제 콜백**(`threads-affiliate-poster` `/api/threads/uninstall`·`/delete`)은 아직 공용 표를 지우지 않는다 → ③단계(쇼핑제휴 전환) 때 함께 처리.
- 토큰 자동 갱신은 지금 댓글자동화만 한다(공용 계정을 쓸 때 공용 표 갱신). threads·쇼핑제휴·운영 자동화는 갱신 기능이 없다(기존과 같음).
