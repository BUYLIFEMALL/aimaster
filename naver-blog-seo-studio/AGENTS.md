# 네이버 블로그 SEO 스튜디오 개발 지침

이 문서는 루트 `../CLAUDE.md`, `../AGENTS.md`, `../docs/PLATFORM_PATTERNS.md`를 전제로 하는 신규 프로그램 전용 지침입니다.

## 제품 경계

- 기존 `naver-blog-auto-poster_app` 및 `naver-blog-auto-poster_web`과 코드·프로그램 slug·이용권한을 공유하지 않습니다.
- 이 프로그램은 AI 콘텐츠 기획·생성·검수 도구입니다.
- 네이버 최종 발행 버튼을 자동으로 누르지 않습니다.
- 계정 정지 위험이 있는 대량 댓글·공감·이웃추가·무인 포스팅은 구현하지 않습니다.

## 개발 규칙

- 주제와 기능을 실제 사용자 흐름으로 먼저 확인하고 작은 기능 단위로 구현합니다.
- 기존 네이버 화면을 자동 조작하는 기능을 추가할 경우 실제 DOM 조사 후 구현하며 셀렉터를 추측하지 않습니다.
- 인증·권한 페이지와 API는 `requireProgramAccess()`/`checkProgramAccessApi()`를 사용하고 `force-dynamic` 및 `force-no-store`를 함께 선언합니다.
- 사용자 데이터는 `user_id`와 RLS로 격리합니다.
- AI API는 공용 `user_api_keys`와 `resolveApiKey()`를 사용하며 본인 키가 없으면 설정 안내를 반환합니다.
- 설정 메뉴 라벨은 `API키등록·플랫폼연동`으로 통일하고 하단에 연동 매뉴얼을 둡니다.
- 기능 하나마다 타입 검사, 빌드, 린트, 실제 화면 검수를 진행하고 README에 결과를 기록합니다.

## 현재 단계

초기 화면 골격만 구현되어 있습니다. 프로그램 등록·요금제·Supabase 마이그레이션·AI 생성 API는 설계 확인 후 단계적으로 추가합니다.
