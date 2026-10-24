// Live transcription in the browser: the Web Speech API (SpeechRecognition /
// webkitSpeechRecognition) with continuous interim results. Chrome ends a recognition session after silence or about a
// minute, so the recognizer restarts itself while the meeting is being transcribed. Errors map to the dictation
// Maps not-allowed to the microphone permission message, audio-capture to the unavailable microphone message, and
// other errors to the retry message. Final results go to session.ts.

export type SpeechErrorCode = 'unsupported' | 'permission' | 'no_microphone' | 'network' | 'language' | 'failed';

export interface FinalResult {
  text: string;
  /** ms since the recording started */
  startMs: number;
  endMs: number;
  /** speaker label when the engine separates speakers (not the case for browser engines; test fakes can set it) */
  speaker?: string;
}

interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives?: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
  onstart?: (() => void) | null;
}

function ctor(): (new () => RecognitionLike) | null {
  const w = window as unknown as { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** 이식판(v1.15): 연결된 마이크(입력 장치)가 하나라도 있는지. 알 수 없으면 있다고 본다. */
export async function hasMicrophone(): Promise<boolean> {
  try {
    const list = await navigator.mediaDevices?.enumerateDevices?.();
    return !list || list.some((d) => d.kind === 'audioinput');
  } catch {
    return true;
  }
}

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && !!ctor();
}

export interface RecognizerOptions {
  lang: string;
  /** ms already recorded before this run (resume) */
  baseMs: number;
  onFinal(r: FinalResult): void;
  onInterim(text: string): void;
  onError(code: SpeechErrorCode, detail?: string): void;
}

/** One live recognition for a meeting (start → pause/resume → stop). */
export class LiveRecognizer {
  private rec: RecognitionLike | null = null;
  private active = false;
  private startedAt = 0;
  private baseMs: number;
  private utteranceStart: number | null = null;
  private restarts = 0;
  private opts: RecognizerOptions;

  constructor(opts: RecognizerOptions) {
    this.opts = opts;
    this.baseMs = opts.baseMs;
  }

  /** ms since the recording started (across pauses). */
  elapsed(): number {
    return this.baseMs + (this.active ? performance.now() - this.startedAt : 0);
  }

  start() {
    const C = ctor();
    if (!C) {
      this.opts.onError('unsupported');
      return;
    }
    this.active = true;
    this.startedAt = performance.now();
    this.restarts = 0;
    this.spawn(C);
  }

  private spawn(C: new () => RecognitionLike) {
    const rec = new C();
    rec.lang = this.opts.lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex ?? 0; i < (e.results?.length ?? 0); i++) {
        const res = e.results[i];
        const alt = res?.[0];
        const text = String(alt?.transcript ?? '').trim();
        if (!text) continue;
        if (this.utteranceStart === null) this.utteranceStart = this.elapsed();
        if (res.isFinal) {
          const end = this.elapsed();
          const speaker = typeof res.speaker === 'string' ? res.speaker : typeof alt?.speaker === 'string' ? alt.speaker : undefined;
          this.opts.onFinal({ text, startMs: Math.round(this.utteranceStart ?? end), endMs: Math.round(end), ...(speaker ? { speaker } : {}) });
          this.utteranceStart = null;
        } else interim += `${text} `;
      }
      this.opts.onInterim(interim.trim());
    };
    rec.onerror = (e: any) => {
      const err = String(e?.error ?? 'failed');
      if (err === 'no-speech' || err === 'aborted') return; // silence: onend restarts
      this.active = false;
      // 이식판(v1.15): 마이크가 아예 없어도 크롬은 'not-allowed'를 줄 때가 있다 → 장치가 0개면 「마이크를 찾지 못함」으로 안내
      if (err === 'not-allowed' || err === 'service-not-allowed') void hasMicrophone().then((ok) => this.opts.onError(ok ? 'permission' : 'no_microphone'));
      else if (err === 'audio-capture') this.opts.onError('no_microphone');
      else if (err === 'network') this.opts.onError('network');
      else if (err === 'language-not-supported') this.opts.onError('language');
      else this.opts.onError('failed', err);
    };
    rec.onend = () => {
      if (this.rec !== rec) return;
      this.opts.onInterim('');
      if (!this.active) return;
      // Chrome stops after silence / ~60s: keep listening while the meeting is transcribed
      if (++this.restarts > 500) {
        this.active = false;
        this.opts.onError('failed', 'restart limit');
        return;
      }
      setTimeout(() => {
        if (this.active && this.rec === rec) this.spawn(C);
      }, 150);
    };
    this.rec = rec;
    try {
      rec.start();
    } catch (e) {
      this.active = false;
      this.opts.onError('failed', String((e as Error)?.message ?? e));
    }
  }

  /** Pause / stop: final results still in flight are delivered by the engine before onend. */
  stop(): number {
    const ms = this.elapsed();
    this.baseMs = ms;
    this.active = false;
    const rec = this.rec;
    this.rec = null;
    try {
      rec?.stop();
    } catch {
      /* already stopped */
    }
    this.opts.onInterim('');
    return ms;
  }

  /**
   * 이식판(v1.15): stop and wait until the engine has delivered its last final results (onend), at most `timeoutMs`.
   * Without this the last sentence arrived after meetingStop / meetingPause and the server rejected it (409 → "ended").
   */
  stopAndDrain(timeoutMs = 2000): Promise<number> {
    const rec = this.rec;
    const drained = new Promise<void>((resolve) => {
      if (!rec) return resolve();
      const prev = rec.onend;
      const timer = setTimeout(resolve, timeoutMs);
      rec.onend = () => {
        clearTimeout(timer);
        prev?.();
        resolve();
      };
    });
    const ms = this.stop();
    return drained.then(() => ms);
  }

  get running(): boolean {
    return this.active;
  }
}

/** BCP-47 tags for the Language menu. 이식판(U6): 언어 이름은 한국어로(번역 키가 없어 이 이름이 화면에 그대로 나옴) */
export const LANGUAGES: { key: string; label: string; tag: string }[] = [
  { key: 'auto', label: '자동(한국어)', tag: '' },
  { key: 'arabic', label: '아랍어', tag: 'ar-SA' },
  { key: 'simplified_chinese', label: '중국어(간체)', tag: 'zh-CN' },
  { key: 'traditional_chinese', label: '중국어(번체)', tag: 'zh-TW' },
  { key: 'danish', label: '덴마크어', tag: 'da-DK' },
  { key: 'dutch', label: '네덜란드어', tag: 'nl-NL' },
  { key: 'english', label: '영어', tag: 'en-US' },
  { key: 'finnish', label: '핀란드어', tag: 'fi-FI' },
  { key: 'french', label: '프랑스어', tag: 'fr-FR' },
  { key: 'german', label: '독일어', tag: 'de-DE' },
  { key: 'hebrew', label: '히브리어', tag: 'he-IL' },
  { key: 'indonesian', label: '인도네시아어', tag: 'id-ID' },
  { key: 'italian', label: '이탈리아어', tag: 'it-IT' },
  { key: 'japanese', label: '일본어', tag: 'ja-JP' },
  { key: 'korean', label: '한국어', tag: 'ko-KR' },
  { key: 'norwegian', label: '노르웨이어', tag: 'nb-NO' },
  { key: 'polish', label: '폴란드어', tag: 'pl-PL' },
  { key: 'portuguese', label: '포르투갈어', tag: 'pt-BR' },
  { key: 'russian', label: '러시아어', tag: 'ru-RU' },
  { key: 'spanish', label: '스페인어', tag: 'es-ES' },
  { key: 'swedish', label: '스웨덴어', tag: 'sv-SE' },
  { key: 'thai', label: '태국어', tag: 'th-TH' },
  { key: 'vietnamese', label: '베트남어', tag: 'vi-VN' },
];

export function languageTag(key: string | undefined): string {
  const hit = LANGUAGES.find((l) => l.key === key || l.tag === key);
  if (hit?.tag) return hit.tag;
  // 이식판(U6): 「자동」이면 브라우저 언어 대신 한국어로 받아쓴다(AIMaster 회원 기준). 다른 언어는 회의록 메뉴에서 고른다
  return 'ko-KR';
}
