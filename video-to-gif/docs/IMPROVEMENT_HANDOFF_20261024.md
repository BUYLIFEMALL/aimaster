# 인수인계 — 이커머스 담당 세션 (2026-10-23 ~ 10-24, Claude Code 맥미니 · 세션 `claude-mac-20261023-ecommerce`)

## 2026-11-15 맥미니 인수인계 — 확장 소스 경로 표준화(사용자 지시, 미배포)

### 원인과 정리한 내용

- 최초시제품7d741bed3(2026-10-24)가확장/host/install을local-renderer아래에묶었고,후속28e5ba230에서공용렌더러가된뒤에도유지됐습니다. 10-31의 `<프로그램>/extension/` 규칙보다이전구조이며명시예외없음. 설치안내전규칙대조가빠져사용자가폴더를찾기어려웠습니다.
- **현재유일한확장소스: `video-to-gif/extension/`**. 기존 local-renderer/extension의manifest.json/background.js를복제없이이동. host/install/test와배포다운로드폴더는local-renderer에유지합니다.
- scripts/build-local-renderer.mjs의manifest읽기/버전동기화/파일열거/ZIP본문읽기를새extensionSrc로통일. lib/localRenderer.ts의경로주석·AGENTS현재안내도맞춤(scripts/extension_apps_report.json은기존미추적생성자료라변경/커밋하지않음).
- 버전v1.31·확장표시명·key/ID **efgimakonmphcdojhiegemjmpbokpcgk**·nativeMessaging/allowed_origins·다운로드URL·ZIP내부gif-renderer-extension/은그대로. 이작업은경로정리이며이름/기능/프로토콜변경이아닙니다. 아래10월절의옛경로는당시기록입니다.

코드 커밋: `63d60f347`(확장2파일100%동일이동 + ZIP제작경로/주석, Git표시4파일변경). 결과함: `63f9313e-1f24-4c2c-96c1-53e769856b8c`. 기존미추적조사표는수정원복후커밋에서제외했습니다.

### 검증·실행하지 않은 것

- node --check video-to-gif/scripts/build-local-renderer.mjs 통과. 두파일이HEAD옛경로와바이트동일,운영v1.31ZIP두파일과동일,manifest공개key에서계산한고정ID일치,옛폴더없음/새폴더있음,ZIP내부폴더명유지 확인. 근거 `_workspace/video-v4-20261115/extension-path-check.json` 모든8검사true.
- 맥에서npm/빌드/ZIP재생성/배포/DB/환경설정변경안함. 운영ZIP은변경하지않아기존배포다운로드에는영향없습니다. 새소스폴더내용이현재ZIP과같으므로Mac설치는배포기다림없이새폴더로계속가능합니다.

### 윈도우 영상 담당 다음 첫 단계

1. **개발자브라우저에옛소스경로를압축해제로드했다면새폴더로다시로드**: D:\Antigravity\AIMaster\video-to-gif\extension (실제공유체크아웃루트에맞춤). 옛폴더는없으므로그대로새로고침하면로드오류가날수있습니다. 고정ID는같으며설치후해당ID단일설치·Host연결을확인합니다.
2. 다음승인된영상배포묶음에서새경로를쓰는build-local-renderer.mjs로ZIP생성·버전일치/배포후검증을진행. **이문서는즉시추가빌드/배포승인요청이아닙니다.** `node scripts/check-extension-release.mjs video-to-gif`의정합성도확인합니다.
3. 원래검수인수: V4사용자녹화→WASM→GIF다운로드는통과,UI15.0초/GIF13.91초차이는원본WebM길이대조필요(결과함4d14c77f). Mac고속확장설치는새폴더선택대기,Host기설치재시험/재설치하지않음.
4. 확장표시명은공용렌더러확장으로AIMaster내PC고속변환을쓰고있습니다. 폴더정리에이름변경까지섞지않았으며본프로그램명일치규칙과공용렌더러정책은별도담당검토로남깁니다.

### 맥미니 현재 설치 경로

`/Volumes/gt1_mega/AIMaster/video-to-gif/extension`


> 다음 CLI가 이 문서 하나로 이어서 작업할 수 있게 정리한 것. 담당 범위: 주인님 지정 **이커머스 카테고리** — `video-to-gif`(상세페이지 GIF 자동화)·`shop-detail-page`(AI 상세페이지 자동화)·`trending-product-finder`(상품소싱 자동화), 병합된 `auto-detail-page`·`detail-page-12p`.
> 계정: Claude 로그인 `rainbowi77777@gmail.com`(맥미니 부계정), 커밋 작성자 `BUYLIFE <buylifemall@gmail.com>`. 작업 폴더 `/Volumes/gt1_mega/Antigravity/AIMaster`(윈도우 `D:\Antigravity\AIMaster`와 같은 SMB 저장소).

## 1. 한 일 요약

| 날짜 | 프로그램 | 내용 | 운영 버전 |
|---|---|---|---|
| 10-23 | 이커머스 전체 | 남은 일 점검 — 이미 배포된 미배포 대기 정리(상품소싱 v1.24·12단 v1.11), 문서만 「미구현」으로 남은 항목 정정(GIF 좁은 화면 줄·상세 S-22-18) | — |
| 10-23 | `shop-detail-page` | Phase 표 정리 — Phase 2 완료, Phase 3(다국어)·4(자유 생성·로고 합성) 「보류 — 회원 요청 시」(주인님 결정) | v1.30 그대로 |
| 10-23 | `video-to-gif` | 8MiB 초과 영상용 사다리 끝 25·20fps 단계 + 완료 줄 「N fps로 낮춤」 + 메뉴 문구·Esc 닫기 | **v1.19** 배포·실검수 |
| 10-23 | `video-to-gif` | WebCodecs 가속 재검토 — 측정 결과 29% 단축(기준 절반 미달)로 중단. 병목은 해석이 아니라 색상표·디더링(한 스레드) | 코드 변경 없음 |
| 10-23 | `video-to-gif` | 멀티스레드 엔진 점검 — 병목 필터가 최신 ffmpeg도 한 스레드라 효과 작고 COOP로 「상세페이지로」 끊김 → 추천 안 함 | 코드 변경 없음 |
| 10-24 | `video-to-gif` | **「⚡ 내 PC 고속 변환」 로컬 렌더러** — 크롬 확장 + Native Messaging(맥 perl·윈도우 PowerShell, 둘 다 기본 내장) + 회원 PC ffmpeg, 사다리 단계 동시 실행, 없으면 브라우저 변환 자동 전환 | **v1.20** 배포·윈도우·맥 실검수 |
| 10-24 | `video-to-gif` | 다듬기 — 새 버전 알림·최소 판, 맥 Homebrew 없을 때 안내, 윈도우 경고 설명·`Unblock-File`, 엣지 안내, 확장 버전 자동 맞춤 | **v1.21** 배포·실검수 |

## 2. 「내 PC 고속 변환」 핵심 (다음 작업자가 꼭 알아야 할 것)
- **구조**: 웹(`lib/localRenderer.ts`) → 크롬 확장(`local-renderer/extension/`, ID `efgimakonmphcdojhiegemjmpbokpcgk` — `manifest.json`의 `key`로 고정, 비밀 키는 저장소에 없음) → 렌더러(`local-renderer/host/host.pl`·`host.ps1`+`host.bat`) → 회원 PC ffmpeg.
- **보안**: 렌더러는 명령 문자열을 받지 않는다. 가로폭·fps·색 수·구간 숫자만 검사해 ffmpeg 인자를 스스로 만든다. 확장은 `video-to-gif.buylife.xyz`만 연결 허용.
- **메시지**: `ping/pong`(host·hostVersion·ffmpeg), `begin`/`chunk`(512KB·`chunk-ok`)/`end`, `encode` → `progress`·`result`·`result-chunk`(600KB)·`result-end`, `release`. 큰 조각은 JSON 해석기 대신 정규식(맥 `JSON::PP`가 느려 20MB 16초 → 0.5초).
- **사다리**: `lib/gifLadder.ts` `runLadder` — 순서대로와 **같은 단계**를 고르되 0단계와 함께 7·5·3단계 등을 미리 동시에 만든다(`localSlots` = 코어−1, 최대 4).
- **판 관리**: `node scripts/build-local-renderer.mjs`가 `lib/version.ts`로 확장 판을 자동으로 맞추고 `public/downloads/local-renderer/`(확장 ZIP·윈도우 렌더러 ZIP·맥 설치 스크립트·`host.pl`·`version.json`)를 만든다. **버전을 올리면 이 스크립트를 다시 돌릴 것**. 렌더러를 고치면 `HOST_VERSION`을 올리고, 메시지 약속을 바꾸면 스크립트의 `MIN_EXTENSION`·`MIN_HOST`도 올린다(그보다 옛 판은 브라우저 변환 + 업데이트 안내). 배포 뒤 DB `extension_version` 맞추고 `node scripts/check-extension-release.mjs video-to-gif` → OK.
- **측정**: 1080p 10초 — 브라우저 157초 → 내 PC 25~48초(PC 상태에 따라). 결과는 같은 단계.
- **설치**: 윈도우 = 확장 ZIP + 렌더러 ZIP `install-windows.bat`(ffmpeg 없으면 `winget install Gyan.FFmpeg --scope user`), 맥 = 확장 ZIP + `curl -fsSL https://video-to-gif.buylife.xyz/downloads/local-renderer/install-mac.sh | bash`(Homebrew 없으면 `/guide#mac-ffmpeg`). 모두 무료, 서명·공증·웹 스토어 없음.
- **시험 요령**: Claude 확장이 조작하는 자동화 탭에도 맥미니에서는 `chrome.runtime`이 생겨 시험 가능했음(윈도우는 일반 탭 + 콘솔, LR-W-03). 측정용 영상은 `MediaRecorder` 대신 `mediabunny` `Output`+`CanvasSource`로 장면을 하나씩 그려 만들 것(창이 가려지면 녹화 길이가 줄어듦).
- 상세 플랜·측정·단계별 결과: [`PLAN_20261023_LOCAL_RENDERER.md`](PLAN_20261023_LOCAL_RENDERER.md), 측정 근거: [`PLAN_20261023_WEBCODECS.md`](PLAN_20261023_WEBCODECS.md), 8MiB fps 단계: [`PLAN_20261023_FPS_STEP.md`](PLAN_20261023_FPS_STEP.md).

## 3. 남은 일

| 우선 | 프로그램 | 내용 | 비고 |
|---|---|---|---|
| 날짜 | `trending-product-finder` | 매일 03:50 정리 뒤 관리자 「30일 자동 정리」 표에 이 프로그램 줄이 생기는지 확인 | 30일 정리 회원별 기록(v1.24 반영) |
| 날짜 | `shop-detail-page` | 2026-11-21 이후 9월 자료 유예가 끝나고 첫 30일 정리가 도는지 확인 | 백로그 |
| 대기 | `auto-detail-page` | 좌측 메뉴 계정 위치(클래스만) — 병합된 프로그램이라 다음 배포 때 함께 | `docs/PENDING_DEPLOYS.md` |
| 설계 | `video-to-gif` → 다른 영상 프로그램 | 같은 렌더러로 넓히기(LR-02). 1순위 `infinite-loop-video`(브라우저 ffmpeg 그대로, 렌더러에 `loop` 명령 추가), 2순위 AI 영상·뮤직비디오(Remotion이라 별도 설계) | 플랜 「다른 영상 프로그램으로 넓히기」, 회원 반응 보고 |
| 보류 | `shop-detail-page` | Phase 3·4, GPT Image 공급자, 12단 장면 카피 미리 채우기 | 회원 요청 시 |
| 확인 못 함 | `video-to-gif` | 「너무 옛 판 → 브라우저 변환」 실제 화면, 맥 ffmpeg 없을 때 작업 화면 연결 | 판단 함수 시험·코드 확인만 |

## 4. 맥미니 환경 (시험용으로 설치해 둔 것)
- PowerShell 7.6.6: `~/.local/bin/pwsh`(Microsoft 공식 배포판, 해시 확인, 관리자 권한 없이 내 계정에만).
- 맥 렌더러: `~/Library/Application Support/BuylifeGifRenderer/`(host.pl·config.json) + `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/xyz.buylife.gif_renderer.json`. 지우려면 `bash video-to-gif/local-renderer/install/uninstall-mac.sh`.
- 크롬 확장: 저장소 폴더 `video-to-gif/extension`을 압축 해제 확장으로 로드(현재 v1.31, 2026-11-15 경로 정리).
- 커밋 훅: `node scripts/git-hooks/install.mjs`로 `pre-commit`·`pre-push`·`commit-msg` 설치(10-23).

## 5. 이번 세션에서 배운 점
- 개선 문서의 「미구현」 줄은 코드·`AGENTS.md` 실검수 기록과 대조한 뒤 남은 일로 보고할 것(처음 보고 때 대조 없이 옮겨 바로잡음).
- 안전 커밋 도우미 `--mine`은 「최근 2시간 안 다른 커밋이 넣은 줄」을 지우면 막는데, **내가 방금 커밋한 줄을 고칠 때도 막힌다**. 그때는 「HEAD 내용으로 되돌림 → `--begin` → 내 수정 다시 덮기 → 일반 커밋」 순서로 처리했다. zsh에서는 여러 파일을 변수 하나에 넣으면 나뉘지 않으니 배열(`FILES=(a b)`)을 쓸 것.
- 한국어 지침: 도구 사이 짧은 안내를 영어로 쓰는 실수가 여러 번 있었다 — 도구를 연달아 쓸 때는 사이에 안내 문장을 넣지 말고 묶음이 끝난 뒤 한국어로 보고할 것.

## 6. 커밋 (이 세션 35개, 세션 트레일러 `AIMaster-Session: claude-mac-20261023-ecommerce`)
`git log --grep=claude-mac-20261023-ecommerce`로 전체 확인. 주요: `db5116a9f`(fps 단계) · `7d741bed3`(렌더러 시제품) · `07f192e20`(웹 연결·동시 실행) · `c7c2c322f`(새 버전 알림·맥 안내) · `ac4bd9256`(v1.21 준비) · 실검수 기록 `b5c375334`·`a8a5227fc`·`af3331b0a`. 배포는 윈도우 세션(v1.19 `video-to-kjwuwh5xt`, v1.20 `video-to-gzwcztx49`, v1.21 `video-to-as3vkytql`).

## 7. 프로그램 링크
https://video-to-gif.buylife.xyz
https://shop-detail-page.buylife.xyz
https://trending-product-finder.buylife.xyz
https://detail-12p.buylife.xyz
