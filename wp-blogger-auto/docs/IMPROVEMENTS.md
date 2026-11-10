# 개선·검수 원장 — AI 워드프레스·구글블로그 자동화

## 2026-11-10 공용 기준 코드에 남길 개선 2건 ([역할: blog] `claude-win-blog`, 2-2 작업 중 발견)
- **`lib/memberIntegrations.ts`의 `MemberPlatform` 형식에 `wordpress`·`blogger` 없음** — 카탈로그(DB)에는 등록됨. 기준을 고치면 사본 10여 곳이 함께 바뀌어 지금은 건드리지 않고, 이 프로그램은 `src/lib/wordpressConnect.ts`에서 형식만 바꿔 씀. 다음에 기준을 고칠 때 형식에 두 값을 더하고 이 우회를 지운다.
- **발행 엔진 `src/lib/publish/http.ts`에 내부망 차단이 없었음(SSRF 위험)** — 회원이 넣은 주소로 서버가 요청하므로 공용 `safe-fetch` 사본을 `fetchImpl`로 끼움(`safeFetchImpl`). 발행 엔진을 다른 프로그램 공용 기준으로 등록할 때 이 기본값을 같이 옮길 것. 남은 한계: `safe-fetch`는 리디렉트 때 같은 요청(인증 머리글 포함)을 다시 보냄 — 회원 본인 비밀번호가 회원이 넣은 사이트의 리디렉트 대상으로 갈 수 있음(회원 본인 위험, 낮음). 연결 때 정확한 https 주소를 쓰도록 안내.

