import Link from "next/link";
import { getStaffStore } from "@/lib/store";
import { NoPermission } from "../../admin-shell";
import { COLOR_PRESETS, INDUSTRIES, INDUSTRY_LABEL, LAYOUTS } from "@/lib/builder/templates";
import TemplateGallery from "./template-gallery";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 디자인 빌더 D5-7 — 템플릿 갤러리. 고르면 디자인 편집기가 그 템플릿으로 「저장 없이」 열린다(내 상품으로 미리보기)
export default async function DesignTemplatesPage({ params }: { params: Promise<{ store: string }> }) {
  const { store: slug } = await params;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/design/templates`);
  if (!staff) return <NoPermission />;
  // 클라이언트로는 그리기에 필요한 값만(빌드 함수는 넘기지 않음)
  const layouts = LAYOUTS.map((l) => ({ id: l.id, name: l.name, description: l.description, industries: l.industries, moods: l.moods, defaultColor: l.defaultColor, shape: l.shape }));
  return (
    <div className="min-h-screen bg-gray-100 px-4 py-4" data-template-page>
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
          <Link href={`/s/${store.slug}/admin/design`} className="font-semibold text-gray-800 hover:underline">
            ← 디자인 편집으로
          </Link>
          <span>템플릿을 고르고 색을 정한 뒤 「내 상품으로 미리보기」를 누르면 편집기에 열립니다. <b>저장하기 전에는 손님 화면이 바뀌지 않습니다.</b></span>
        </div>
        <h1 className="text-xl font-black tracking-tight text-gray-900">🎨 템플릿 고르기</h1>
        <p className="mt-1 text-sm text-gray-600">
          레이아웃 {LAYOUTS.length}종 × 색 {COLOR_PRESETS.length}가지 = {LAYOUTS.length * COLOR_PRESETS.length}가지 모양. 고른 뒤에도 블록·색·메뉴를 마음대로 고칠 수 있습니다.
        </p>
        <TemplateGallery
          slug={store.slug}
          layouts={layouts}
          colors={COLOR_PRESETS}
          industries={INDUSTRIES.map((i) => ({ id: i, label: INDUSTRY_LABEL[i] }))}
        />
      </div>
    </div>
  );
}
