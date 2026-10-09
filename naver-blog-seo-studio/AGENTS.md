# 네이버 블로그 SEO 스튜디오 개발 지침

## 프로그램 버전 관리

- 현재 회원용 앱·확장 공개 버전은 `v1.61`이며 `lib/version.ts`의 `APP_VERSION`, 공용 DB `programs.version`, 확장 `manifest.json`의 `version_name`, 다운로드 ZIP을 항상 같은 값으로 변경한다.
- 이 프로젝트를 수정해 배포할 때마다 앱과 확장 공개 버전을 함께 `0.01` 올린다. 메이저 증가는 주인님 지시가 있을 때만 가능하다.
- Chrome 확장 `manifest.json.version`은 Chrome 업데이트 비교용 내부 번호다. 이미 배포된 번호보다 낮출 수 없으므로 항상 증가시키되, 사용자에게 보이는 번호는 반드시 `version_name`의 앱 버전과 일치시킨다. 확장 ZIP도 같은 작업에서 다시 생성한다.

## 이용 권한 (2026-10-01, v1.48)

- `lib/access.ts`(웹)와 `lib/extensionAuth.ts`(크롬 확장 토큰)는 루트 `CLAUDE.md` 핵심 원칙 6번 순서를 따른다:
  정지 → 관리자 → **FREE 배지(가입만 하면 등급 무관 허용)** → 결제 구독 → 최소 등급 없음 → **등급 ≥ 최소 등급 그리고 관리자가 넣어준 사용기간** → 그 외 차단.
- 예전에는 웹이 정지 계정 차단·FREE 배지 처리 없이 `grade_program_access`나 사용기간 하나만으로 허용했고, 확장은 등급만 있어도 허용했다(2026-09-30 정리).
  적용 전 계산: 회원 170명 모두 사용기간+일반 이상이라 막히는 회원 없음.
- 이 변경은 서버 판정만 바꾼 것이라 확장 ZIP·`manifest.json`은 다시 만들 필요가 없었다.

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

초기 골격 단계는 종료됐습니다. AI 초안 생성, 사용자별 API 키, 새 글 만들기별 콘텐츠·이미지 모델 선택, 확장 토큰, Chrome 확장
실제 입력, 나노바나나 이미지 삽입, 발행 설정 카테고리·태그 입력, 본문 일반어를 제외한 추천 태그 추출까지 구현·검증됐습니다. 다음
작업자는 반드시 [CLI_HANDOFF_2026-10-01.md](./CLI_HANDOFF_2026-10-01.md)와 루트
`docs/NAVER_BLOG_EDITOR_AUTOMATION_GUIDE.md`를 함께 읽고 이어서 작업합니다.

## 확장 다운로드 고정 주소 (2026-10-09, v1.61)

- 다운로드 주소를 `/downloads/naver-blog-seo-studio-extension-latest.zip`로 통일했다(빌드가 버전별 ZIP과 함께 `-latest.zip` 사본을 만든다). 설정 화면 카드·`GET /api/extension/whoami`의 `downloadUrl`·DB `extension_download_url`(마이그레이션 `20261009160000_bump_version_v1_61.sql`)이 같은 주소를 쓴다. 기능·확장 코드 변경 없음(ZIP·manifest만 v1.61).

## 확장 새 버전 안내 (2026-10-09, v1.60)

- `GET /api/extension/whoami`가 `latestVersion`(=`APP_VERSION`)과 `downloadUrl`(`/downloads/naver-blog-seo-studio-extension-<버전>.zip`)을 함께 돌려준다. 확장 사이드패널은 연결 상태를 확인할 때 설치된 버전(`manifest.version_name`)보다 높을 때만 상단에 "새 버전이 나왔습니다" 배너와 ZIP 링크를 보여준다(안내 주소는 이 사이트의 `/downloads/` 아래만 허용). 연결(토큰)을 하지 않은 상태에서는 안내가 뜨지 않는다.
- 알림 코드가 들어간 v1.60 이상 확장은 회원이 한 번 직접 다시 설치해야 이후부터 알림이 뜬다(v1.59 이하에는 코드가 없다).
- 이 프로그램은 배포 전에 `npm run extension:archive`로 ZIP을 직접 만들어야 한다(`prebuild`에 연결돼 있지 않다). 배포 후 루트에서 `node scripts/check-extension-release.mjs naver-blog-seo-studio`로 DB·ZIP 버전 일치를 확인한다(`docs/EXTENSION_RELEASE_RULES.md`).
- 검사: `npm run test:update-banner`.
