# 음악

- 담당: Claude Code(윈도우) `claude-win-20261024-music`
- 맡은 폴더: `ai-music-studio/` `music/` `lyric-video-studio/` `playlist-channel-studio/` `music-video-studio/` `ai-mastering-studio/` 등(쇼츠·shots의 음악 부분 포함)
- 카테고리: 음악
- 메인 지침: [`docs/MUSIC_AUTOMATION_POLICY.md`](../MUSIC_AUTOMATION_POLICY.md) — 음악 작업 전에 먼저 읽는다
- 주력 업무: 음악 프로그램 개발·배경음악 공용화·외부 분석 인계 처리. 대기 목록: `docs/MUSIC_OWNER_QUEUE_20261024.md`
- 마지막 갱신: 2026-11-03 (`claude-win-20261024-music` — AI 무료음악 자동화 1단계 웹 뼈대 코드, gemini-2.5 점검은 맥미니 플랜 `docs/PLAN_20261103_MODEL_MIGRATION_DEC.md`로 대체)

## 지금 하는 일
| 프로그램 | 작업 | 시작 | 상태 |
|---|---|---|---|
| `free-music-studio`(새) | AI 무료음악 자동화 — 0단계 끝(미니PC CPU·마스터PC 5080 「SUNO보단 못하지만 들을만함」), **1단계 웹 뼈대 v1.01 배포 완료**(https://free-music-studio.buylife.xyz , `new·coming` 배지) | 2026-11-03 | **2단계 엔진 0.1 코드 `6e6b73c4c`** — 미니PC에서 사이트→엔진→곡 생성 성공. 다음: 마스터PC(5080) 처음부터 설치 시험 → 3단계 웹 연결. 미배포 대기 `96f04aee3` 3건. 플랜 `free-music-studio/docs/PLAN_20261103_V1_01.md` |
| `lyric-video-studio` v1.11 | Lyricbi L-2~L-5 남음(L-1 v1.11 배포 끝, 승인 빌드 2회 중 1회 사용, 플랜 `lyric-video-studio/docs/PLAN_20261024_LYRICBI_L1_L5.md`) | 2026-10-24 | L-1 끝, 다음 L-2 |

## 대기 중 (주인님 승인·결정 대기 포함)
| 프로그램 | 작업 | 기다리는 것 | 근거 문서 |
|---|---|---|---|
| `music` v1.49 | 30일 정리 결과 대조 | 2026-11-04 03:00 정리 뒤 남은 행 0개(다른 회원 4행 삭제)·두 계정 자료 유지 확인 | `music/AGENTS.md` 2026-11-03 |
| `music-video-studio` v1.26 | 미배포 대기 `fde4c94bf`(분석 결과만 있어도 장면 이미지 먼저) | 다음 배포 때 함께(v1.27) | `music-video-studio/AGENTS.md` v1.26 |
| `lyric-video-studio` v1.11 | Lyricbi L-2 LP판 회전 → L-3 무료 사진 배경 → L-4 꾸밈 확장 → L-5 렌더 진단(배포 1회) | **다음 작업 대기** — 주인님이 시작을 지시하실 때(2026-11-03 보류 지시) | `lyric-video-studio/docs/PLAN_20261024_LYRICBI_L1_L5.md` |
| `playlist-channel-studio` v1.34 | Spectrum P-6 확장 묶음(대기 4번) | 실제 속도 보고 범위 결정 | `playlist-channel-studio/docs/PLAN_20261024_SPECTRUM_P1_P6.md` |

## 최근 완료 (최근 10개)
| 날짜 | 프로그램·버전 | 한 일 | 배포 |
|---|---|---|---|
| 2026-11-03 | `free-music-studio` v1.01(새) | AI 무료음악 자동화 1단계 웹 뼈대(곡 만들기·AI 작사·엔진 안내·설정·매뉴얼), 시험 계정 크롬 검수·AI 작사 1회 성공 | 배포 |
| 2026-11-03 | 종료 모델 긴급 교체 8개 | 영상 v1.26·쇼츠 v1.43·이미지 v1.31·플레이리스트 v1.34·쓰레드 3개·타로 v1.28, 시험 4개 통과 | 배포 |
| 2026-11-03 | `music` v1.49 | 30일 정리 수정(멈춘 생성 중·원곡 조회 오류)·관리자·시험 계정 제외 | 배포 |
| 2026-11-03 | `playlist-channel-studio` v1.33 | 플랫폼별 최신 모델 추가(텍스트 9·이미지 6, 시험 모두 통과) | 배포 |
| 2026-11-01 | `music-automation` v1.48 | AI 공급사 순서 변경, 최신 모델 6개 추가 | 배포 |
| 2026-10-31 | `ai-mastering-studio` v1.15 | AI 제안 최신 모델 9개 추가, 플랫폼별 묶음, 기본값 3.8 Flash | 배포 |
| 2026-10-31 | `ai-audio-analyzer` v1.14 | `gemini-3.8-flash` 교체, Suno v6 지시문·화면 문구, 정확성 규칙. 합성음 환각은 미해결 | 배포 |
| 2026-10-25 | `lyric-video-studio` v1.11 | Lyricbi L-1 노래방 로마자 발음(끔/위/아래, 시험 5개) | 배포 |
| 2026-10-25 | 음악 카테고리 | 기본 지침 1판 `docs/MUSIC_AUTOMATION_POLICY.md`(대화 기록 66건 분석) · 쇼츠 무료 음성 휴대폰 속도 20초/20초 기록 | 없음(문서) |
| 2026-10-24 | `shorts-onestop-studio` v1.42 | 무료 음성(내 브라우저) + 공용 엔진 `browser-free-tts` — 시험 계정 운영 검수 완료(음성·업로드·MP4) | 배포 |
| 2026-10-24 | 무료 음성 엔진 | 사전 검증 페이지(내 PC): 첫 내려받기 40~54초·두 번째 2.1초, 여러 줄 계산 0.66~0.99배, 외부 그림 정상, 음질 주인님 통과 → 개발 플랜 작성 | 없음(비용 없음) |
| 2026-10-24 | `playlist-channel-studio` v1.31 | 영상(MP4) 배경 미표시 수정 | 배포 |
| 2026-10-24 | `playlist-channel-studio` v1.30 | Spectrum P-3·P-4·P-5 | 배포 |
| 2026-10-24 | `playlist-channel-studio` v1.29 | Spectrum P-0·P-1·P-2 | 배포 |
| 2026-10-24 | `music-video-studio` v1.26 | 참고 이미지 화풍 분석 → 장면 | 배포 |
| 2026-10-24 | `music-video-studio` v1.25 | 곡 파형 | 배포 |
| 2026-10-24 | `music-video-studio` v1.24 | AI 이미지 스튜디오 이미지를 참고로 | 배포 |

## 다음 첫 단계
1. 2026-11-04 03:00(KST) 뒤 음악(SUNO) 30일 정리 결과 대조(다른 회원 4행 삭제·관리자·시험 계정 자료 유지·`cleanup_expired` 새 줄)
2. 그 다음 작업은 주인님 지시를 기다림 — 가사 영상 L-2~L-5는 대기 목록(위 표)

## 주인님께 여쭐 것
- (없음)
