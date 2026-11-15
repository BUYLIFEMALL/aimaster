
// Inbox items also appear as browser notifications — when the user allowed them ("Enable desktop notifications" in
// Inbox › More actions) and Settings › Notifications keeps desktop notifications on (space_view.notify_desktop).
import type { BlockRecord, NotificationRecord, UserRecord } from '#shared/records.ts';
import { records } from '../../../lib/store/records.ts';
import { currentSpaceView, useSession } from '../../../lib/store/session.ts';
import { openPage } from '../../../lib/router.ts';
import { pageTitle } from '../../page/pageActions.ts';

const seen = new Set<string>();
let installed = false;

export function desktopPushSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function desktopPushState(): 'granted' | 'denied' | 'default' | 'unsupported' {
  return desktopPushSupported() ? Notification.permission : 'unsupported';
}

export async function enableDesktopPush(): Promise<boolean> {
  if (!desktopPushSupported()) return false;
  const r = await Notification.requestPermission();
  return r === 'granted';
}

function text(n: NotificationRecord): { title: string; body: string } {
  const actor = records.get<UserRecord>('lit_user', n.actor_id);
  const who = actor?.name || actor?.email || '누군가';
  const a = (n.activity ?? {}) as Record<string, any>;
  const page = records.get<BlockRecord>('block', (a.page_id as string) ?? n.navigable_block_id);
  const title = pageTitle(page) || '페이지';
  // 2026-11-15 한국어 어순으로(알림 줄 영어 조각 정리) — 화면 알림 줄은 i18n.ko-KR.json, 데스크톱 알림은 여기
  switch (n.type) {
    case 'mention':
    case 'property_mention':
      return { title: `${who}님이 「${title}」에서 나를 언급했습니다`, body: a.text ?? '' };
    case 'comment':
      return { title: a.kind === 'reaction' ? `${who}님이 「${title}」에 반응을 남겼습니다` : `${who}님이 「${title}」에 댓글을 남겼습니다`, body: a.text ?? '' };
    case 'invite':
      return { title: `${who}님이 「${title}」에 초대했습니다`, body: '' };
    case 'reminder':
      return { title: `「${title}」 리마인더`, body: a.text ?? a.date_text ?? '' };
    case 'access_requested':
      return { title: `${who}님이 「${title}」 접근 권한을 요청했습니다`, body: a.message ?? '' };
    default:
      return { title: `${who}님이 「${title}」을(를) 수정했습니다`, body: '' };
  }
}

export function installDesktopPush() {
  if (installed || !desktopPushSupported()) return;
  installed = true;
  for (const n of records.all<NotificationRecord>('notification')) seen.add(n.id);
  records.subscribeAll((keys) => {
    for (const k of keys) {
      if (!k.startsWith('notification:')) continue;
      const id = k.slice('notification:'.length);
      if (seen.has(id)) continue;
      seen.add(id);
      const n = records.get<NotificationRecord>('notification', id);
      const me = useSession.getState().userId;
      if (!n || n.user_id !== me || n.read || n.archived || Date.now() - n.created_time > 60_000) continue;
      if (Notification.permission !== 'granted' || currentSpaceView()?.notify_desktop === false) continue;
      if (!document.hidden && document.hasFocus()) continue;
      const { title, body } = text(n);
      try {
        const note = new Notification(title, { body: body.slice(0, 200), tag: n.id });
        note.onclick = () => {
          window.focus();
          const pid = ((n.activity as { page_id?: string } | undefined)?.page_id) ?? n.navigable_block_id;
          if (pid) openPage(pid);
          note.close();
        };
      } catch {
        /* notifications blocked by the browser */
      }
    }
  });
}
