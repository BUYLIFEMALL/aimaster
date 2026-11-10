import { requireProgramAccess } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMemberKey } from "@/lib/memberKeys";
import { listConnections } from "@/lib/connections";
import { WriteForm } from "@/components/draft/WriteForm";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function WritePage() {
  const user = await requireProgramAccess();
  const admin = createAdminClient();
  const [key, conns] = await Promise.all([getMemberKey(admin, user.id, "anthropic"), listConnections(user.id)]);
  return (
    <div className="space-y-6">
      <div>
        <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-extrabold text-blue-700">🛰 탑재물 준비</span>
        <h1 className="mt-2 text-3xl font-black">원고 만들기</h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">주제만 넣어도 구글 검색에 맞춘 제목·요약 설명·주소 이름·소제목·태그까지 만듭니다. 만든 뒤 편집 화면에서 고치고 발행합니다.</p>
      </div>
      <WriteForm hasKey={!!key} connected={{ wordpress: conns.some((c) => c.platform === "wordpress"), blogger: conns.some((c) => c.platform === "blogger") }} />
    </div>
  );
}
