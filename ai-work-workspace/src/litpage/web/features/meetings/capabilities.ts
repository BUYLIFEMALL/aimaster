// What this server can do for AI Meeting Notes (api/modules/meetings.ts meetingStatus): uploaded audio is transcribed
// by a speech-to-text provider, and none ships with the clone (apps/server/src/meetings/audio.ts registers them). The
// "Upload audio" entry points show disabled with the reason instead of ending every upload in "This recording
// couldn't be transcribed."
import { useEffect, useState } from 'react';
import { api } from '../../lib/api.ts';
import { transactions } from '../../lib/store/transactions.ts';
import { savePref } from '../settings/userSettings.ts';
import { t } from '../shell/i18n.ts';

const cache = new Map<string, Promise<string | null>>();

/** The speech-to-text provider's label for a workspace's meeting notes, or null when there is none. */
export function sttProviderOf(spaceId: string | undefined): Promise<string | null> {
  if (!spaceId) return Promise.resolve(null);
  let p = cache.get(spaceId);
  if (!p) {
    p = api<{ sttProvider?: string | null }>('meetingStatus', { spaceId }).then((r) => r?.sttProvider ?? null).catch(() => null);
    cache.set(spaceId, p);
  }
  return p;
}

/** undefined while loading, then the provider label or null. */
export function useSttProvider(spaceId: string | undefined): string | null | undefined {
  const [v, setV] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    void sttProviderOf(spaceId).then((x) => { if (live) setV(x); });
    return () => { live = false; };
  }, [spaceId]);
  return v;
}

export const noSttReason = () => t('lp.meetings.uploaded_audio_can_t_be_transcribed', 'Uploaded audio can’t be transcribed here: no speech-to-text service is set up on this server.');

// 2026-11-06: 음성 파일 받아쓰기 엔진 선택(플랜 docs/PLAN_20261106_STT_ENGINE_CHOICE.md)
export type SttEngineChoice = 'auto' | 'openai';
export interface SttChoiceStatus {
  /** 회원 키가 있는 엔진 목록 */
  modes: ('gemini' | 'openai')[];
  /** 회원이 고른 값(회원 설정 meeting_stt_engine) */
  engine: SttEngineChoice;
}

/** 설정 메뉴를 열 때마다 새로 묻는다(키·선택이 바뀌었을 수 있어 캐시하지 않음). 실패하면 null → 선택 칸을 숨긴다. */
export function sttEngineChoiceOf(spaceId: string | undefined): Promise<SttChoiceStatus | null> {
  if (!spaceId) return Promise.resolve(null);
  return api<{ sttModes?: ('gemini' | 'openai')[]; sttEngine?: SttEngineChoice }>('meetingStatus', { spaceId })
    .then((r): SttChoiceStatus => ({ modes: r?.sttModes ?? [], engine: r?.sttEngine === 'openai' ? 'openai' : 'auto' }))
    .catch(() => null);
}

/** 회원 설정에 저장하고 서버 반영을 기다린 뒤(다음 파일 올리기가 바로 새 엔진을 쓰도록) 제공자 표시 캐시를 비운다. */
export async function setSttEngine(spaceId: string | undefined, engine: SttEngineChoice) {
  savePref('meeting_stt_engine', engine);
  await transactions.flush();
  if (spaceId) cache.delete(spaceId);
}
