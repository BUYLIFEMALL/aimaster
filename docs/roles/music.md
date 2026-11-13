# 음악

- 담당: Claude Code(윈도우) `claude-win-20261024-music`
- 맡은 폴더: `ai-music-studio/` `music/` `lyric-video-studio/` `playlist-channel-studio/` `music-video-studio/` `ai-mastering-studio/` 등(쇼츠·shots의 음악 부분 포함)
- 카테고리: 음악
- 메인 지침: [`docs/MUSIC_AUTOMATION_POLICY.md`](../MUSIC_AUTOMATION_POLICY.md) — 음악 작업 전에 먼저 읽는다
- 주력 업무: 음악 프로그램 개발·배경음악 공용화·외부 분석 인계 처리. 대기 목록: `docs/MUSIC_OWNER_QUEUE_20261024.md`
- 마지막 갱신: 2026-11-13 `claude-win-20261024-music` (음악 자동화 v1.51 가사 생성·수정·저장)

## 지금 하는 일
| 프로그램 | 작업 | 시작 | 상태 |
|---|---|---|---|
| — | 진행 중인 개발 없음 | — | 최근 배포: music v1.51(11-13) · 플레이리스트 v1.41(11-13) · 무료음악 v1.65·마스터링 v1.16(11-10). 미배포 대기: 플레이리스트 1건(`16439a8e9`) · 음악 6개 공통 보완(`b4403e8bd`, music·가사 영상 나감) · music 가사 정리·버튼 문구(`d29041221`) · 무료음악 웹·엔진 2건 |

## 대기 중 (주인님 승인·결정 대기 포함)
| 프로그램 | 작업 | 기다리는 것 | 근거 문서 |
|---|---|---|---|
| `free-music-studio` | B-6 LeVo 2 v2-medium | 공식 코드 `tencent-ailab/SongGeneration` 공개(아직 404) — **공개되면 바로 진행**(2026-11-10 주인님 「이건 나오면 진행」, 공개 확인 시 플랜부터) | 백로그 「보관」 B-6 |
| `playlist-channel-studio` | 첫 30일 정리 예약 실행 확인(cron 04:20 KST) | 2026-11-14 04:20 이후(Vercel 로그·`usage_logs` `cleanup_expired`) | 플랜 `playlist-channel-studio/docs/PLAN_20261113_RETENTION_30D.md` |
| `playlist-channel-studio` | 곡 넣기 전에도 「내가 올린 영상」 목록 보이기 `16439a8e9`(구현 끝) | 다음 플레이리스트 배포(v1.42) | `playlist-channel-studio/docs/IMPROVEMENTS.md` |
| 음악 6개 공통 보완(단독 배포 안 함) | **구현 끝·미배포 `b4403e8bd`(11-13)**: 로그아웃 local 9곳 · 서버 `User-Agent` 5곳 · 저장공간 위젯 4곳(무료음악·music·AI 음악 스튜디오·마스터링·가사 영상·뮤직비디오) | 각 프로그램 다음 배포 때 함께(버전 +0.01은 그때) | 각 폴더 `docs/IMPROVEMENTS.md` 맨 위 |
| `ai-music-studio` | ⏸ Mureka 켜기(코드 준비됨·숨김) | 주인님이 필요해 충전하실 때(10-23 지시) | `ai-music-studio/docs/IMPROVEMENT_BACKLOG.md` |
| `free-music-studio` | D-2 앨범 그림 모델 이름 따라 바꾸기 | `ai-image-studio` 모델이 바뀔 때만(상시 점검) | 백로그 D-2 |
| `free-music-studio` | **구현 끝·미배포(11-13)**: 웹 `76d9bab83` 끝 이어 만들기 가사 미리 채우기(빈 `[Outro]` 건너뛰기) / 엔진 `388b00b23` 끝 줄이기 곡선 `hsin` | 웹은 다음 웹 배포, 엔진은 다음 엔진 설치 파일 배포 때(실제 곡으로 끝 듣기 확인) · 엔진 시험 「도구 받기」 1개 실패 원인 확인 | `free-music-studio/docs/IMPROVEMENTS.md` 맨 위 |

## 나중에 할 일 (장비가 바뀐 뒤 — 지금은 손대지 않음)
| 프로그램 | 작업 | 언제 | 근거 |
|---|---|---|---|
| `free-music-studio` | A-6 Apple Silicon 맥 엔진 설치 파일(DMG는 엔진 0.7.7 이상으로) | 장비가 Apple Silicon 맥으로 바뀐 뒤(2026-11-10 주인님 「나중에 장비 바뀌면 할꺼니까 나중에 하는 걸로」) | 백로그 「보관」 A-6 · `free-music-studio/docs/MAC_MINI_DMG_PROMPT_20261108.md` |

## 최근 완료 (최근 10개)
| 날짜 | 프로그램·버전 | 한 일 | 배포 |
|---|---|---|---|
| 11-13 | 음악 자동화 v1.51 | 기획 상세 가사 생성·수정·저장 → 저장 가사로 보컬 생성, 스튜디오 가사 칸 아래 생성 버튼 | ✅ `music-qs47n803e` (가사 정리·버튼 문구는 미배포) |
| 2026-11-13 | `lyric-video-studio` v1.14 | 3차: 채널 로고·프레임 4종 + 유튜브 제목·설명 AI 제안(회원 본인 키, 저가 모델). 플레이리스트 원본 번들 사본 삭제, 공용 인코더 반영 제안은 영상 담당께 | 배포 |
| 2026-11-13 | `playlist-channel-studio` v1.41 | 30일 자동 정리(cron 04:20, `retention_exempt` 제외) + 업무·캘린더 보내기 실제 검수(비공개 1편 → 기록 → 받은 업무 → 콘텐츠 캘린더, 영상 삭제). 첫 예약 실행 11-14 확인 남음 | 배포 |
| 2026-11-13 | `playlist-channel-studio` v1.39 | 유튜브 올리기 기록 저장(표 `playlist_youtube_uploads`, 회원 채널 확인 뒤 저장, 워크스페이스 캘린더 연동 전제) + 로그아웃 local·서버 UA·저장공간 위젯. ego 시험 계정 v1.39·가짜 기록 거절 확인 | 배포 |
| 2026-11-12 | `free-music-studio` | Admin PC 실물 확인 1·2번 모두 통과 — 마스터링 「AI 설정 제안」 오류 없음·EQ·압축 칸 11개 중 9개 바뀜·대기열 저장 / 연주곡 「AI 작곡 기획」 재즈 피아노 트리오 장르 지킴·프리셋 242→8개로 좁힘·곡 저장 (`3a423b222`, 미리 듣기 버튼은 창에 없음) | 해당 없음 |
| 2026-11-12 | `music` v1.50 | 리믹스 결과 카드 → 가사 영상 링크(Admin PC `6d5f6d711`) + 저장공간 위젯(`5e9fea2d2`). ego lite 시험 계정으로 링크 2개·💾·가사 영상 쪽 곡 받기 확인 | 배포 |
| 2026-11-11 | `free-music-studio` | B-4 닫음 — 2번째 곡(후렴 3번·22줄) 자동 맞추기를 주인님이 듣고 고친 줄 0(22/22, 반복 12줄 포함), 「반복 가사 줄은 확인 필요」 규칙 넣지 않음(윈도우 미니PC 세션이 진행, 음악 담당이 증거 파일·운영 DB 읽기로 재확인 후 커밋) · 「내 자료함」 연동(트리거 `member_assets_sync_fms`, 코드 변경 없음) 안내를 `IMPROVEMENTS.md` 맨 위로 옮김 | 해당 없음 |
| 2026-11-10 | `ai-mastering-studio` v1.16 | 미배포 3건 묶음(Gemini 2.5 제거 `946660f65` — 12-01 종료 대비, API 키 문구, 권한 판정 동시 조회). ego 운영 v1.16·`gemini-2.5` 없음 | 배포 |
| 2026-11-10 | `free-music-studio` v1.65 | 트로트·성인가요 장르·프리셋 3개(C-17) + 엔진 업데이트 안내 넓히기(상태 막대·곡 메뉴) | 배포 |
| 2026-11-10 | `free-music-studio` 엔진 0.8.4 | 주인님 이음새 듣기 「자연스럽게 넘어가」 — 끝 이어 만들기 실물 확인 끝, 음량 보정 안 함(인수인계서 24절) | 해당 없음 |
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
1. 미배포 대기 묶음(대기 표)은 각 프로그램 다음 배포 때 함께 — 코드는 모두 커밋됨(11-13)
2. **음악 표 칸 이름을 바꿀 때 주의(2026-11-11)**: `free_music_tracks`·`ams_generations`·`music_track_variants`는 메인 「내 자료함」 트리거(`member_assets_sync_fms/ams/suno`, 마이그레이션 0059)가 읽는다 — 칸 이름·저장 경로를 바꾸면 트리거도 함께 고친다(트리거 오류 = 원본 저장 실패)
3. **11-14 04:20 이후** 플레이리스트 첫 예약 정리 실행 확인(Vercel 로그 또는 `usage_logs`) · 플레이리스트 미배포 대기 1건(곡 없이도 기록 목록 보이기 `16439a8e9`, 다음 배포 때 v1.42)
4. 새 작업이 오면: `node scripts/dev-requests.mjs list --role music` → 백로그 확인 → 플랜 → 구현. 화면을 크게 바꾼 뒤에는 배포 전에 `next dev`로 「Maximum update depth」 경고를 확인한다(2026-11-09 교훈)

## 주인님께 여쭐 것
- 없음
