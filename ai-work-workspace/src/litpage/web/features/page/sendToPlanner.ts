// U8-B·2026-11-15: 할 일 플래너 「받은 할 일」로 보내기 — 페이지 메뉴(todos·page)와 표 행 메뉴(rows)가 함께 쓴다.
// 서버 명령 src/server/workInbox.ts workInboxSendToPlanner. 이미 플래너에 대기 중인 같은 항목은 서버가 건너뛴다.
import { api } from '../../lib/api.ts';
import { useUI } from '../../lib/store/ui.ts';

export async function sendToPlanner(arg: { pageId: string; mode: 'todos' | 'page' } | { pageIds: string[]; mode: 'rows' }) {
  try {
    const r = await api<{ count: number; skipped?: number; plannerUrl: string }>('workInboxSendToPlanner', arg);
    const skipped = r.skipped ? ` · 이미 플래너에 대기 중인 ${r.skipped}개는 건너뜀` : '';
    const text = r.count ? `할 일 ${r.count}개를 AI 할 일 플래너 「받은 할 일」로 보냈습니다.${skipped}` : `보낼 새 할 일이 없습니다${skipped}.`;
    useUI.getState().toast(text, { label: '플래너 열기', run: () => window.open(r.plannerUrl, '_blank', 'noopener') });
  } catch (e: any) {
    useUI.getState().toast(e?.message ?? '할 일 플래너로 보내지 못했습니다.');
  }
}
