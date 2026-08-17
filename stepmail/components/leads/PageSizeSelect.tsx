"use client";

import { useRouter } from "next/navigation";
import { PAGE_SIZE_OPTIONS } from "@/lib/leadsPaging";

export function PageSizeSelect({ value, status }: { value: number; status: string }) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(`/leads?status=${status}&page=1&limit=${e.target.value}`);
  }

  return (
    <label className="flex items-center gap-1.5 text-xs text-gray-500">
      한 페이지에
      <select
        value={value}
        onChange={handleChange}
        className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700"
      >
        {PAGE_SIZE_OPTIONS.map((n) => (
          <option key={n} value={n}>
            {n}개씩
          </option>
        ))}
      </select>
      보기
    </label>
  );
}
