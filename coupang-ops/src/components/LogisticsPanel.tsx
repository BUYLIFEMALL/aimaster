"use client";

import { useState, useTransition } from "react";
import { saveOutboundAction, saveReturnCenterAction } from "@/lib/actions/logistics";
import { COMMON_COURIERS } from "@/lib/coupang/defaults";
import { checkPlace, checkRemote, checkReturnContract, RETURN_COURIERS } from "@/lib/coupang/logisticsWrite";

const field = "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-normal focus:border-blue-500 focus:outline-none";
const label = "text-xs font-bold text-slate-700";
const num = (v: string) => Number(v.replace(/[,\s원]/g, "")) || 0;

/** WING에 가지 않고 출고지·반품지를 만들거나 고친다. 코드를 넣으면 수정, 비우면 새로 만들기 */
export function LogisticsPanel({ keysSaved, defaultCourier }: { keysSaved: boolean; defaultCourier: string }) {
  const [kind, setKind] = useState<"outbound" | "return">("outbound");
  const [code, setCode] = useState("");
  const [place, setPlace] = useState({ name: "", phone: "", zip: "", address: "", addressDetail: "" });
  const [remote, setRemote] = useState({ courier: defaultCourier, jeju: "0", notJeju: "0" });
  const [contract, setContract] = useState({ courier: "CJGLS", contractNumber: "", contractCustomerNumber: "", fee: "" });
  const [ask, setAsk] = useState(false);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const edit = !!code.trim();
  const remoteValue = { courier: remote.courier, jeju: num(remote.jeju), notJeju: num(remote.notJeju) };
  const contractValue = { ...contract, fee: num(contract.fee) };
  const problem = checkPlace(place) || (kind === "outbound" ? (edit ? "" : checkRemote(remoteValue)) : checkReturnContract(contractValue, !edit));

  const send = () =>
    start(async () => {
      const r = kind === "outbound" ? await saveOutboundAction({ code: code.trim() || undefined, place, remote: remoteValue }) : await saveReturnCenterAction({ code: code.trim() || undefined, place, contract: contractValue });
      setAsk(false);
      setNote(r.ok ? `✅ ${r.message}` : `❌ ${r.error}`);
    });
  const set = (p: Partial<typeof place>) => { setAsk(false); setPlace({ ...place, ...p }); };

  return (
    <section className="slw-card space-y-3 p-5">
      <h2 className="text-base font-extrabold text-slate-900">출고지·반품지 만들기·고치기</h2>
      <p className="text-[13px] text-slate-600">WING에 가지 않고 처리합니다. 코드를 비우면 새로 만들고, 코드를 넣으면 그 곳을 고칩니다. 고칠 때는 지금 내용을 모두 다시 넣어 주세요.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className={label}>종류
          <select value={kind} onChange={(e) => { setAsk(false); setKind(e.target.value as "outbound" | "return"); }} className={field}><option value="outbound">출고지</option><option value="return">반품지</option></select>
        </label>
        <label className={label}>고칠 곳의 코드(새로 만들면 비움)<input inputMode="numeric" value={code} onChange={(e) => { setAsk(false); setCode(e.target.value.replace(/\D/g, "")); }} className={field} /></label>
        <label className={label}>이름(50자)<input maxLength={50} value={place.name} onChange={(e) => set({ name: e.target.value })} className={field} /></label>
        <label className={label}>전화번호<input placeholder="02-1234-5678" value={place.phone} onChange={(e) => set({ phone: e.target.value })} className={field} /></label>
        <label className={label}>우편번호<input inputMode="numeric" value={place.zip} onChange={(e) => set({ zip: e.target.value })} className={field} /></label>
        <label className={label}>주소<input maxLength={150} value={place.address} onChange={(e) => set({ address: e.target.value })} className={field} /></label>
        <label className={label}>상세주소<input maxLength={200} value={place.addressDetail} onChange={(e) => set({ addressDetail: e.target.value })} className={field} /></label>
      </div>
      {kind === "outbound" && !edit && (
        <div className="grid gap-3 sm:grid-cols-3">
          <label className={label}>도서산간 택배사
            <select value={remote.courier} onChange={(e) => setRemote({ ...remote, courier: e.target.value })} className={field}>
              <option value="">고르기</option>
              {COMMON_COURIERS.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </label>
          <label className={label}>제주 추가배송비<input inputMode="numeric" value={remote.jeju} onChange={(e) => setRemote({ ...remote, jeju: e.target.value })} className={field} /></label>
          <label className={label}>제주 외 도서산간<input inputMode="numeric" value={remote.notJeju} onChange={(e) => setRemote({ ...remote, notJeju: e.target.value })} className={field} /></label>
        </div>
      )}
      {kind === "outbound" && edit && <p className="text-[12px] text-amber-800">⚠ 도서산간 추가배송비는 쿠팡이 수정에 필요한 번호를 주지 않아 여기서 고칠 수 없습니다. WING에서 고쳐 주세요.</p>}
      {kind === "return" && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className={label}>택배사
              <select value={contract.courier} onChange={(e) => setContract({ ...contract, courier: e.target.value })} className={field}>{RETURN_COURIERS.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select>
            </label>
            <label className={label}>택배사 계약코드<input value={contract.contractNumber} onChange={(e) => setContract({ ...contract, contractNumber: e.target.value })} className={field} /></label>
            {contract.courier === "EPOST" && <label className={label}>우체국 업체코드<input value={contract.contractCustomerNumber} onChange={(e) => setContract({ ...contract, contractCustomerNumber: e.target.value })} className={field} /></label>}
            <label className={label}>계약 요금(원)<input inputMode="numeric" value={contract.fee} onChange={(e) => setContract({ ...contract, fee: e.target.value })} className={field} /></label>
          </div>
          <p className="text-[12px] text-amber-800">⚠ 계약 요금은 고객에게 받는 금액이 아니라 택배사와 계약한 금액입니다. 크게 넣으면 그대로 지불될 수 있습니다. 무게·결제 방식 12칸에 같은 값이 들어가니, 다르면 WING에서 고쳐 주세요. 택배사 계약이 없으면 반품지 없이도 상품을 등록할 수 있습니다.</p>
        </>
      )}
      {!keysSaved && <p className="text-xs text-amber-800">먼저 「API키등록·플랫폼연동」에서 키를 저장해 주세요.</p>}
      {problem ? <p className="text-[12px] text-slate-500">{problem}</p> : !ask ? (
        <button type="button" disabled={!keysSaved || pending} onClick={() => setAsk(true)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50">{edit ? "고치기 확인" : "만들기 확인"}</button>
      ) : (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
          <b>{kind === "outbound" ? "출고지" : "반품지"} 「{place.name}」을 쿠팡에 {edit ? "고칠까요" : "만들까요"}?</b>
          <button type="button" disabled={pending} onClick={send} className="rounded border border-blue-600 bg-blue-700 px-3 py-1 font-bold text-white disabled:opacity-50">{pending ? "보내는 중…" : "네, 쿠팡에 적용"}</button>
          <button type="button" disabled={pending} onClick={() => setAsk(false)} className="rounded border border-slate-300 bg-white px-3 py-1 font-bold text-slate-700">취소</button>
        </div>
      )}
      {note && <p className="text-[13px] text-slate-800">{note}</p>}
    </section>
  );
}
