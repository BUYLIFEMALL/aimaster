# 음악

- 담당: Claude Code(윈도우) `claude-win-20261024-music`
- 맡은 폴더: `ai-music-studio/` `music/` `lyric-video-studio/` `playlist-channel-studio/` `music-video-studio/` `ai-mastering-studio/` 등(쇼츠·shots의 음악 부분 포함)
- 카테고리: 음악
- 메인 지침: [`docs/MUSIC_AUTOMATION_POLICY.md`](../MUSIC_AUTOMATION_POLICY.md) — 음악 작업 전에 먼저 읽는다
- 주력 업무: 음악 프로그램 개발·배경음악 공용화·외부 분석 인계 처리. 대기 목록: `docs/MUSIC_OWNER_QUEUE_20261024.md`
- 마지막 갱신: 2026-11-06 (`claude-win-20261024-music` — AI 무료음악 원본 이식 9번 플레이리스트 영상 끝, 미배포 대기)

## 지금 하는 일
| 프로그램 | 작업 | 시작 | 상태 |
|---|---|---|---|
| `free-music-studio`(새) | **주인님 지시(11-03): 음악 퀄리티 최고 수준 방향** · AI 무료음악 자동화 — 0단계 끝(미니PC CPU·마스터PC 5080 「SUNO보단 못하지만 들을만함」), **1단계 웹 뼈대 v1.01 배포 완료**(https://free-music-studio.buylife.xyz , `new·coming` 배지) | 2026-11-03 | **2단계 엔진 0.1 코드 `6e6b73c4c`** — 미니PC에서 사이트→엔진→곡 생성 성공, **마스터PC(5080) 처음부터 설치 성공(2026-11-03, 고품질 cuda 자동 선택)**. **v1.02 3단계 웹 연결·v1.03 「모든 음악」 보관함·v1.04 저장 폴더 고르기·v1.05 프로젝트·플레이리스트 배포 완료**(운영 확인). **v1.06 가져온 음악(커버) 배포, 2026-11-03 전체 9단계 플랜 `free-music-studio/docs/PLAN_20261103_FULL_ROADMAP.md`, 1단계 PC 검사·음악 모델 고르기 배포(`be0b822ca`), 2026-11-04 2단계 만들기 강화 v1.08(`273934d52`)·3단계 작업 대기열 v1.09·엔진 0.1.6(`d6880119a`) 배포, v1.10·엔진 0.2.0 비상업용 YuE2 + 재생바 배포**, v1.11 엔진 설치 파일, **v1.12·엔진 0.4.0 음악 엔진 더 넣기 1차(HeartMuLa·Stable Audio 3·LeVo 2, 상업용·개인용 두 묶음) 배포**. 다음: 마스터PC에서 새 엔진 세 개 실물(주인님) → 2차(DiffRhythm 2·InspireMusic·MiniMax Music 3, 플랜 `free-music-studio/docs/PLAN_20261104_MORE_ENGINES.md`) → 4단계 나머지 |
| `lyric-video-studio` v1.11 | Lyricbi L-2~L-5 남음(L-1 v1.11 배포 끝, 승인 빌드 2회 중 1회 사용, 플랜 `lyric-video-studio/docs/PLAN_20261024_LYRICBI_L1_L5.md`) | 2026-10-24 | L-1 끝, 다음 L-2 |

## 대기 중 (주인님 승인·결정 대기 포함)
| 프로그램 | 작업 | 기다리는 것 | 근거 문서 |
|---|---|---|---|
| `free-music-studio` | 묶음 1 「내 곡에서 바로 커버」 `2673573a5` + 2-1 환경설정 `3f9613f4c` + 플레이리스트 보강 `f6753d3a4` + 보관함 안전 `08c5ec312`(엔진 0.6.9) + 원본 이식 1번 묶음 `09bfef101` + 2번 묶음 `550b8eb03`·`a6a31e78f`·`51264756e` + 3번 묶음 `4fb0783a3` + 4번 묶음 `0d320ff44`·`7e0859a1e`·`413a27da5`·`633d73a21` + 5번 `b6c32440a`·`4dd3ad948` + 6번 `d8a673b82` + 7번 `d189230f6` + 8번 `70564b7a6` + 9번 영상 `6c29f99d6`·`afe641f78`·`4d1e13eba`(엔진 0.6.9) 미배포 대기(운영 DB 칸 3개는 11-06 적용 완료) | 다음 음악 배포 때 함께(운영 DB `parent_id` 칸은 2026-11-05 적용 완료) | `free-music-studio/docs/PLAN_20261105_ORIGINAL_PARITY.md` |
| `music` v1.49 | 30일 정리 결과 대조 | 2026-11-04 03:00 정리 뒤 남은 행 0개(다른 회원 4행 삭제)·두 계정 자료 유지 확인 | `music/AGENTS.md` 2026-11-03 |
| `music-video-studio` v1.26 | 미배포 대기 `fde4c94bf`(분석 결과만 있어도 장면 이미지 먼저) | 다음 배포 때 함께(v1.27) | `music-video-studio/AGENTS.md` v1.26 |
| `lyric-video-studio` v1.11 | Lyricbi L-2 LP판 회전 → L-3 무료 사진 배경 → L-4 꾸밈 확장 → L-5 렌더 진단(배포 1회) | **다음 작업 대기** — 주인님이 시작을 지시하실 때(2026-11-03 보류 지시) | `lyric-video-studio/docs/PLAN_20261024_LYRICBI_L1_L5.md` |
| `playlist-channel-studio` v1.34 | Spectrum P-6 확장 묶음(대기 4번) | 실제 속도 보고 범위 결정 | `playlist-channel-studio/docs/PLAN_20261024_SPECTRUM_P1_P6.md` |

## 최근 완료 (최근 10개)
| 날짜 | 프로그램·버전 | 한 일 | 배포 |
|---|---|---|---|
| 2026-11-06 | `free-music-studio` | 원본 이식 9번 플레이리스트 영상: 장면 37개 그대로 이식, 엔진 `video.mjs`(분석·조각 받기·담기·반복·검증), 사이트 `/video`(템플릿·미리보기·가사 영상·만든 영상 목록). ego 실측 두 편 완성(하드웨어 인코딩 1분 약 9~10초), 하드웨어 인코더 시간 정보 문제 `-fflags +genpts -r`로 해결 | 미배포 대기(엔진 0.6.9와 함께) |
| 2026-11-06 | `free-music-studio` | 운영 DB(ref `esgxyikcnnvmlhygjkth`)에 `free_music_songs.project_id`·`free_music_tracks.trashed_at`·`trash_batch_id` 추가(채팅 승인, ego lite SQL 편집기) + 4번 묶음 끝(홈·좌측 목록·자동 저장·「…」 메뉴·프로젝트 안에서 만들기) | DB 적용 / 화면 미배포 |
| 2026-11-06 | `free-music-studio` | 주인님 「원본에서 활용할 수 있는 건 싹 가져와」: 원본 약 180개 파일 4갈래 분석 → 전체 이식 플랜 10묶음(`free-music-studio/docs/PLAN_20261106_ORIGINAL_PORT_ALL.md`), MIT 고지(`NOTICE.md`), 보관함 지우기 안전(`08c5ec312`), 1번 묶음 화면 기본(`09bfef101`) | 미배포 대기 |
| 2026-11-06 | `free-music-studio` | 플레이리스트 보강(주인님 캡처 요청): 여러 곡 고르기·담기·새로 만들어 담기·프로젝트로 옮기기·빼기, 끌어서 순서·번호 입력·제목순·되돌리기(원본 `TrackOrderList` MIT 코드), 재생 대기열 패널 | 미배포 대기 `f6753d3a4` |
| 2026-11-05 | `free-music-studio` | 운영 DB(ref `esgxyikcnnvmlhygjkth`)에 원곡 번호 칸 `parent_id`·색인 추가(채팅 승인, ego lite SQL 편집기) | 없음(DB) |
| 2026-11-05 | `free-music-studio` | 원본 boks-music(beta.5) 명령 67개 전체 대조 → 묶음 1~6 플랜, 묶음 1 「내 곡에서 바로 커버」 구현 | 미배포 대기 |
| 2026-11-05 | `free-music-studio` v1.25 | 엔진 0.6.8: 앨범 그림 플랫폼 고르기(Gemini·GPT Image·FLUX 2) + 곡 표지(「모든 음악」 작은 그림·MP3에 표지) | 배포 |
| 2026-11-05 | `free-music-studio` v1.18~v1.24 | 엔진 0.6.3~0.6.7: LeVo 2 실행 환경·MiniMax Music 3 불러오기·효과음 모드·영어 설명·앨범 그림 만들기(Gemini) — 상세 `free-music-studio/AGENTS.md` §4 | 배포 |
| 2026-11-04 | `free-music-studio` v1.17 | 엔진 0.6.2: LeVo 2 모델을 v1 base-full로(v2-medium 구조 불일치), 버전 표시 크고 밝게 | 배포 |
| 2026-11-04 | `free-music-studio` v1.16 | 엔진 0.6.1: LeVo 2 진짜 원인(GitHub 압축 안 LFS 자리표시 파일) 자동 수정 | 배포 |
| 2026-11-04 | `free-music-studio` v1.15 | 엔진 0.6.0: 2차 MiniMax Music 3(상업용 조건부)·LeVo 2 torch.load 수정·실패 원인 표시·새 판 안내 | 배포 |
| 2026-11-04 | `free-music-studio` v1.14 | 엔진 0.5.0: 모델 저장 공간 관리 — 「모델 저장 공간」 상자(항목별 크기·안 쓰는 모델 지우기)·모델 폴더를 다른 드라이브로(옮기기/새로 받기)·설치 확인 창 없앰·받기 진행 막대. 미니PC 실물(한글 경로 D 드라이브) | 배포 |
| 2026-11-04 | `free-music-studio` v1.13 | 엔진 0.4.1: 추가 엔진 설치 실패(torch 판 맞추기, 마스터PC HeartMuLa) 수정 — PyTorch 저장소를 보조로 | 배포 |
| 2026-11-04 | `free-music-studio` v1.12 | 음악 엔진 더 넣기 1차(엔진 0.4.0 공통 실행 틀): 상업용 HeartMuLa·Stable Audio 3(조건부, 회원 Hugging Face 토큰) / 개인용 LeVo 2, 곡 만들기·PC 검사 두 묶음, 받은 모델 지우기, 함께 `/downloads` 공개 | 배포 |
| 2026-11-04 | `free-music-studio` v1.11 | 엔진 설치 파일(엔진 0.3.0, `desktop/` Electron: 작업 표시줄·자동 실행·예전 엔진 정리·새 버전 알림) + 원클릭 다운로드 센터 | 배포 |
| 2026-11-04 | `free-music-studio` v1.10 | 비상업용 음악 엔진 YuE2(엔진 0.2.0, ACE-Step 잠시 멈춤으로 그래픽 메모리 비움)·엔진 고르기·비상업 동의·「비상업용」 표시·DB `license` + 재생바·실패 이유 표시 | 배포 |
| 2026-11-04 | `free-music-studio` v1.09 | 3단계: 작업 대기열(엔진 0.1.6 `/queue`·웹 `/queue`·좌측 개수·자동 기록), 가짜 음악 엔진으로 검수 | 배포 |
| 2026-11-04 | `free-music-studio` v1.08 | 2단계: 프리셋 85개·내 프리셋(새 DB 표)·연주곡 + AI 작곡 기획·목표 길이 5분·생성 개수·가사 다듬기·금지어 | 배포 |
| 2026-11-03 | `free-music-studio` v1.06 | 가져온 음악(커버·부분 수정) + AI 작사 OpenAI/Claude/Gemini + 최고 품질(엔진 0.1.4 XL·4B·FLAC·MP3 320k) | 배포 |
| 2026-11-03 | `free-music-studio` v1.05 | 프로젝트·플레이리스트(묶기·담기·순서·이어 듣기) + 사이트 안 한글 폴더 고르기 | 배포 |
| 2026-11-03 | `free-music-studio` v1.04 | 저장 폴더 — 기본 음악\AI 무료음악, PC 폴더 고르기 창·기존 노래 옮기기·폴더 열기, 파일 이름 = 곡 제목(엔진 0.1.2) | 배포 |
| 2026-11-03 | `free-music-studio` v1.03 | 「모든 음악」 — 엔진 0.1.1 내 PC 보관함 + 곡 기록 표 + 보관함 화면(다시 듣기·내려받기·가사·지우기) | 배포 |
| 2026-11-03 | `free-music-studio` v1.02 | 3단계 웹 ↔ 내 PC 엔진(연결 코드 6자리·노래 만들기·걸린 시간·재생·MP3 내려받기), 「짝짓기」→「연결 코드」, 운영 사이트에서 30초 곡 생성 확인 | 배포 |
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
0. `free-music-studio` 원본 전체 이식 — 1~9번 끝(미배포) → **10번 Stem 분리(BS-RoFormer 2·6트랙) → 자동 가사 정렬(Qwen3-ForcedAligner, 받기 전 라이선스 확인)** → 그 뒤 v1.26 + 엔진 0.6.9 설치 파일 함께 배포(빌드 승인 필요) 파일 → 9 영상 → 10 Stem·자동 정렬 → 4(홈·2단·「…」 메뉴, DB 칸) → 5(AI 가사 결과 창) → 6(휴지통) → 7(마스터링) → 8(가사 파일) → 9(영상) → 10(Stem·자동 정렬) — `free-music-studio/docs/PLAN_20261106_ORIGINAL_PORT_ALL.md`(옛 `PLAN_20261105_ORIGINAL_PARITY.md`를 대신함). 원본 소스 `D:/PDS/Program_dev/free-music-src/repo`(beta.5)를 묶음마다 먼저 읽음. (주인님 확인 대기) 마스터PC 엔진 0.6.8 표지·MP3 표지, GPT Image·FLUX 2 그림
1. 2026-11-04 03:00(KST) 뒤 음악(SUNO) 30일 정리 결과 대조(다른 회원 4행 삭제·관리자·시험 계정 자료 유지·`cleanup_expired` 새 줄)
2. (끝) 마스터PC 엔진 0.1.11로 대기열 실물 확인 — 완성·자동 기록·취소·중단됨 모두 정상(2026-11-04). 그 과정에서 엔진 0.1.7~0.1.11 수정(기록 파일·빈 번호·남은 음악 엔진 정리·실패 이유 표시·UTF-8)
3. (끝) 마스터PC YuE2 첫 실물 성공 — 주인님 「음질·음악적 필 모두 YuE2가 좋다」
3-1. (끝) 마스터PC HeartMuLa 첫 실물 성공(엔진 0.4.1, 2026-11-04 14:14~14:52, 첫 받기 포함 38분, RTX 5080 16GB 나눠 올리기) — 주인님 「음질 무난하고 한국 발음도 자연스러워」(상업용 한국어 노래 후보)
3-3. (끝) 2차 배포 v1.15·엔진 0.6.0(`free-music-studio-e1xugpr05`): MiniMax Music 3(상업용 조건부), LeVo 2 「Weights only load failed」 수정, 실패 원인 표시, 새 판 안내. DiffRhythm 2는 3차, InspireMusic 보류. 엔진 플랜 승인 빌드 3회 다 씀
3-5. LeVo 2 진짜 원인 = GitHub 압축 안 LFS 자리표시 글(`tools/new_prompt.pt` 133바이트, realty 세션이 확인) → 마스터PC는 주인님이 진짜 파일로 바꿈(확인값 일치), 엔진 0.6.1 자동 수정 배포 완료(v1.16 `free-music-studio-5gh1o5hsp`)
3-4. 마스터PC 엔진 0.6.0 설치 → LeVo 2 [다시 하기] → MiniMax Music 3 1곡(약 35GB 받음, 16GB 나눠 올리기라 느림) → Stable Audio 3(회원 Hugging Face 토큰)
3-2. 마스터PC 엔진 0.5.0 설치(확인 창 없이) → 「모델 저장 공간」에서 모델 폴더를 다른 드라이브로 옮기기 실물 → LeVo 2 · Stable Audio 3(회원 Hugging Face 토큰) 실물(엔진 실행 프로그램이 새 버전 알림 → 받기·설치 → 곡 만들기에서 HeartMuLa·Stable Audio 3·LeVo 2 각 1곡). 실패하면 데이터 폴더 `<엔진>-log.txt`부터. Stable Audio 3는 회원 Hugging Face 토큰·약관 동의 먼저
4. AI 무료음악 자동화 4단계 나머지 — 홈 화면·곡 만들기 2단·내 곡에서 바로 커버·휴지통(재생바는 v1.10에서 끝)

## 주인님께 여쭐 것
- (없음 — AI 무료음악 원본 이식 결정 5가지는 2026-11-06 채팅으로 모두 확정, 요청함 승인완료)
