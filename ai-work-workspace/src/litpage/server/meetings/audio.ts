// Uploaded meeting audio and transcript retention.
// - "Upload audio": AAC, M4A, MP3 or WAV (not video) uploaded through /api/upload, then transcribed by a
// speech-to-text provider. Providers plug in with registerSttProvider; this build ships none and never calls an
// outside service, so without one the block shows the "This recording couldn’t be transcribed." state.
// - Audio is processing material, not content: deleted after a successful transcription, kept at most 3 days after
// a failure, or right away with "Delete audio".
// - Automatic transcript deletion (Enterprise, Settings › Meeting notes): a daily job deletes transcripts older than
// the chosen number of days ("Transcript was deleted … according to your workspace’s automatic transcript deletion
// policy").
// 이식판: 음성 파일 내용은 DB(files.content)에서 읽는다(디스크 사용 안 함)
import type { BlockRecord, SpaceRecord } from '#shared/records.ts';
import { roleAtLeast } from '#shared/permissions.ts';
import { db, getRecord } from '../db.ts';
import { blockRole } from '../records.ts';
import { fileRow, readFileContent } from '../content/files.ts';
import { registerJobHandler, scheduleJob, getJob, cancelJob } from '../scheduler.ts';
import {
  MeetingError, assertCanEdit, assertEnabled, assertNotTemplate, deleteTranscript, ensureStructure, importSegments, meetingBlock, recordState, spaceSetting,
  stateOf, transcriptRuns, type SegmentInput,
} from './model.ts';
// 이식판 U6-B: 회원 본인 키 받아쓰기(Gemini 우선·OpenAI 보조)
import {
  GEMINI_MAX_BYTES, SERVER_UPLOAD_MAX_BYTES, SttError, deleteGeminiFile, geminiFileUri, isAllowedFileRef, isAllowedOrigin, memberSttMode,
  startGeminiUpload, transcribeWithGemini, transcribeWithOpenAi, type SttMode,
} from './memberStt.ts';

export interface SttProvider {
  id: string;
  label: string;
  /** audio bytes → timed segments (speaker labels when the provider separates speakers) */
  transcribe(input: { data: Buffer; mime: string; name: string; language?: string }): Promise<{ segments: SegmentInput[] }>;
}

const providers = new Map<string, SttProvider>();

export function registerSttProvider(p: SttProvider) {
  providers.set(p.id, p);
}

// 이식판 U6-B: 회원 본인 키 제공자(memberStt.ts) — 요청마다 그 회원의 키(withMemberAiKeys)로 정해진다
const MEMBER_PROVIDERS: Record<SttMode, SttProvider> = {
  gemini: { id: 'member-gemini', label: 'Gemini', transcribe: async (i) => ({ segments: await transcribeWithGemini({ data: i.data, mime: i.mime, language: i.language }) }) },
  openai: { id: 'member-openai', label: 'OpenAI', transcribe: async (i) => ({ segments: await transcribeWithOpenAi(i) }) },
};

/** 등록된 제공자(원본 시험용)가 있으면 그것, 없으면 회원 본인 키 제공자(Gemini 우선·OpenAI 보조), 둘 다 없으면 null. */
export function sttProvider(): SttProvider | null {
  const id = process.env.NC_STT_PROVIDER?.trim();
  if (id) return providers.get(id) ?? null;
  if (providers.size === 1) return [...providers.values()][0];
  const mode = memberSttMode();
  return mode ? MEMBER_PROVIDERS[mode] : null;
}

/** 이 회원이 올릴 수 있는 음성 파일 최대 크기(Gemini는 Google 직접 업로드, OpenAI는 우리 서버 경유) */
export function sttMaxBytes(): number {
  return memberSttMode() === 'gemini' ? GEMINI_MAX_BYTES : SERVER_UPLOAD_MAX_BYTES;
}

/** Google에 직접 올린 음성의 표식(files 표가 아니라 회원 Gemini 파일 저장소에 있다) */
const GEMINI_PREFIX = 'gemini:';

export const AUDIO_TYPES: Record<string, string> = {
  'audio/aac': 'AAC', 'audio/x-aac': 'AAC', 'audio/mp4': 'M4A', 'audio/m4a': 'M4A', 'audio/x-m4a': 'M4A', 'audio/mpeg': 'MP3', 'audio/mp3': 'MP3',
  'audio/wav': 'WAV', 'audio/x-wav': 'WAV', 'audio/wave': 'WAV', 'audio/vnd.wave': 'WAV',
};
const EXT_TYPES: Record<string, string> = { aac: 'audio/aac', m4a: 'audio/mp4', mp3: 'audio/mpeg', wav: 'audio/wav' };
export const ALLOWED_LABEL = 'AAC, M4A, MP3 or WAV';
const KEEP_FAILED_MS = 3 * 86_400_000;

function audioMime(name: string, mime: string): string | null {
  if (AUDIO_TYPES[mime]) return mime;
  const ext = /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase() ?? '';
  return EXT_TYPES[ext] ?? null;
}

function removeFile(fileId: string) {
  const row = fileRow(fileId);
  if (!row) return;
  // 이식판: 내용은 files.content(DB)에 있어 행을 지우면 함께 지워진다
  db.prepare('DELETE FROM files WHERE id = ?').run(fileId);
  db.prepare('DELETE FROM meeting_audio WHERE file_id = ?').run(fileId);
}

// Which uploads are a meeting's audio: written by uploadAudio (the uploader's own file, checked there) for that block.
// The block's transcription_state is client-writable — any editor can put any file id in it — so reading, transcribing
// and deleting audio go by this record, never by the id in the state alone.
db.exec(`
CREATE TABLE IF NOT EXISTS meeting_audio (
  file_id TEXT PRIMARY KEY,
  block_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_time INTEGER NOT NULL
);
`);

/** Is `fileId` an upload made as this meeting block's audio? */
function isBlockAudio(blockId: string, fileId: string | undefined): boolean {
  return !!fileId && !!db.prepare('SELECT 1 AS hit FROM meeting_audio WHERE file_id = ? AND block_id = ?').get(fileId, blockId);
}

/** Delete the block's own audio upload (and its expiry job); ids that aren't this block's uploads are left alone. */
function removeBlockAudio(blockId: string, fileId: string | undefined) {
  if (!fileId || !isBlockAudio(blockId, fileId)) return;
  removeFile(fileId);
  cancelJob(`meeting-audio:${fileId}`);
  // 이식판 U6-B: Google에 올린 파일도 지운다(회원 키가 없는 정리 작업에서는 Google이 48시간 뒤 자동 삭제)
  if (fileId.startsWith(GEMINI_PREFIX)) void deleteGeminiFile(fileId.slice(GEMINI_PREFIX.length));
}

function assertCanUpload(b: BlockRecord, userId: string) {
  assertEnabled(b);
  assertCanEdit(b, userId);
  assertNotTemplate(b);
  const st = stateOf(b);
  if (st.state === 'transcribing' || st.state === 'summarizing') throw new MeetingError('busy', '받아쓰기를 멈춘 뒤 음성 파일을 올려 주세요.', 409);
}

/** 이식판 U6-B ① 회원 본인 Gemini 키로 Google 직접 업로드 주소를 받는다(파일은 브라우저가 Google로 바로 올림). */
export async function startGeminiAudioUpload(blockId: unknown, userId: string, input: { fileName?: unknown; mimeType?: unknown; size?: unknown; origin?: unknown }) {
  const b = meetingBlock(blockId);
  assertCanUpload(b, userId);
  if (memberSttMode() !== 'gemini') throw new MeetingError('need_key', '큰 음성 파일은 본인 Gemini API 키로 받아씁니다. 메인 사이트 「API키등록·플랫폼연동」에서 Gemini 키를 등록해 주세요.', 400);
  const name = String(input.fileName ?? '').slice(0, 200) || 'audio';
  const mime = audioMime(name, String(input.mimeType ?? ''));
  if (!mime) throw new MeetingError('unsupported', `${ALLOWED_LABEL} 형식의 음성 파일을 골라 주세요.`, 400);
  const size = Number(input.size);
  if (!Number.isFinite(size) || size <= 0) throw new MeetingError('upload', '파일 크기를 확인할 수 없습니다. 파일을 다시 골라 주세요.', 400);
  if (size > GEMINI_MAX_BYTES) throw new MeetingError('too_large', '음성 파일은 100MB까지 받아쓸 수 있습니다. 나눠서 올려 주세요.', 400);
  const origin = String(input.origin ?? '');
  if (!isAllowedOrigin(origin)) throw new MeetingError('origin', '허용되지 않은 접속 주소입니다.', 403);
  try {
    return { uploadUrl: await startGeminiUpload({ displayName: name, mimeType: mime, size, origin }), mimeType: mime };
  } catch (e) {
    if (e instanceof SttError) throw new MeetingError('upload', e.message, 400);
    throw e;
  }
}

/** 이식판 U6-B ② Google에 다 올린 파일을 이 회의록의 음성으로 붙이고 받아쓴다. */
export async function attachGeminiAudio(blockId: unknown, userId: string, input: { name?: unknown; uri?: unknown; fileName?: unknown; mimeType?: unknown; size?: unknown }) {
  let b = meetingBlock(blockId);
  assertCanUpload(b, userId);
  const ref = String(input.name ?? '');
  if (!isAllowedFileRef(ref, String(input.uri ?? ''))) throw new MeetingError('upload', '올린 음성 파일을 찾지 못했습니다. 파일을 다시 골라 시도해 주세요.', 400);
  const name = String(input.fileName ?? '').slice(0, 200) || 'audio';
  const mime = audioMime(name, String(input.mimeType ?? ''));
  if (!mime) throw new MeetingError('unsupported', `${ALLOWED_LABEL} 형식의 음성 파일을 골라 주세요.`, 400);
  const st = stateOf(b);
  b = ensureStructure(b, userId);
  const fileId = `${GEMINI_PREFIX}${ref}`;
  const now = Date.now();
  if (st.audio?.file_id && st.audio.file_id !== fileId) removeBlockAudio(b.id, st.audio.file_id);
  db.prepare('INSERT OR REPLACE INTO meeting_audio (file_id, block_id, user_id, created_time) VALUES (?, ?, ?, ?)').run(fileId, b.id, userId, now);
  recordState(userId, b, {
    state: 'transcript_ready', error: undefined,
    audio: { file_id: fileId, name, mime, size: Math.max(0, Number(input.size) || 0), status: 'transcribing', time: now },
  }, 'uploadAudio');
  scheduleJob('meeting-audio-expire', `meeting-audio:${fileId}`, now + KEEP_FAILED_MS, { blockId: b.id, fileId });
  return transcribeUploaded(b.id, userId);
}

/** Attach an uploaded audio file and transcribe it (or record why it can't be). */
export async function uploadAudio(blockId: unknown, userId: string, fileId: unknown) {
  let b = meetingBlock(blockId);
  assertCanUpload(b, userId);
  const st = stateOf(b);
  const row = fileRow(String(fileId ?? ''));
  if (!row || row.user_id !== userId) throw new MeetingError('upload', '음성 파일을 올리지 못했습니다. 파일을 다시 골라 시도해 주세요.', 400);
  const mime = audioMime(row.name, row.mime);
  if (!mime) {
    removeFile(row.id);
    throw new MeetingError('unsupported', `${ALLOWED_LABEL} 형식의 음성 파일을 골라 주세요.`, 400);
  }
  b = ensureStructure(b, userId);
  const now = Date.now();
  // replaces an earlier upload of this block (only one that was uploaded as its audio)
  if (st.audio?.file_id && st.audio.file_id !== row.id) removeBlockAudio(b.id, st.audio.file_id);
  db.prepare('INSERT OR REPLACE INTO meeting_audio (file_id, block_id, user_id, created_time) VALUES (?, ?, ?, ?)').run(row.id, b.id, userId, now);
  recordState(userId, b, {
    state: 'transcript_ready', error: undefined,
    audio: { file_id: row.id, name: row.name, mime, size: row.size, status: 'transcribing', time: now },
  }, 'uploadAudio');
  scheduleJob('meeting-audio-expire', `meeting-audio:${row.id}`, now + KEEP_FAILED_MS, { blockId: b.id, fileId: row.id });
  return transcribeUploaded(b.id, userId);
}

export async function transcribeUploaded(blockId: string, userId: string): Promise<{ status: 'complete' | 'error'; error?: string }> {
  const b = meetingBlock(blockId);
  const st = stateOf(b);
  const audio = st.audio;
  if (!audio || audio.status === 'deleted') throw new MeetingError('no_audio', '음성을 복구할 수 없습니다. 이 PC에 저장된 녹음이 만료됐을 수 있습니다.', 400);
  const provider = sttProvider();
  const fail = (message: string, code = 'transcribe') => {
    recordState(userId, meetingBlock(blockId), { state: 'error', error: { code, message, time: Date.now() }, audio: { ...audio, status: 'failed' } }, 'transcribeFailed');
    return { status: 'error' as const, error: message };
  };
  const ownAudio = isBlockAudio(blockId, audio.file_id);
  const onGoogle = ownAudio && audio.file_id.startsWith(GEMINI_PREFIX);
  if (!provider && !onGoogle) return fail('음성 파일 받아쓰기에 쓸 본인 Gemini 또는 OpenAI API 키가 없습니다. 메인 사이트 「API키등록·플랫폼연동」에서 등록해 주세요.', 'stt_unavailable');
  try {
    let segments: SegmentInput[];
    if (onGoogle) {
      // 이식판 U6-B: 회원 Gemini 파일 저장소에 올린 음성(Google 직접 업로드)
      if (memberSttMode() !== 'gemini') return fail('Google에 올린 음성은 본인 Gemini API 키로 받아씁니다. Gemini 키를 확인해 주세요.', 'stt_unavailable');
      const ref = audio.file_id.slice(GEMINI_PREFIX.length);
      segments = await transcribeWithGemini({ fileUri: geminiFileUri(ref), fileName: ref, mime: audio.mime, language: st.language });
    } else {
      // only a file uploaded as this block's audio (not whatever id the state names)
      const row = ownAudio ? fileRow(audio.file_id) : undefined;
      const content = row ? readFileContent(row.id) : null;
      if (!row || !content) return fail('음성 파일을 찾지 못했습니다. 보관 기간(3일)이 지났을 수 있으니 파일을 다시 올려 주세요.', 'audio_missing');
      segments = (await provider!.transcribe({ data: content, mime: audio.mime, name: audio.name, language: st.language })).segments;
    }
    // 빈 결과로 기존 받아쓴 글을 지우지 않는다
    if (!segments.length) return fail('받아쓴 말이 없습니다. 말소리가 들어 있는 파일인지 확인해 주세요.');
    importSegments(blockId, userId, segments);
    removeBlockAudio(blockId, audio.file_id);
    recordState(userId, meetingBlock(blockId), { state: 'transcript_ready', error: undefined, audio: { ...audio, status: 'deleted' } }, 'transcribed');
    return { status: 'complete' };
  } catch (e) {
    console.error('[meetings] transcription failed', e instanceof Error ? e.message.slice(0, 300) : e);
    return fail(e instanceof SttError ? e.message : '받아쓰기에 실패했습니다. 「받아쓰기 다시 시도」를 눌러 주세요.');
  }
}

/** "Delete audio": the uploaded file goes now (transcript and timestamps stay). */
export function deleteAudio(blockId: unknown, userId: string) {
  const b = meetingBlock(blockId);
  assertCanEdit(b, userId);
  const audio = stateOf(b).audio;
  if (!audio || audio.status === 'deleted') return b;
  // any editor of the meeting may delete its audio — the file uploaded as this block's audio, nothing else
  removeBlockAudio(b.id, audio.file_id);
  recordState(userId, b, { audio: { ...audio, status: 'deleted' } }, 'deleteAudio');
  return getRecord<BlockRecord>('block', b.id)!;
}

registerJobHandler('meeting-audio-expire', (payload: { blockId?: string; fileId?: string }) => {
  if (!payload?.fileId) return;
  removeFile(payload.fileId);
  const b = payload.blockId ? getRecord<BlockRecord>('block', payload.blockId) : undefined;
  const audio = b ? stateOf(b).audio : undefined;
  if (b && audio?.file_id === payload.fileId) {
    const actor = actorFor(b);
    if (actor) recordState(actor, b, { audio: { ...audio, status: 'deleted' } }, 'audioExpired');
  }
});

// ---------------------------------------------------------------- automatic transcript deletion

/** Someone allowed to write the block for maintenance (its creator if they still can, else a workspace owner). */
function actorFor(b: BlockRecord): string | null {
  if (b.created_by_id && roleAtLeast(blockRole(b.id, b.created_by_id), 'read_and_write')) return b.created_by_id;
  const space = getRecord<SpaceRecord>('space', b.space_id);
  for (const p of space?.permissions ?? []) {
    if (p.user_id && (p.role as string) === 'owner' && roleAtLeast(blockRole(b.id, p.user_id), 'read_and_write')) return p.user_id;
  }
  return null;
}

/** Delete transcripts older than each Enterprise workspace's retention (returns how many were deleted). */
export function runTranscriptRetention(now = Date.now()): number {
  let n = 0;
  const rows = db.prepare(`SELECT data FROM records WHERE tbl = 'block' AND alive = 1 AND json_extract(data, '$.type') IN ('meeting_notes', 'transcription')`).all() as { data: string }[];
  const policies = new Map<string, number | null>();
  for (const r of rows) {
    const b = JSON.parse(r.data) as BlockRecord;
    if (!policies.has(b.space_id)) {
      const space = getRecord<SpaceRecord>('space', b.space_id);
      const days = Number(spaceSetting(space, 'meeting_transcript_deletion', 'never'));
      policies.set(b.space_id, space?.plan_type === 'enterprise' && Number.isFinite(days) && days > 0 ? days : null);
    }
    const days = policies.get(b.space_id);
    if (!days) continue;
    const st = stateOf(b);
    if (st.transcript_deleted || st.state === 'transcribing' || st.state === 'paused') continue;
    const ended = st.stopped_time ?? b.created_time;
    if (now - ended < days * 86_400_000) continue;
    if (!transcriptRuns(b).length) continue;
    const actor = actorFor(b);
    if (!actor) continue;
    try {
      deleteTranscript(b.id, actor, 'policy');
      n++;
    } catch (e) {
      console.error('[meetings] retention failed for', b.id, e);
    }
  }
  return n;
}

registerJobHandler('meeting-retention', () => {
  runTranscriptRetention();
  scheduleJob('meeting-retention', 'meeting-retention', Date.now() + 86_400_000);
});
if (!getJob('meeting-retention')) scheduleJob('meeting-retention', 'meeting-retention', Date.now() + 5 * 60_000);
