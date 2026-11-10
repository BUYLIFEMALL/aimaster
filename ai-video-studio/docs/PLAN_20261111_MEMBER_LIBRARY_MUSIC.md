# 영상 합치기 배경음악을 「내 자료함」으로 — 개발 플랜 (2026-11-11)

- 담당: [역할: video] Claude Code(윈도우) `claude-win-video`
- 지시: 공용 `member-assets-client` 안내(2026-11-11) → 주인님 「진행해」
- 상태: **v1.35 배포 완료(2026-11-11).** 결정: 1 AI 영상 스튜디오만 먼저 · 2 구현 뒤 바로 배포. 구현 중 바뀐 점: `timeline.ts`는 공용 기준이라 모양 검사 `isLibraryRef`를 그 안에 두고 `librarySongs.ts`가 가져다 씀(사본이 새 파일을 몰라도 되게).

## 1. 지금 상태
- `ai-video-studio` 「영상 합치기」 배경음악은 `lib/edit/amsSongs.ts`가 **AI 음악 스튜디오(`ams_generations`) 곡만** 최근 40개 읽음. Suno(음악 자동화)·무료음악 곡은 고를 수 없음.
- 고른 곡은 편집 프로젝트에 `{ kind: "ams", ref: "생성번호:순번" }`로 저장되고, 다시 열 때 `lib/edit/edits.ts`가 `ams_generations`를 직접 읽어 서명 주소를 만듦.
- 공용 기준 코드 `member-assets-client`(메인 사이트 `lib/library/memberAssets.ts`)는 회원 본인 자료 색인 `member_assets`에서 음악 3종을 한 번에 돌려주고(`listMemberAssets`), 저장한 `sourceRef`로 다시 연다(`signMemberAssetByRef`).

## 2. 바꿀 것
| 파일 | 내용 |
|---|---|
| `lib/memberAssets.ts`(사본) | 기준 복사, `scripts/check-shared-modules.mjs`·`docs/SHARED_MODULES.md`에 사본 경로 등록 |
| `app/api/edit/songs/route.ts` | `listMemberAssets(admin, user.id, { kind: "audio", limit: 60 })` → 곡 목록(만든 프로그램 이름·길이·재생 주소). `localOnly`(무료음악 — 음원이 회원 PC)는 「무료음악 프로그램에서 보내 주세요」로 비활성, `external`(Suno 임시 주소)은 「약 14일 뒤 재생이 안 될 수 있음」 표시 |
| `components/edit/EditStudio.tsx` | 배경음악 목록 제목 「내 자료함 음악」, 곡마다 출처(AI 음악 스튜디오·Suno 음악 자동화·무료음악) 표시, 고르면 `{ kind: "library", ref: sourceRef }` 저장 |
| `lib/edit/timeline.ts`·`edits.ts` | 새 `library` 출처 추가(다시 열 때 `signMemberAssetByRef`, `null`이면 「원본이 지워졌습니다(보관 기간 만료)」). **예전 `ams` 기록은 그대로 읽음**(이미 저장된 편집이 깨지지 않게) |
| `lib/edit/amsSongs.ts` | 목록 함수는 더 쓰지 않아 정리(앱 주소 상수만 남김) |
| 시험 | 출처 판정(`ams`/`library`/옛 값), 목록 변환(localOnly·external·주소 없음) |

- 잃는 것: 지금 목록의 「30MB 넘는 곡 막기」는 자료함에 파일 크기가 없어 화면에서 미리 막지 못함 → 받을 때 크기를 확인해 넘으면 안내(브라우저에서 받기 전 `Content-Length` 확인).
- 바뀌지 않는 것: 렌더는 회원 브라우저, 파일 복사 없음, 외부 AI 호출 없음, 회원 본인 자료만(서버에서 로그인 회원 id로 거름).

## 3. 다른 영상 프로그램(이번에는 하지 않음)
- `shorts-onestop-studio`(AI 음악 가져오기·무료음악 배경음악), `music-video-studio`(가사 시간 `amsLyrics`·`fmsLyrics`가 필요) — 곡의 가사·시간 같은 원본 고유 정보를 쓰므로 목록만 합칠 수 있는지 따로 검토. 이번 결과를 보고 다음 차례로.

## 4. 검수
- 로컬: 시험·tsc·build(무료). 운영: 시험 계정으로 영상 합치기 화면에서 곡 목록에 AI 음악 스튜디오·Suno 곡이 함께 보이는지, 한 곡 골라 미리 듣기·저장 후 다시 열기(비용 없음).

## 5. 비용·배포
- AI 호출 없음. 배포: `ai-video-studio` v1.35 빌드 1회(함께 나가는 대기: 서버 지역 서울 `icn1`). DB 변경 없음.

## 6. 주인님 결정 항목
| 번호 | 결정할 것 | 추천 |
|---|---|---|
| 1 | 이번 범위 | AI 영상 스튜디오(영상 합치기)만 먼저 — 나머지 둘은 결과 보고 다음 |
| 2 | 배포 | 구현·검사 뒤 v1.35 빌드 1회로 바로(서울 지역 설정도 함께 반영) |
