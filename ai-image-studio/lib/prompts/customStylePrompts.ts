import catalog from './stylePresetPrompts.json';

export interface CustomStylePrompt {
  id: string;
  source_prompt_id: string | null;
  style_id: string;
  label: string;
  prompt: string;
  display_order: number;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export const CUSTOM_PROMPT_FIELDS = 'id,source_prompt_id,style_id,label,prompt,display_order,created_at,updated_at,expires_at';
const styleIds = new Set(catalog.map(item => item.style_id));
export const isStyleId = (value: unknown): value is string => typeof value === 'string' && styleIds.has(value);
export const isPromptId = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export function validateCustomPrompt(body: unknown):
  | { ok: true; data: { style_id: string; label: string; prompt: string; display_order: number } }
  | { ok: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: '올바른 프롬프트 정보를 입력해주세요.' };
  const input = body as Record<string, unknown>;
  if (!isStyleId(input.style_id)) return { ok: false, error: '화풍을 선택해주세요.' };
  const title = typeof input.label === 'string' ? input.label.trim() : '';
  const label = title && !title.startsWith('#') ? `#${title}` : title;
  const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : '';
  if (!label || label.length > 120) return { ok: false, error: '프롬프트 이름을 120자 이내로 입력해주세요.' };
  if (!prompt || prompt.length > 20000) return { ok: false, error: '프롬프트 본문을 20,000자 이내로 입력해주세요.' };
  const order = input.display_order ?? 0;
  if (typeof order !== 'number' || !Number.isInteger(order) || order < 0 || order > 9999) {
    return { ok: false, error: '정렬 순서는 0~9999 사이 정수로 입력해주세요.' };
  }
  return { ok: true, data: { style_id: input.style_id, label, prompt, display_order: order } };
}
