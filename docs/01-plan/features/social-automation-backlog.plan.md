---
template: plan
version: 1.0
description: Threads/Instagram/YouTube 추가 자동화 프로그램 작업 대기 리스트
variables:
  - feature: social-automation-backlog
  - date: 2026-08-26
  - author: buylifemall@gmail.com
  - project: ai-master
---

# social-automation-backlog Planning Document

> **Summary**: threads-comment-reply/instagram-comment-reply/youtube-auto-reply(각 플랫폼 "내 콘텐츠
> 댓글에 AI 답글")를 만든 뒤, 세 플랫폼 공식 API 전체를 조사해서 **추가로 안전하게(공식 API +
> 정책 준수) 만들 수 있는 자동화 후보**를 정리했다. 하나씩 골라서 다음 서브프로젝트로 이어갈 때
> 이 문서를 참고한다.
>
> **Project**: ai-master
> **Author**: buylifemall@gmail.com
> **Date**: 2026-08-26
> **Status**: 대기 — 아직 착수한 항목 없음

---

## ⚠️ 조사 결과 하지 않기로 확정한 것

**"키워드로 다른 사람의 게시물/영상을 검색해서 좋아요 + AI 댓글을 자동으로 다는 아웃바운드 참여
자동화"는 세 플랫폼 모두 만들지 않는다.**

- Instagram/Threads: 좋아요 API 자체가 없고, 키워드 검색은 App Review 필요(Threads) 또는 구버전
  API 전용(Instagram)이며, 남의 콘텐츠에 새 댓글 작성 자체가 API로 막혀 있다.
- YouTube: API 자체는 가능하지만(`search.list`+`videos.rate`+`comments.insert`), YouTube API
  Services Developer Policies가 "자동화된 좋아요/댓글로 참여를 인위적으로 부풀리는 행위"를
  명시적으로 금지하고 있어 정책 위반이 확정적이다.

이 결론은 지금까지 지켜온 "차단당하지 않는 안전한 설계"(사전 동의, inbound 성격, 본인 콘텐츠
범위) 원칙과 정확히 일치한다. 아래 후보 전부 이 원칙 안에서만 골랐다.

---

## 우선순위 추천

**⭐ 다음 후보 1순위: 인스타그램 DM 자동응답 챗봇**
`instagram_business_manage_messages` 권한은 **본인 테스터 계정 25개까지 App Review 없이 바로
사용 가능**하다(instagram-comment-reply와 동일한 "본인 앱 + 본인 테스터" 패턴 그대로 적용).
ManyChat 등 상용 서비스가 이미 이 방식으로 검증했다.

---

## 🧵 Threads 후보

| 기능 | 필요 권한 | 상태 |
|---|---|---|
| 동영상/캐러셀(최대 20장) 게시 확장 | `threads_content_publish` | ⏳ 대기 |
| 투표(poll) 첨부 게시 | `threads_content_publish` | ⏳ 대기 |
| 게시물 성과 리포트 자동화(텔레그램 요약 등) | `threads_manage_insights` | ⏳ 대기 |
| 멘션 확인 + AI 자동 답글 | `threads_manage_mentions`(App Review 필요) | ⏳ 대기 |
| 부적절한 댓글 자동 숨김(모더레이션) | `threads_manage_replies` | ⏳ 대기 |
| 댓글 승인제 자동 처리(2026 신규) | `threads_manage_replies` | ⏳ 대기 |
| 폴링 → 실시간 웹훅 전환 | Webhook 구독(replies/mentions/delete/publish) | ⏳ 대기 |

## 📸 Instagram 후보

| 기능 | 필요 권한 | 상태 |
|---|---|---|
| **DM 자동응답 챗봇** | `instagram_business_manage_messages` | ⏳ 대기(1순위 추천) |
| 멘션(태그) 감사 답글 | Mentions API | ⏳ 대기 |
| 성과 리포트 자동 발송 | Insights API | ⏳ 대기 |
| 악성 댓글 자동 숨김 | `instagram_business_manage_comments`(instagram-comment-reply가 이미 보유) | ⏳ 대기 |
| 스토리 예약 게시(insta_auto_poster 확장) | Content Publishing API | ⏳ 대기 |

## ▶️ YouTube 후보

| 기능 | 필요 권한 | 상태 |
|---|---|---|
| 채널 성과 자동 리포트 | YouTube Analytics API | ⏳ 대기 |
| 영상 메타데이터 일괄 관리 | `videos.update` | ⏳ 대기 |
| 신규 영상 자동 재생목록 추가 | `playlistItems.insert` | ⏳ 대기 |
| AI 자막 자동 생성·업로드 | `captions.insert` | ⏳ 대기 |
| 라이브 채팅 자동 응답 | `liveChatMessages` | ⏳ 대기 |
| 멤버십/슈퍼챗 자동 감사 인사 | `superChatEvents` 등 | ⏳ 대기 |
| ~~커뮤니티 탭 자동 게시~~ | — | ❌ 불가능(API 2024.4 지원 중단 확인됨) |

---

## 착수 시 진행 방식

1. 이 목록에서 사용자가 하나를 고른다.
2. 필요하면 그 기능만 다시 한번 최신 공식 문서로 재확인(정책/엔드포인트는 계속 바뀔 수 있음).
3. 기존 서브프로젝트 확장인지(예: instagram-comment-reply에 DM 기능 추가) 신규 서브프로젝트인지
   판단 — DM 챗봇처럼 성격이 다른 기능은 별도 서브프로젝트(`instagram-dm-reply` 등)로 분리하는
   쪽을 우선 검토한다(멀티테넌시 원칙, 프로그램 카탈로그 단위와도 맞음).
4. 착수한 항목은 이 표의 상태를 "⏳ 대기" → "🚧 진행 중" → "✅ 완료"로 갱신하고, 완료되면 해당
   서브프로젝트의 AGENTS.md/README.md로 상세 내용을 옮긴다.

## 리서치 근거 (원본 조사 출처)

- Threads: [Threads Posts](https://developers.facebook.com/documentation/threads/posts), [Publishing Reference](https://developers.facebook.com/docs/threads/reference/publishing/), [Threads Insights](https://developers.facebook.com/docs/threads/insights), [Threads Mentions](https://developers.facebook.com/docs/threads/threads-mentions), [Reply Management](https://developers.facebook.com/docs/threads/reference/reply-management/), [Threads Webhooks](https://developers.facebook.com/docs/threads/webhooks)
- Instagram: [Instagram Messaging API](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/messaging-api), [Mentions](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/mentions/), [Insights](https://developers.facebook.com/docs/instagram-platform/insights/), [Comment Moderation](https://developers.facebook.com/docs/instagram-platform/comment-moderation/)
- YouTube: [Channel Reports](https://developers.google.com/youtube/analytics/channel_reports), [Videos: update](https://developers.google.com/youtube/v3/docs/videos/update), [PlaylistItems: insert](https://developers.google.com/youtube/v3/docs/playlistItems/insert), [Captions: insert](https://developers.google.com/youtube/v3/docs/captions/insert), [LiveChatMessages](https://developers.google.com/youtube/v3/live/docs/liveChatMessages), [Revision History](https://developers.google.com/youtube/v3/revision_history)

## Version History

| 버전 | 날짜 | 변경 내용 |
|---|---|---|
| 1.0 | 2026-08-26 | 최초 작성 — 3개 포크 에이전트 조사 결과 취합 |
