# [업무 워크스페이스 담당(workspace)께 · 2026-11-11 영상 담당 요청] 구글 연결 칸에 공용 「내 구글 앱 만들기」 매뉴얼 연결

- **주인님 지시(2026-11-11)**: 「각 개인도 본인계정으로 인증해서 사용하게 할꺼니까 관련 내용을 정리해 사용자 매뉴얼과 해당 연동하는 부분에 찾아서 추가해놔」.
- **영상 담당이 한 일**: 공용 매뉴얼 글 두 개를 오늘 확인한 사실 기준으로 다시 썼습니다(DB `platform_guides`, 빌드 없이 바로 반영).
  - 「내 구글 앱(OAuth 클라이언트) 만들기 — 유튜브·구글블로그·캘린더·Gmail·Drive 공용」 https://www.buylife.xyz/guides/523e7401-7393-44f5-ba45-dd437e10fa2d
  - 「내 유튜브 채널 연결하기 (내 구글 앱으로)」 https://www.buylife.xyz/guides/1c4181ac-a8c4-4b11-80f4-b29f3318c39b
  - 담은 내용: 회원 본인 구글 계정으로 프로젝트 → API 켜기 → 브랜딩(홈페이지·/privacy·/terms, **로고 비우기**) → 웹 애플리케이션 클라이언트 + 프로그램별 리디렉션 URI 표(이 프로그램: `https://ai-work-workspace.buylife.xyz/api/oauth/google-calendar/callback`) → **앱 게시(프로덕션)** → ID·보안 비밀 저장 → 「확인되지 않은 앱」 [고급 → 이동], 막히는 곳(400 redirect_uri_mismatch·구글 500·7일 끊김·권한 체크 해제).
- **핵심 사실(꼭 반영)**: 구글 앱이 「테스트 중」이면 받은 연결(갱신 토큰)이 **7일 뒤 자동으로 끊깁니다.** 「테스트 사용자만 등록하면 계속 쓸 수 있다」는 옛 안내는 틀립니다 → 「대상 → 앱 게시」로 프로덕션 뒤 다시 연결해야 유지됩니다(근거 `docs/ERROR_LESSONS.md` 2026-11-11).
- **요청**: 캘린더 연동(/calendar-sync) 구글 연결 칸·키 화면(KeysForm)에 위 공용 글로 가는 버튼(또는 링크) 한 줄과 「테스트 중이면 7일마다 끊김 → 앱 게시」 문장을 넣어 주세요. 이 프로그램은 Google Calendar API도 켜야 함을 안내에 함께. 작은 수정이라 다음 배포 때 함께 내보내면 됩니다. 이 프로그램 화면에 「테스트 사용자 등록이면 충분」 같은 옛 문구가 있으면 같이 고쳐 주세요.
- 참고 구현: `youtube-viral-studio` v1.28 「내 채널 진짜 지표」(`src/app/(dashboard)/my-channel/page.tsx`·`settings/page.tsx`의 `GuideLinkButton`).
