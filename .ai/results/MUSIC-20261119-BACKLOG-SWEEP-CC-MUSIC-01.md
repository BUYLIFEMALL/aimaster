# MUSIC-20261119-BACKLOG-SWEEP — 음악 프로그램 대기 항목 대조와 다음 묶음 후보 (CC-MUSIC-01)

- 상태: **ready_review** (판정은 Master)
- 범위: 음악 7개 폴더(`free-music-studio` `music` `ai-music-studio` `ai-mastering-studio` `playlist-channel-studio` `lyric-video-studio` `music-video-studio`)의 `docs/IMPROVEMENTS.md`·마지막 버전 커밋 뒤 코드 커밋·DB 버전·코드 대조
- 하지 않은 것: 제품 파일·공용 문서 편집, 실제 생성, 빌드·배포·푸시. 가사 영상 v1.17 2건·QA002 B는 다시 하지 않음

## 1. 버전·미배포 대조 (2026-11-19 HEAD 기준)

| 프로그램 | 화면 = DB | 마지막 버전 커밋 뒤 코드 커밋 | 판정 |
|---|---|---|---|
| 무료 음악 | v1.67 = v1.67 | 엔진만 4개(`f247a4c83` `2131089b7` `766febe46` `e8e52b505`, IMG-P1 PR-A, ECOM 점유) — 엔진 0.8.5 그대로, 엔진 릴리스 전 | 웹 미배포 0. 엔진 변경은 ECOM 몫(음악 담당 아님) |
| 음악 자동화 | v1.58 = v1.58 | 0 | 미배포 0 |
| AI 음악 스튜디오 | v1.16 = v1.16 | 0 | 미배포 0 |
| AI 마스터링 | v1.17 = v1.17 | 0 | 미배포 0 |
| 플레이리스트 | v1.42 = v1.42 | 0 | 미배포 0 |
| 가사 영상 | v1.17 = v1.17 | 0 | 미배포 0(11-19 배포) |
| 뮤직비디오 | v1.31 = v1.31 | 0 | 미배포 0 |

(근거: `node scripts/deploy.mjs <폴더> --version-only` 7개 모두 「버전 일치」, `git log <마지막 version.ts 커밋>..HEAD -- <폴더> ':!docs' ':!*.md'`)

## 2. 대기 항목 분류

| 구분 | 항목 | 근거 |
|---|---|---|
| **이미 반영(문서 표시만 늦음)** | 음악 리믹스 카드 → 가사 영상 바로가기 | `music/components/remix/RemixCard.tsx:188-190` `lyric-video-studio…/source?remix=`, 받는 쪽 `lyric-video-studio/src/components/views/SourceView.tsx:24-26`·`src/lib/suno.ts:62-64`. 그런데 `music/docs/IMPROVEMENTS.md:104`는 `[ ]`, `lyric-video-studio/docs/IMPROVEMENTS.md:50`은 「대기」 |
| 진짜 미구현 | 음악 리믹스 → **플레이리스트** 바로가기·받기 | `RemixCard.tsx`에 플레이리스트 링크 없음, `playlist-channel-studio/src`에 `?remix=`·`music_track_remix_variants` 읽기 없음(곡 가져오기는 `SunoImportPanel.tsx`·`api/suno/tracks`로 일반 곡만). 원래 플랜 `music/docs/PLAN_20261022_REMIX_SHORTCUTS.md`, `playlist-channel-studio/docs/IMPROVEMENTS.md:70-71` |
| 진짜 미구현(작음) | 가사 영상 L5 미리보기 `play()` 실패 무시 → 화면 안내 / U3 휴대폰 「영상 만들기는 PC 크롬·엣지에서」 안내 | `parts.tsx:37`·`SyncView.tsx:49,89` `play().catch(() => undefined)`, 휴대폰 안내 문구 코드 없음. `lyric-video-studio/docs/IMPROVEMENTS.md:26,33` |
| 실검증 대기 | 뮤직비디오 루프(시작 이미지 = 끝 화면)·이미지→영상 실제 호출 | `music-video-studio/docs/IMPROVEMENTS.md:42` 「가짜 응답 시험만 통과」 |
| 실검증 대기 | 가사 영상 「파일로 바로 저장」 맥 실물(QA002 B) | 맥 결과 대기 — 이번에 손대지 않음 |
| 외부 차단 | LeVo 2 다국어·YuE2 커버 원본 지원, Mureka 충전($30~), Apple Silicon 장비, 음악 50MB 넘는 WAV(지출 상한 유지 결정) | `free-music-studio/docs/IMPROVEMENTS.md:53`, `ai-music-studio/docs/IMPROVEMENTS.md:27`, `music/docs/IMPROVEMENTS.md:100` |
| 보류(주인님 결정 필요) | 플레이리스트 Spectrum Studio P-1~P-6(권리 재확인 대기), IMP-PLS-003~005(agy 제안, 승인 전) | `playlist-channel-studio/docs/IMPROVEMENTS.md:31-42,79-81` |

## 3. 다음 묶음 우선 후보 (최대 3개)

### 후보 1. 리믹스 결과 → 플레이리스트 바로가기·받기 (10-22 플랜의 남은 절반)
- 근거: 위 2절. 가사 영상 쪽은 v1.12에서 끝났고 플레이리스트만 남음
- 선행: Master 배정 + 주인님 범위 승인(두 프로그램 수정). `music_track_remix_variants` 회원 본인 것만 읽기(가사 영상 `suno.ts:62-64`와 같은 방식 재사용), 가사 없는 종류(반주 추가·연주곡) 처리
- 완료 기준: 리믹스 카드에 「플레이리스트」 버튼 → `playlist-channel-studio…?remix=<id>`로 열면 그 곡이 트랙 목록에 1개 들어감, 남의 id는 거절(시험), 시험·tsc·build 통과, 두 프로그램 버전 +0.01
- Mac 검수: 맥 크롬에서 시험 계정 리믹스 카드 → 플레이리스트 열림·곡 1개·재생 확인(생성 호출 없음)
- 예상 비용: Vercel 빌드 2회(음악·플레이리스트, 다른 수정과 묶으면 추가 0), AI·Suno 호출 0

### 후보 2. 가사 영상 L5·U3 + 문서 표시 정리 (작은 묶음)
- 근거: 위 2절. 자동 재생이 막힌 브라우저(맥 Safari 등)에서 재생 버튼이 반응 없이 끝나 회원이 고장으로 오해할 수 있음
- 선행: Master 배정. 한 파일 계열(`parts.tsx`·`SyncView.tsx` + 레이아웃 안내 1곳)
- 완료 기준: `play()` 거절 시 「브라우저가 자동 재생을 막았습니다 — 재생 버튼을 한 번 더 눌러 주세요」류 안내(`role=status`), 767px 이하에 PC 안내 상단 고정, 기존 시험 36 + 새 시험, tsc
- Mac 검수: 맥 Safari에서 가사 싱크 화면 재생 → 안내 표시 여부, 아이폰 폭(390px) 안내 고정
- 예상 비용: 작은 수정이라 단독 배포 안 함 → 다음 가사 영상 배포 때 함께(추가 빌드 0). AI 0

### 후보 3. 뮤직비디오 루프·이미지→영상 실제 호출 1회 검증
- 근거: 위 2절 — 회원이 처음 쓸 때 실패할 수 있는 미검증 경로
- 선행: 주인님 비용 승인(유료 호출), 시험 계정 본인 Gemini 키 등록 상태 확인, 영상·음악 파일 소유 분리(Master 정리 중)와 겹치지 않게 Movie 담당과 범위 조율
- 완료 기준: 시험 계정으로 루프 장면 1개·이미지→영상 1개 실제 생성 성공(또는 실패 원인 기록), 결과·비용 기록
- Mac 검수: 결과 영상을 맥 크롬에서 재생해 끝 화면 = 시작 이미지 연결 확인(생성은 윈도우 1회, 맥은 재생만)
- 예상 비용: 회원 본인 Gemini 키(Omni Flash) 영상 생성 2회 — 공식 가격표 실행 전 재확인, 빌드 0

## 4. 정리 권고 (편집하지 않음 — 담당 작업 때 반영)
- `music/docs/IMPROVEMENTS.md:104` → 「가사 영상 절반 ✅(v1.12), 플레이리스트 절반 미구현」
- `lyric-video-studio/docs/IMPROVEMENTS.md:50` 「대기: 리믹스 결과 받기」 → ✅ v1.12
