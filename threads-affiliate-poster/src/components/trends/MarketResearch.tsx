"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { fetchMarketResearchAction, type MarketResearchState } from "@/lib/actions/search";
import type { NaverSearchItem } from "@/lib/naver/search";

const COLUMNS: { key: "news" | "blog" | "cafe"; label: string }[] = [
  { key: "news", label: "뉴스" },
  { key: "blog", label: "블로그" },
  { key: "cafe", label: "카페글" },
];

function dateOf(item: NaverSearchItem): string {
  const raw = item.pubDate ?? item.postdate;
  if (!raw) return "";
  if (/^\d{8}$/.test(raw)) return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? raw : d.toLocaleDateString("ko-KR");
}

function ResultColumn({ label, items }: { label: string; items?: NaverSearchItem[] }) {
  return (
    <div className="min-w-0 flex-1 space-y-2">
      <p className="text-xs font-semibold text-neutral-700">{label}</p>
      {!items || items.length === 0 ? (
        <p className="text-xs text-neutral-400">결과가 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="rounded-lg border border-neutral-200 bg-white p-3">
              <a
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="line-clamp-2 text-sm font-medium text-neutral-900 hover:underline"
              >
                {item.title}
              </a>
              <p className="mt-1 line-clamp-2 text-xs text-neutral-500">{item.description}</p>
              <p className="mt-1 text-[11px] text-neutral-400">
                {item.bloggername ?? item.cafename ?? "네이버 뉴스"}
                {dateOf(item) && ` · ${dateOf(item)}`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function MarketResearch() {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<MarketResearchState>({});
  const [isPending, startTransition] = useTransition();

  const handleSearch = () => {
    if (!query.trim()) return;
    setState({});
    startTransition(async () => {
      const result = await fetchMarketResearchAction(query);
      setState(result);
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="mb-1 text-lg font-semibold text-neutral-900">시장 반응 검색</h2>
        <p className="text-xs text-neutral-500">
          상품 키워드로 최신 뉴스·블로그·카페글을 한 번에 훑어보세요. 소비자 반응, 이슈, 경쟁
          콘텐츠를 소싱 전에 파악하는 용도입니다.
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="검색 키워드 (예: 무선 이어폰)"
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearch())}
        />
        <Button type="button" onClick={handleSearch} disabled={isPending}>
          {isPending ? "검색 중..." : "검색"}
        </Button>
      </div>

      {state.error && <p className="text-xs text-red-600">{state.error}</p>}

      {(state.news || state.blog || state.cafe) && (
        <div className="space-y-2">
          <p className="text-[11px] text-neutral-400">
            {state.fromCache ? "캐시된 결과입니다 (최근 12시간 이내 같은 키워드로 조회된 값)" : "방금 새로 조회한 결과입니다"}
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            {COLUMNS.map((col) => (
              <ResultColumn key={col.key} label={col.label} items={state[col.key]} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
