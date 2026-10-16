# AGENTS.md — 뮤직비디오 자동화 (music-video-studio)

작업 전 루트 `CLAUDE.md`, `docs/HANDOFF.md`, `docs/ERROR_LESSONS.md`와 이 폴더 `README.md`를 읽는다.

- 현재 버전 **v1.02** (`src/lib/version.ts`, `package.json`, DB `programs.version`, 마이그레이션 SQL, README 작업 기록을 같이 올린다).
- 최상위 규칙: 모든 AI 호출은 **회원 본인 Gemini 키**(`user_api_keys`, 서버에서만). 키를 브라우저로 내려보내거나 운영자·다른 회원 키로 폴백하지 않는다.
- 모든 API route는 `authorize()`(로그인+프로그램 권한) → `requireGeminiKey()` 순서, `dynamic`/`fetchCache` 두 줄 필수.
- 영상 내려받기 주소는 작업 결과에서만 얻고 `isAllowedVideoUri`로 Google 주소만 허용한다(SSRF 방지). 작업 이름은 `isAllowedOperationName`으로 검증.
- 유료 호출(이미지·영상) 앞에는 예상 비용 확인창을 둔다(`/scenes`). 요금표가 바뀌면 `VEO_MODELS.usdPerSecond`를 고친다.
- 이미지·영상 결과는 저장하지 않는다(용량). 글 상태만 localStorage(`music_video_studio_project_v1`).
- 참고 도구 대조 이력과 미검증 항목은 `README.md` "작업 기록·남은 일" 참고.
- v1.04 (2026-10-12): 핸드폰 번호 필수 정책 적용 — 핸드폰 번호가 없는 회원(관리자 제외)은 이용할 수 없고 메인 사이트 설정에서 번호를 등록하도록 안내합니다. 공용 규칙은 루트 `lib/utils/phone.ts`, 상세는 `docs/HANDOFF.md` 2026-10-12 항목.


## B5 (2026-10-15) — 한국 시간 현재 월 기준 추가 (v1.04)

- 주 생성·분석 지침에 한국 시간 기준 현재 연·월을 반영하고, 계절·시기 표현은 현재 월에 맞추며 불필요한 계절·연도 표현을 덧붙이지 않도록 했습니다.


## 2026-10-16 DB 연동 변수 호환 — v1.05 (music-video-studio)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.
