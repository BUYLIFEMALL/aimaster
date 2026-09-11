// <input type="datetime-local">에 넣기 위해 ISO 문자열을 로컬 시간 기준
// "yyyy-MM-ddTHH:mm" 형식으로 변환합니다.
export function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  const local = new Date(date.getTime() - offsetMs);
  return local.toISOString().slice(0, 16);
}
