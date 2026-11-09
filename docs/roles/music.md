# 음악

- 담당: Claude Code(윈도우) `claude-win-20261024-music`
- 맡은 폴더: `ai-music-studio/` `music/` `lyric-video-studio/` `playlist-channel-studio/` `music-video-studio/` `ai-mastering-studio/` 등(쇼츠·shots의 음악 부분 포함)
- 카테고리: 음악
- 메인 지침: [`docs/MUSIC_AUTOMATION_POLICY.md`](../MUSIC_AUTOMATION_POLICY.md) — 음악 작업 전에 먼저 읽는다
- 주력 업무: 음악 프로그램 개발·배경음악 공용화·외부 분석 인계 처리. 대기 목록: `docs/MUSIC_OWNER_QUEUE_20261024.md`
- 마지막 갱신: 2026-11-09 `claude-win-20261024-music` (역할 파일 정리 — 끝난 항목 정리, 최근 완료 10개로)

## 지금 하는 일
| 프로그램 | 작업 | 시작 | 상태 |
|---|---|---|---|
| — | 진행 중인 개발 없음 | — | 무료음악 v1.59 · 이미지 v1.34 · 플레이리스트 v1.38까지 배포 끝, 미배포 대기 0 |

## 대기 중 (주인님 승인·결정 대기 포함)
| 프로그램 | 작업 | 기다리는 것 | 근거 문서 |
|---|---|---|---|
| `free-music-studio` | C-17 트로트·성인가요 장르(대분류) 추가 | 주인님 「일단 대기」 — 마스터PC에서 한국어 트로트 실물 확인 뒤 | `free-music-studio/docs/IMPROVEMENT_BACKLOG.md` C-17 |
| `free-music-studio` | WAV 원음을 FLAC으로 통일(엔진 0.8.2) | 주인님 「일단 놔둬」(2026-11-09) — 지시 있을 때만 | 이 파일(기록용) |
| `free-music-studio` | A-6 Apple Silicon 맥 엔진 설치 파일 | Apple Silicon 맥 준비(엔진 0.7.7 이상으로) | 백로그 「보관」 A-6 |
| `free-music-studio` | B-6 LeVo 2 v2-medium | 공식 코드 `tencent-ailab/SongGeneration` 공개(아직 404) | 백로그 「보관」 B-6 |
| `free-music-studio` | B-4 가사 시간 맞추기 추가 비교 | 수동 정답 자료 준비 | 백로그 「보관」 B-4 |
| `free-music-studio` | D-2 앨범 그림 모델 이름 따라 바꾸기 | `ai-image-studio` 모델이 바뀔 때만(상시 점검) | 백로그 D-2 |
| `free-music-studio` | 다른 세션 미커밋 변경(`AlbumArtPanel.tsx` `pickLocalArtVariant`·엔진 `imageArt.mjs`) | 그 세션이 마무리·배포 — v1.59는 이 변경을 빼고 커밋된 코드만 배포함 | `docs/HANDOFF.md` 2026-11-09 |

## 최근 완료 (최근 10개)
| 날짜 | 프로그램·버전 | 한 일 | 배포 |
|---|---|---|---|
| 2026-11-09 | `free-music-studio` v1.59 | 곡 만들기 화면 왼쪽 메뉴·모든 화면 이동 먹통 수정(`MultiVersionPanel` `useEffect` 무한 반복 → `useMemo`, v1.57부터 있던 버그) + 「작업 대기열」 링크. 재발 방지 `docs/ERROR_LESSONS.md` 2026-11-09 | 배포(커밋된 코드만) |
| 2026-11-09 | `free-music-studio` v1.58 | 연주곡 장르 2단계(9개·세부 49개, AI 작곡 기획·프리셋 연동) + 단계 막대·AI 작사 접기(C-36) + 넓은 화면 배치(C-35) | 배포 |
| 2026-11-09 | `ai-image-studio` v1.34 | 「내 PC (무료)」로 그린 그림 갤러리 자동 저장(`/api/local-result`) | 배포 |
| 2026-11-09 | `playlist-channel-studio` v1.38 | P-6 추가 스티커 최대 3개(미리보기·MP4) | 배포 |
| 2026-11-09 | `free-music-studio` v1.57·엔진 0.8.1 · `ai-image-studio` v1.33 · `playlist-channel-studio` v1.37 | 여러 버전 한 번에(C-34)·넣을 프로젝트(C-33)·이미지 자동화 연결(D-3) / 「내 PC (무료)」 카드 / P-6 스펙트럼 3종·팔레트·파티클 | 배포 |
| 2026-11-09 | `free-music-studio` v1.55~v1.56·엔진 0.8.0 | YuE2 커버(원곡 멜로디 받아 적기, B-5 마스터PC 확인) + 커버 기록 버그(C-31)·AI 작사 옵션 접기(C-32) | 배포 |
| 2026-11-09 | `free-music-studio` v1.52~v1.54·엔진 0.7.8~0.7.9 | 노래 장르 2단계(대분류 12·세부 59) · 그림 메모리 부족 안내·자동 재시도 · 곡 만들기 두 칸·분위기 탭(C-22~C-26) | 배포 |
| 2026-11-08 | `free-music-studio` v1.41~v1.51·엔진 0.7.4~0.7.7 | 글 AI 모델 계정 저장·음악앨범 화면·VIP 새 프로그램 자동 체크(운영 DB `0057`)·FLAC 표지·금지어 계정 저장 등 | 배포 |
| 2026-11-07~08 | `free-music-studio` v1.35~v1.40 | 음악앨범(곡과 따로 그림 만들기·모아 보기)·그림으로 곡 만들기·PC 검사 정리 | 배포 |
| 2026-11-06 | 공용 권한 판정(56개)·`lyric-video-studio` v1.12·`free-music-studio` v1.26~v1.29 | 권한 판정 두 묶음 동시 조회 · Lyricbi L-2~L-5 · 원본 boks-music 이식 10묶음 운영 반영 | 배포 |

더 앞의 이력은 각 프로그램 `AGENTS.md` 버전 기록에 있다(`free-music-studio/AGENTS.md` §4 등).

## 다음 첫 단계
1. (선택·주인님 확인) 마스터PC에서 연주곡 장르를 골라 「AI 작곡 기획」 1회 — 고른 장르 안에서 곡을 짜는지 실물 확인(회원 키 AI 호출 1번)
2. 주인님이 C-17(트로트) 재개를 지시하면: 마스터PC 한국어 트로트 1곡 실물 확인 → `lyricTags.ts` 대분류 추가
3. 새 작업이 오면: `node scripts/dev-requests.mjs list --role music` → 백로그 확인 → 플랜 → 구현. 화면을 크게 바꾼 뒤에는 배포 전에 `next dev`로 「Maximum update depth」 경고를 확인한다(2026-11-09 교훈)

## 주인님께 여쭐 것
- 없음
