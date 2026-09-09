import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { BroadcastRecipientsSection } from "@/components/settings/BroadcastRecipientsSection";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * 수신자가 많아지면 설정 페이지 안에 묻혀 있기보다 좌측 메뉴로 따로 빼는 게 낫다는
 * 사용자 피드백으로 분리한 전용 페이지 — crm-google-form의 "접수 내역"/"RCS 프로모션
 * 발송"처럼 연락처 목록 관리 화면을 사이드바 별도 메뉴로 두는 패턴을 그대로 따랐다.
 * 실제 등록/삭제 로직(BroadcastRecipientsSection)은 그대로 재사용하고, 이 페이지는
 * 데이터를 불러와 전달하는 역할만 한다.
 */
export default async function RecipientsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const [{ data: broadcastRecipients }, { data: solapiAccount }] = await Promise.all([
    supabase
      .from("kakao_broadcast_recipients")
      .select("id, phone, label")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("user_solapi_accounts")
      .select("kakao_pf_id, channel_friend_url, alimtalk_template_id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-semibold text-neutral-900">카카오톡 수신자 목록</h1>
      <p className="mb-6 text-sm text-neutral-600">
        여기 등록한 사람들에게 리포트를 함께 발송합니다. 발송 계정은{" "}
        <a href="/settings" className="font-medium text-yellow-700 hover:underline">
          설정 페이지
        </a>
        의 카카오톡 채널(SOLAPI) 연동에서 관리합니다.
      </p>

      <div className="rounded-2xl border-2 border-neutral-300 bg-white p-4 shadow-sm">
        <BroadcastRecipientsSection
          recipients={broadcastRecipients ?? []}
          hasSolapiChannel={Boolean(solapiAccount?.kakao_pf_id)}
          channelFriendUrl={solapiAccount?.channel_friend_url ?? null}
          hasAlimtalkTemplate={Boolean(solapiAccount?.alimtalk_template_id)}
        />
      </div>
    </div>
  );
}
