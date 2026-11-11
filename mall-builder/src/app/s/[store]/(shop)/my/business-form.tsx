"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { CERT_TYPES, certPath, checkCertFile, validateBusinessApplication } from "@/lib/business";
import { applyBusinessAction } from "./actions";

// 사업자 신청 — 등록증은 비공개 저장소(<몰>/<내 계정>/)로 바로 올린 뒤 신청을 기록한다
export default function BusinessForm({
  slug,
  storeId,
  userId,
  initial,
}: {
  slug: string;
  storeId: string;
  userId: string;
  initial: { business_no: string; company: string; ceo_name: string };
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const input = { business_no: String(data.get("business_no") ?? ""), company: String(data.get("company") ?? ""), ceo_name: String(data.get("ceo_name") ?? "") };
    const file = data.get("cert") as File | null;
    const v = validateBusinessApplication(input);
    const fileError = checkCertFile(file && file.size ? file : null);
    if (!v.ok) return setError(v.error);
    if (fileError) return setError(fileError);
    setError("");
    start(async () => {
      const path = certPath(storeId, userId, file!.type);
      const { error: upError } = await createClient().storage.from("mall-builder-private").upload(path, file!, { contentType: file!.type, upsert: false });
      if (upError) return setError(`사업자등록증 올리기 실패: ${upError.message}`);
      const r = await applyBusinessAction(slug, { ...v.value, cert_path: path });
      if (r.error) return setError(r.error);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(e.currentTarget);
      }}
      className="grid gap-2 sm:grid-cols-3"
      data-business-form
    >
      <label className="block">
        <span className="text-xs text-gray-500">사업자등록번호</span>
        <input name="business_no" defaultValue={initial.business_no} required placeholder="000-00-00000" className="mt-0.5 w-full rounded border px-2 py-1.5 text-sm" />
      </label>
      <label className="block">
        <span className="text-xs text-gray-500">상호</span>
        <input name="company" defaultValue={initial.company} required maxLength={60} className="mt-0.5 w-full rounded border px-2 py-1.5 text-sm" />
      </label>
      <label className="block">
        <span className="text-xs text-gray-500">대표자</span>
        <input name="ceo_name" defaultValue={initial.ceo_name} required maxLength={30} className="mt-0.5 w-full rounded border px-2 py-1.5 text-sm" />
      </label>
      <label className="block sm:col-span-3">
        <span className="text-xs text-gray-500">사업자등록증 (PDF·JPG·PNG·WEBP, 5MB 이하 — 운영자만 볼 수 있습니다)</span>
        <input name="cert" type="file" accept={CERT_TYPES.join(",")} required className="mt-0.5 block w-full text-sm" />
      </label>
      {error && <p className="text-sm text-red-600 sm:col-span-3" data-business-error>{error}</p>}
      <button disabled={pending} className="min-h-10 rounded bg-gray-900 px-4 text-sm text-white disabled:opacity-50 sm:w-40">
        {pending ? "신청하는 중…" : "사업자 승인 신청"}
      </button>
    </form>
  );
}
