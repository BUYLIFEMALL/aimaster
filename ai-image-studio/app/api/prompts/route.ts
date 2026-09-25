import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// GET: 화풍별 추천 프롬프트 예시 목록 조회
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const styleId = searchParams.get("style_id");

    const supabaseAdmin = createAdminClient();
    let query = supabaseAdmin
      .from("style_preset_prompts")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (styleId) {
      query = query.eq("style_id", styleId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to fetch style_preset_prompts:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ prompts: data || [] });
  } catch (err: any) {
    console.error("GET /api/prompts error:", err);
    return Response.json({ error: err.message || "Failed to load prompts" }, { status: 500 });
  }
}

// POST: 새 화풍 프롬프트 등록
export async function POST(req: Request) {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { style_id, label, prompt, display_order = 0 } = await req.json();

    if (!style_id || !label || !prompt) {
      return Response.json({ error: "필수 파라미터(style_id, label, prompt)가 누락되었습니다." }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from("style_preset_prompts")
      .insert({
        style_id,
        label,
        prompt,
        display_order: Number(display_order) || 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to insert style_preset_prompt:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ prompt: data });
  } catch (err: any) {
    console.error("POST /api/prompts error:", err);
    return Response.json({ error: err.message || "Failed to create prompt" }, { status: 500 });
  }
}

// PUT: 기존 화풍 프롬프트 수정
export async function PUT(req: Request) {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id, style_id, label, prompt, display_order } = await req.json();

    if (!id || !style_id || !label || !prompt) {
      return Response.json({ error: "필수 파라미터(id, style_id, label, prompt)가 누락되었습니다." }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from("style_preset_prompts")
      .update({
        style_id,
        label,
        prompt,
        display_order: Number(display_order) || 0,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update style_preset_prompt:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ prompt: data });
  } catch (err: any) {
    console.error("PUT /api/prompts error:", err);
    return Response.json({ error: err.message || "Failed to update prompt" }, { status: 500 });
  }
}

// DELETE: 화풍 프롬프트 삭제
export async function DELETE(req: Request) {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json({ error: "삭제할 프롬프트 ID가 필요합니다." }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin
      .from("style_preset_prompts")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Failed to delete style_preset_prompt:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/prompts error:", err);
    return Response.json({ error: err.message || "Failed to delete prompt" }, { status: 500 });
  }
}
