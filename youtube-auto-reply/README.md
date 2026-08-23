# 💬 YouTube Auto Reply — 유튜브 댓글 자동 답글

내 유튜브 채널에 달린 댓글을 AI가 읽고 사람처럼 자연스러운 답글(원하는 링크 포함)을 초안으로
만들어주고, 검토 후 게시할 수 있는 프로그램.

## 설계 배경

Make.com 시나리오 없이 완전 신규로 기획했다. 기본은 채널의 **모든 영상**에 댓글 자동화가
동작하고, 원치 않는 영상만 개별로 끌 수 있게 만들었다(사용자 요청사항).

### 유튜브 정책 준수 — "봇 로직에 걸리지 않게" 설계한 방법

사용자가 "유튜브 AI 로직 검토에 안 걸리게, 각 사용자의 PC자원(IP/아이디) 기준으로 서로 다른
데이터가 오가게 만들어야 한다"고 요청해서, 실제로 [YouTube API Services Developer
Policies](https://developers.google.com/youtube/terms/developer-policies) 원문과 커뮤니티
사례를 조사했다. 결론: **IP를 사용자별로 분리하는 게 정책 요건이 아니다.**

- **III.I.2조**: *"you must not automate or trigger... comments... without the user's prior
  specific and express consent"* — 자동화 자체가 아니라 **행동마다 사용자의 사전 명시적 동의**가
  요구된다.
- **III.E.3.d조**: 사용자를 대신해 데이터를 등록/변경하는 행동은 실행 전에 사용자가 명시적으로
  동의해야 한다.
- IP 주소·서버 분리에 대한 요구사항은 정책 어디에도 없다. 대신 구글이 공식적으로 제공하는
  다중 사용자 구분 메커니즘은 `quotaUser` 파라미터(사용자별 식별값)다 — IP가 아니라 이 값으로
  요청 주체를 구분한다.
- 실제 스팸 판정 기준은 서버 IP 개수가 아니라 **내용/패턴**이다(판에 박힌 문구 반복, 짧은 간격
  연속 게시, 무차별 링크 도배). replient.ai/commentshark.com/replytide.co 같은 상용 서비스가
  이미 공식 API로 같은 기능을 정상 운영 중이다.

**반영한 조치:**
1. **AI가 댓글마다 다른 답글 초안을 생성 → 화면에서 사람이 검토·수정 → "게시" 버튼을 직접
   눌러야만 실제로 올라간다.** 이 버튼 클릭 자체가 정책이 요구하는 "건별 사전 명시적 동의"다
   (`lib/actions/comments.ts`의 `postReplyAction`). Phase 1은 자동 즉시게시를 하지 않는다.
2. 모든 YouTube API 호출에 `quotaUser=user.id`를 넣어 사용자별로 요청을 구분한다
   (`lib/youtube/client.ts`).
3. 한 번 동기화당 영상별 최근 댓글 20개까지만 가져와서, 몰아서 대량 처리하지 않는다.

## 유튜브 OAuth — shots(유튜브 쇼츠 자동생성)와 같은 원칙, 다른 스코프

`youtube.upload`/`youtube.readonly`처럼 `youtube.force-ssl`도 Google이 "민감 범위"로 분류해서,
앱이 구글 검증을 통과하기 전까지는 사용자가 각자 자신의 **Google Cloud OAuth Client ID/Secret**을
등록해야 한다(공용 buylife 앱 불가). `google_client_id`/`google_client_secret`은 이미
`user_api_keys`의 공용 provider라 shots에서 이미 등록한 사용자는 값 재사용이 가능하지만,
**리디렉션 URI는 이 프로젝트 것을 Google Cloud Console에 추가로 등록**해야 한다(설정 화면에
안내 문구 있음). 스코프가 shots와 달라서 **OAuth 토큰 자체는 공유하지 않고**
`ytreply_accounts`(이 프로젝트 전용 테이블)에 따로 저장한다.

앱이 미검증 상태면 refresh_token이 7일 후 만료되어 재연결이 필요해지는 것도 shots와 동일하다
(`getYoutubeConnectionStatus()`의 `needsReconnect` 패턴 재사용).

## 데이터 모델

- `ytreply_accounts` — 유튜브 OAuth 연결(user_id unique)
- `ytreply_videos` — 채널 영상 동기화 결과, `is_monitored`(기본 true) + `custom_link`(영상별 링크 오버라이드)
- `ytreply_settings` — 채널 기본 링크 + AI 답글 톤 커스텀 지시문
- `ytreply_comments` — 수집한 댓글 + AI 초안 + 상태(`pending_review`/`posted`/`skipped`/`failed`)

## 핵심 흐름

1. `/settings` — Google OAuth 채널 연결
2. `/videos` — "채널 영상 동기화" → 영상 목록(기본 전체 모니터링) → 개별 on/off, 링크 오버라이드
3. `/comments` — "지금 새 댓글 확인하기" → 신규 댓글 수집 + AI 초안 생성(`syncCommentsAction`) →
   초안 검토/수정 → "게시"(`postReplyAction`, 실제 유튜브 API 호출)

## Phase 진행 상태

[AGENTS.md](AGENTS.md)의 Phase 표 참고.

## 명령어

```bash
npm run dev       # 로컬 개발 서버
npm run build     # 프로덕션 빌드
```

## 환경변수 (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_MAIN_SITE_URL=
NEXT_PUBLIC_SITE_URL=
GOOGLE_YOUTUBE_REDIRECT_URI=
```
