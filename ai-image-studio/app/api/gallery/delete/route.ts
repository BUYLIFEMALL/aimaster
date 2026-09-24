import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const AI_IMAGE_STUDIO_PROGRAM_ID = "26b9f0b2-b48b-4f9d-b751-ecb88e98e95e";

async function processDelete(req: Request) {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const singleId = url.searchParams.get("id");

  let idsToDelete: string[] = [];
  let deleteAll = false;
  let providerFilter: string | null = null;
  let modelFilter: string | null = null;

  if (singleId) {
    idsToDelete = [singleId];
  } else {
    try {
      const body = await req.json();
      if (Array.isArray(body.ids)) {
        idsToDelete = body.ids;
      }
      if (body.deleteAll) {
        deleteAll = true;
      }
      if (body.provider && body.provider !== "all") {
        providerFilter = body.provider;
      }
      if (body.model && body.model !== "all") {
        modelFilter = body.model;
      }
    } catch {
      // Empty or non-JSON body
    }
  }

  const supabaseAdmin = createAdminClient();

  let query = supabaseAdmin
    .from("usage_logs")
    .select("id, metadata")
    .eq("user_id", user.id)
    .eq("program_id", AI_IMAGE_STUDIO_PROGRAM_ID);

  if (idsToDelete.length > 0) {
    query = query.in("id", idsToDelete);
  } else if (!deleteAll && !providerFilter && !modelFilter) {
    return Response.json({ error: "삭제할 대상이 지정되지 않았증니다." }, { status: 400 });
  }

  const { data: targets, error: fetchErr } = await query;
  if (fetchErr) {
    return Response.json({ error: fetchErr.message }, { status: 500 });
  }

  if (!targets || targets.length === 0) {
    return Response.json({ success: true, count: 0 });
  }

  let matchedTargets = targets;
  if (idsToDelete.length === 0) {
    if (providerFilter) {
      matchedTargets = matchedTargets.filter(
        (t) => (t.metadata?.provider || "").toLowerCase() === providerFilter!.toLowerCase()
      );
    }
    if (modelFilter) {
      matchedTargets = matchedTargets.filter(
        (t) => (t.metadata?.model || "").toLowerCase() === modelFilter!.toLowerCase()
      );
    }
  }

  if (matchedTargets.length === 0) {
    return Response.json({ success: true, count: 0 });
  }

  const matchedIds = matchedTargets.map((t) => t.id);

  // Remove storage files in batch
  const filesToDelete = matchedTargets
    .map((t) => t.metadata?.image_url)
    .filter((url): url is string => Boolean(url && url.includes("/ai-image-generations/")))
    .map((url) => url.split("/ai-image-generations/").pop())
    .filter((fn): fn is string => Boolean(fn));

  if (filesToDelete.length > 0) {
    await supabaseAdmin.storage.from("ai-image-generations").remove(filesToDelete);
  }

  // Remove DB records
  const { error: deleteErr } = await supabaseAdmin
    .from("usage_logs")
    .delete()
    .in("id", matchedIds);

  if (deleteErr) {
    return Response.json({ error: deleteErr.message }, { status: 500 });
  }

  return Response.json({ success: true, count: matchedIds.length });
}

export async function DELETE(req: Request) {
  return processDelete(req);
}

export async function POST(req: Request) {
  return processDelete(req);
}
