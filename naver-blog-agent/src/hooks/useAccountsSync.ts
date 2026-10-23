"use client";

import { useEffect, useRef } from "react";
import { SAMPLE_BLOG_ID, SYNC_DONE_PREFIX, mergeAccounts, pullAccounts, pushAccounts, type SyncAccount } from "@/lib/serverSync";

const ACCOUNTS_KEY = "nba_accounts_local";
const DONE_KEY = SYNC_DONE_PREFIX + "accounts";

const syncShape = (list: SyncAccount[]) =>
  JSON.stringify(list.filter((a) => a.blog_id !== SAMPLE_BLOG_ID).map((a) => ({ blog_id: a.blog_id, label: a.label })));

/**
 * 계정 목록을 회원별 DB와 맞춘다. 서버가 기준이고 브라우저 저장소(nba_accounts_local)는 캐시다.
 * - 이 브라우저에서 처음 연결할 때: 서버 목록 + 서버에 없는 로컬 계정을 합쳐 올린다(데이터 유실 방지).
 * - 이후: 서버 목록을 따르고, 화면에서 바뀐 목록은 서버에 저장한다.
 * - 서버를 읽지 못하면 아무것도 바꾸지 않고 기존 로컬 값으로 계속 동작한다.
 */
export function useAccountsSync<T extends SyncAccount>(accounts: T[], setAccounts: (next: T[]) => void) {
  const ready = useRef(false);
  const lastPushed = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const server = await pullAccounts();
      if (server === null || cancelled) return;

      let local: T[] = [];
      let done = false;
      try {
        const parsed = JSON.parse(window.localStorage.getItem(ACCOUNTS_KEY) || "[]");
        if (Array.isArray(parsed)) local = parsed;
        done = window.localStorage.getItem(DONE_KEY) === "1";
      } catch {}

      const { merged, localOnly } = mergeAccounts(server, local, !done);
      if (!done && localOnly.length > 0) {
        if (!(await pushAccounts(merged))) return; // 올리지 못하면 표시를 남기지 않고 다음 접속에 다시 시도
      }
      // 서버도 비어 있고 로컬에 견본 계정뿐이면 화면을 그대로 둔다. 실제 계정이 있었다가 비워진 경우에는 비운 상태를 따른다.
      const apply = merged.length > 0 || local.some((a) => a.blog_id !== SAMPLE_BLOG_ID);
      try {
        window.localStorage.setItem(DONE_KEY, "1");
        if (apply) window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(merged));
      } catch {}
      if (cancelled) return;
      if (apply) {
        lastPushed.current = syncShape(merged);
        setAccounts(merged);
      } else {
        lastPushed.current = syncShape([]);
      }
      ready.current = true;
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready.current) return;
    const shape = syncShape(accounts);
    if (shape === lastPushed.current) return;
    lastPushed.current = shape;
    void pushAccounts(accounts);
  }, [accounts]);
}
