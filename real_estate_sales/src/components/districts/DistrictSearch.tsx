"use client";

import { useState } from "react";
import { DistrictToggle } from "./DistrictToggle";

// 경기·인천까지 지역이 많아져서 이름으로 바로 찾는 칸(2026-10-31). 띄어쓰기는 무시한다(「수원 장안」도 찾음).
const compact = (s: string) => s.replace(/\s+/g, "");

export function DistrictSearch({
  districts,
  activeCodes,
}: {
  districts: { sgg_cd: string; sgg_nm: string; sido: string }[];
  activeCodes: string[];
}) {
  const [query, setQuery] = useState("");
  const q = compact(query);
  const matches = q ? districts.filter((d) => compact(`${d.sido}${d.sgg_nm}`).includes(q)) : [];

  return (
    <div className="mx-card mb-4">
      <label htmlFor="district-search" className="mx-section-title mb-2 block">
        🔎 지역 찾기
      </label>
      <input
        id="district-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="예: 분당, 수원 장안, 인천 연수"
        className="w-full rounded-lg border border-mx-border bg-dark-100 px-3 py-2 text-sm text-mx-text"
      />
      {q && matches.length === 0 && <p className="mt-3 text-sm text-mx-muted">찾는 지역이 없어요. 시·군·구 이름으로 찾아 보세요.</p>}
      {matches.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
          {matches.map((d) => (
            <DistrictToggle
              key={d.sgg_cd}
              sggCd={d.sgg_cd}
              sggNm={`${d.sido} ${d.sgg_nm}`}
              isActive={activeCodes.includes(d.sgg_cd)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
