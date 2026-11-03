// 이식판 U6-B(플랜 docs/PLAN_20261024_U6_MEETING_NOTES.md §2): 회원 본인 키로 음성 파일 받아쓰기.
// - 1순위 Gemini: 큰 파일은 서버가 회원 키로 Google 파일 「이어 올리기」 주소를 받고 브라우저가 Google로 직접 올린다
//   (키는 서버에만, Vercel 본문 4.5MB 한도 우회, 최대 100MB). 기준 코드: ai-audio-analyzer/src/lib/geminiFiles.ts(사본).
//   작은 파일(우리 서버 /api/upload로 올라온 4MB 이하)은 같은 모델에 바로 넣는다.
// - 2순위 OpenAI: 브라우저 직접 업로드가 없어 4MB 이하 파일만(/api/upload → audio/transcriptions).
// - Claude 키만 있으면 음성 파일 받아쓰기는 안 된다(Claude API는 음성 입력을 받지 않음). 실시간 받아쓰기는 된다.
// 모델은 docs/AI_MODEL_CATALOG.md(2026-11-03 확인) 기준: Gemini 중가 기본 gemini-3.8-flash, OpenAI 받아쓰기 gpt-transcribe.
import { geminiKey, openaiConfig, scrub } from '../ai/providers/config.ts';
import { geminiError } from '../ai/providers/gemini.ts';
import type { SegmentInput } from './model.ts';

export type SttMode = 'gemini' | 'openai';

export const GEMINI_STT_MODEL = 'gemini-3.8-flash';
export const OPENAI_STT_MODEL = 'gpt-transcribe';
/** Google 직접 업로드 한도(화면·매뉴얼과 같은 값) */
export const GEMINI_MAX_BYTES = 100 * 1024 * 1024;
/** 우리 서버(/api/upload)를 거치는 파일 한도 — src/server/files.ts MAX_UPLOAD_BYTES와 같은 값 */
export const SERVER_UPLOAD_MAX_BYTES = 4 * 1024 * 1024;

const API_ORIGIN = 'https://generativelanguage.googleapis.com';
const UPLOAD_URL_PREFIX = `${API_ORIGIN}/upload/`;
const FILE_URI_PREFIX = `${API_ORIGIN}/v1beta/files/`;

/** 회원이 가진 키로 정한 받아쓰기 방식: Gemini 우선, 없으면 OpenAI, 둘 다 없으면 null */
export function memberSttMode(): SttMode | null {
  if (geminiKey()) return 'gemini';
  if (openaiConfig()) return 'openai';
  return null;
}

export class SttError extends Error {}

/** 브라우저가 Google로 직접 올릴 수 있는 사이트 주소(Google이 이 Origin에만 직접 업로드를 허용) */
export function isAllowedOrigin(origin: string): boolean {
  return (
    origin === 'https://ai-work-workspace.buylife.xyz' ||
    /^https:\/\/ai-work-workspace(-[a-z0-9-]+)?\.vercel\.app$/.test(origin) ||
    /^http:\/\/localhost:\d+$/.test(origin)
  );
}

export function isAllowedFileRef(name: string, uri: string): boolean {
  return /^files\/[a-z0-9-]+$/.test(name) && uri === `${API_ORIGIN}/v1beta/${name}` && uri.startsWith(FILE_URI_PREFIX);
}

export function geminiFileUri(name: string): string {
  return `${API_ORIGIN}/v1beta/${name}`;
}

function requireGeminiKey(): string {
  const key = geminiKey();
  if (!key) throw new SttError('음성 파일 받아쓰기에 쓸 본인 Gemini API 키가 없습니다. 메인 사이트 「API키등록·플랫폼연동」에서 등록해 주세요.');
  return key;
}

async function googleFail(prefix: string, res: Response): Promise<never> {
  let payload: unknown = '';
  try {
    payload = await res.json();
  } catch {
    /* 본문 없음 */
  }
  const e = geminiError(res.status, payload, { model: GEMINI_STT_MODEL });
  throw new SttError(`${prefix} ${e.message}`.trim());
}

/** 회원 본인 키로 Google 파일 이어 올리기를 시작하고 올림 주소(키 없음)를 돌려준다. */
export async function startGeminiUpload(input: { displayName: string; mimeType: string; size: number; origin: string }): Promise<string> {
  const key = requireGeminiKey();
  const res = await fetch(`${UPLOAD_URL_PREFIX}v1beta/files`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': key,
      Origin: input.origin,
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(input.size),
      'X-Goog-Upload-Header-Content-Type': input.mimeType,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file: { display_name: input.displayName.slice(0, 120) } }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) await googleFail('음성 파일 올리기를 시작하지 못했습니다.', res);
  const url = res.headers.get('x-goog-upload-url');
  if (!url || !url.startsWith(UPLOAD_URL_PREFIX)) throw new SttError('음성 파일 올리기 주소를 받지 못했습니다. 잠시 뒤 다시 시도해 주세요.');
  return url;
}

/** Google이 파일 처리를 끝낼 때까지 기다린다(음성은 보통 몇 초). */
async function waitUntilActive(key: string, name: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const res = await fetch(`${API_ORIGIN}/v1beta/${name}`, { headers: { 'x-goog-api-key': key }, signal: AbortSignal.timeout(20_000) });
    if (!res.ok) await googleFail('올린 음성 파일을 확인하지 못했습니다.', res);
    const file = (await res.json()) as { state?: string };
    if (file.state === 'ACTIVE') return;
    if (file.state === 'FAILED') throw new SttError('Google에서 음성 파일을 처리하지 못했습니다. 다른 형식(MP3·WAV)으로 다시 시도해 주세요.');
    if (Date.now() > deadline) throw new SttError('음성 파일 준비가 오래 걸립니다. 잠시 뒤 「받아쓰기 다시 시도」를 눌러 주세요.');
    await new Promise((r) => setTimeout(r, 2000));
  }
}

/** 받아쓰기가 끝난 Google 파일을 지운다. 실패해도 Google이 48시간 뒤 자동 삭제하므로 오류는 무시한다. */
export async function deleteGeminiFile(name: string): Promise<void> {
  const key = geminiKey();
  if (!key || !/^files\/[a-z0-9-]+$/.test(name)) return;
  try {
    await fetch(`${API_ORIGIN}/v1beta/${name}`, { method: 'DELETE', headers: { 'x-goog-api-key': key }, signal: AbortSignal.timeout(15_000) });
  } catch {
    /* 무시 */
  }
}

function languageRule(language: string | undefined): string {
  if (!language || language === 'auto') return '말한 언어 그대로 받아쓰세요. 번역하지 마세요.';
  return `회의 언어는 ${language}입니다. 말한 언어 그대로 받아쓰고 번역하지 마세요.`;
}

const SEGMENT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    segments: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          speaker: { type: 'STRING' },
          start_seconds: { type: 'NUMBER' },
          end_seconds: { type: 'NUMBER' },
          text: { type: 'STRING' },
        },
        required: ['speaker', 'start_seconds', 'text'],
      },
    },
  },
  required: ['segments'],
};

/** Gemini 받아쓰기 결과(JSON) → 회의록 받아쓴 줄 */
export function parseGeminiSegments(raw: string): SegmentInput[] {
  let data: { segments?: { speaker?: unknown; start_seconds?: unknown; end_seconds?: unknown; text?: unknown }[] };
  try {
    data = JSON.parse(raw);
  } catch {
    throw new SttError('받아쓰기 결과를 읽지 못했습니다. 녹음이 너무 길면 나눠서 올려 주세요.');
  }
  const out: SegmentInput[] = [];
  for (const s of data.segments ?? []) {
    const text = String(s?.text ?? '').replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const start = Number(s.start_seconds);
    const end = Number(s.end_seconds);
    out.push({
      text,
      speaker: typeof s.speaker === 'string' && s.speaker.trim() ? s.speaker.trim().slice(0, 80) : '화자 1',
      startMs: Number.isFinite(start) && start >= 0 ? Math.round(start * 1000) : undefined,
      endMs: Number.isFinite(end) && end >= 0 ? Math.round(end * 1000) : undefined,
    });
  }
  return out;
}

/** 회원 본인 Gemini 키로 받아쓰기: Google에 올린 파일(fileUri) 또는 작은 파일 내용(data) */
export async function transcribeWithGemini(input: { fileUri?: string; fileName?: string; data?: Buffer; mime: string; language?: string; waitMs?: number }): Promise<SegmentInput[]> {
  const key = requireGeminiKey();
  if (input.fileUri && input.fileName) await waitUntilActive(key, input.fileName, input.waitMs ?? 40_000);
  const audioPart = input.fileUri
    ? { fileData: { fileUri: input.fileUri, mimeType: input.mime } }
    : { inlineData: { mimeType: input.mime, data: (input.data ?? Buffer.alloc(0)).toString('base64') } };
  const prompt = [
    '이 회의 녹음을 처음부터 끝까지 빠짐없이 받아쓰세요. 요약하거나 고쳐 쓰지 마세요.',
    languageRule(input.language),
    '말한 사람이 바뀌면 새 줄로 나누고 「화자 1」「화자 2」처럼 이름을 붙이세요. 같은 사람은 끝까지 같은 이름을 쓰세요.',
    '각 줄에 녹음 시작부터 잰 시작·끝 시각(초)을 넣으세요. 한 줄은 길어도 몇 문장 이내로 나누세요.',
    '말소리가 없으면 segments를 빈 배열로 두세요.',
  ].join('\n');
  const res = await fetch(`${API_ORIGIN}/v1beta/models/${GEMINI_STT_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [audioPart, { text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: SEGMENT_SCHEMA, maxOutputTokens: 65_536, temperature: 0 },
    }),
    // RPC 함수 한도 300초 안에서 실패를 기록할 수 있게 앞의 대기(최대 40초)와 합쳐 끊는다
    signal: AbortSignal.timeout(230_000),
  }).catch((e: unknown) => {
    if ((e as Error)?.name === 'TimeoutError') throw new SttError('받아쓰기가 오래 걸려 멈췄습니다. 녹음을 짧게 나눠 올리거나 「받아쓰기 다시 시도」를 눌러 주세요.');
    throw new SttError('Gemini에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.');
  });
  if (!res.ok) await googleFail('받아쓰기에 실패했습니다.', res);
  const body = (await res.json()) as { candidates?: { finishReason?: string; content?: { parts?: { text?: string }[] } }[] };
  const cand = body.candidates?.[0];
  const text = (cand?.content?.parts ?? []).map((p) => p.text ?? '').join('');
  if (cand?.finishReason === 'MAX_TOKENS') throw new SttError('녹음이 너무 길어 한 번에 받아쓰지 못했습니다. 1시간 이내로 나눠서 올려 주세요.');
  if (!text) throw new SttError('받아쓰기 결과가 비어 있습니다. 말소리가 들어 있는 파일인지 확인해 주세요.');
  return parseGeminiSegments(text);
}

/** OpenAI 받아쓰기 글(시각 없음) → 몇 문장씩 묶은 줄 */
export function textToSegments(text: string): SegmentInput[] {
  const sentences = text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?。？！])\s+/).filter(Boolean);
  const out: SegmentInput[] = [];
  let cur = '';
  for (const s of sentences) {
    if (cur && cur.length + s.length > 400) {
      out.push({ text: cur, speaker: '화자 1' });
      cur = '';
    }
    cur = cur ? `${cur} ${s}` : s;
  }
  if (cur) out.push({ text: cur, speaker: '화자 1' });
  return out;
}

/** 회원 본인 OpenAI 키로 받아쓰기(4MB 이하 파일) */
export async function transcribeWithOpenAi(input: { data: Buffer; mime: string; name: string; language?: string }): Promise<SegmentInput[]> {
  const cfg = openaiConfig();
  if (!cfg) throw new SttError('음성 파일 받아쓰기에 쓸 본인 OpenAI API 키가 없습니다. 메인 사이트 「API키등록·플랫폼연동」에서 등록해 주세요.');
  const fd = new FormData();
  fd.append('file', new Blob([new Uint8Array(input.data)], { type: input.mime }), input.name || 'audio');
  fd.append('model', OPENAI_STT_MODEL);
  fd.append('response_format', 'json');
  const lang = input.language && input.language !== 'auto' ? input.language.split('-')[0] : '';
  if (lang) fd.append('language', lang);
  const res = await fetch(`${cfg.baseUrl}/audio/transcriptions`, {
    method: 'POST', headers: { Authorization: `Bearer ${cfg.apiKey}` }, body: fd, signal: AbortSignal.timeout(240_000),
  }).catch(() => {
    throw new SttError('OpenAI에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.');
  });
  if (res.status === 401 || res.status === 403) throw new SttError('등록한 OpenAI API 키가 거절됐습니다. 「API키등록·플랫폼연동」에서 본인 키를 확인해 주세요.');
  if (res.status === 429) throw new SttError('OpenAI 사용 한도나 잔액을 넘었습니다. OpenAI 계정을 확인해 주세요.');
  if (!res.ok) {
    const detail = scrub(await res.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 200);
    throw new SttError(`받아쓰기에 실패했습니다(${res.status}). ${detail}`.trim());
  }
  const body = (await res.json()) as { text?: string };
  const segments = textToSegments(String(body.text ?? ''));
  if (!segments.length) throw new SttError('받아쓰기 결과가 비어 있습니다. 말소리가 들어 있는 파일인지 확인해 주세요.');
  return segments;
}
