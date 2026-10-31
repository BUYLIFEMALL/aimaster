"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createQuickProductAction } from "@/lib/actions/quickProduct";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "shop-detail-images";
const MAX_MB = 10;
const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";
const label = "mb-1 block text-xs font-bold text-slate-700";

/** 이미지를 브라우저에서 회원 본인 폴더로 바로 올린다(서버 함수 요청 크기 제한을 피함) */
async function upload(userId: string, file: File): Promise<string> {
  if (!/^image\/(jpeg|png)$/.test(file.type)) throw new Error(`${file.name}: JPG·PNG만 올릴 수 있습니다.`);
  if (file.size > MAX_MB * 1024 * 1024) throw new Error(`${file.name}: ${MAX_MB}MB까지 올릴 수 있습니다.`);
  const path = `${userId}/coupang/${crypto.randomUUID()}.${file.type === "image/png" ? "png" : "jpg"}`;
  const { error } = await createClient().storage.from(BUCKET).upload(path, file, { contentType: file.type });
  if (error) throw new Error(`${file.name}: 올리지 못했습니다.`);
  return path;
}

export function QuickProductForm({ userId }: { userId: string }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [sale, setSale] = useState("");
  const [main, setMain] = useState<File | null>(null);
  const [extras, setExtras] = useState<File[]>([]);
  const [details, setDetails] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [step, setStep] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const money = (v: string) => Number(v.replace(/[,\s원]/g, ""));
  const ready = name.trim() && money(sale) > 0 && main && details.length > 0;

  const submit = () =>
    start(async () => {
      setError("");
      try {
        setStep("이미지를 올리는 중…");
        const mainPath = await upload(userId, main!);
        const extraPaths: string[] = [];
        for (const f of extras) extraPaths.push(await upload(userId, f));
        const detailPaths: string[] = [];
        for (const f of details) detailPaths.push(await upload(userId, f));
        setStep("상품을 만드는 중…");
        const r = await createQuickProductAction({ name, price: money(price), salePrice: money(sale), mainPath, extraPaths, detailPaths });
        if (!r.ok) return setError(r.error);
        router.push(`/products/${r.id}`);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setStep("");
      }
    });

  return (
    <section className="slw-card space-y-3 p-5">
      <label className="block"><span className={label}>상품명(100자까지)</span><input maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className={field} /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className={label}>정가(비우면 판매가와 같음)</span><input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} className={field} /></label>
        <label className="block"><span className={label}>판매가(10원 단위)</span><input inputMode="numeric" value={sale} onChange={(e) => setSale(e.target.value)} className={field} /></label>
      </div>
      <label className="block"><span className={label}>대표 이미지 1장(정사각형, 500px 이상 권장)</span><input type="file" accept="image/jpeg,image/png" onChange={(e) => setMain(e.target.files?.[0] ?? null)} className="block w-full text-sm" /></label>
      <label className="block"><span className={label}>추가 이미지(선택, 9장까지)</span><input type="file" multiple accept="image/jpeg,image/png" onChange={(e) => setExtras([...(e.target.files ?? [])].slice(0, 9))} className="block w-full text-sm" /></label>
      <label className="block"><span className={label}>상세 이미지(위에서 아래 순서대로, 20장까지)</span><input type="file" multiple accept="image/jpeg,image/png" onChange={(e) => setDetails([...(e.target.files ?? [])].slice(0, 20))} className="block w-full text-sm" /></label>
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-900">❌ {error}</p>}
      <button type="button" disabled={pending || !ready} onClick={submit} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50">{pending ? step || "처리 중…" : "다음: 카테고리·옵션 입력"}</button>
      <p className="text-[12px] text-slate-500">아직 쿠팡에 보내지 않습니다. 다음 화면에서 카테고리와 옵션을 넣고 검사한 뒤 저장합니다.</p>
    </section>
  );
}
