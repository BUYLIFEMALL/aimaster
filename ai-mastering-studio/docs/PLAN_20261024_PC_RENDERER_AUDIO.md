# 개발 플랜 — 「내 PC 고속 변환」 음악 연계 1단계: 공통 작업 + 마스터링 소리 내보내기 (2026-10-24)

작성: Claude Code 윈도우 · 음악 담당 세션 `claude-win-20261024-music`. 상태: **주인님 승인 대기**.
배경: 주인님 「새로 무료로 영상을 만들거나 렌더링하는 기능이 추가되었어, 음악 쪽에서 연계해서 활용할 수 있는 방안을 강구해봐」 → 연계안 4가지 보고 → 「완성된 프로그램이니 이제 너가 진행해도 돼」(확장·실행기 공통 작업을 이 세션이 맡음).
기준: `video-to-gif` v1.21 「⚡ 내 PC 고속 변환」(크롬 확장 `local-renderer/extension` → 실행기 `host.ps1`·`host.pl` → 회원 PC ffmpeg). 인수인계 `video-to-gif/docs/IMPROVEMENT_HANDOFF_20261024.md` §2.

## 1. 공통 작업 (`video-to-gif` v1.22로 배포 — 확장·실행기의 집)
1. **확장**: 이름 「AIMaster 내 PC 고속 변환」, 연결 허용 사이트에 `ai-mastering-studio.buylife.xyz`·`ai-music-studio.buylife.xyz` 추가(`manifest.json` `externally_connectable` + `background.js` `ALLOWED_ORIGINS`). 확장 ID는 같은 `key`라 그대로 → 기존 설치자는 ZIP 덮어쓰기 + 새로고침만.
2. **실행기**(윈도우 `host.ps1`·맥 `host.pl` 둘 다, `HostVersion` 1.00 → 1.10):
   - `pong`에 `capabilities: ["gif","audio"]` 추가(화면이 지원 여부를 앎, 옛 실행기는 없음 → 「업데이트 필요」 안내 후 브라우저 저장).
   - 새 명령 `audio`: 올린 WAV를 받아 **형식**(`mp3`·`aac`·`flac`·`wav` 중 하나), **비트레이트**(96~320kbps 정수), **샘플레이트**(44100·48000), **음량 맞춤**(선택: 목표 -30~-6 LUFS, 최대 음량 -3~0 dBTP — ffmpeg `loudnorm` 2번 방식: 먼저 측정 → 측정값으로 적용)을 숫자·정해진 낱말만 검사해 ffmpeg 인자를 스스로 만든다(명령 문자열 받지 않는 원칙 유지). 결과 파일은 기존 `result`·`result-chunk`·`result-end`로 돌려주고, 측정값(통합 음량 LUFS·최대 음량 dBTP·음량 범위 LRA, 맞춤 전·후)을 `result`에 함께 담는다.
   - GIF 약속은 바꾸지 않음 → `MIN_HOST`·`MIN_EXTENSION` 그대로(옛 판도 GIF는 계속 됨).
3. `node scripts/build-local-renderer.mjs`로 다운로드 묶음 재생성, DB `programs.extension_version`·`check-extension-release.mjs video-to-gif` OK.
4. 웹 연결 코드를 **공용 기준 코드** `pc-renderer-client`로 새로 등록: 기준 `ai-mastering-studio/src/lib/pcRenderer.ts`(확장 감지·`ping`·파일 조각 올리기·명령 실행·결과 받기, 명령 종류에 상관없는 부분만). GIF 변환은 지금 코드를 그대로 두고(동작 불변), 이후 음악 프로그램이 사본으로 씀. `docs/SHARED_MODULES.md`·`SHARED_FEATURE_MAP.md` 등록.

## 2. 마스터링 (`ai-mastering-studio` v1.14 — 미배포 대기 GUIDE 배지 수정 함께)
- 트랙 결과 옆 「⚡ 내 PC로 저장」 칸: 형식(MP3 320k·AAC 256k·FLAC·WAV 24bit)·「유튜브·스트리밍 기준 음량 맞춤(-14 LUFS, 최대 -1 dBTP)」 켜기/끄기 → 마스터링된 WAV를 실행기로 보내 변환 → 파일 내려받기 + 측정값 표시(맞춤 전 → 후).
- 확장·실행기·ffmpeg가 없거나 옛 판이면 이유별 안내(설치 안내는 `video-to-gif.buylife.xyz/guide` 설치 절로 연결) + 지금처럼 WAV 저장은 그대로.
- 서버·DB·AI 호출 없음. 회원 파일은 PC 밖으로 나가지 않음.

## 3. 검수
- 로컬: 시험(명령 값 검사·응답 해석·측정값 해석)·`tsc`·`npm run build`(두 프로그램).
- 실행기: 윈도우 — 이 PC에 설치된 실행기(`%LOCALAPPDATA%\BuylifeGifRenderer`)를 새 판으로 바꿔 `ping`(capabilities)·`audio` 4형식·음량 맞춤 실물 시험, 기존 `gif` 명령 회귀 시험. 맥 — 이 PC Git Bash의 perl로 `host.pl` 같은 시험(윈도우 ffmpeg 사용), 실제 맥 확인은 맥미니 세션 요청(남는 확인으로 기록).
- 운영(메인 크롬, 시험 계정): 마스터링 화면에서 곡 1개 처리 → MP3·FLAC 저장, 음량 맞춤 전·후 값 표시, 파일 재생 확인. GIF 변환 화면에서 「내 PC 고속 변환」 GIF 1개 정상(회귀).

## 4. 비용
| 항목 | 횟수 | 계정·키 | 대략 |
|---|---|---|---|
| Vercel 배포 빌드 | 2회(`video-to-gif` 1 · `ai-mastering-studio` 1) | 팀 `buylife` | 빌드 2회분 |
| AI·외부 호출 | 없음 | — | 0원 |
| 회원 부담 | 없음(본인 PC ffmpeg, 무료) | — | 0원 |

## 5. 다음 단계(이번 범위 밖)
- 2단계: 플레이리스트·LP 「짧게 그리고 길게 붙이기」(`loop-mux` 명령). 3단계: 뮤직비디오 쇼츠 하이라이트(`trim`). 4단계: 가사영상 30분 제한(`frames`, 효과 보고 결정). AI 음악 스튜디오 곡 형식 변환은 1단계 공용 사본을 받아 2단계와 함께.
