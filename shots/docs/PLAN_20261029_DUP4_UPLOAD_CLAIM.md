# 플랜 — DUP-4 유튜브·인스타 업로드 중복 방지 (2026-10-29, [역할: video] Claude Code(윈도우) `claude-win-video`)

- 근거: `docs/YOUTUBE_CONSOLIDATION_TASKS.md` YT-U7, 주인님 지시(같은 문서 16행 — 완료 기준 4가지), 분석 담당 배정표(`docs/roles/analysis-planning.md`, DUP-4 → `video`).
- 문제: `postToYoutubeAction`·`postToInstagramAction`이 상태를 확인하지 않고 `posting`으로 바꾼 뒤 올림 → 두 탭·빠른 두 번 누름이면 같은 영상이 두 번 올라감. 시간 초과로 `failed`가 되면 회원이 다시 눌러 중복 위험.
- 범위: 서버 액션 2개 + 게시 화면(`PostingSection.tsx`). DB 구조 변경 없음(상태 값은 기존 열거형 unposted/posting/posted/failed 그대로 — 새 값은 DB 제약에 걸릴 수 있어 쓰지 않음). 공용 기준 `youtube-upload-client`는 고치지 않음.

| 완료 기준 | 구현 |
|---|---|
| 첫 번째: 결과 불확실이면 자동 재발송 안 함·「확인 필요」 | 요청을 보낸 뒤 연결 오류·5xx(인스타는 응답 번호가 없어 연결 오류만)면 `failed`로 바꾸지 않고 `posting`으로 남김. 10분(`STALE_MS`, 업로드 최대 300초+여유) 지나면 배지 「확인 필요」 |
| 두 번째: 서버에서 상태 먼저 잡기 | `claimDecision`(진행 중이면 거절) + 조건부 update `.or(status is null, status ≠ posting, updated_at < 10분 전)`·`.select("id")` 0행이면 거절 — 기준 `youtube-auto-reply/lib/comments/post.ts` 46~59행 |
| 세 번째: 같은 대상 재발송은 회원 확인 창 | 이미 올림·확인 필요면 `window.confirm` 뒤 숨은 값 `confirmResend=1`. 서버도 이 값 없으면 `needsConfirm`으로 거절 |
| 네 번째: 시험은 모의 | `tests/uploadGuard.test.mjs` 5개(판단·표시·실패 분류). 실발송 시험은 하지 않음(주인님 승인 뒤 1건) |

- 파일: `src/lib/uploadGuard.ts`(새), `src/lib/actions/youtube.ts`, `src/lib/actions/instagram.ts`, `src/components/candidates/PostingSection.tsx`, `tests/uploadGuard.test.mjs`(새).
- 검수: 시험 14개(전체)·`tsc`·고친 파일 eslint·`npm run build`(로컬, 무료).
- 배포: **미배포 대기**(작은 수정 — 다음 Shots 배포 때 함께, 그때 버전 v1.45). 비용: 없음.
- 주의: 상태 판단은 `updated_at`(2026-10-21 자동 갱신 장치) 기준 — 설명·캡션 저장도 이 시각을 바꾸므로 「확인 필요」가 늦게 뜰 수는 있어도 일찍 뜨지는 않음.
