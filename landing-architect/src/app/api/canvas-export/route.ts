import { NextResponse, type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { checkProgramAccess } from "@/lib/programAccess";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeStoredPlan } from "@/lib/lpa/plan";
import { planToCanvasDoc, sendableSubPages, subPageToCanvasDoc } from "@/lib/lpa/toCanvas";
import { getUserApiKey } from "@/lib/apiKeys";
import { resolveImages, type StockProvider } from "@/lib/images";

// 「🧩 UI Canvas로 보내 다듬기」(2026-10-21 v1.11): 기획안을 UI Canvas 자동화의 새 프로젝트로 만든다.
// 프로그램끼리 서로 호출하지 않고 공용 DB 표 ui_canvas_projects에 회원 본인 user_id로 한 행만 추가한다(서비스 롤 → user_id 직접 지정).
// UI Canvas 이용 권한과 프로젝트 100개 한도는 UI Canvas와 같은 규칙으로 여기서도 확인한다.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;
const NO_STORE = { "Cache-Control": "private, no-store" };
const UI_CANVAS_URL = "https://ui-canvas.buylife.xyz";
const MAX_CANVAS_PROJECTS = 100;
const PROVIDERS: StockProvider[] = ["unsplash", "pexels", "pixabay"];
const LABEL: Record<StockProvider, string> = { unsplash: "Unsplash", pexels: "Pexels", pixabay: "Pixabay" };

type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export async function POST(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status, headers: NO_STORE });

  const body = (await request.json().catch(() => null)) as { name?: unknown; plan?: unknown; imageProvider?: unknown } | null;
  const plan = sanitizeStoredPlan(body?.plan);
  if (!plan) return NextResponse.json({ error: "보낼 기획안이 없습니다. 먼저 기획안을 만들어 주세요." }, { status: 400, headers: NO_STORE });

  const admin = createAdminClient();
  const canvasAccess = await checkProgramAccess(admin as unknown as SupabaseLike, access.user.id, "ui-canvas");
  if (!canvasAccess.allowed) {
    return NextResponse.json({ error: "UI Canvas 자동화 이용 권한이 없습니다. 메인 사이트에서 이용 권한을 확인해 주세요." }, { status: 403, headers: NO_STORE });
  }
  // v1.12: 메인 페이지 + 내용이 있는 서브 페이지(각각 별도 프로젝트 — UI Canvas는 프로젝트당 캔버스 1장)
  const base = (typeof body?.name === "string" && body.name.trim() ? body.name.trim() : plan.projectInfo.topic).replace(/\s+/g, " ");
  const subs = sendableSubPages(plan);
  const total = 1 + subs.length;

  // 한도를 먼저 확인한다(사진 검색으로 회원 이미지 API 사용량을 쓰기 전에)
  const { count } = await admin.from("ui_canvas_projects").select("id", { count: "exact", head: true }).eq("user_id", access.user.id);
  const room = MAX_CANVAS_PROJECTS - (count ?? 0);
  if (room < total) {
    return NextResponse.json(
      { error: `UI Canvas 프로젝트는 100개까지라 ${total}개(메인 1 + 서브 ${subs.length})를 더 만들 수 없습니다(남은 자리 ${Math.max(0, room)}개). UI Canvas에서 쓰지 않는 프로젝트를 지운 뒤 다시 보내 주세요.` },
      { status: 409, headers: NO_STORE },
    );
  }

  // v1.13: 이미지 소스가 Unsplash·Pexels·Pixabay이고 회원 본인 키가 있으면 키워드에 맞는 실제 사진(프로토타입과 같은 resolveImages).
  // 키가 없거나 오류·한도 초과면 무료 임시 사진으로 그대로 보낸다(보내기 자체는 막지 않음).
  const provider = PROVIDERS.find((p) => p === body?.imageProvider);
  const keywords = [...new Set(plan.imageAssets.map((a) => a.keyword).filter((k) => /^[a-z0-9,_-]{1,60}$/.test(k)))].slice(0, 12);
  let imageUrls: Record<string, string> = {};
  let imageNote = "";
  if (provider && keywords.length) {
    const key = await getUserApiKey(access.user.id, provider);
    if (!key) {
      imageNote = `${LABEL[provider]} 키가 등록되지 않아 이미지는 무료 임시 사진으로 넣었습니다.`;
    } else {
      try {
        const r = await resolveImages(provider, key, keywords);
        imageUrls = r.urls;
        imageNote = `${LABEL[provider]}에서 사진 ${Object.keys(r.urls).length}장을 찾아 넣었습니다.${r.failed.length ? ` ${r.failed.length}장은 찾지 못해 임시 사진으로 넣었습니다.` : ""}`;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        imageNote = msg === "invalid-key" ? `${LABEL[provider]} 키가 올바르지 않아 이미지는 임시 사진으로 넣었습니다.`
          : msg === "rate" ? `${LABEL[provider]} 사용 한도를 넘어 이미지는 임시 사진으로 넣었습니다.`
          : "사진을 가져오지 못해 이미지는 임시 사진으로 넣었습니다.";
      }
    }
  }

  const rows = [
    { name: `${base} (랜딩 기획)`.slice(0, 80), doc: planToCanvasDoc(plan, imageUrls) },
    ...subs.map((p) => ({ name: `${base} (랜딩 기획) 서브: ${p.title}`.slice(0, 80), doc: subPageToCanvasDoc(plan, p) })),
  ];

  const { data, error } = await admin
    .from("ui_canvas_projects")
    .insert(rows.map((r) => ({ user_id: access.user.id, name: r.name, doc: r.doc, component_count: r.doc.components.length })))
    .select("id, name");
  if (error || !data?.length) return NextResponse.json({ error: "UI Canvas 프로젝트를 만들지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500, headers: NO_STORE });
  const main = data.find((d) => d.name === rows[0].name) ?? data[0];
  return NextResponse.json(
    { url: `${UI_CANVAS_URL}/editor/${main.id}`, created: data.length, subPages: data.length - 1, components: rows[0].doc.components.length, imageNote },
    { status: 201, headers: NO_STORE },
  );
}
