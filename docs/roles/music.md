# 음악

- 담당: Claude Code(윈도우) `claude-win-20261024-music`
- 맡은 폴더: `ai-music-studio/` `music/` `lyric-video-studio/` `playlist-channel-studio/` `music-video-studio/` `ai-mastering-studio/` 등(쇼츠·shots의 음악 부분 포함)
- 카테고리: 음악
- 주력 업무: 음악 프로그램 개발·배경음악 공용화·외부 분석 인계 처리. 대기 목록: `docs/MUSIC_OWNER_QUEUE_20261024.md`
- 마지막 갱신: 2026-10-24 저녁 (`claude-win-20261024-music` — 지침 다시 읽고 확인·수정)

## 지금 하는 일
| 프로그램 | 작업 | 시작 | 상태 |
|---|---|---|---|
| — | 없음 | — | — |

## 대기 중 (주인님 승인·결정 대기 포함)
| 프로그램 | 작업 | 기다리는 것 | 근거 문서 |
|---|---|---|---|
| `lyric-video-studio` v1.10 | Lyricbi L-1~L-5(대기 2번) | 플랜·빌드 2회 승인 | `lyric-video-studio/docs/PLAN_20261024_LYRICBI_L1_L5.md` |
| 공용 엔진 + `shorts-onestop-studio` v1.41 | 무료 음성 엔진 — 질문 3개 답 받음(상업 허용·휴대폰 공개·내 PC 먼저), 사전 검증 페이지 끝(음질 주인님 통과, 여러 줄 계산 재생보다 빠름) | **개발 플랜·빌드 1~2회 승인, 기본 음성(OpenAI 유지/무료로)** | `shorts-onestop-studio/docs/PLAN_20261024_FREE_TTS.md`, `docs/MUSIC_OWNER_QUEUE_20261024.md` §5·§6 |
| `music-video-studio` v1.26 | 미배포 대기 `fde4c94bf`(분석 결과만 있어도 장면 이미지 먼저) | 다음 배포 때 함께(v1.27) | `music-video-studio/AGENTS.md` v1.26 |
| `ai-audio-analyzer` | 미배포 대기 `22c6cda35`(메뉴 계정 위치) | 다음 배포 때 함께 | `docs/PENDING_DEPLOYS.md` |
| `playlist-channel-studio` v1.31 | Spectrum P-6 확장 묶음(대기 4번) | 실제 속도 보고 범위 결정 | `playlist-channel-studio/docs/PLAN_20261024_SPECTRUM_P1_P6.md` |

## 최근 완료 (최근 10개)
| 날짜 | 프로그램·버전 | 한 일 | 배포 |
|---|---|---|---|
| 2026-10-24 | 무료 음성 엔진 | 사전 검증 페이지(내 PC): 첫 내려받기 40~54초·두 번째 2.1초, 여러 줄 계산 0.66~0.99배, 외부 그림 정상, 음질 주인님 통과 → 개발 플랜 작성 | 없음(비용 없음) |
| 2026-10-24 | `playlist-channel-studio` v1.31 | 영상(MP4) 배경 미표시 수정 | 배포 |
| 2026-10-24 | `playlist-channel-studio` v1.30 | Spectrum P-3·P-4·P-5 | 배포 |
| 2026-10-24 | `playlist-channel-studio` v1.29 | Spectrum P-0·P-1·P-2 | 배포 |
| 2026-10-24 | `music-video-studio` v1.26 | 참고 이미지 화풍 분석 → 장면 | 배포 |
| 2026-10-24 | `music-video-studio` v1.25 | 곡 파형 | 배포 |
| 2026-10-24 | `music-video-studio` v1.24 | AI 이미지 스튜디오 이미지를 참고로 | 배포 |
| 2026-10-24 | `music-video-studio` v1.23 | 장면 타임라인·순서 바꾸기 | 배포 |
| 2026-10-24 | `music-video-studio` v1.22 | 완성본 보관 | 배포 |
| 2026-10-24 | `ai-music-studio` v1.14 · `music` v1.46 | 「⚡ 내 PC로 저장」 | 배포 |

## 다음 첫 단계
1. 무료 음성 플랜 승인 나면 쇼츠 원스톱 v1.42 개발 시작(작업 중 표 등록 → T-1 엔진 → T-2 연결 → T-3 머리글), 사전 검증 페이지(저장소 밖 임시 폴더) 지우기
2. 그 다음 Lyricbi L-1~L-5(빌드 2회 승인 필요)

## 주인님께 여쭐 것
- 무료 음성 개발 플랜(`shorts-onestop-studio/docs/PLAN_20261024_FREE_TTS.md`)과 빌드 1~2회 승인
- 무료 음성을 쇼츠 원스톱 기본 음성으로 할지(지금 플랜은 OpenAI 기본 유지)
- Lyricbi L-1~L-5 빌드 2회 승인
