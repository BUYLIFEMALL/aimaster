// 브라우저에서 파일 저장(내려받기) — 서버를 거치지 않는다.
export function saveBlob(fileName: string, data: Blob | Uint8Array, type = "application/octet-stream") {
  const blob = data instanceof Blob ? data : new Blob([data as BlobPart], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** localStorage 읽기·쓰기(사생활 보호 창 등에서 막혀도 화면은 정상 동작) */
export function loadLocal<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}
export function saveLocal(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 저장이 막혀도 작업은 계속된다 */
  }
}
