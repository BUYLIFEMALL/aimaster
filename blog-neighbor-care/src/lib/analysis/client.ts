// Browser contracts only. This module never imports node:crypto, credentials, or service-role clients.
export type Preferences = { requiredTopics: string[]; excludedTopics: string[]; region: string; scale: 'any' | 'small'; styleSamples: string[] };
export type Profile = { topics: string[]; interests: string[]; audience: string; tone: string; phrases: string[]; keywords: string[] };
export type Citation = { sourceId: string; quote: string };
export type Candidate = { blogId: string; topicScore: number; reasons: string[]; evidence: Citation[]; sourcePostCount: number };
export type AnalysisResult = { profile?: Profile; evidence?: Citation[]; candidates?: Candidate[]; provisional?: boolean; sampleCount?: number; sources?: { id: string; blogId: string; postId: string; bodyTruncated?: boolean }[] };
export type JobSummary = { id: string; kind: 'profile' | 'candidates'; state: 'queued' | 'running' | 'uncertain' | 'succeeded' | 'cancelled'; revision: number; created_at: string; expires_at: string };
export type AnalysisJob = Omit<JobSummary, 'created_at' | 'expires_at'> & { createdAt: string; expiresAt: string; result: AnalysisResult | null; preferences?: Preferences; reviewedProfile: { profile: Profile; preferences: Preferences } | null; selection: string[]; profileStale: boolean; provider: string; model: string };
export type Material = { id: string; title: string; blog_id: string; post_id: string; expires_at: string; body?: string };
export const blankPreferences = (): Preferences => ({ requiredTopics: [], excludedTopics: [], region: '', scale: 'any', styleSamples: [] });
export const stateLabels: Record<JobSummary['state'], string> = { queued: '실행 대기', running: '분석 중', uncertain: '결과 확인 필요', succeeded: '결과 저장됨', cancelled: '대기 취소됨' };
export const lines = (value: string) => value.split('\n').map(s => s.trim()).filter(Boolean);
export function date(value: string) { return new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }); }
export class AnalysisResponseError extends Error {
  constructor(message: string, readonly status: number, readonly jobId?: string, readonly needKey = false) { super(message); }
}
export async function request<T>(url: '/api/analysis' | '/api/reader/member', operation: string, payload: Record<string, unknown> = {}): Promise<T> {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 65000);
  try {
    const response = await fetch(url, { method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: controller.signal, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ operation, payload }) });
    const json = await response.json();
    if (!response.ok) throw new AnalysisResponseError(typeof json.error === 'string' ? json.error : '요청 결과를 확인하지 못했습니다.', response.status, json.jobId, json.needKey === true);
    return json.data as T;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('응답을 제때 확인하지 못했습니다. 실행 취소를 뜻하지 않습니다. 요청 번호로 결과부터 확인해 주세요.');
    throw error;
  } finally { clearTimeout(timer); }
}
export const analysis = <T>(operation: string, payload: Record<string, unknown> = {}) => request<T>('/api/analysis', operation, payload);
// Remember IDs only, scoped to the authenticated member. Never store original text, API keys or model results here.
export function pendingIds(userId: string): string[] {
  try { const value: unknown = JSON.parse(sessionStorage.getItem(`bnc-pending:${userId}`) || '[]'); return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string' && /^[a-f0-9-]{36}$/i.test(id)).slice(-20) : []; } catch { return []; }
}
export function rememberPending(userId: string, id: string, remove = false) {
  try { const values = pendingIds(userId).filter(x => x !== id); if (!remove) values.push(id); sessionStorage.setItem(`bnc-pending:${userId}`, JSON.stringify(values.slice(-20))); } catch { /* Visible request ID remains available if browser storage is blocked. */ }
}
