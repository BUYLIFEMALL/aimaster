# 개발 플랜 — 「⚡ 내 PC 고속 변환」 로컬 렌더러 (2026-10-23, Claude Code 맥미니 · 주인님 지시)

## 배경 (측정 근거)
- 지금 웹 엔진(ffmpeg.wasm 0.12.6 = ffmpeg n5.1.3, 단일 스레드): 1080p 10초 → 560px·40fps **시도 1회 약 102초**(사다리 2번 157초).
- 같은 변환 명령을 맥미니 네이티브 ffmpeg 8.1로: **약 19~21초**(약 5배). 여러 스레드/한 스레드 차이 거의 없음 — 병목인 `palettegen`·`paletteuse`는 최신 ffmpeg도 한 스레드. 빨라지는 이유는 wasm을 거치지 않는 것.
- WebCodecs(29% 단축)·멀티스레드 엔진(해석만 빨라짐 + COOP로 「상세페이지로」 끊김)은 기준 미달 — [`PLAN_20261023_WEBCODECS.md`](PLAN_20261023_WEBCODECS.md).

## 주인님 결정
- 회원 배포는 **윈도우 무료판** 먼저. **맥도 회원이 무료로 설치·운용할 수 있는 방법을 함께 검토**.
- **개발·1차 시험은 맥미니**(PowerShell 7.6.6 `~/.local/bin/pwsh` 설치 완료, ffmpeg 8.1 있음), **윈도우 동작 시험은 윈도우 PC**.

## 구조
```
GIF 자동화 웹(video-to-gif.buylife.xyz) ─chrome.runtime.connect(확장 ID)→ 크롬 확장 ─connectNative→ 로컬 렌더러(연결 스크립트 + ffmpeg)
   └ 렌더러 없음·실패 → 지금 브라우저(wasm) 변환으로 자동 전환
```
- 영상·GIF는 회원 PC 안에서만 오감(서버 업로드 없음, 지금과 같음).
- **확장**(MV3): `externally_connectable`은 `https://video-to-gif.buylife.xyz/*`만, `nativeMessaging` 권한. 고정 `key`로 압축 해제 설치여도 확장 ID가 바뀌지 않게(렌더러 등록의 `allowed_origins`에 필요). 역할은 중계뿐.
- **메시지 나눠 보내기**: 렌더러 → 확장 한 메시지 1MB 제한 → 영상·GIF를 약 512KB base64 조각으로 주고받음.
- **보안**: 렌더러는 **명령 문자열을 받지 않는다** — 정해진 값(가로폭·fps·색 수·구간 시작/끝·한 번에/두 번 방식)만 받아 스스로 ffmpeg 인자를 만든다(숫자 범위 검사). 임시 폴더에만 쓰고 끝나면 지움. 우리 확장 ID만 렌더러를 부를 수 있고, 우리 사이트만 확장을 부를 수 있음.
- **웹 쪽**: 사다리·25/20fps 단계·8MiB 판정은 그대로 웹에서, 시도마다 렌더러에 「이 값으로 한 번 만들어」 요청(원본은 첫 시도에 한 번만 보내고 렌더러가 작업 끝까지 보관). 설정 패널 「⚡ 내 PC 고속 변환 사용 중」 표시, `/guide` 설치 안내.

## 운영체제별 렌더러 (무료)
| | 윈도우 | 맥 |
|---|---|---|
| 연결 스크립트 | `host.ps1` — 윈도우 기본 PowerShell 5.1 | `host.pl` — 맥 기본 perl 5.34(+ JSON::PP 기본 포함). `python3`는 새 맥에서 개발 도구 설치를 요구해 안 씀 |
| ffmpeg | 공식 윈도우 빌드 LGPL판을 ZIP에 포함(판 고정·SHA-256) | 이미 있으면 그대로(Homebrew 등), 없으면 설치 스크립트가 정적 빌드를 받아 해시 확인 |
| 설치 | ZIP 풀고 `설치.bat` 더블클릭 → `HKCU` 레지스트리에 연결 등록(관리자 권한 불필요) | 터미널 한 줄(`curl … \| sh`) → `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/`에 등록. 터미널로 받은 파일은 격리 표시가 붙지 않아 Apple 공증 없이 실행됨 |
| 경고 | 서명 없음 → 「알 수 없는 게시자」 경고 가능(안내로 해결) | 터미널 설치라 경고 없음(대신 터미널 사용 필요) |
| 비용 | 0원 | 0원 (더블클릭 설치판을 원하면 Apple 공증 연 $99 — 지금은 안 함) |

## 순서
1. **맥미니 시제품**: 확장(`video-to-gif/local-renderer/extension/`), 연결 스크립트 `host.pl`(맥)·`host.ps1`(윈도우, 맥에서는 pwsh 7로 1차 확인), 맥 설치 스크립트. 맥미니 크롬에 압축 해제 확장 로드(주인님 도움 1회) → 운영 GIF 페이지에서 확장을 불러 변환·속도 확인(웹 코드 배포 없이).
2. **웹 연결**(`ConverterWorkspace.tsx`): 감지·조각 전송·시도별 요청·자동 전환·상태 표시·`/guide`. 맥미니에서 tsc·eslint, 운영 반영은 윈도우 빌드.
3. **윈도우 PC 동작 시험**: `설치.bat` 등록, PowerShell 5.1, 경고 화면, 같은 시험 영상 속도, 렌더러 삭제 시 자동 전환, 「상세페이지로」·ZIP·구간·fps 단계 회귀.
4. **배포**: 확장 ZIP·렌더러 ZIP을 GitHub 릴리스(무료)에, 웹 v1.20(빌드 1~2회, 그때 사전 승인), 확장 버전 규칙(핵심 원칙 10) 적용.

## 비용
개발·시험 0원(AI 호출 없음). 배포 Vercel 빌드 1~2회. 회원 0원. 서명·공증·웹 스토어 등록 안 함.

## 1단계 시제품 결과 (2026-10-24, 맥미니) — `video-to-gif/local-renderer/`
- 파일: `extension/`(MV3, 고정 키 → ID `efgimakonmphcdojhiegemjmpbokpcgk`, 비밀 키는 저장소에 넣지 않음), `host/host.pl`(맥 perl)·`host/host.ps1`+`host.bat`(윈도우 PowerShell 5.1, ASCII 전용), `install/install-mac.sh`·`uninstall-mac.sh`, `install/install-windows.bat`+`.ps1`(BOM UTF-8, ffmpeg 없으면 `winget install Gyan.FFmpeg --scope user`)·`uninstall-windows.bat`.
- 메시지: `ping/pong`, `begin`·`chunk`(512KB, 조각마다 `chunk-ok`)·`end`, `encode{job,req,width,fps,colors,start,duration}` → `progress`·`result`·`result-chunk`(600KB)·`result-end`, `release`. 확장은 `ext-hello`만 직접 답하고 나머지는 중계.
- 크롬 흉내 시험 도구(저장소 밖): perl 3초 6.8초·10초 20.3초, PowerShell 7(맥) 같은 결과, 명령 끼워 넣기 값 거부. **발견·수정**: 맥 기본 `JSON::PP`가 700KB 조각 해석이 느려 20MB 전송 16.5초 → 조각은 정규식으로 바로 꺼내 **0.5초**(PowerShell도 같은 방식).
- **실제 크롬(맥미니, 운영 페이지 → 확장 v1.00 → host.pl → ffmpeg 8.1)**: 같은 1080p 10초 시험 영상(14,933,867바이트), 앱과 같은 사다리 — 전송 1.1초, 시도 1(560px) 41.8초 → 시도 2(336px·192색) 17.8초, **전체 60.7초**(지금 웹 157초, **약 2.6배**), 결과 336×189·7.27MiB·400장·장면 간격 2/3(=40fps). 앞서 「약 5배」는 다른 시험 영상 기준이었고, 이 영상에서는 2.6배.
- 다음 개선 후보: 렌더러는 PC 코어를 여럿 쓸 수 있으므로 사다리 단계를 **여러 개 동시에** 돌려 맞는 것 중 가장 큰 것을 고르면 전체 ≈ 첫 시도 시간(약 40초)까지 줄일 수 있음(2단계에서 검토).

## 2단계 웹 연결 결과 (2026-10-24, 맥미니 · 미배포)
- `lib/localRenderer.ts`(새): `detectLocalRenderer()`(확장 없음 `none`·렌더러 없음 `no-host`·ffmpeg 없음 `no-ffmpeg`·`ready`), `LocalRendererPool`(연결 = 렌더러 프로세스 하나, 동시 수만큼 같은 영상을 올림), `localSlots()`(코어−1, 최대 4, 100MB 넘으면 2).
- `lib/gifLadder.ts` `runLadder(encodeAt, slots, onStep?)`: 순서대로 돌 때와 **같은 단계를 고르되** 0단계와 함께 `SPECULATIVE_ORDER`(7·5·3·6·4·8단계)를 미리 만든다. 시험(저장소 밖) 7개 통과 — 크기 7종 × 동시 1·4에서 순서대로와 결과 같음, 같은 단계 두 번 안 만듦, 미리 만든 단계 실패는 필요할 때만 오류.
- `components/ConverterWorkspace.tsx`: 렌더러 `ready`면 `convertLocal`(같은 사다리·필터), 렌더러 문제면 안내 한 줄 후 브라우저 변환으로 자동 전환, 「끝까지 8MiB 초과」는 브라우저로 다시 하지 않음(`TooBigError`). 설정 패널 「⚡ 내 PC 고속 변환」 상태·「다시 확인」, 버튼 「⚡ 내 PC로 변환 중...」. 마무리는 `finishJob` 하나로(브라우저 경로도 같이 씀).
- `/guide#local-renderer`: 윈도우(확장 ZIP + 렌더러 ZIP `install-windows.bat`)·맥(확장 ZIP + 터미널 한 줄) 설치·삭제 안내.
- 내려받을 파일: `node scripts/build-local-renderer.mjs` → `public/downloads/local-renderer/`(`gif-renderer-extension-latest.zip`·`gif-renderer-windows-latest.zip`·`install-mac.sh`·`uninstall-mac.sh`·`host.pl`·`version.json`). 새 패키지 없이 공용 `lib/zip.ts` 사본 사용.
- **실제 화면 코드 시험(맥미니 크롬, 운영 페이지에 두 파일을 자바스크립트로 바꿔 넣음)**: 감지 `ready`(확장 v1.00·ffmpeg 8.1), 동시 4개 — 올리기 1.7초, 7·5·3·0단계 동시 시작, 5단계 25.9초에 이미 끝남 → 0단계(46초) 직후 바로 확정, **전체 47.6초**(한 단계씩 60.7초·브라우저 157초), 결과는 한 단계씩과 같은 5단계·336×189·7.27MiB.
- tsc 0, eslint 0.

## 열어 둔 점
- 쇼츠·뮤직비디오 등 다른 영상 프로그램도 같은 렌더러를 쓸 수 있게, 명령 종류를 「gif」로 이름 붙여 나중에 늘릴 수 있게 설계.
- 맥 정적 ffmpeg 빌드의 출처·라이선스는 1단계에서 확정(LGPL판 우선).
