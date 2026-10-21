# 개발 플랜 — Suno V6 3차 ⑤⑥: 보컬 추가 · 반주 추가 · 매시업 (v1.34 예정)

> 2026-10-21 Claude Code(윈도우). 제안서 [PLAN_20261021_SUNO_V6_FEATURES.md](PLAN_20261021_SUNO_V6_FEATURES.md) ⑤⑥. 주인님 승인 대기.

## 문서 확인 내용 (docs.sunoapi.org, 2026-10-21)
| 기능 | 주소 | 필수 | 하는 일 |
|---|---|---|---|
| 보컬 추가 | `POST /api/v1/generate/add-vocals` | `uploadUrl`(반주 음원), `title`, `style`, `negativeTags`, `callBackUrl` (+ `lyrics`·`vocalGender`·`audioWeight`·`model` V6 등 선택) | 반주(연주곡) 위에 AI 보컬을 입힌 노래를 만든다 |
| 반주 추가 | `POST /api/v1/generate/add-instrumental` | `uploadUrl`(보컬·멜로디 음원), `title`, `tags`, `negativeTags`, `callBackUrl` | 목소리·멜로디 녹음에 어울리는 반주를 만든다 |
| 매시업 | `POST /api/v1/generate/mashup` | `uploadUrlList`(음원 **2개**), `model`, `callBackUrl` (+ `lyrics`·`style`·`title` 80자·`duration`·페르소나 선택) | 두 곡을 섞어 새 곡을 만든다 |
- 세 기능 모두 결과 콜백이 곡 생성과 같은 형식(text → first → complete, `data[]`) → 기존 `/api/webhooks/suno`(리믹스도 작업 번호로 찾음)를 그대로 쓴다. 결과 14일 보관 → 지금처럼 우리 저장소로 복사.
- `uploadUrl`은 공개 접근 가능한 주소여야 함 → 리믹스와 같이 **24시간짜리 서명 주소**를 넘긴다(`lib/storageSign.ts` `SUNO_FETCH_TTL_SECONDS`).
- 크레딧 단가는 문서에 없음(https://sunoapi.org/billing), 실패 시 환불.

## 설계 — 기존 「음악 Remix 스튜디오」에 방식 3개를 추가
지금 리믹스는 「원곡(내 곡 또는 올린 파일) → 새 스타일로 커버(upload-cover)」 한 가지다. 같은 화면·같은 결과 목록에 **방식 선택**을 넣는다.
| 방식 | 원곡으로 쓰기 좋은 것 | 입력 |
|---|---|---|
| 🎨 스타일 커버(기존) | 아무 곡 | 원하는 느낌·가사 |
| 🎤 보컬 추가 | 연주곡(BGM) 트랙, MR 반주, 올린 반주 파일 | 가사·스타일·보컬 성별 |
| 🎹 반주 추가 | MR 보컬, 올린 목소리 녹음 | 반주 스타일 |
| 🔀 매시업 | 두 곡(원곡 2개 선택) | 스타일·가사(선택)·길이 |
- 곡 카드의 MR 결과(보컬/반주 분리) 옆에 「🎤 이 반주로 보컬 추가」·「🎹 이 보컬로 반주 추가」 바로가기 → 해당 파일을 원곡으로 등록하고 리믹스 화면으로 이동.

## 범위·구현 순서
1. **DB(승인 필요)** `music_track_remixes`에 칸 추가: `mode text not null default 'cover'`(cover·add_vocals·add_instrumental·mashup), `second_source_id uuid`(원곡 2, `on delete set null`), `second_source_audio_url text`. 원곡 표 `music_remix_sources.kind`에 `mr`(MR 결과에서 등록) 추가. 기존 행은 모두 `cover`로 그대로.
2. `lib/ai/suno.ts` `requestSunoAddVocals`·`requestSunoAddInstrumental`·`requestSunoMashup`.
3. `lib/actions/remix.ts` 방식별 요청(원곡 서명 주소 24시간), 결과는 기존 리믹스 결과 저장 그대로. 자동 연장 등 커버 전용 옵션은 커버 방식에서만.
4. 화면: 리믹스 화면 방식 선택·입력 칸, 매시업 두 번째 원곡 선택, 결과 카드에 방식 표시. 곡 카드 MR 결과 바로가기.
5. 30일 정리: 두 번째 원곡도 기존 원곡 규칙대로(직접 올린 파일만 삭제).

## 검수 방법
로컬 tsc·lint·테스트·build → 배포 → 크롬 시험 계정에서 **3회 실제 호출**(보컬 추가 1·반주 추가 1·매시업 1, 승인 필요) → 결과 저장·재생, `record-info`로 요청 값 확인.

## 비용
| 항목 | 내용 | 승인 |
|---|---|---|
| 개발·시험 | Suno 보컬 추가 1 + 반주 추가 1 + 매시업 1(시험 계정 본인 sunoapi.org 키, 단가 문서 미표기·실패 시 환불) | 필요 |
| 운영자 | Vercel 빌드 1회 | |
| 회원 부담 | 회원 본인 sunoapi.org 크레딧 | |
| DB | `music_track_remixes` 칸 3개, `music_remix_sources.kind` 값 1개 추가 | 필요 |

## 버전·배포·인수인계
v1.34(코드 + DB), 마이그레이션 `supabase/migrations/0019_remix_modes.sql`, `AGENTS.md`, 제안서 ⑤⑥, 루트 `docs/HANDOFF.md`.
