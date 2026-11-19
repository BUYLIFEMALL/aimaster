// 이름마다 한 번에 하나만 실행하는 잠금. 여러 탭이 같은 접수·같은 그림을 동시에 다루지 않게 한다.

export type Lock = <T>(name: string, fn: () => Promise<T>) => Promise<T>;

// 같은 화면(같은 스크립트) 안에서만 줄을 세우는 잠금.
const chains = new Map<string, Promise<unknown>>();
export const localLock: Lock = (name, fn) => {
  const run = (chains.get(name) ?? Promise.resolve()).then(fn, fn);
  const tail = run.then(
    () => undefined,
    () => undefined,
  );
  chains.set(name, tail);
  void tail.then(() => {
    if (chains.get(name) === tail) chains.delete(name);
  });
  return run;
};

type WebLocks = { request<T>(name: string, fn: () => Promise<T>): Promise<T> };
const webLocks = (): WebLocks | undefined => (globalThis as { navigator?: { locks?: WebLocks } }).navigator?.locks;

/** 이 브라우저에 탭 사이 잠금(Web Locks)이 있는가 */
export const hasCrossTabLock = (): boolean => !!webLocks();

/**
 * 탭 사이에서도 듣는 잠금. 없으면 null.
 * - Web Locks가 있으면 그것을 쓴다.
 * - 브라우저 탭이 아닌 환경(문서가 없는 실행 환경 — 시험 등)은 다른 탭이 있을 수 없으므로 같은 스크립트 안의 잠금으로 충분하다.
 * - 브라우저인데 Web Locks가 없으면 null — 다른 탭과 겹치지 않는다고 보장할 수단이 없다.
 */
export function crossTabLock(): Lock | null {
  const locks = webLocks();
  if (locks) return (name, fn) => locks.request(name, fn);
  return typeof (globalThis as { document?: unknown }).document === "undefined" ? localLock : null;
}

/** 탭 사이 잠금이 있으면 그것을, 없으면 같은 화면 안의 잠금을 쓴다(없는 브라우저에서는 탭 사이 중복을 막지 못한다) */
export const defaultLock: Lock = (name, fn) => (crossTabLock() ?? localLock)(name, fn);

/** 회원별 「접수」 잠금 이름 — 접수 기록을 읽고 접수 번호를 적고 보내기까지를 한 번에 하나씩만 한다 */
export const submitLockName = (memberId: string) => `fis.submit:${memberId}`;
