import Link from "next/link";
import { getStaffStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";
import { BULK_DAY_MAX, BULK_ONCE_MAX, EXTRA_KINDS, OPTOUT_MAX, PLACEHOLDERS, TEMPLATE_KINDS, fillPlaceholders, unknownPlaceholders } from "@/lib/messages";
import { AdminShell, NoPermission } from "../../admin-shell";
import { saveMessageSettingsAction, saveTemplateAction } from "../actions";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const EXTRA_LABEL: Record<string, string> = { customer_cancelled: "주문 취소 → 유저", customer_returned: "반품 승인 → 유저", customer_refunded: "환불 완료 → 유저" };
const OK: Record<string, string> = { settings: "설정을 저장했습니다.", template: "문구를 저장했습니다.", template_reset: "기본 문구로 되돌렸습니다." };

// M2-12a 메시지 설정(대표만 저장) — 발송 상한·광고 수신 거부 안내·새 알림 켜기·자동 알림 문구 편집
export default async function MessageSettingsPage({ params, searchParams }: { params: Promise<{ store: string }>; searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { store: slug } = await params;
  const { error, ok } = await searchParams;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/messages/settings`);
  if (!staff) return <NoPermission />;
  const supabase = await createClient();
  const [{ data: ns }, { data: tpl }] = await Promise.all([
    supabase.from("mall_builder_store_notify_settings").select("bulk_once, bulk_day, optout_text, extra_kinds, extra_email_kinds").eq("store_id", store.id).maybeSingle(),
    supabase.from("mall_builder_notify_templates").select("kind, channel, subject, body").eq("store_id", store.id),
  ]);
  const saved = new Map((tpl ?? []).map((t) => [`${t.kind}|${t.channel}`, t as { subject: string; body: string }]));
  const kinds = new Set((ns?.extra_kinds ?? []) as string[]);
  const emailKinds = new Set((ns?.extra_email_kinds ?? []) as string[]);

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/messages/settings">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-bold">메시지 설정</h1>
        <Link href={`/s/${store.slug}/admin/messages`} className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50">메시지 보내기</Link>
      </div>
      {error && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {ok && OK[ok] && <p className="mt-3 rounded bg-green-50 px-3 py-2 text-sm text-green-800">{OK[ok]}</p>}

      <form action={saveMessageSettingsAction.bind(null, store.slug)} className="mt-4 space-y-3 rounded-lg border p-4 text-sm" data-message-settings>
        <h2 className="font-semibold">발송 상한·광고 안내</h2>
        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col">
            <span className="text-xs text-gray-500">한 번에 보낼 수 있는 인원(최대 {BULK_ONCE_MAX.toLocaleString("ko-KR")})</span>
            <input type="number" name="bulk_once" min={1} max={BULK_ONCE_MAX} defaultValue={ns?.bulk_once ?? BULK_ONCE_MAX} className="w-36 rounded border px-2 py-1.5" />
          </label>
          <label className="flex flex-col">
            <span className="text-xs text-gray-500">하루에 보낼 수 있는 인원(최대 {BULK_DAY_MAX.toLocaleString("ko-KR")})</span>
            <input type="number" name="bulk_day" min={1} max={BULK_DAY_MAX} defaultValue={ns?.bulk_day ?? BULK_DAY_MAX} className="w-36 rounded border px-2 py-1.5" />
          </label>
        </div>
        <label className="block">
          <span className="text-xs text-gray-500">광고 수신 거부 안내(광고 문자·메일 끝에 붙음, {OPTOUT_MAX}자까지) — 예: 무료수신거부 080-123-4567</span>
          <input name="optout" maxLength={OPTOUT_MAX} defaultValue={ns?.optout_text ?? ""} className="mt-1 w-full rounded border px-2 py-1.5" />
        </label>
        <fieldset>
          <legend className="text-xs text-gray-500">새 자동 알림 켜기(문자 / 메일)</legend>
          <ul className="mt-1 space-y-1">
            {EXTRA_KINDS.map((k) => (
              <li key={k} className="flex flex-wrap items-center gap-3">
                <span className="w-36">{EXTRA_LABEL[k]}</span>
                <label className="flex items-center gap-1"><input type="checkbox" name="kinds" value={k} defaultChecked={kinds.has(k)} /> 문자</label>
                <label className="flex items-center gap-1"><input type="checkbox" name="email_kinds" value={k} defaultChecked={emailKinds.has(k)} /> 메일</label>
              </li>
            ))}
          </ul>
        </fieldset>
        <button className="rounded bg-gray-900 px-4 py-2 text-white">저장</button>
        <p className="text-xs text-gray-500">대표만 저장할 수 있습니다. 문자·메일 연결(솔라피·Resend 키)은 쇼핑몰 정보 화면의 「주문 알림」에서 합니다.</p>
      </form>

      <section className="mt-6 rounded-lg border p-4 text-sm" data-template-editor>
        <h2 className="font-semibold">자동 알림 문구</h2>
        <p className="mt-1 text-xs text-gray-500">
          비워 두면 기본 문구가 갑니다. 쓸 수 있는 치환 문자: {PLACEHOLDERS.join(" ")} — 문자에는 앞에 [몰 이름]이 붙지 않으니 필요하면 {"{몰이름}"}을 넣어 주세요.
        </p>
        <div className="mt-3 space-y-4">
          {TEMPLATE_KINDS.flatMap((k) =>
            (["sms", "email"] as const).map((ch) => {
              const cur = saved.get(`${k.key}|${ch}`);
              const bad = cur ? unknownPlaceholders(`${cur.subject} ${cur.body}`) : [];
              return (
                <form key={`${k.key}-${ch}`} id={`t-${k.key}-${ch}`} action={saveTemplateAction.bind(null, store.slug, k.key, ch)} className="rounded border bg-gray-50 p-3" data-template={`${k.key}-${ch}`}>
                  <p className="font-medium">
                    {k.label} · {ch === "sms" ? "문자" : "메일"} {cur ? <span className="ml-1 rounded bg-blue-100 px-1.5 text-xs text-blue-800">고친 문구</span> : <span className="ml-1 text-xs text-gray-400">기본 문구</span>}
                  </p>
                  {ch === "email" && <input name="subject" maxLength={100} defaultValue={cur?.subject ?? ""} placeholder="메일 제목(비우면 기본 제목)" className="mt-2 w-full rounded border bg-white px-2 py-1.5" />}
                  <textarea name="body" maxLength={1000} rows={3} defaultValue={cur?.body ?? ""} placeholder="비우면 기본 문구" className="mt-2 w-full rounded border bg-white px-2 py-1.5" />
                  {cur && <p className="mt-1 whitespace-pre-wrap text-xs text-gray-600">미리보기: {fillPlaceholders(cur.body)}</p>}
                  {bad.length > 0 && <p className="mt-1 text-xs text-amber-700">모르는 치환 문자 {bad.join(" ")} — 그대로 보내집니다.</p>}
                  <button className="mt-2 rounded border bg-white px-3 py-1 text-xs hover:bg-gray-100">저장</button>
                </form>
              );
            }),
          )}
        </div>
      </section>
    </AdminShell>
  );
}
