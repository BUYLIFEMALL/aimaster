import { Suspense } from "react";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { getRegisteredProviders } from "@/lib/apiKeys";
import { Workspace } from "@/components/studio/Workspace";
import { StudioTabs } from "@/components/studio/StudioTabs";
import "./studio.css";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 정밀 기획 스튜디오(2026-10-21 병합 M1): 옛 「Suno 음악기획 자동화」 화면을 그대로 옮겨 왔다.
// 보관함·내 Style은 서버 표에, 작성 중 초안은 이 브라우저에 저장된다.
export default async function StudioPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const providers = await getRegisteredProviders(supabase, user.id);
  const registered = {
    gemini: providers.has("gemini"),
    openai: providers.has("openai"),
    anthropic: providers.has("anthropic"),
  };
  return (
    <div className="suno-studio">
      <Suspense fallback={null}>
        <StudioTabs />
        <p className="studio-note">
          보관함에 저장한 기획과 내 Style은 계정에 저장되어 다른 기기에서도 보입니다. 보관함 기획은 마지막 수정 후 30일이
          지나면 자동 삭제되니, 오래 둘 기획은 JSON으로 백업해 두세요.
        </p>
        <Workspace key={user.id} userId={user.id} registered={registered} />
      </Suspense>
    </div>
  );
}
