import { PRESET_PERSONAS } from "@/lib/constants/personas";

export interface SavedPersona {
  id: string; // "my-<uuid>" so it never collides with preset ids ("p-01") or "custom"
  name: string;
  toneDescription: string;
  sampleWriting: string | null;
}

export function describeSavedPersona(p: SavedPersona): string {
  return p.sampleWriting
    ? `${p.toneDescription}\n참고할 문체 예시(내용이 아닌 말투만 참고): ${p.sampleWriting}`
    : p.toneDescription;
}

export function resolvePersonaTone(
  selectedId: string,
  customText: string,
  savedPersonas: SavedPersona[],
  fallback: string,
): string {
  if (selectedId === "custom") return customText.trim() || fallback;
  const saved = savedPersonas.find((p) => p.id === selectedId);
  if (saved) return describeSavedPersona(saved);
  return PRESET_PERSONAS.find((p) => p.id === selectedId)?.toneDescription ?? fallback;
}
