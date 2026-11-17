# WS-20261117-18 키 화면 캘린더 연결 상태 — CC-WORKSPACE-01 (ready_review)

- 주인님 직접 지시(2026-11-17): 「둘째, /settings/keys의 캘린더 칸에 연결 상태와 「캘린더 연동 화면 열기」 버튼을 붙입니다. 이걸로 수정해」. 첫째 안(「예정된 일정 › 캘린더 연결」 숨김)은 선택되지 않아 수정 0. Master msg_cf30224c79cf 배정.
- 커밋 `5d0aa1def`(2파일). 허용 경로: `src/app/settings/keys/KeysForm.tsx` + 시험 1파일. 미배포 묶음, 실화면 미확인.
- 구현: `KeysForm.tsx` 끝에 `CalendarConnStatus`(「📅 구글 캘린더 연결」 그룹에서만 표시). 상태는 기존 읽기 요청 `calState`(`src/server/calendarSync.ts` 62행 `calState`, 응답 `google.hasApp/connected/needsReconnect/email`, `feed`) — `src/lib/standaloneRpc.ts`의 같은 출처 `/api/rpc/calState`, 기존 회원 인가 그대로. 표시: 확인 중 / 구글 앱 키 먼저 / 아직 연결 안 됨 / ✅ 연결됨·계정 / ⚠️ 다시 연결 필요 / 간편 구독 켜짐(표 수). 읽기 실패는 「확인하지 못했습니다(끊겼다는 뜻 아님)」+「🔄 다시 확인」(미연결로 단정 0). 「📅 캘린더 연동 화면 열기」 = `/calendar-sync` 링크. 키 저장·삭제 때(reloadTag) 다시 읽고 마지막 요청만 반영, 화면 해제 뒤 응답 무시.
- 서버·API·DB·캘린더 권한 범위·OAuth·연결 동작 변경 0, 다른 화면 변경 0.
- 시험 `calendarConnStatusDom` 8(실제 React·rpc 모의): 호출은 calState만·링크 경로, 상태 4종, 간편 구독, 읽기 실패→다시 확인→정상, 늦은 이전 응답 무시, 해제 뒤 응답 무시 → 8/8. 수정 전에는 모듈 없음 실패(행동 실패 아님).
- 한계: 단독 /settings/keys는 계정 기대 검사가 없어(영수증과 달리) 다른 탭에서 계정을 바꾸면 다음 읽기 때 새 계정 상태가 보임 — 표시만 하는 읽기라 쓰기 섞임 없음. tsc 전체·빌드·전체 시험·3457 0.
