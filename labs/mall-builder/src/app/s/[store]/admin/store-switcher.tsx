"use client";

// D31 관리 화면 「다른 몰로」 — 고르면 그 몰의 같은 관리 화면(대시보드)으로
import { useRouter } from "next/navigation";

export default function StoreSwitcher({ current, stores }: { current: string; stores: { slug: string; name: string }[] }) {
  const router = useRouter();
  return (
    <label className="ml-auto flex items-center gap-1 text-sm text-gray-500" data-store-switcher>
      다른 몰로
      <select value={current} onChange={(e) => router.push(`/s/${e.target.value}/admin`)} className="rounded border px-2 py-1 text-gray-900">
        {stores.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
      </select>
    </label>
  );
}
