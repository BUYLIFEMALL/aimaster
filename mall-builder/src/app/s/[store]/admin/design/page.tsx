import Link from "next/link";
import { getCategoryRows, getHomeForEdit, getStaffStore, getStoreProducts } from "@/lib/store";
import { getDesignForEdit } from "@/lib/builder/design-store";
import { buildCategoryTree, flattenTree } from "@/lib/categories";
import { readTheme } from "@/lib/theme";
import { readFooter, readHeader, readPopup } from "@/lib/builder/frame";
import { readDetail, readList } from "@/lib/builder/pages";
import { applyTemplate, findColor, findLayout } from "@/lib/builder/templates";
import { designPolicy } from "@/lib/builder/policy";
import { readBusinessInfo } from "@/lib/businessInfo";
import { NoPermission } from "../admin-shell";
import DesignEditor from "./design-editor";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 디자인 빌더 D2 — 끌어 놓는 첫 화면 편집기(Puck). 저장 모양·검사·저장 함수는 기존 첫 화면 편집(F18)과 같다
// 초안 저장은 나만 보이고, 「손님 화면에 게시」를 눌러야 손님에게 보인다
export default async function AdminDesignPage({ params, searchParams }: { params: Promise<{ store: string }>; searchParams: Promise<{ template?: string; color?: string }> }) {
  const { store: slug } = await params;
  const { template, color } = await searchParams;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/design`);
  if (!staff) return <NoPermission />;
  const [home, rows, products, design] = await Promise.all([getHomeForEdit(store.id), getCategoryRows(store.id), getStoreProducts(store.id), getDesignForEdit(store.id)]);
  // 테마: 초안이 있으면 초안, 없으면 게시본, 둘 다 없으면 기본(지금 106 스타일)
  const theme = design.theme;
  const initialTheme = readTheme(theme?.draft ?? theme?.published ?? null);
  // D5 템플릿 미리보기: 주소에 템플릿이 있으면 그 템플릿으로 「저장 없이」 연다(초안 저장·게시해야 반영)
  const tpl = template ? applyTemplate(template, color, { now: Date.now(), storeName: store.name }) : null;
  const tplName = tpl ? `${findLayout(template!)!.name} · ${(color && findColor(color)?.name) || "기본 색"}` : "";
  const policy = designPolicy(store);
  const pick = (k: "header" | "footer" | "popup" | "list" | "detail") => design[k]?.draft ?? design[k]?.published ?? null;
  const initialFrame = { header: readHeader(pick("header")), footer: readFooter(pick("footer")), popup: readPopup(pick("popup")), list: readList(pick("list")), detail: readDetail(pick("detail")) };
  const anyPublished = home.published || theme?.published || design.header?.published || design.footer?.published || design.popup?.published || design.list?.published || design.detail?.published;
  const publishedState = anyPublished
    ? JSON.stringify({ blocks: home.published?.blocks ?? [], theme: readTheme(theme?.published ?? null), header: readHeader(design.header?.published ?? null), footer: readFooter(design.footer?.published ?? null), popup: readPopup(design.popup?.published ?? null), list: readList(design.list?.published ?? null), detail: readDetail(design.detail?.published ?? null) })
    : null;
  // 미리보기 틀용 — 손님 메뉴에 보이는 카테고리(최상위)·사업자 정보
  const topCats = buildCategoryTree(rows, false).map((c) => ({ id: c.id, name: c.name }));
  const categories = flattenTree(buildCategoryTree(rows, true)).map((c) => ({ id: c.id, name: `${"　".repeat(c.depth - 1)}${c.name}${c.is_visible ? "" : " (숨김)"}` }));
  const pickable = products.filter((p) => p.status === "on_sale" || p.status === "sold_out").map((p) => ({ id: p.id, name: p.name }));

  return (
    // 편집 칸이 넓어야 하므로 관리 메뉴 없이 화면 전체를 쓴다(맨 위 줄에 돌아가기)
    <div className="flex h-screen flex-col bg-gray-100 px-3 py-2" data-design-page>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
        <Link href={`/s/${store.slug}/admin`} className="font-semibold text-gray-800 hover:underline">
          ← {store.name} 관리 화면
        </Link>
        <span>왼쪽에서 블록을 끌어 놓고, 가운데에서 블록을 눌러 오른쪽에서 고칩니다. <b>초안 저장</b>은 나만 보이고, <b>손님 화면에 게시</b>를 눌러야 손님에게 보입니다.</span>
        <Link href={`/s/${store.slug}`} target="_blank" className="underline">손님 화면 열기 ↗</Link>
        <Link href={`/s/${store.slug}/admin/design/templates`} className="font-semibold text-violet-700 underline">🎨 템플릿 고르기</Link>
        <Link href={`/s/${store.slug}/admin/home`} className="underline">간단 편집(예전 화면)</Link>
      </div>
      {tpl && (
        <p className="mb-2 rounded bg-violet-50 px-3 py-2 text-xs text-violet-800" data-template-preview>
          템플릿 미리보기 중: <b>{tplName}</b> — 아직 저장되지 않았습니다. 마음에 들면 <b>초안 저장</b>(나만 보임) 또는 <b>손님 화면에 게시</b>를 누르세요. 그대로 나가면 지금 디자인이 유지됩니다.{" "}
          <Link href={`/s/${store.slug}/admin/design`} className="underline">미리보기 취소</Link>
        </p>
      )}
      {policy.notes.map((n) => (
        <p key={n} className="mb-2 rounded bg-amber-50 px-3 py-2 text-xs text-amber-800" data-design-policy>{n}</p>
      ))}
      <DesignEditor
        key={tpl ? `tpl-${template}-${color ?? ""}` : "draft"}
        slug={store.slug}
        storeId={store.id}
        categories={categories}
        products={pickable}
        initial={tpl ? tpl.home : home.draft}
        initialTheme={tpl ? tpl.theme : initialTheme}
        initialFrame={tpl ? { header: tpl.header, footer: tpl.footer, popup: tpl.popup, list: tpl.list, detail: tpl.detail } : initialFrame}
        footerBankLocked={!policy.footerBank}
        previewing={!!tpl}
        storeName={store.name}
        topCategories={topCats}
        businessInfo={readBusinessInfo(store.business_info)}
        publishedState={publishedState}
        draftAt={home.draftAt}
        publishedAt={home.publishedAt}
      />
    </div>
  );
}
