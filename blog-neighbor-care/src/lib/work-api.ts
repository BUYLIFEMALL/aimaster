import {validSchedule} from './schedule';
export type Access = { allowed: true; userId: string } | { allowed: false; status: number; error: string };
type Dependencies = {
  authorize: () => Promise<Access>;
  execute: (userId: string, operation: string, payload: Record<string, unknown>) => Promise<{
    data: unknown; error: { code?: string; message?: string } | null;
  }>;
};
const uuid = (v: unknown) => typeof v === 'string' && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(v);
const blog = (v: unknown) => typeof v === 'string' && /^[a-z0-9_-]{1,50}$/.test(v);
const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown) => typeof v === 'string' && v.length <= 4000;
const limits: Record<string, number> = { request_cap: 20, like_cap: 100, comment_cap: 30 };
const operations: Record<string, string[]> = {
  review_approve:['id','expected_body'],save_execution:['request_cap','like_cap','comment_cap','enabled','expected_revision','confirmed'],
  accept_devices:[],grant_accept:['device_id','read','execute','confirmed'],revoke_accept:['device_id'],accept_list:[],draft_accept:['id','confirmed'],approve_accept:['id','confirmed'],
  settings: [], list: [], request_status: [], configure: ['request_cap', 'like_cap', 'comment_cap', 'enabled', 'mode'],
  engagement_list: [], engagement_review:['id'], draft_reply: ['id','body'], draft_return_visit: ['id','body'],
  extension_devices:[],grant_extension:['device_id','confirmed','kinds','reads'],revoke_extension:['device_id'],
  schedule: [], save_schedule: ['interval_minutes','start_minute','end_minute','expected_revision'],
  schedule_status: [], resume_schedule: ['run_id','generation','settings_revision','preference_revision','confirmed'],
  create: ['account_id', 'neighbor_id', 'post_id', 'kind', 'body'], approve: ['id'], edit: ['id', 'body'], cancel: ['id'],
};
function valid(operation: string, p: Record<string, unknown>) {
  if (Object.keys(p).some(key => !operations[operation].includes(key))) return false;
  if(operation==='review_approve')return uuid(p.id)&&text(p.expected_body);
  if(operation==='save_execution')return p.confirmed===true&&typeof p.enabled==='boolean'&&Number.isSafeInteger(p.expected_revision)&&Number(p.expected_revision)>0&&Object.entries(limits).every(([k,max])=>Number.isInteger(p[k])&&Number(p[k])>=0&&Number(p[k])<=max);
  if(operation==='grant_accept')return uuid(p.device_id)&&p.confirmed===true&&typeof p.read==='boolean'&&typeof p.execute==='boolean';
  if(operation==='revoke_accept')return uuid(p.device_id);
  if(operation==='draft_accept'||operation==='approve_accept')return uuid(p.id)&&p.confirmed===true;
  if(operation==='grant_extension'){
   const reads=p.reads??[];return uuid(p.device_id)&&p.confirmed===true&&Array.isArray(p.kinds)&&p.kinds.length<=4&&new Set(p.kinds).size===p.kinds.length&&p.kinds.every(k=>['request','like','comment','reply'].includes(k))&&Array.isArray(reads)&&reads.length<=3&&new Set(reads).size===reads.length&&reads.every(k=>['relationship','incoming','return_post'].includes(k))&&p.kinds.length+reads.length>0;
  }
  if(operation==='revoke_extension')return uuid(p.device_id);
  if(operation==='engagement_review')return uuid(p.id);
  if(operation==='draft_reply'||operation==='draft_return_visit')return uuid(p.id)&&text(p.body)&&!!String(p.body).trim()&&!/https?:\/\/|www\./i.test(String(p.body));
  if(operation==='resume_schedule')return uuid(p.run_id)&&p.confirmed===true&&
    [p.generation,p.settings_revision,p.preference_revision].every(n=>Number.isSafeInteger(n)&&Number(n)>0);
  if(operation==='save_schedule')return validSchedule(p as {interval_minutes:number;start_minute:number;end_minute:number})&&Number.isSafeInteger(p.expected_revision)&&Number(p.expected_revision)>0;
  if (operation === 'configure') {
    if (!Object.keys(p).length) return false;
    for (const [key, max] of Object.entries(limits)) {
      if (key in p && (typeof p[key] !== 'number' || !Number.isInteger(p[key]) || p[key] < 0 || p[key] > max)) return false;
    }
    return (!('mode' in p) || ['review', 'auto'].includes(String(p.mode))) &&
      (!('enabled' in p) || typeof p.enabled === 'boolean');
  }
  if (operation === 'create') {
    if (!uuid(p.account_id) || !blog(p.neighbor_id) || !['request', 'like', 'comment'].includes(String(p.kind))) return false;
    if (p.kind !== 'request' && (typeof p.post_id !== 'string' || !/^\d{1,30}$/.test(p.post_id))) return false;
    if ('post_id' in p && typeof p.post_id !== 'string') return false;
    if ('body' in p && !text(p.body)) return false;
    if (p.kind !== 'like' && (typeof p.body !== 'string' || !p.body.trim())) return false;
    if (['comment', 'reply'].includes(String(p.kind)) && /https?:\/\/|www\./i.test(String(p.body))) return false;
  }
  if (['approve', 'edit', 'cancel'].includes(operation) && !uuid(p.id)) return false;
  if (operation === 'edit' && (!text(p.body) || !String(p.body).trim())) return false;
  return true;
}
const response = (body: unknown, status = 200) => Response.json(body, {
  status, headers: { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie, Origin', 'X-Content-Type-Options': 'nosniff' },
});
async function readJson(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('INVALID');
  const chunks: Uint8Array[] = []; let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 8192) { await reader.cancel(); throw new Error('TOO_LARGE'); }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
}
export function createWorkHandler({ authorize, execute }: Dependencies) {
  return async (request: Request): Promise<Response> => {
    // Next의 내부 URL 호스트와 실제 요청 Host가 다를 수 있으므로 전송된 Host와 대조한다.
    const url = new URL(request.url);
    const expectedOrigin = `${url.protocol}//${request.headers.get('host') ?? url.host}`;
    if (request.headers.get('origin') !== expectedOrigin || request.headers.get('sec-fetch-site') === 'cross-site') {
      return response({ error: '같은 프로그램 화면에서 요청해 주세요.' }, 403);
    }
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
      return response({ error: 'JSON 요청이 필요합니다.' }, 415);
    }
    try {
      const access = await authorize();
      if (!access.allowed) return response({ error: access.error }, access.status);
      let input: unknown;
      try { input = await readJson(request); }
      catch (error) { return response({ error: '요청 내용을 확인해 주세요.' }, error instanceof Error && error.message === 'TOO_LARGE' ? 413 : 400); }
      if (!object(input) || Object.keys(input).some(k => !['operation', 'payload'].includes(k)) || typeof input.operation !== 'string') {
        return response({ error: '요청 형식이 올바르지 않습니다.' }, 400);
      }
      const operation = input.operation;
      if (!Object.hasOwn(operations, operation)) return response({ error: '회원 화면에서 실행할 수 없는 작업입니다.' }, 403);
      const payload = input.payload ?? {};
      if (!object(payload) || !valid(operation, payload)) return response({ error: '입력값을 확인해 주세요.' }, 400);
      const result = await execute(access.userId, operation, payload);
      if (result.error) {
        const message = result.error.message ?? '';
        if(message==='BNC_SCHEDULE_CHANGED')return response({error:'반복 설정이나 실행 기록이 바뀌었습니다. 현재 상태를 다시 조회한 뒤 진행해 주세요.'},409);
        if(message==='BNC_RESUME_BLOCKED')return response({error:'이전 작업의 결과 확인과 미해결 작업 처리가 필요합니다. 자동 실행은 꺼진 상태에서 다시 확인해 주세요.'},409);
        if (message === 'BNC_NOT_FOUND') return response({ error: '작업을 찾을 수 없습니다.' }, 404);
        if (message === 'BNC_ENGAGEMENT_EXISTS') return response({ error: '이미 초안이 있습니다. 대상을 다시 조회해 저장된 초안을 확인하세요.' }, 409);
        if (message === 'BNC_RETURN_POST_REQUIRED') return response({ error: '확인된 답방 글이 필요합니다.' }, 409);
        if (/^BNC_(LIVE_DISABLED|ACCOUNT_REQUIRED|STOPPED|UNCERTAIN|APPROVAL_CHANGED|INVALID_STATE|EXPIRED)$/.test(message)) {
          return response({ error: '연결·실행 준비 상태를 확인해 주세요.', reason: message }, 409);
        }
        if (['23514', '23502', '22P02', '23505'].includes(result.error.code ?? '')) return response({ error: '입력값 또는 중복 작업을 확인해 주세요.' }, 400);
        return response({ error: '서버 준비 상태를 확인해 주세요.' }, 503);
      }
      return response({ data: result.data });
    } catch { return response({ error: '서버 준비 상태를 확인해 주세요.' }, 503); }
  };
}
