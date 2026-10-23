# 개발 플랜 — Suno V6 2차 ④: 구간 다시 만들기 (v1.29 예정)

> 2026-10-21 Claude Code(윈도우). 제안서 [PLAN_20261021_SUNO_V6_FEATURES.md](PLAN_20261021_SUNO_V6_FEATURES.md) ④. 주인님 승인 대기.

## 문제·목적
완성곡이 대부분 마음에 드는데 한 구간(예: 1:10~1:30 가사 발음·멜로디)만 아쉬울 때, 지금은 곡 전체를 다시 만들어야 한다. sunoapi.org `POST /api/v1/generate/replace-section`(V6)으로 **그 구간만 새로 만들고 나머지는 원곡 그대로** 둔다.

## 문서 확인 내용 (docs.sunoapi.org, 2026-10-21)
- 기존 곡 모드: `taskId`·`audioId` 필수(이때 `model`·`uploadUrl` 넣지 않음).
- 필수: `prompt`(바꿀 구간 가사), `tags`(스타일), `title`, `infillStartS`·`infillEndS`(소수 2자리), `fullLyrics`(바뀐 구간을 포함한 곡 전체 가사).
- 구간 길이 **10초 이상, 원곡 길이의 50% 이하**.
- 선택: `lyrics`(prompt보다 우선), `negativeTags`, `vocalGender`, `variety`, `personaId`·`personaModel`(v1.27 페르소나 재사용 가능), `callBackUrl`.
- 콜백 형식이 곡 생성과 같다(`callbackType: complete`, `data[]`에 audio_url·image_url·duration) → **기존 `/api/webhooks/suno`를 그대로 사용**.

## 범위·구현 순서
1. **DB(승인 필요)** `music_tracks`에 칸 3개 추가: `replaced_from_variant_id uuid`(원곡 변주, `on delete set null`), `replace_start_s numeric`, `replace_end_s numeric`. 결과는 연장처럼 **새 트랙 행**으로 쌓아 원곡을 보존한다(이력·비교 가능, 30일 정리 규칙 그대로 적용).
2. `lib/ai/suno.ts` `requestSunoReplaceSection()` — 구간 검사(10초 이상·50% 이하), 글자 수 한도, 응답 코드 한국어 안내.
3. `lib/actions/replaceSection.ts` — 본인 변주·원곡 task_id 확인 → 본인 Suno 키 → 새 트랙(`generating`) 저장 → 요청 → task_id 기록. 실패 시 트랙을 실패로 표시.
4. 곡 카드 「✂️ 구간 다시 만들기」: 시작·끝 초 입력(오디오 현재 위치 「여기부터/여기까지」 버튼), 그 구간에 쓸 새 가사 입력(빈칸이면 원래 가사 그대로 다시 부르기), 곡 전체 가사는 기획 가사에서 자동 구성(보이는 칸에서 고칠 수 있음). 결과 트랙 제목에 「✂️ 구간 수정본 · 1:10~1:30」 표시.
5. 웹훅 쪽은 task_id로 트랙을 찾으므로 변경 없음(완료 확인만).

## 검수 방법
- 로컬: tsc·lint·테스트 53 + 구간 검사 단위 시험 추가·build.
- 운영: 배포 후 크롬(일반 회원 `buylifemall@naver.com`) 시험 곡 「빗속의 다짐」에서 **실제 호출 1회**(승인 필요) → 웹훅 저장·잠금 해제·재생·구간 표시 확인, sunoapi.org `record-info`로 요청 값 확인.

## 비용
| 항목 | 내용 | 비고 |
|---|---|---|
| 개발·시험 | Suno 구간 다시 만들기 **1회**(시험 계정 본인 sunoapi.org 키, 곡 생성 1회와 비슷한 크레딧 — 문서에 단가 표기 없음, 실패 시 환불) | 사전 승인 필요 |
| 개발·시험 | 커버 이미지는 웹훅이 Suno 커버를 그대로 쓰는지 기존 경로 확인(새 이미지 생성 없으면 0) | |
| 운영자 | Vercel 빌드 **1회** | |
| 회원 부담 | 회원 본인 sunoapi.org 크레딧(곡 생성과 비슷) | |
| DB | 칸 3개 추가(용량 영향 없음) | 사전 승인 필요 |

## 버전·배포·인수인계
v1.29(코드 `lib/version.ts` + DB `programs.version`), 마이그레이션 `supabase/migrations/0017_track_replace_section.sql`, `AGENTS.md` v1.29, 제안서 ④ 상태, 루트 `docs/HANDOFF.md`.

## 곡 연장(V6) 실패 — 별도 작업으로 분리
④ 완료 뒤 따로 진행: `continueAt`을 곡 끝 30초 전으로 앞당겨 실제 연장 1회 시험(실패 시 크레딧 환불) → 그래도 실패하면 sunoapi.org 문의 문구 정리.
