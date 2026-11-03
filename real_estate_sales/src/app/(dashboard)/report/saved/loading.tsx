// 저장한 리포트는 저장된 숫자만 읽으므로 공공 자료 대기 안내(/report/loading.tsx) 대신 짧은 안내
export default function Loading() {
  return <p className="mx-auto max-w-4xl text-sm text-mx-muted">💾 저장한 리포트를 여는 중이에요…</p>;
}
