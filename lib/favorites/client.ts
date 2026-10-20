// 「내 작업대」 즐겨찾기 공용 부품(2026-10-20) — 카드 별 버튼·퀵 프리뷰 팝업·내 작업대가 모두 이것만 쓴다.
// 로그인한 회원: DB `program_favorites`(본인 행만, RLS)에 저장해 어느 기기·브라우저에서나 같은 목록.
// 비로그인: 예전처럼 브라우저 저장소만. 로그인 후 첫 동기화 때 브라우저에 있던 즐겨찾기를 DB로 합친다.
// seen_version: 마지막으로 열었을(또는 고정했을) 때의 programs.version — 내 작업대의 「새 버전」 점 판단용.
import { createClient } from "@/lib/supabase/client";

const LOCAL_KEY = "aimaster_favorites";
const SEEN_KEY = "aimaster_favorites_seen";
export const FAVORITES_EVENT = "aimaster-favorites-changed";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장소를 못 쓰는 환경 — 화면 상태만 바뀐다
  }
}

export const readFavorites = (): string[] => read<string[]>(LOCAL_KEY, []);
export const readSeenVersions = (): Record<string, string> => read<Record<string, string>>(SEEN_KEY, {});
const notify = () => window.dispatchEvent(new CustomEvent(FAVORITES_EVENT));

let userIdPromise: Promise<string | null> | null = null;
let syncPromise: Promise<void> | null = null;

function currentUserId(): Promise<string | null> {
  if (!userIdPromise) {
    userIdPromise = createClient()
      .auth.getUser()
      .then(({ data }) => data.user?.id ?? null)
      .catch(() => null);
  }
  return userIdPromise;
}

/** 페이지당 한 번: DB 목록을 브라우저에 반영하고, 브라우저에만 있던 것은 DB로 올린다. */
export function syncFavorites(): Promise<void> {
  if (!syncPromise) {
    syncPromise = (async () => {
      const userId = await currentUserId();
      if (!userId) return;
      const supabase = createClient();
      const { data, error } = await supabase
        .from("program_favorites")
        .select("program_id, seen_version, created_at")
        .order("created_at", { ascending: false });
      if (error || !data) return;
      const serverIds = data.map((r) => r.program_id as string);
      const localOnly = readFavorites().filter((id) => !serverIds.includes(id));
      if (localOnly.length) {
        await supabase
          .from("program_favorites")
          .upsert(localOnly.map((program_id) => ({ user_id: userId, program_id })), { onConflict: "user_id,program_id", ignoreDuplicates: true });
      }
      const seen = readSeenVersions();
      for (const r of data) if (r.seen_version) seen[r.program_id as string] = r.seen_version as string;
      write(LOCAL_KEY, [...localOnly, ...serverIds]);
      write(SEEN_KEY, seen);
      notify();
    })().catch(() => undefined);
  }
  return syncPromise;
}

/** 고정/해제를 뒤집고 새 상태를 돌려준다. 고정할 때 지금 버전을 「봤음」으로 기록한다. */
export async function toggleFavorite(programId: string, version: string | null | undefined): Promise<boolean> {
  const list = readFavorites();
  const on = !list.includes(programId);
  write(LOCAL_KEY, on ? [programId, ...list] : list.filter((id) => id !== programId));
  if (on && version) write(SEEN_KEY, { ...readSeenVersions(), [programId]: version });
  notify();
  await syncFavorites();
  const userId = await currentUserId();
  if (userId) {
    const supabase = createClient();
    if (on) await supabase.from("program_favorites").upsert({ user_id: userId, program_id: programId, seen_version: version ?? null }, { onConflict: "user_id,program_id" });
    else await supabase.from("program_favorites").delete().eq("user_id", userId).eq("program_id", programId);
  }
  return on;
}

/** 내 작업대에서 프로그램을 열었을 때: 지금 버전을 「봤음」으로 — 새 버전 점이 사라진다. */
export async function markFavoriteSeen(programId: string, version: string | null | undefined) {
  if (!version || !readFavorites().includes(programId)) return;
  write(SEEN_KEY, { ...readSeenVersions(), [programId]: version });
  notify();
  const userId = await currentUserId();
  if (userId) await createClient().from("program_favorites").update({ seen_version: version }).eq("user_id", userId).eq("program_id", programId);
}
