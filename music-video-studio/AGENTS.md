# AGENTS.md — 뮤직비디오 스튜디오 (music-video-studio)

작업 전 루트 `CLAUDE.md`, `docs/HANDOFF.md`, `docs/ERROR_LESSONS.md`와 이 폴더 `README.md`를 읽는다.

- 현재 버전 **v1.01** (`src/lib/version.ts`, `package.json`, DB `programs.version`, 마이그레이션 SQL, README 작업 기록을 같이 올린다).
- 최상위 규칙: 모든 AI 호출은 **회원 본인 Gemini 키**(`user_api_keys`, 서버에서만). 키를 브라우저로 내려보내거나 운영자·다른 회원 키로 폴백하지 않는다.
- 모든 API route는 `authorize()`(로그인+프로그램 권한) → `requireGeminiKey()` 순서, `dynamic`/`fetchCache` 두 줄 필수.
- 영상 내려받기 주소는 작업 결과에서만 얻고 `isAllowedVideoUri`로 Google 주소만 허용한다(SSRF 방지). 작업 이름은 `isAllowedOperationName`으로 검증.
- 유료 호출(이미지·영상) 앞에는 예상 비용 확인창을 둔다(`/scenes`). 요금표가 바뀌면 `VEO_MODELS.usdPerSecond`를 고친다.
- 이미지·영상 결과는 저장하지 않는다(용량). 글 상태만 localStorage(`music_video_studio_project_v1`).
- 참고 도구 대조 이력과 미검증 항목은 `README.md` "작업 기록·남은 일" 참고.
