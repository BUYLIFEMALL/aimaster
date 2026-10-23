# 플랜 — 문서 속 프로그램 주소 점검 스크립트 (2026-10-23, Claude Code 윈도우 · 세션 `claude-win-20261023-url-check`)

## 문제
INSTA 실제 주소는 `https://auto-instagram-posting.buylife.xyz`인데, 보고와 `docs/PROGRAM_CATEGORY_TEMPLATE_MAP.md`에 연결되지 않은 `insta-auto-poster.buylife.xyz`를 썼다. 보고 링크를 문서에서 옮겨 적다 보면 같은 일이 반복된다.

## 범위
- 새 스크립트 `scripts/check-app-urls.mjs`(읽기 전용, 비용 없음)
  1. 운영 DB `programs`의 `slug`·`app_url`을 읽는다.
  2. 저장소 문서(`*.md`, `node_modules`·`.next`·`labs` 제외)에서 `https://<이름>.buylife.xyz` 주소를 모은다.
  3. 어느 프로그램의 `app_url` 호스트와도 맞지 않는 `*.buylife.xyz` 호스트를 실제로 접속해 본다 — 연결 자체가 안 되면 「잘못된 주소」로 파일:줄과 함께 보고하고, 비슷한 slug의 올바른 주소를 추천한다.
  4. `--app` 옵션: 모든 `app_url`이 실제로 응답하는지도 확인.
- 보고에 주소를 쓰기 전에 이 스크립트나 DB `app_url`로 확인하도록 협업 규칙 문서에 한 줄 추가.
- 옛 기록 문서는 고치지 않고 보고만 한다.

## 검수
- 알려진 오류(`insta-auto-poster.buylife.xyz`)가 잡히는지, 정상 주소는 통과하는지 확인.
