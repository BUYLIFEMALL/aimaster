# 음악

- 담당: Claude Code(윈도우) `claude-win-20261024-music`
- 맡은 폴더: `ai-music-studio/` `music/` `lyric-video-studio/` `playlist-channel-studio/` `music-video-studio/` `ai-mastering-studio/` 등(쇼츠·shots의 음악 부분 포함)
- 카테고리: 음악
- 메인 지침: [`docs/MUSIC_AUTOMATION_POLICY.md`](../MUSIC_AUTOMATION_POLICY.md) — 음악 작업 전에 먼저 읽는다
- 주력 업무: 음악 프로그램 개발·배경음악 공용화·외부 분석 인계 처리. 대기 목록: `docs/MUSIC_OWNER_QUEUE_20261024.md`
- 마지막 갱신: 2026-11-10 `claude-win-20261024-music` (엔진 0.8.4 Admin PC 재시험 통과 반영, 주인님 듣기 대기)

## 지금 하는 일
| 프로그램 | 작업 | 시작 | 상태 |
|---|---|---|---|
| — | 진행 중인 개발 없음 | — | 무료음악 v1.64 · 엔진 0.8.4 배포 끝. 미배포 대기 1건(C-17 트로트 장르·프리셋 `462596896`, 주인님 「모아두었다가 해」) |

## 대기 중 (주인님 승인·결정 대기 포함)
| 프로그램 | 작업 | 기다리는 것 | 근거 문서 |
|---|---|---|---|
| `free-music-studio` | A-6 Apple Silicon 맥 엔진 설치 파일 | Apple Silicon 맥 준비(엔진 0.7.7 이상으로) | 백로그 「보관」 A-6 |
| `free-music-studio` | B-6 LeVo 2 v2-medium | 공식 코드 `tencent-ailab/SongGeneration` 공개(아직 404) | 백로그 「보관」 B-6 |
| `free-music-studio` | B-4 가사 시간 맞추기 추가 비교 | 수동 정답 자료 준비 | 백로그 「보관」 B-4 |
| `free-music-studio` | D-2 앨범 그림 모델 이름 따라 바꾸기 | `ai-image-studio` 모델이 바뀔 때만(상시 점검) | 백로그 D-2 |
| `free-music-studio` | 마스터PC 실물: 재생 강조·EQ·시각화·쇼츠 보내기, 참고곡 Gemini 1회 | 주인님 확인·승인 | `free-music-studio/AGENTS.md` v1.60 |
| `free-music-studio` | 마스터PC 실물: 끝 이어 만들기 이음새 듣기, AI 설정 제안 1번(회원 키) | 주인님 듣기 판정(요청함 `4faa2066`) — Admin PC 0.8.4 재시험은 숫자로 통과(인수인계서 23절) | `free-music-studio/AGENTS.md` v1.64 |
| `free-music-studio` | 다음 묶음 후보: 끝 줄이기 마지막 0.5초 -34.5dB(기준 -35 경계) 곡선 보강, 이어 만든 부분 음량 3~4dB 작음, 끝 이어 만들기 가사 칸 `[Outro]` 한 줄 | 주인님 듣기 결과와 함께 결정 | 인수인계서 20·23절 |
| `free-music-studio` | 엔진 업데이트 안내 넓히기 — 상태 막대·「끝 이어 만들기」 비활성 메뉴에 「새 엔진 · 업데이트」 | 미구현 — 다음 무료음악 배포 때 묶어서 | `free-music-studio/docs/IMPROVEMENTS.md` 2026-11-10 |

## 최근 완료 (최근 10개)
| 날짜 | 프로그램·버전 | 한 일 | 배포 |
|---|---|---|---|
| 2026-11-10 | `free-music-studio` 엔진 0.8.4 | Admin PC 재시험 통과 — 끝 이어 만들기 211초(곡 중간 무음 0곳)·끝 자동 줄이기 -14.9→-34.5dB(인수인계서 23절) | 해당 없음 |
| 2026-11-10 | `free-music-studio` | C-17 트로트·성인가요 장르(세부 4) + 노래 프리셋 3개 — Admin PC 3곡 시험, 주인님 「셋다 트로트 답다」(인수인계서 22절, `462596896`) | 미배포 대기 |
| 2026-11-10 | `free-music-studio` v1.64 · 엔진 0.8.4 | 0.8.3 끝 처리 실패(ffmpeg 자리에 참·거짓 전달) 고침 | 배포 |
| 2026-11-10 | `free-music-studio` v1.63 → 쇼츠 원스톱 v1.47 · shots v1.46 | D-4·D-6 무료음악 곡 → 쇼츠 원스톱·shots 배경음악 보내기 — Admin PC 실제 곡 시험 두 갈래 모두 통과(인수인계서 17절, 커밋 `d0055ed43`) | 이미 배포됨 |
| 2026-11-10 | `free-music-studio` | WAV 원음 FLAC 통일 — 주인님 「안할꺼야」로 대기 목록에서 지움(하지 않음) | 해당 없음 |
| 2026-11-10 | `free-music-studio` v1.63 · 엔진 0.8.3 | 곡 끝 처리 — 끊긴 끝 3초 자동 줄이기·「끝 이어 만들기」(ACE-Step 부분 수정 30·60·90초)·가사 길이 경고 + 마스터링 창 넓힘 | 배포 |
| 2026-11-09 | `free-music-studio` v1.60 · `ai-music-studio` v1.15 | 연계 D-4 보내는 쪽·D-8 댄스·월드 프리셋·D-9 참고곡 스타일·D-10 EQ·시각화·속도·D-11 유료 모델 비교 + 재생 강조 2곳 + 그림 기본 판 복구 | 배포 |
| 2026-11-09 | `free-music-studio` v1.59 | 곡 만들기 화면 왼쪽 메뉴·모든 화면 이동 먹통 수정(`MultiVersionPanel` `useEffect` 무한 반복 → `useMemo`, v1.57부터 있던 버그) + 「작업 대기열」 링크. 재발 방지 `docs/ERROR_LESSONS.md` 2026-11-09 | 배포(커밋된 코드만) |
| 2026-11-09 | `free-music-studio` v1.58 | 연주곡 장르 2단계(9개·세부 49개, AI 작곡 기획·프리셋 연동) + 단계 막대·AI 작사 접기(C-36) + 넓은 화면 배치(C-35) | 배포 |
| 2026-11-09 | `ai-image-studio` v1.34 | 「내 PC (무료)」로 그린 그림 갤러리 자동 저장(`/api/local-result`) | 배포 |
| 2026-11-09 | `playlist-channel-studio` v1.38 | P-6 추가 스티커 최대 3개(미리보기·MP4) | 배포 |
| 2026-11-09 | `free-music-studio` v1.57·엔진 0.8.1 · `ai-image-studio` v1.33 · `playlist-channel-studio` v1.37 | 여러 버전 한 번에(C-34)·넣을 프로젝트(C-33)·이미지 자동화 연결(D-3) / 「내 PC (무료)」 카드 / P-6 스펙트럼 3종·팔레트·파티클 | 배포 |
| 2026-11-09 | `free-music-studio` v1.55~v1.56·엔진 0.8.0 | YuE2 커버(원곡 멜로디 받아 적기, B-5 마스터PC 확인) + 커버 기록 버그(C-31)·AI 작사 옵션 접기(C-32) | 배포 |
| 2026-11-09 | `free-music-studio` v1.52~v1.54·엔진 0.7.8~0.7.9 | 노래 장르 2단계(대분류 12·세부 59) · 그림 메모리 부족 안내·자동 재시도 · 곡 만들기 두 칸·분위기 탭(C-22~C-26) | 배포 |
| 2026-11-08 | `free-music-studio` v1.41~v1.51·엔진 0.7.4~0.7.7 | 글 AI 모델 계정 저장·음악앨범 화면·VIP 새 프로그램 자동 체크(운영 DB `0057`)·FLAC 표지·금지어 계정 저장 등 | 배포 |
| 2026-11-07~08 | `free-music-studio` v1.35~v1.40 | 음악앨범(곡과 따로 그림 만들기·모아 보기)·그림으로 곡 만들기·PC 검사 정리 | 배포 |

더 앞의 이력은 각 프로그램 `AGENTS.md` 버전 기록에 있다(`free-music-studio/AGENTS.md` §4 등).

## 다음 첫 단계
1. 주인님 이음새 듣기 결과(요청함 `4faa2066`)를 받으면 끝 처리 보강 후보(대기 표)를 다음 배포 묶음에 넣을지 정함
2. (선택·주인님 확인) 마스터PC에서 연주곡 장르를 골라 「AI 작곡 기획」 1회 — 고른 장르 안에서 곡을 짜는지 실물 확인(회원 키 AI 호출 1번)
3. 다음 무료음악 배포 때: 미배포 대기(C-17 트로트) + 엔진 업데이트 안내 넓히기(구현 뒤) 함께, 버전 +0.01
4. 새 작업이 오면: `node scripts/dev-requests.mjs list --role music` → 백로그 확인 → 플랜 → 구현. 화면을 크게 바꾼 뒤에는 배포 전에 `next dev`로 「Maximum update depth」 경고를 확인한다(2026-11-09 교훈)

## 주인님께 여쭐 것
- 없음
