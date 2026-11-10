// Realtime: websocket for pushed record changes + page presence; reconnects with backoff and
// re-syncs the records currently in view after reconnecting.
import { clientId, api } from '../api.ts';
import { records } from './records.ts';
import { useUI } from './ui.ts';

let ws: WebSocket | null = null;
let spaceIds: string[] = [];
let currentPage: string | null = null;
let currentPresenceData: Record<string, unknown> | null = null;
let retry = 0;
let resyncHandler: (() => void) | null = null;
let closedByUs = false;

export function onResync(fn: () => void) {
  resyncHandler = fn;
}

function send(msg: unknown) {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

// 이식판(U3 중 발견): 이식판 서버(Vercel)에는 원본 웹소켓(/ws)이 없어 연결이 늘 실패 → 화면이 항상 「오프라인」이 되고
// AI 입력 칸이 잠기며 재연결을 계속 시도했다. 실시간 동기화는 협업 단계(U13, Supabase Realtime)에서 다시 연다.
// 그 전까지는 웹소켓을 열지 않고 브라우저의 실제 인터넷 연결 상태(navigator.onLine)로 판단한다.
const REALTIME_SOCKET = false;
let onlineWatch = false;
function watchBrowserOnline() {
  if (onlineWatch || typeof window === 'undefined') return;
  onlineWatch = true;
  const apply = () => useUI.getState().setConnection(navigator.onLine === false ? 'offline' : 'online');
  window.addEventListener('online', apply);
  window.addEventListener('offline', apply);
  apply();
}

export function connectRealtime(spaces: string[]) {
  spaceIds = spaces;
  if (!REALTIME_SOCKET) return watchBrowserOnline();
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    send({ type: 'subscribe', spaceIds });
    return;
  }
  closedByUs = false;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const sock = new WebSocket(`${proto}://${location.host}/ws?clientId=${clientId}`);
  ws = sock;
  sock.onopen = () => {
    const wasReconnect = retry > 0;
    retry = 0;
    send({ type: 'subscribe', spaceIds });
    if (currentPage) send({ type: 'presence', pageId: currentPage, data: currentPresenceData });
    useUI.getState().setConnection('online');
    if (wasReconnect) resyncHandler?.();
  };
  sock.onmessage = (ev) => {
    let msg: any;
    try {
      msg = JSON.parse(ev.data);
    } catch {
      return;
    }
    if (msg.type === 'records') {
      if (msg.origin && msg.origin === clientId) return; // our own echo is handled by the HTTP response
      records.batch(() => {
        for (const r of msg.records) records.mergeServer(r.table, r.id, r.value, r.role);
      });
    } else if (msg.type === 'presence') {
      useUI.getState().setPresence(msg.pageId, msg.viewers);
    } else if (msg.type === 'session_ended') {
      // the account is gone (a deleted demo sandbox): start over from the root (login page, or the browser's new sandbox)
      disconnectRealtime();
      location.assign('/');
    }
  };
  sock.onclose = () => {
    ws = null;
    if (closedByUs) return;
    useUI.getState().setConnection('offline');
    retry = Math.min(retry + 1, 6);
    setTimeout(() => connectRealtime(spaceIds), 500 * 2 ** retry);
  };
}

export function disconnectRealtime() {
  closedByUs = true;
  ws?.close();
  ws = null;
}

export function setPresencePage(pageId: string | null) {
  if (pageId !== currentPage) currentPresenceData = null;
  currentPage = pageId;
  send({ type: 'presence', pageId, data: currentPresenceData });
  if (!REALTIME_SOCKET && pageId && pageId !== pollPage) schedulePoll(300);
}

// 이식판 U13(2026-11-11, 주인님 결정 「5초마다 확인」): 웹소켓 대신 열린 페이지를 서버(collabPoll)에 물어
// 다른 사람이 바꾼 레코드·함께 보는 사람을 받는다. 다른 사람과 공유된 페이지는 5초, 혼자 쓰는 페이지는 60초, 화면이 숨겨지면 쉼.
let pollTimer: ReturnType<typeof setTimeout> | null = null;
let pollPage: string | null = null;
let pollLsn = 0;
let pollShared = false;
function schedulePoll(ms: number) {
  if (pollTimer) clearTimeout(pollTimer);
  pollTimer = setTimeout(() => void pollOnce(), ms);
}
async function pollOnce() {
  pollTimer = null;
  const page = currentPage;
  if (!page) return;
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return schedulePoll(5000);
  if (page !== pollPage) {
    pollPage = page;
    pollLsn = 0;
  }
  try {
    const res: any = await api('collabPoll', { pageId: page, lsn: pollLsn, data: currentPresenceData });
    if (page === currentPage) {
      pollLsn = Number(res?.lsn) || pollLsn;
      pollShared = !!res?.shared;
      if (res?.recordMap) records.mergeRecordMap(res.recordMap);
      useUI.getState().setPresence(page, Array.isArray(res?.viewers) ? res.viewers : []);
    }
  } catch {
    /* 다음 차례에 다시 */
  }
  schedulePoll(page !== currentPage ? 0 : pollShared ? 5_000 : 60_000);
}

/** Presence payload for the current page (focused block + text selection), relayed to other viewers. */
export function setPresenceData(data: Record<string, unknown> | null) {
  currentPresenceData = data;
  if (currentPage) send({ type: 'presence', pageId: currentPage, data });
}

export function presencePageId(): string | null {
  return currentPage;
}

export async function syncRecords(pointers: { table: string; id: string }[]) {
  if (!pointers.length) return;
  const res = await api('fetchRecords', { requests: pointers.map((p) => ({ pointer: p, version: -1 })) });
  records.mergeRecordMap(res.recordMap);
}
