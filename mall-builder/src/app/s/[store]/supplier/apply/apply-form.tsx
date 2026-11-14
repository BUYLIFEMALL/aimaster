"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { CERT_TYPES, checkCertFile } from "@/lib/business";
import { supplierApplyCertPath, validateSupplierApply } from "@/lib/supplier-apply";
import { applySupplierAction } from "@/lib/supplier-actions";

// M1-0(0070) 공급사 입점 신청 — 사업자등록증은 비공개 저장소(<몰>/<내 계정>/supplier-apply-…)로 바로 올린 뒤 신청을 기록한다
export default function SupplierApplyForm({ storeId, userId }: { storeId: string; userId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function submit(form: HTMLFormElement) {
    const d = new FormData(form);
    const s = (k: string) => String(d.get(k) ?? "");
    const v = validateSupplierApply({ company: s("company"), biz_no: s("biz_no"), ceo_name: s("ceo_name"), contact_name: s("contact_name"), phone: s("phone"), category: s("category"), intro: s("intro") });
    const file = d.get("cert") as File | null;
    const fileError = checkCertFile(file && file.size ? file : null);
    if (!v.ok) return setError(v.error);
    if (fileError) return setError(fileError);
    setError("");
    start(async () => {
      const path = supplierApplyCertPath(storeId, userId, file!.type);
      const { error: upError } = await createClient().storage.from("mall-builder-private").upload(path, file!, { contentType: file!.type, upsert: false });
      if (upError) return setError(`사업자등록증 올리기 실패: ${upError.message}`);
      const r = await applySupplierAction(storeId, { ...v.value, cert_path: path });
      if (r.error) return setError(r.error);
      router.refresh();
    });
  }

  const field = "mt-1 w-full rounded border px-2 py-2 text-sm";
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(e.currentTarget);
      }}
      className="space-y-3 text-sm"
      data-supplier-apply-form
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="font-medium">회사(상호) *</span><input name="company" required maxLength={60} className={field} /></label>
        <label className="block"><span className="font-medium">사업자등록번호 *</span><input name="biz_no" required placeholder="000-00-00000" className={field} /></label>
        <label className="block"><span className="font-medium">대표자</span><input name="ceo_name" maxLength={30} className={field} /></label>
        <label className="block"><span className="font-medium">담당자</span><input name="contact_name" maxLength={30} className={field} /></label>
        <label className="block"><span className="font-medium">연락처</span><input name="phone" maxLength={30} placeholder="010-0000-0000" className={field} /></label>
        <label className="block"><span className="font-medium">주요 상품 분야</span><input name="category" maxLength={60} placeholder="예: 생활용품, 차박용품" className={field} /></label>
      </div>
      <label className="block"><span className="font-medium">회사·상품 소개</span><textarea name="intro" rows={4} maxLength={1000} className={field} /></label>
      <label className="block">
        <span className="font-medium">사업자등록증 *</span>
        <input name="cert" type="file" accept={CERT_TYPES.join(",")} required className="mt-1 block w-full text-sm" />
        <span className="mt-1 block text-xs text-gray-500">PDF·JPG·PNG·WEBP, 5MB 이하. 본사 운영자만 볼 수 있게 비공개로 보관합니다.</span>
      </label>
      {error && <p className="rounded bg-red-50 px-3 py-2 text-red-700" data-apply-error>{error}</p>}
      <button disabled={pending} className="min-h-11 rounded bg-gray-900 px-5 py-2.5 text-white disabled:opacity-60">{pending ? "보내는 중…" : "입점 신청 보내기"}</button>
    </form>
  );
}
