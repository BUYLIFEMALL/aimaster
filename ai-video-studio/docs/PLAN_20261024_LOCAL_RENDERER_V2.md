# AIMaster 「내 PC 렌더러」 2.0 플랜 — video-to-gif 렌더러를 영상 프로그램 공용 무료 렌더·생성 기반으로 (2026-10-24)

> 상태: **플랜(주인님 승인 대기)** · 작성 Claude Code 윈도우, 영상 담당 `claude-win-video`
> 지시: 「그쪽에선 기본 프로그램을 완성했으니 넌 영상 담당이니 기존 영상 프로그램과 연계한 확장가능한 방향으로 플랜을 짜봐」 · 「무료로 영상을 랜더링·생성 할 수 있으니 다양하게 활용할 여지가 있어」
> 대상: ① AIMaster 운영. 렌더러 원본 `video-to-gif/local-renderer/`(이커머스 담당이 v1.21까지 완성) → **렌더러 본체(확장·host·설치)는 이후 영상 담당이 맡고**, video-to-gif 화면은 이커머스 담당 그대로.
> 근거: `video-to-gif/docs/IMPROVEMENT_HANDOFF_20261024.md`, `PLAN_20261023_LOCAL_RENDERER.md`(LR-02), 코드 `local-renderer/host/host.ps1`·`extension/background.js`·`lib/localRenderer.ts`, 분석 `ANALYSIS_20261024_LOCAL_RENDERER_FOR_VIDEO.md`.

## 0. 지금 구조와 바꿀 점
| 부분 | 지금(v1.21) | 2.0 |
|---|---|---|
| 확장 | 이름 「GIF 자동화 · 내 PC 고속 변환」, 연결 허용 `video-to-gif.buylife.xyz` 한 곳, 메시지 그대로 중계 | 이름 「AIMaster 내 PC 렌더러」, 허용 사이트 목록에 영상 프로그램 추가(와일드카드 없이 하나씩). **확장 ID·키·Native 이름(`xyz.buylife.gif_renderer`)은 그대로** → 기존 설치 회원은 다시 설치할 필요 없이 확장 ZIP만 덮어쓰기 |
| 렌더러(host.pl·host.ps1) | 명령 `encode` 하나(GIF 전용: 가로폭·fps·색 수·구간) | **명령 목록 방식**: `encode`는 그대로 두고 `op` 칸으로 명령 종류를 고름(`gif`·`loop`·`normalize`·`compress`·`scale`·`slideshow`·`audiovis`·`probe`). 명령마다 정해진 숫자·선택지만 검사해 ffmpeg 인자를 렌더러가 만듦(명령 문자열은 계속 받지 않음) |
| 입력 | 작업당 파일 1개 | 작업당 **파일 여러 개**(`begin`에 `slot` 0~19 — 이미지 여러 장 + 음악 1개 등) |
| 지원 확인 | `pong`의 `hostVersion` | `pong.capabilities`(예: `["gif","loop",…]`) → 화면은 그 명령이 있을 때만 「⚡ 내 PC로」를 켜고, 없으면 지금 방식(브라우저) 그대로 |
| 웹 연결 코드 | `video-to-gif/lib/localRenderer.ts` | 공용 기준 코드 `local-renderer-client`로 등록(기준 video-to-gif, 사본은 각 영상 프로그램). 프로그램끼리 서로 부르지 않음 |
| 설치 안내 | video-to-gif `/guide`·`/downloads/local-renderer/` | 설치 파일 위치는 그대로(한 곳), 각 프로그램 매뉴얼에서 그 주소로 연결 |

## 1. 명령별 활용 — 어떤 프로그램에 무엇을
| 명령 | 하는 일 | 쓰는 프로그램 | 회원 이득 |
|---|---|---|---|
| `gif`(있음) | 영상 → GIF(색상표) | video-to-gif, **AI 영상 스튜디오 갤러리 「GIF로」**(새) | 영상 결과를 상세페이지·SNS용 GIF로 바로 |
| `probe` | 길이·해상도·소리 트랙 확인(ffprobe) | 모든 연결 프로그램 | 브라우저 짐작 오류(무한 루프 v1.07 같은 문제) 방지 |
| `loop` | 무한 루프(스마트·오버랩·바운스, 크로스페이드, 반복) | `infinite-loop-video` | 긴·고화질 영상도 빠르게(브라우저 ffmpeg.wasm 대신) |
| `normalize` | 넣는 영상을 H.264·고정 프레임·짝수 크기로 맞춤 | `ai-video-studio` 영상 합치기(R1 대책), `music-video-studio` 장면 영상 | 휴대폰 촬영·하드웨어 인코딩 영상을 넣을 때 느린 브라우저 재인코딩 대신 몇 초 |
| `compress` | 최종 MP4 용량 줄이기·빠른 시작 | 영상 합치기·뮤직비디오·원스톱·Shots·가사 영상 결과 | 갤러리 50MB 한도·업로드에 유리 |
| `scale` | 1080p·4K로 키우기(lanczos+선명화) | AI 영상 스튜디오 갤러리 | 업체 1080p 추가 요금 없이 큰 화면(화질이 새로 생기지는 않음 — 안내) |
| **`slideshow`(생성)** | 이미지 여러 장 + 음악 → MP4(천천히 확대·이동, 장면 전환, 9:16·16:9·1:1) | `ai-image-studio` 갤러리 「영상으로」, `shots`·`shorts-onestop-studio` 빠른 초안, 카드뉴스 → 릴스 | **AI 영상 요금 없이** 사진만으로 움직이는 영상 |
| **`audiovis`(생성)** | 대표 이미지 + 긴 음악 → 파형·스펙트럼 영상(1시간 이상도) | `playlist-channel-studio`, `ai-music-studio`, `lyric-video-studio`(간단 모드) | 브라우저가 버거운 긴 플레이리스트 영상을 PC에서 빠르게 |

## 2. 단계 (한 단계씩 플랜 → 구현 → 윈도우·맥 실검수 → 배포)
| 단계 | 내용 | 배포 대상(빌드) | 맥 실검수 |
|---|---|---|---|
| ✅ 0 | 무한 루프 브라우저 소리 판단 수정(렌더러 없는 회원도 정상) | infinite-loop-video v1.07 (완료) | — |
| **1 기반** | 확장 이름·허용 사이트, 렌더러 `op` 목록·여러 파일·`capabilities`·`probe`, `HOST_VERSION` 2.00(옛 GIF 메시지 그대로 받음), 공용 기준 `local-renderer-client` 등록, 설치 ZIP 다시 만들기 | video-to-gif 1회(확장 ZIP·DB 확장 버전 함께) | 필요 |
| **2 loop** | 렌더러 `loop` + 무한 루프 화면 「⚡ 내 PC로 빠르게」(없으면 브라우저) | infinite-loop-video 1회 | 필요 |
| 3 영상 합치기 | `normalize`·`compress` + AI 영상 스튜디오 합치기 연결, 갤러리 「GIF로」(`gif`) | ai-video-studio 1회 | 필요 |
| 4 생성 ① | `slideshow` + AI 이미지 스튜디오 갤러리 「영상으로」(사진 여러 장 + 내 음악) | ai-image-studio 1회 | 필요 |
| 5 생성 ② | `audiovis` + 플레이리스트 「⚡ 긴 영상 PC로」 | playlist-channel-studio 1회 | 필요 |
| 6 넓히기 | 원스톱·Shots·뮤직비디오·가사 영상 결과 `compress`, 음악 프로그램 | 프로그램별 1회(모아서) | 필요 |

## 3. 지켜야 할 것
- **보안**: 렌더러는 명령 문자열·파일 경로를 받지 않음. `op`별 허용 값 표(숫자 범위·선택지)를 host.pl·host.ps1 두 곳에 똑같이 두고, 시험으로 두 파일의 표가 같은지 확인. 확장 허용 사이트는 하나씩 적음.
- **하위 호환**: 옛 웹(v1.21 video-to-gif)이 보내는 `encode`(op 없음)는 GIF로 처리. 새 확장 + 옛 렌더러면 `capabilities`가 없어 화면이 브라우저로 자동 전환.
- **회원에게는 선택 사항**: 설치하지 않아도 모든 프로그램이 지금처럼 동작. 휴대폰은 해당 없음.
- **회원 데이터**: 파일은 회원 PC 밖으로 나가지 않음(서버 저장 없음). 결과를 갤러리에 저장할 때만 지금 규칙(30일)대로.
- **윈도우 렌더러는 ASCII만**(PowerShell 5.1), 큰 조각은 정규식 처리(기존 교훈).
- **맥 실검수**는 맥미니에서만 가능 → 단계마다 맥미니 세션에 시험을 부탁하거나 주인님께 맥미니 확인을 요청.

## 4. 비용
| 항목 | 단계 1 | 단계 2 | 이후 |
|---|---|---|---|
| Vercel 빌드 | 1회(video-to-gif) | 1회(infinite-loop-video) | 단계마다 1회 |
| AI 호출 | 없음 | 없음 | 없음 |
| 회원·운영자 비용 | 없음(회원 PC 무료 ffmpeg) | 없음 | 없음 |

## 5. 먼저 승인받을 것
- 단계 1·2를 이어서 진행(빌드 2회), 렌더러 본체를 영상 담당이 맡는 것(video-to-gif `AGENTS.md`·인수인계에 기록, 이커머스 담당에게 알림).
