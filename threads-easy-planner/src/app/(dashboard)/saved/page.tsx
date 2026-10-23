import { SavedPlansClient } from "@/components/saved/SavedPlansClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const metadata = {
  title: "내 콘텐츠 보관함 | Threads AI 기획기",
  description: "저장해둔 스레드 기획 콘텐츠를 확인하고 에디터로 불러와서 수정하세요.",
};

export default function SavedPlansPage() {
  return (
    <div className="space-y-6">
      <SavedPlansClient />
    </div>
  );
}
