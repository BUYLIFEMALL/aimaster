import type { SupabaseClient } from '@supabase/supabase-js';
import { CUSTOM_PROMPT_FIELDS, isPromptId, isStyleId, validateCustomPrompt } from './customStylePrompts';

interface Dependencies {
  authorize: () => Promise<{ user: { id: string } | null; errorResponse?: Response | null }>;
  client: () => Promise<SupabaseClient>;
}

function json(data: unknown, init?: ResponseInit) {
  const response = Response.json(data, init);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
const missing = () => json({ error: '내 프롬프트를 찾을 수 없습니다. 삭제되었거나 보관 기간이 끝났을 수 있습니다.' }, { status: 404 });
function failed(error: { code?: string }) {
  console.error('Custom style prompt storage:', error.code ?? 'unknown');
  const unavailable = error.code === '42P01' || error.code === 'PGRST205';
  return json({ error: unavailable ? '개인 프롬프트 보관함을 준비 중입니다. 기본 예시는 계속 이용할 수 있습니다.' : '프롬프트를 처리하지 못했습니다. 잠시 후 다시 시도해주세요.' }, { status: unavailable ? 503 : 500 });
}

export function createCustomPromptHandlers(deps: Dependencies) {
  async function gate() {
    const auth = await deps.authorize();
    if (auth.errorResponse) return auth.errorResponse;
    if (!auth.user) return json({ error: '로그인이 필요합니다.' }, { status: 401 });
    return { user: auth.user, db: await deps.client() };
  }

  return {
    async GET(req: Request) {
      const access = await gate();
      if (access instanceof Response) return access;
      const params = new URL(req.url).searchParams;
      const id = params.get('id');
      const style = params.get('style_id');
      if ((id && !isPromptId(id)) || (style && !isStyleId(style))) return json({ error: '잘못된 프롬프트 주소입니다.' }, { status: 400 });
      let query = access.db.from('ais_user_style_prompts').select(CUSTOM_PROMPT_FIELDS)
        .eq('user_id', access.user.id).gt('expires_at', new Date().toISOString());
      if (style) query = query.eq('style_id', style);
      if (id) {
        const { data, error } = await query.eq('id', id).maybeSingle();
        if (error) return failed(error);
        return data ? json({ prompt: data }) : missing();
      }
      const { data, error } = await query.order('display_order', { ascending: true }).order('created_at', { ascending: false });
      return error ? failed(error) : json({ prompts: data ?? [] });
    },

    async POST(req: Request) {
      const access = await gate();
      if (access instanceof Response) return access;
      let body;
      try { body = await req.json(); } catch { return json({ error: '입력 정보를 확인해주세요.' }, { status: 400 }); }
      const checked = validateCustomPrompt(body);
      if (!checked.ok) return json({ error: checked.error }, { status: 400 });
      if (!isPromptId(body.source_prompt_id)) return json({ error: '바탕으로 사용할 기본 예시를 선택해주세요.' }, { status: 400 });
      const source = await access.db.from('style_preset_prompts').select('id').eq('id', body.source_prompt_id).maybeSingle();
      if (source.error) return failed(source.error);
      if (!source.data) return json({ error: '기본 예시를 찾을 수 없습니다. 목록을 새로고침해주세요.' }, { status: 404 });
      const { data, error } = await access.db.from('ais_user_style_prompts').insert({
        ...checked.data, user_id: access.user.id, source_prompt_id: body.source_prompt_id,
      }).select(CUSTOM_PROMPT_FIELDS).single();
      return error ? failed(error) : json({ prompt: data }, { status: 201 });
    },

    async PUT(req: Request) {
      const access = await gate();
      if (access instanceof Response) return access;
      let body;
      try { body = await req.json(); } catch { return json({ error: '입력 정보를 확인해주세요.' }, { status: 400 }); }
      const checked = validateCustomPrompt(body);
      if (!checked.ok) return json({ error: checked.error }, { status: 400 });
      if (!isPromptId(body.id)) return json({ error: '프롬프트 주소를 확인해주세요.' }, { status: 400 });
      const { data, error } = await access.db.from('ais_user_style_prompts').update(checked.data)
        .eq('id', body.id).eq('user_id', access.user.id).gt('expires_at', new Date().toISOString())
        .select(CUSTOM_PROMPT_FIELDS).maybeSingle();
      return error ? failed(error) : data ? json({ prompt: data }) : missing();
    },

    async DELETE(req: Request) {
      const access = await gate();
      if (access instanceof Response) return access;
      const id = new URL(req.url).searchParams.get('id');
      if (!isPromptId(id)) return json({ error: '프롬프트 주소를 확인해주세요.' }, { status: 400 });
      const { data, error } = await access.db.from('ais_user_style_prompts').delete()
        .eq('id', id).eq('user_id', access.user.id).gt('expires_at', new Date().toISOString())
        .select('id').maybeSingle();
      return error ? failed(error) : data ? json({ success: true }) : missing();
    },
  };
}
