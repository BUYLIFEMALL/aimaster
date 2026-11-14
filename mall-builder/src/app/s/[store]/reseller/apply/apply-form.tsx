"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { APPLY_FILE_TYPES, checkApplyFile, PAYEE_TYPE_LABEL, resellerApplyPath, validateResellerApply } from "@/lib/reseller-apply";
import { applyResellerAction } from "@/lib/reseller-actions";

// M1-4(0071) 리셀러 신청 — 통장 사본(필수)·사업자등록증(사업자만)을 비공개 저장소(<몰>/<내 계정>/reseller-apply-…)로 올린 뒤 신청을 기록한다
export default function ResellerApplyForm({ storeId, userId, defaults }: { storeId: string; userId: string; defaults: { name: string; phone: string } }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [type, setType] = useState<"individual" | "business">("individual");
  const [pending, start] = useTransition();

  function submit(form: HTMLFormElement) {
    const d = new FormData(form);
    const s = (k: string) => String(d.get(k) ?? "");
    const v = validateResellerApply({
      name: s("name"),
      phone: s("phone"),
      channel: s("channel"),
      intro: s("intro"),
      payee_type: s("payee_type"),
      biz_no: s("biz_no"),
      bank_name: s("bank_name"),
      bank_account: s("bank_account"),
      bank_holder: s("bank_holder"),
    });
    if (!v.ok) return setError(v.error);
    const book = d.get("bankbook") as File | null;
    const doc = d.get("doc") as File | null;
    const bookError = checkApplyFile(book, "통장 사본");
    if (bookError) return setError(bookError);
    const needDoc = v.value.payee_type === "business";
    if (needDoc) {
      const docError = checkApplyFile(doc, "사업자등록증");
      if (docError) return setError(docError);
    }
    setError("");
    start(async () => {
      const storage = createClient().storage.from("mall-builder-private");
      const bookPath = resellerApplyPath(storeId, userId, "bankbook", book!.type);
      const up1 = await storage.upload(bookPath, book!, { contentType: book!.type, upsert: false });
      if (up1.error) return setError(`통장 사본 올리기 실패: ${up1.error.message}`);
      let docPath: string | null = null;
      if (needDoc) {
        docPath = resellerApplyPath(storeId, userId, "doc", doc!.type);
        const up2 = await storage.upload(docPath, doc!, { contentType: doc!.type, upsert: false });
        if (up2.error) return setError(`사업자등록증 올리기 실패: ${up2.error.message}`);
      }
      const r = await applyResellerAction(storeId, { ...v.value, bankbook_path: bookPath, doc_path: docPath });
      if (r.error) return setError(r.error);
      router.refresh();
    });
  }

  const field = "mt-1 w-full rounded border px-2 py-2 text-sm";
  const accept = APPLY_FILE_TYPES.join(",");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(e.currentTarget);
      }}
      className="space-y-3 text-sm"
      data-reseller-apply-form
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="font-medium">이름 *</span><input name="name" required maxLength={30} defaultValue={defaults.name} className={field} /></label>
        <label className="block"><span className="font-medium">연락처</span><input name="phone" maxLength={30} defaultValue={defaults.phone} placeholder="010-0000-0000" className={field} /></label>
      </div>
      <label className="block"><span className="font-medium">홍보할 채널 *</span><input name="channel" required maxLength={300} placeholder="예: https://blog.naver.com/내블로그, 인스타 @아이디" className={field} /></label>
      <label className="block"><span className="font-medium">소개(선택)</span><textarea name="intro" rows={3} maxLength={1000} placeholder="어떤 분들께 어떤 상품을 알리실지 적어 주세요." className={field} /></label>

      <fieldset className="rounded border p-3">
        <legend className="px-1 font-medium">정산 방식 *</legend>
        <div className="flex flex-wrap gap-4">
          {(["individual", "business"] as const).map((t) => (
            <label key={t} className="flex items-center gap-1.5">
              <input type="radio" name="payee_type" value={t} checked={type === t} onChange={() => setType(t)} /> {PAYEE_TYPE_LABEL[t]}
            </label>
          ))}
        </div>
        {type === "business" && (
          <label className="mt-2 block"><span className="font-medium">사업자등록번호 *</span><input name="biz_no" placeholder="000-00-00000" className={field} /></label>
        )}
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block"><span className="font-medium">은행 *</span><input name="bank_name" required maxLength={30} className={field} /></label>
        <label className="block"><span className="font-medium">계좌번호 *</span><input name="bank_account" required maxLength={40} className={field} /></label>
        <label className="block"><span className="font-medium">예금주 *</span><input name="bank_holder" required maxLength={30} className={field} /></label>
      </div>
      <label className="block">
        <span className="font-medium">통장 사본 *</span>
        <input name="bankbook" type="file" accept={accept} required className="mt-1 block w-full text-sm" />
      </label>
      {type === "business" && (
        <label className="block">
          <span className="font-medium">사업자등록증 *</span>
          <input name="doc" type="file" accept={accept} className="mt-1 block w-full text-sm" />
        </label>
      )}
      <p className="text-xs text-gray-500">서류는 PDF·JPG·PNG·WEBP, 5MB 이하. 몰 운영자만 볼 수 있게 비공개로 보관합니다.</p>
      {error && <p className="rounded bg-red-50 px-3 py-2 text-red-700" data-apply-error>{error}</p>}
      <button disabled={pending} className="min-h-11 w-full rounded bg-gray-900 px-5 py-2.5 text-white disabled:opacity-60 sm:w-auto">{pending ? "보내는 중…" : "리셀러 신청 보내기"}</button>
    </form>
  );
}
