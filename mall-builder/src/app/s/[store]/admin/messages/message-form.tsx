"use client";

// M2-12a 메시지 쓰기 — 「미리보기」로 실제 받는 인원·문구를 확인한 뒤 「보내기」. 보내기는 미리보기 뒤에만 켜진다
import { useActionState, useState } from "react";
import { composeSms, MESSAGE_LIMIT, smsBytes, smsType } from "@/lib/messages";
import type { SendState } from "./actions";

type Target = { kind: "customer"; customerId: string } | { kind: "order"; orderId: string } | { kind: "filter"; filter: string };

export default function MessageForm({
  action,
  target,
  storeName,
  optout,
  adBlocked = "",
}: {
  action: (prev: SendState, form: FormData) => Promise<SendState>;
  target: Target;
  storeName: string;
  optout: string;
  /** 비어 있지 않으면 광고·홍보 선택을 막고 이 이유를 보여 줌(미동의 유저 한 명·주문 화면). 실제 거르기는 DB가 그대로 함 */
  adBlocked?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [channel, setChannel] = useState<"sms" | "email">("sms");
  const [isAd, setIsAd] = useState(false);
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState("");
  const [previewKey, setPreviewKey] = useState(""); // 미리보기한 입력과 지금 입력이 같을 때만 보내기
  const ad = !adBlocked && isAd; // 막힌 화면에서는 늘 일반 메시지
  const key = `${channel}|${ad}|${subject}|${body}`;
  const full = channel === "sms" ? composeSms(storeName, body, ad, optout) : body;
  const canSend = Boolean(state.preview) && previewKey === key && !pending;

  return (
    <form action={formAction} className="space-y-3" data-message-form>
      {target.kind === "customer" && <input type="hidden" name="customer_id" value={target.customerId} />}
      {target.kind === "order" && <input type="hidden" name="order_id" value={target.orderId} />}
      {target.kind === "filter" && <input type="hidden" name="filter" value={target.filter} />}
      <input type="hidden" name="target" value={target.kind} />

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-1">
          <input type="radio" name="channel" value="sms" checked={channel === "sms"} onChange={() => setChannel("sms")} /> 문자
        </label>
        <label className="flex items-center gap-1">
          <input type="radio" name="channel" value="email" checked={channel === "email"} onChange={() => setChannel("email")} /> 메일
        </label>
        <label className={`flex items-center gap-1 ${adBlocked ? "text-gray-400" : ""}`} data-ad-toggle>
          <input
            type="checkbox"
            name="is_ad"
            value="1"
            checked={ad}
            disabled={Boolean(adBlocked)}
            aria-describedby={adBlocked ? "ad-blocked-reason" : undefined}
            onChange={(e) => setIsAd(e.target.checked)}
          />{" "}
          광고·홍보 메시지
        </label>
      </div>
      {adBlocked && (
        <p id="ad-blocked-reason" className="rounded bg-gray-100 px-3 py-2 text-xs text-gray-700" data-ad-blocked>
          {adBlocked}
        </p>
      )}
      {ad && (
        <p className="rounded bg-amber-50 px-3 py-2 text-xs text-amber-900">
          광고는 <b>수신 동의한 유저에게만</b> 가고, 앞에 「(광고)」·끝에 수신 거부 안내가 붙습니다. 밤 9시~아침 8시에는 보낼 수 없습니다.
        </p>
      )}

      {channel === "email" && (
        <label className="block text-sm">
          <span className="text-xs text-gray-500">메일 제목</span>
          <input name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={100} required className="mt-1 w-full rounded border px-2 py-1.5" />
        </label>
      )}
      <label className="block text-sm">
        <span className="text-xs text-gray-500">내용</span>
        <textarea
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={MESSAGE_LIMIT[channel]}
          rows={6}
          required
          className="mt-1 w-full rounded border px-2 py-1.5"
          data-message-body
        />
      </label>
      {channel === "sms" && body && (
        <div className="rounded bg-gray-50 px-3 py-2 text-xs text-gray-600" data-sms-meter>
          실제 문자 <b>{smsBytes(full)}바이트 · {smsType(full) === "SMS" ? "단문" : "장문"}</b>
          <pre className="mt-1 whitespace-pre-wrap font-sans text-gray-800">{full}</pre>
        </div>
      )}

      {state.error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700" data-message-error>{state.error}</p>}
      {state.preview && previewKey === key && (
        <div className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900" data-message-preview>
          받는 사람 <b>{state.preview.will_send.toLocaleString("ko-KR")}명</b>
          {state.preview.no_agree > 0 && ` · 수신 미동의 제외 ${state.preview.no_agree}명`}
          {state.preview.no_contact > 0 && ` · 연락처 없음 제외 ${state.preview.no_contact}명`}
          <span className="text-blue-700"> (오늘 보낸 {state.preview.today.toLocaleString("ko-KR")}명 / 하루 {state.preview.limit_day.toLocaleString("ko-KR")}명)</span>
          <p className="mt-1 text-xs text-blue-800" data-message-cost>
            요금: {channel === "sms" ? `문자 ${state.preview.will_send.toLocaleString("ko-KR")}통(${smsType(state.preview.preview_body) === "SMS" ? "단문" : "장문"})` : `메일 ${state.preview.will_send.toLocaleString("ko-KR")}통`}이
            운영사 본인 {channel === "sms" ? "솔라피" : "Resend"} 계정에서 나갑니다. 실제 단가는 그 계정의 요금제·계약에 따르며, 이 화면은 단가를 알 수 없어 정확한 예상 요금을 계산하지 않습니다.
          </p>
        </div>
      )}
      {state.sent && (
        <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-800" data-message-sent>
          {state.sent.will_send.toLocaleString("ko-KR")}명에게 보낼 줄에 넣었습니다. 1분 안에 차례로 나가며 「발송 내역」에서 결과를 볼 수 있습니다.
        </p>
      )}

      <div className="flex gap-2">
        <button name="mode" value="preview" disabled={pending || !body.trim()} onClick={() => setPreviewKey(key)} className="min-h-11 rounded border px-4 py-2 text-sm disabled:opacity-50">
          미리보기(받는 인원 확인)
        </button>
        <button name="mode" value="send" disabled={!canSend} className="min-h-11 rounded bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-40" data-message-send>
          보내기
        </button>
      </div>
      {!canSend && body.trim() && <p className="text-xs text-gray-500">보내기 전에 「미리보기」로 받는 인원을 확인해 주세요. 내용을 바꾸면 다시 확인해야 합니다.</p>}
    </form>
  );
}
