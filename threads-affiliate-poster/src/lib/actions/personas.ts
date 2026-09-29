"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProgramAccess } from "@/lib/access";
import type { SavedPersona } from "@/lib/personaTone";

const MAX_PERSONAS = 20;

function toSavedPersona(row: any): SavedPersona {
  return {
    id: `my-${row.id}`,
    name: row.name,
    toneDescription: row.tone_description,
    sampleWriting: row.sample_writing ?? null,
  };
}

export async function listMyPersonasAction(): Promise<{ personas: SavedPersona[] }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { data } = await (supabase as any)
    .from("tap_personas")
    .select("id, name, tone_description, sample_writing")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  return { personas: ((data ?? []) as any[]).map(toSavedPersona) };
}

export async function saveMyPersonaAction(input: {
  name: string;
  toneDescription: string;
  sampleWriting?: string;
}): Promise<{ persona?: SavedPersona; error?: string }> {
  const user = await requireProgramAccess();
  const name = input.name.trim();
  const toneDescription = input.toneDescription.trim();
  const sampleWriting = input.sampleWriting?.trim() || null;

  if (!name || name.length > 40) return { error: "페르소나 이름은 1~40자로 입력해주세요." };
  if (!toneDescription || toneDescription.length > 500) return { error: "말투·어조 설명은 1~500자로 입력해주세요." };
  if (sampleWriting && sampleWriting.length > 1000) return { error: "예시 문장은 1,000자 이하로 입력해주세요." };

  const supabase = await createClient();
  const { count } = await (supabase as any)
    .from("tap_personas")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if ((count ?? 0) >= MAX_PERSONAS) {
    return { error: `페르소나는 최대 ${MAX_PERSONAS}개까지 저장할 수 있습니다. 쓰지 않는 페르소나를 삭제해주세요.` };
  }

  const { data, error } = await (supabase as any)
    .from("tap_personas")
    .insert({ user_id: user.id, name, tone_description: toneDescription, sample_writing: sampleWriting })
    .select("id, name, tone_description, sample_writing")
    .single();
  if (error || !data) return { error: `페르소나 저장에 실패했습니다: ${error?.message ?? "알 수 없는 오류"}` };

  return { persona: toSavedPersona(data) };
}

export async function deleteMyPersonaAction(personaId: string): Promise<{ error?: string }> {
  const user = await requireProgramAccess();
  const id = personaId.replace(/^my-/, "");
  const supabase = await createClient();
  const { error } = await (supabase as any).from("tap_personas").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: `삭제에 실패했습니다: ${error.message}` };
  return {};
}
