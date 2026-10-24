// P-5(2026-10-24) 영상 만들기 「내 설정」 — 이름 붙여 저장·적용·삭제, 파일로 내보내기·가져오기, 처음 열 때 쓸 설정, 장르 시작 프리셋.
// 저장 위치: 이 브라우저(localStorage, 회원별 칸). 읽기·쓰기 실패(사생활 보호 창 등)는 조용히 넘어간다.
// 로고·스티커처럼 임시 파일 주소(blob:)인 값은 저장하지 않는다. 장르 프리셋 값은 우리 디자인.
import { DEFAULT_SETTINGS } from '@/data/presets';
import type { StudioSettings } from '@/types/playlist';

export interface SavedPreset {
  name: string;
  savedAt: string; // ISO
  settings: Partial<StudioSettings>;
}

const KEY = (userId: string | null | undefined) => `pcs_studio_presets_v1:${userId || 'guest'}`;
const START_KEY = (userId: string | null | undefined) => `pcs_studio_start_v1:${userId || 'guest'}`;
const MAX_SAVED = 30;

/** 저장하지 않는 칸(파일 주소 등) */
const SKIP = new Set<string>(['logoUrl']);
const storable = (k: string, v: unknown) => !SKIP.has(k) && !/url$/i.test(k) && !(typeof v === 'string' && v.startsWith('blob:'));

/** 저장·가져오기 값 정리: 기본 설정에 있는 칸만, 같은 종류(숫자·글자·참거짓)만 받는다 */
export function sanitizeSettings(raw: unknown): Partial<StudioSettings> {
  const out: Record<string, unknown> = {};
  if (!raw || typeof raw !== 'object') return out as Partial<StudioSettings>;
  const src = raw as Record<string, unknown>;
  for (const [k, def] of Object.entries(DEFAULT_SETTINGS)) {
    if (!(k in src) || !storable(k, src[k])) continue;
    const v = src[k];
    if (typeof def === 'number' && typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof def === 'boolean' && typeof v === 'boolean') out[k] = v;
    else if (typeof def === 'string' && typeof v === 'string' && v.length <= 40) out[k] = v;
  }
  return out as Partial<StudioSettings>;
}

/** 지금 설정에서 저장할 칸만 */
export function pickStorable(s: StudioSettings): Partial<StudioSettings> {
  return sanitizeSettings(s);
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function listPresets(userId?: string | null): SavedPreset[] {
  const list = read<SavedPreset[]>(KEY(userId), []);
  return Array.isArray(list) ? list.filter((p) => p && typeof p.name === 'string').map((p) => ({ ...p, settings: sanitizeSettings(p.settings) })) : [];
}

/** 같은 이름이 있으면 덮어쓴다. 저장 성공 여부를 돌려준다 */
export function savePreset(userId: string | null | undefined, name: string, s: StudioSettings): boolean {
  const clean = name.trim().slice(0, 30);
  if (!clean) return false;
  const list = listPresets(userId).filter((p) => p.name !== clean);
  list.unshift({ name: clean, savedAt: new Date().toISOString(), settings: pickStorable(s) });
  return write(KEY(userId), list.slice(0, MAX_SAVED));
}

export function deletePreset(userId: string | null | undefined, name: string): boolean {
  return write(KEY(userId), listPresets(userId).filter((p) => p.name !== name));
}

export function loadStartSettings(userId?: string | null): Partial<StudioSettings> | null {
  const v = read<unknown>(START_KEY(userId), null);
  return v ? sanitizeSettings(v) : null;
}
export function saveStartSettings(userId: string | null | undefined, s: StudioSettings | null): boolean {
  if (!s) {
    try { window.localStorage.removeItem(START_KEY(userId)); return true; } catch { return false; }
  }
  return write(START_KEY(userId), pickStorable(s));
}

/** 파일로 내보내기(브라우저 내려받기) */
export function exportSettingsFile(s: StudioSettings, name = 'my-studio-settings') {
  const blob = new Blob([JSON.stringify({ app: 'playlist-channel-studio', version: 1, settings: pickStorable(s) }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/[\\/:*?"<>|]+/g, '_')}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** 파일 가져오기 — 이 프로그램에서 내보낸 형식 또는 설정 객체 그대로 */
export async function importSettingsFile(file: File): Promise<Partial<StudioSettings> | null> {
  if (file.size > 200_000) return null;
  try {
    const data = JSON.parse(await file.text()) as { settings?: unknown };
    const s = sanitizeSettings(data && typeof data === 'object' && 'settings' in data ? data.settings : data);
    return Object.keys(s).length ? s : null;
  } catch {
    return null;
  }
}

/** 장르 시작 프리셋 — 지금 설정 위에 덮어 쓰는 값만 담는다(우리 값) */
export const GENRE_PRESETS: { id: string; label: string; emoji: string; patch: Partial<StudioSettings> }[] = [
  {
    id: 'lofi', label: '로파이', emoji: '☕',
    patch: { bgAnimated: 'stars', bgAnimPalette: 'night', bgAnimSpeed: 50, visualizerType: 'MINI_BARS', colorPreset: 'NEON_ICE', filterType: 'VINTAGE', filterIntensity: 45, filmGrain: true, filmGrainIntensity: 35, vignette: true, vignetteIntensity: 60, snow: true, rain: false, titleStyle: 'minimal', titlePos: 'bl' },
  },
  {
    id: 'edm', label: 'EDM 파티', emoji: '🎆',
    patch: { bgAnimated: 'grid', bgAnimPalette: 'sunset', bgAnimSpeed: 150, visualizerType: 'SPECTRUM_DUAL', colorPreset: 'VIBRANT', filterType: 'CYBERPUNK', filterIntensity: 50, laserBeams: true, cyberLines: true, snow: false, pulseEnabled: true, pulseIntensity: 35, titleStyle: 'neon', titlePos: 'mc' },
  },
  {
    id: 'ballad', label: '발라드', emoji: '🌙',
    patch: { bgAnimated: 'aurora', bgAnimPalette: 'night', bgAnimSpeed: 60, visualizerType: 'FILLED_WAVE', colorPreset: 'NEON_ICE', filterType: 'DREAMY', filterIntensity: 40, bokeh: true, sparkles: false, lightLeaks: true, lightLeaksIntensity: 35, titleStyle: 'card', titlePos: 'bl' },
  },
  {
    id: 'jazz', label: '재즈 바', emoji: '🎷',
    patch: { bgAnimated: 'orbs', bgAnimPalette: 'sunset', bgAnimSpeed: 50, visualizerType: 'CIRCLE', colorPreset: 'SUNSET', filterType: 'CINEMATIC', filterIntensity: 55, filmGrain: true, filmGrainIntensity: 25, embers: true, musicNotes: true, titleStyle: 'outline', titlePos: 'tl' },
  },
  {
    id: 'citypop', label: '시티팝', emoji: '🌆',
    patch: { bgAnimated: 'gradient', bgAnimPalette: 'sunset', bgAnimSpeed: 80, visualizerType: 'BARS', colorPreset: 'SUNSET', filterType: 'VIVID', filterIntensity: 40, sparkles: true, neonShapes: true, titleStyle: 'tag', titlePos: 'tc' },
  },
  {
    id: 'classic', label: '클래식', emoji: '🎻',
    patch: { bgAnimated: 'gradient', bgAnimPalette: 'mono', bgAnimSpeed: 40, visualizerType: 'LINE', colorPreset: 'DEFAULT', primaryColor: '#e5e7eb', filterType: 'NOIR', filterIntensity: 35, vignette: true, vignetteIntensity: 75, snow: false, titleStyle: 'minimal', titlePos: 'bc' },
  },
];
