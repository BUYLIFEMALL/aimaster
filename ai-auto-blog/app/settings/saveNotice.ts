// 설정 카드의 모델 저장 안내 타이머(2026-11-19, Master msg_963f5dc087ca).
// 성공 안내는 1.5초 뒤 사라지지만, 그 사이에 새 결과(실패·부분 저장·다시 성공)가 오면
// 이전 타이머를 먼저 취소한다 — 이전 성공 타이머가 최신 실패 안내를 지우지 않게.
export type SaveNoticeValue = 'saved' | 'partial' | 'failed'

export const SAVED_NOTICE_MS = 1500

type Schedule = (fn: () => void, ms: number) => unknown
type Cancel = (handle: unknown) => void

export function createSaveNotice(
  setNotice: (value: SaveNoticeValue | null) => void,
  schedule: Schedule = (fn, ms) => setTimeout(fn, ms),
  cancel: Cancel = (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
) {
  let timer: unknown = null

  function clear() {
    if (timer !== null) {
      cancel(timer)
      timer = null
    }
  }

  return {
    report(result: SaveNoticeValue) {
      clear()
      setNotice(result)
      if (result === 'saved') {
        timer = schedule(() => {
          timer = null
          setNotice(null)
        }, SAVED_NOTICE_MS)
      }
    },
    /** 화면이 사라질 때 남은 타이머 정리 */
    dispose: clear,
  }
}
