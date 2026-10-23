// v1.11 디자인 리뉴얼(사운드 랩 바이올렛 스타일) — 공급자별 색. 모델 카드 띠·곡 카드 파형·미니 플레이어가 같은 색을 쓴다.
import type { ProviderId } from "@/lib/providers/catalog";

export interface ProviderStyle { label: string; dot: string; text: string; bar: string; strip: string }

export const PROVIDER_STYLE: Record<ProviderId, ProviderStyle> = {
  gemini: { label: "Lyria", dot: "bg-sky-400", text: "text-sky-300", bar: "bg-sky-400", strip: "from-sky-400 to-violet-500" },
  elevenlabs: { label: "ElevenLabs", dot: "bg-zinc-200", text: "text-zinc-200", bar: "bg-zinc-300", strip: "from-zinc-300 to-zinc-500" },
  suno: { label: "Suno", dot: "bg-amber-400", text: "text-amber-300", bar: "bg-amber-400", strip: "from-amber-400 to-orange-500" },
  fal: { label: "fal", dot: "bg-fuchsia-400", text: "text-fuchsia-300", bar: "bg-fuchsia-400", strip: "from-fuchsia-400 to-violet-500" },
  replicate: { label: "Replicate", dot: "bg-emerald-400", text: "text-emerald-300", bar: "bg-emerald-400", strip: "from-emerald-400 to-teal-500" },
  mureka: { label: "Mureka", dot: "bg-rose-400", text: "text-rose-300", bar: "bg-rose-400", strip: "from-rose-400 to-pink-500" },
};

export const styleOf = (p: string): ProviderStyle => PROVIDER_STYLE[p as ProviderId] ?? PROVIDER_STYLE.gemini;
