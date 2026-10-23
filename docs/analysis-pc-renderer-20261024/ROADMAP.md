# 「내 PC 고속 변환」 플랫폼 확장 로드맵 (2026-10-24)

작성: Claude Code 윈도우 · 음악 담당 세션 `claude-win-20261024-music`.
주인님 지시: 「새로 무료로 영상을 만들거나 렌더링하는 기능이 추가되었어, 음악 쪽에서 연계해서 활용할 수 있는 방안을 강구해봐」 → 「완성된 프로그램이니 이제 너가 진행해도 돼」 → 「무료로 영상을 생성할 수 있으니 다양한 각도로 기존 프로그램과 연계한 기능으로 확장 가능하도록 플랜을 짜고 진행해봐」.

## 0. 출발점 — 무엇이 생겼나
- `video-to-gif` v1.20~v1.21 「⚡ 내 PC 고속 변환」: 웹 → 크롬 확장 → 회원 PC 실행기(윈도우 PowerShell·맥 perl, 둘 다 기본 내장) → **회원 PC의 ffmpeg**. 서버 비용 0원, 브라우저보다 3~6배 빠름, 브라우저 메모리·길이 한계 없음, 영상이 PC 밖으로 나가지 않음.
- 안전 원칙(바꾸지 않음): 실행기는 **명령 문자열을 받지 않는다** — 「명령 종류 + 검사한 숫자·정해진 낱말」만 받아 ffmpeg 인자를 스스로 만든다. 확장은 허용한 사이트만 연결.
- 한계: 회원이 확장·실행기·ffmpeg를 한 번 설치해야 함 → 모든 기능은 **설치 안 했으면 지금 방식(브라우저)으로 자동 대체**가 필수.

## 1. 확장 각도 5가지
| 각도 | 무엇 | 실행기 명령(새로) | 대상 프로그램(지금 방식) |
|---|---|---|---|
| A. 소리 처리 | MP3·AAC·FLAC 저장, 스트리밍 기준 음량 맞춤(-14 LUFS·최대 -1 dBTP), 정밀 측정 | `audio` | `ai-mastering-studio`(WAV16만), `ai-music-studio`(받은 형식 그대로), `music`(SUNO), `shorts-onestop-studio` 내레이션 |
| B. 짧게 그리고 길게 붙이기 | 브라우저는 반복 가능한 짧은 영상만 그리고 PC가 곡 길이만큼 반복·곡 이어 붙이기·소리 합치기(다시 압축 없음) | `loop-mux` | `playlist-channel-studio`(1시간 영상을 장면마다 그림), `vinyl-lp-studio`(LP 한 바퀴 반복), `infinite-loop-video`(브라우저 ffmpeg.wasm) |
| C. 이미지 → 영상 (새 기능) | 이미지 여러 장 + 장면 길이 + 천천히 확대·이동(켄 번즈) + 전환 + 배경음악 → 세로·가로 MP4. **이미지만 만들던 프로그램이 무료로 릴스·쇼츠를 갖게 됨** | `slideshow` | `insta_auto_poster` 카드뉴스 → 릴스, `four-cut-comics`·`ai-webtoon-studio` → 세로 스크롤 영상, `shop-detail-page`·`detail-page-12p` → 상품 홍보 영상, `ai-image-studio`·`portrait-photo` → 사진 영상, 음악 프로그램 곡 + 이미지 → 뮤직 비주얼라이저 |
| D. 자르기·잇기·줄이기 | 구간 자르기(다시 압축 없음), 여러 영상 잇기, 업로드 한도 맞춰 용량 줄이기(인스타 100MB·스레드 등) | `trim`·`concat`·`compress` | `music-video-studio` 쇼츠 하이라이트, `ai-video-studio` 영상 합치기, `shots`·`shorts-onestop-studio` 업로드 전 용량 |
| E. 브라우저 렌더 가속·길이 해제 | 브라우저가 그린 장면을 PC로 바로 넘겨 하드웨어 압축 | `frames` | `lyric-video-studio`(12·30분 제한), `music-video-studio`·`ai-video-studio`(Remotion), `shots`·`shorts-onestop-studio`(WebCodecs) — 장면 전달량이 커서 마지막에 효과 보고 결정 |

## 2. 공통 기반 (모든 단계가 함께 씀)
1. 확장 이름 「AIMaster 내 PC 고속 변환」, 연결 허용 사이트를 단계마다 추가(확장 ID 고정 `efgimakonmphcdojhiegemjmpbokpcgk`).
2. 실행기 `pong`에 `capabilities`(가능한 명령 목록) → 화면이 버튼을 보이거나 「업데이트 필요」 안내.
3. 웹 연결 코드 공용 기준 코드 `pc-renderer-client`(확장 감지·`ping`·파일 조각 올리기·명령 실행·결과 받기). 사본으로 각 프로그램에 배포.
4. 설치 안내는 한 곳(`video-to-gif.buylife.xyz/guide` 설치 절)으로 연결, 각 프로그램 매뉴얼에는 링크 한 줄.
5. 실행기 판 관리는 `node scripts/build-local-renderer.mjs`(이 스크립트가 다운로드 묶음·`version.json`을 만든다). 명령을 추가할 때마다 `HOST_VERSION` +0.10, GIF 약속을 바꾸지 않는 한 `MIN_HOST`는 그대로.

## 3. 단계 (한 단계씩, 단계마다 플랜 → 구현 → 윈도우 실물 시험 → 배포 → 크롬 검수 → 인수인계)
| 단계 | 내용 | 배포 | 상태 |
|---|---|---|---|
| **1** | 공통 기반 + 각도 A(`audio`) → 마스터링 「⚡ 내 PC로 저장」(MP3·AAC·FLAC·WAV24, 음량 맞춤) | `video-to-gif` v1.22 · `ai-mastering-studio` v1.14 | **진행 중** — 플랜 `ai-mastering-studio/docs/PLAN_20261024_PC_RENDERER_AUDIO.md` |
| 2 | 각도 B(`loop-mux`) → 플레이리스트 「빠른 긴 영상」, LP 턴테이블 「한 바퀴 그리고 반복」 | `video-to-gif` · `playlist-channel-studio` · `vinyl-lp-studio` | 대기 |
| 3 | 각도 C(`slideshow`) → 음악 곡 + 이미지 비주얼라이저(AI 음악 스튜디오), 카드뉴스 → 릴스 | `video-to-gif` · `ai-music-studio` · `insta_auto_poster` | 대기(다른 담당 프로그램은 그 세션과 조율) |
| 4 | 각도 D(`trim`·`concat`·`compress`) → 뮤직비디오 쇼츠 하이라이트, AI 영상 스튜디오 잇기 | `video-to-gif` · `music-video-studio` · `ai-video-studio` | 대기 |
| 5 | 각도 A 넓히기 → AI 음악 스튜디오·SUNO 곡 형식 변환, 원스톱 내레이션 음량 | 각 프로그램 | 대기 |
| 6 | 각도 E(`frames`) → 가사영상 길이 제한 해제 시제품, 효과 측정 후 다른 프로그램 | `lyric-video-studio` 등 | 검토 |

## 4. 지켜야 할 것
- 회원 본인 PC·본인 파일만 처리, 서버 저장·AI 호출 없음(필요한 단계만 회원 본인 키). 비용은 배포 빌드뿐 — 단계마다 사전 보고.
- 다른 세션 담당 프로그램(인스타·웹툰·상세페이지·AI 영상 등)은 작업 중 표 확인·담당 세션과 조율 후 진행.
- 맥 실행기는 이 PC의 Git Bash perl로 1차 시험, 실제 맥 확인은 맥미니 세션 요청(남는 확인으로 기록).
