"use server";

// 디자인 빌더 E3 「내 섹션」 서버 액션 — 회원 본인 섹션 목록·저장·삭제(DB 0095, RLS 본인만 읽기 + 보안 함수로만 쓰기)
// 편집기에 넣는 일(번호 새로·다른 몰 출처 바꾸기)은 화면에서 sections.ts prepareInsert로 한다(저장은 평소 저장·게시 단추)

import { createClient } from "@/lib/supabase/server";
import { MAX_SECTIONS, validateSection, type MySection } from "@/lib/builder/sections";

type Fail = { ok: false; error: string };

export async function listMySectionsAction(): Promise<{ ok: true; sections: MySection[] } | Fail> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "로그인이 필요합니다." };
  const { data, error } = await supabase
    .from("mall_builder_sections")
    .select("id, name, blocks, source_store_id, created_at")
    .eq("owner_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(MAX_SECTIONS);
  if (error) return { ok: false, error: "내 섹션을 불러오지 못했습니다." };
  return { ok: true, sections: (data ?? []) as MySection[] };
}

export async function saveMySectionAction(storeId: string, name: unknown, blocks: unknown): Promise<{ ok: true; id: string } | Fail> {
  const v = validateSection(name, blocks);
  if (!v.ok) return v;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mall_builder_section_save", { p_store_id: storeId, p_name: v.value.name, p_blocks: v.value.blocks });
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data as string };
}

export async function deleteMySectionAction(id: string): Promise<{ ok: true } | Fail> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: "지울 섹션을 찾지 못했습니다." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("mall_builder_section_delete", { p_id: id });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
