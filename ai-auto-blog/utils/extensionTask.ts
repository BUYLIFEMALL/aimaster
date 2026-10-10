// BLOG 크롬 확장 "자동 입력" 작업의 공용 규칙(2026-10-10, v1.40).
// 웹에서 "네이버 입력기로 보내기"를 누르면 글이 자동 입력 대기가 되고, 확장 작업기(background)가 가져가 네이버 편집기에 입력한다.
// DB 칸은 그대로(extension_handoff_at + naver_input_status)이며 새 상태 값은 만들지 않는다.
//   대기   = extension_handoff_at 있음 + naver_input_status 비어 있음 + 보낸 지 AUTO_START_WINDOW_MS 안
//   입력 중 = in_progress, 입력 완료 = completed, 발행 직전 준비 완료 = publish_ready, 실패 = failed

// 오래전에 보내 둔 글이 확장을 켜는 순간 갑자기 입력되지 않도록, 자동 시작은 보낸 직후 이 시간 안에서만 한다.
// 이 시간이 지난 글은 목록에 남고, 회원이 확장 사이드패널에서 직접 시작할 수 있다.
export const AUTO_START_WINDOW_MS = 30 * 60 * 1000
// 입력 중이라고 표시된 글을 다시 보내려면 이 시간이 지나야 한다(진행 중인 입력을 덮어쓰지 않기 위함).
export const RUNNING_GUARD_MS = 90 * 60 * 1000

export const INPUT_STATUSES = ['in_progress', 'completed', 'publish_ready', 'failed'] as const
export type InputStatus = (typeof INPUT_STATUSES)[number]

// 결과 보고가 받아들여지는 "이전 상태". 늦게 도착한 옛 보고가 새로 보낸 글의 상태를 덮어쓰지 못하게 한다.
export const ALLOWED_PREVIOUS: Record<InputStatus, ReadonlyArray<InputStatus | null>> = {
  in_progress: [null, 'failed', 'completed', 'publish_ready', 'in_progress'],
  completed: ['in_progress', 'completed'],
  publish_ready: ['in_progress', 'completed', 'publish_ready'],
  failed: ['in_progress', 'completed', 'failed'],
}

export function isInputStatus(value: string): value is InputStatus {
  return (INPUT_STATUSES as readonly string[]).includes(value)
}

export function autoStartCutoff(now = Date.now()) {
  return new Date(now - AUTO_START_WINDOW_MS).toISOString()
}
