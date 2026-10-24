# Lyricbi 1.9.0 남은 기능 묶음 L-1~L-5 — 개발 플랜 초안 (2026-10-24)

- 작성: Claude Code(윈도우) `claude-win-dotori`(새 프로그램 분석·플랜 담당) → **구현: 음악 담당 세션**
- 상태: **플랜 초안 — 범위·순서·비용 주인님 승인 전**
- 근거: [재확인 기록](../../docs/analysis-lyricbi-20261021/RECHECK_20261024.md)(2026-10-24, 현재 코드와 대조), [원 분석](../../docs/analysis-lyricbi-20261021/REPORT.md)(2026-10-21)
- 권리: Lyricbi는 비공개 상용(`UNLICENSED`) — **기능만 참고**, 코드·수식·문구·프리셋 값 사용 금지.
- 대상: AIMaster 운영, DB ref `esgxyikcnnvmlhygjkth`. 현재 v1.10. DB 구조 변경 없음 예상(디자인 설정은 기존 보관함 저장 형식 안).

## 현재 코드 위치

| 역할 | 파일 |
|---|---|
| 디자인 목록·형식 | `src/lib/design.ts` (`Highlight` 7 · `SpectrumKind` 3+없음 · `FontId` 6 · `PRESETS` 10 · `Design` · `normalizeDesign`) |
| 그리기(미리보기·MP4 공용) | `src/lib/render/draw.ts` (`background`·`drawCover`·`drawTitle`·`drawSpectrum`·`drawProgress`·`drawLyrics`·`drawFrame`) · `spectrum.ts` |
| 출력 | `src/lib/render/export.ts`·`mp4Encoder.ts`(공용 `browser-mp4-encoder` 계열) |
| 가사 | `src/lib/lyrics.ts` |

## 단계

| 단계 | 기능 | 구현 방향 | 비용 |
|---|---|---|---|
| L-1 | **노래방 로마자 발음 표기** (IMPROVEMENTS L4) | 새 `src/lib/romanize.ts`(순수 함수): 한글 음절을 초성·중성·종성으로 나눠 **국립국어원 로마자 표기법** 규칙으로 변환(연음 등 기본 규칙만, AI 없음) — 우리가 새로 작성. 디자인에 「로마자 표기: 끔/위/아래」, `drawLyrics`가 현재 줄 위·아래에 작게 그림. 시험: 대표 단어·받침·연음 표 | 없음 |
| L-2 | **LP판 회전 연출** | `drawCover` 옆에 `drawVinyl`: 커버 뒤에서 도는 원판(홈·라벨에 커버 그림), 회전 속도는 재생 시간 기준(프레임마다 같은 값 — 미리보기와 MP4 일치). 레이아웃 「패널」에서 켜고 끄기 | 없음 |
| L-3 | **무료 사진 배경** | 공용 기준 코드 `free-photo-search` 사본(기준 `insta_auto_poster/src/lib/cardnews/photoSearch.ts`, 회원 본인 Pixabay·Pexels 키 — 공용 연동 항목, 없으면 「○○에서 한 번 연결해 주세요」). 한국어 제목·가사 첫 줄 → 영어 검색어는 **회원이 고치는 칸**으로(사전 없이 시작, 필요하면 우리 단어표). 고른 사진을 배경으로, 작가·출처 표시 | 회원 무료 키 |
| L-4 | 화면 꾸밈 확장(조금씩) | 강조 +2~3(점·괄호·세로 바), 스펙트럼 +2~3, 한글 글꼴 +3~4, 프리셋 +4~6(세로 포함) — 우리 디자인 값 | 없음 |
| L-5 | 렌더 진단 기록 | 렌더 실패·인코더 대체·메모리 경고를 화면 안 기록으로 모아 「진단 복사」 | 없음 |

함께 내보낼 대기 항목: `docs/IMPROVEMENTS.md` 「`?remix=` 음악(SUNO) 리믹스 결과 받기 — 따로 배포하지 않고 다음 빌드 때 함께」(2026-10-22 주인님 지시).

순서 추천: L-1 → L-2 → (대기 `?remix=` 포함) 배포 1 → L-3 → L-4 → L-5 → 배포 2. 배포할 때만 버전 +0.01(코드·DB).

## 하지 않는 것
- 플레이리스트 모드(여러 곡·앨범 카드·챕터) — `playlist-channel-studio`가 이미 함(가사 층 v1.17). 중복 개발하지 않음.
- 로고·채널 프레임 — 낮은 우선, 필요하면 다음 묶음.
- 월간 인증 코드 등 Lyricbi 판매 방식.

## 검수
- 무료: `tsc`·빌드·기존 시험 14개 + 새 시험(로마자 표).
- 크롬 실제 화면(시험 계정): 짧은 곡 1개로 가로·세로 MP4 각 1편 — 로마자 위/아래, LP판 회전, 사진 배경 확인. 미리보기와 MP4 결과가 같은지.

## 비용
| 항목 | 횟수 | 계정·키 | 대략 |
|---|---|---|---|
| AI 호출 | 0 | — | 없음 |
| 무료 사진 검색 시험 | 1~2회 | 시험 계정 본인 Pixabay/Pexels 키(무료) | 없음 |
| Vercel 빌드 | 2회 | 팀 `buylife` | 배포 2회분 |
| 회원 부담 | 없음(무료 사진 키는 회원 본인 무료 키) | — | 없음 |
