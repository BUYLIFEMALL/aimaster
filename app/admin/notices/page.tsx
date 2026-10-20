import { createServiceClient } from "@/lib/supabase/service";
import GoldGradientText from "@/components/ui/GoldGradientText";
import NoticeManager from "@/components/admin/NoticeManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "공지사항 관리" };

export default async function AdminNoticesPage({ searchParams }: { searchParams: Promise<{ program?: string }> }) {
  const { program: presetProgramId } = await searchParams;
  const supabase = createServiceClient();

  const [{ data: notices }, { data: programs }] = await Promise.all([
    supabase
      .from("notices")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false }),
    // 공지의 「관련 프로그램」 선택용(2026-10-20)
    supabase.from("programs").select("id, name, version").order("name"),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          <GoldGradientText>공지사항</GoldGradientText> 관리
        </h1>
        <p className="text-subtext mt-1">
          /support/notice 게시판에 노출되는 공지사항을 추가·수정·삭제하세요
        </p>
      </div>

      <NoticeManager initialNotices={notices ?? []} programs={programs ?? []} presetProgramId={presetProgramId} />
    </div>
  );
}
