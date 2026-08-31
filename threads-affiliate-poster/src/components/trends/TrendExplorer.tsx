"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { fetchTrendAction, type FetchTrendState } from "@/lib/actions/trend";
import type { TrendResultGroup } from "@/lib/naver/trend";

interface CategoryPreset {
  name: string;
  keywords: string[];
}

const CATEGORY_PRESETS: CategoryPreset[] = [
  { name: "생활용품", keywords: ["다회용 수세미", "실리콘 밀폐용기", "논슬립 러그"] },
  { name: "주방용품", keywords: ["에어프라이어", "휴대용 블렌더", "원터치 텀블러"] },
  { name: "뷰티/화장품", keywords: ["선크림", "쿠션팩트", "헤어에센스"] },
  { name: "건강식품", keywords: ["유산균", "콜라겐", "루테인"] },
  { name: "패션잡화", keywords: ["크로스백", "니트가디건", "레인부츠"] },
  { name: "유아동", keywords: ["기저귀", "이유식세트", "유아매트"] },
  { name: "반려동물", keywords: ["강아지사료", "고양이모래", "강아지장난감"] },
  { name: "디지털가전", keywords: ["무선이어폰", "보조배터리", "미니가습기"] },
  { name: "스포츠레저", keywords: ["요가매트", "캠핑의자", "등산스틱"] },
  { name: "홈인테리어", keywords: ["무드등", "디퓨저", "암막커튼"] },
];

const PERIOD_OPTIONS: { value: 1 | 3 | 6; label: string }[] = [
  { value: 1, label: "최근 1개월" },
  { value: 3, label: "최근 3개월" },
  { value: 6, label: "최근 6개월" },
];

const MAX_GROUPS = 5;

interface GroupInput {
  id: string;
  groupName: string;
  keywords: string;
}

function emptyGroup(): GroupInput {
  return { id: crypto.randomUUID(), groupName: "", keywords: "" };
}

/** data(0~100 상대값) 배열을 작은 SVG 꺾은선으로 그린다. 외부 차트 라이브러리 없이 최소 구현. */
function Sparkline({ data }: { data: { period: string; ratio: number }[] }) {
  if (data.length === 0) return null;
  const width = 220;
  const height = 40;
  const points = data
    .map((d, i) => {
      const x = data.length === 1 ? width : (i / (data.length - 1)) * width;
      const y = height - (d.ratio / 100) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="overflow-visible">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth={1.5} className="text-neutral-900" />
    </svg>
  );
}

function TrendCard({ group }: { group: TrendResultGroup }) {
  const last = group.data[group.data.length - 1];
  const first = group.data[0];
  const diff = last && first ? last.ratio - first.ratio : 0;
  const trend = diff > 3 ? "▲ 상승" : diff < -3 ? "▼ 하락" : "─ 보합";
  const trendColor = diff > 3 ? "text-red-600" : diff < -3 ? "text-blue-600" : "text-neutral-500";

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-neutral-900">{group.title}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {group.keywords.map((kw) => (
              <Link
                key={kw}
                href={`/products?keyword=${encodeURIComponent(kw)}`}
                className="rounded-full border border-neutral-200 px-2 py-0.5 text-[11px] text-neutral-600 hover:border-neutral-900 hover:text-neutral-900"
                title={`"${kw}" 키워드로 쿠팡 소싱하기`}
              >
                {kw} →
              </Link>
            ))}
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-neutral-900">{last?.ratio.toFixed(1) ?? "-"}</p>
          <p className={`text-xs font-medium ${trendColor}`}>{trend}</p>
        </div>
      </div>
      <div className="text-neutral-900">
        <Sparkline data={group.data} />
      </div>
      <p className="mt-1 text-[11px] text-neutral-400">
        {first?.period} ~ {last?.period} · 선택 기간 내 최고값을 100으로 놓은 상대 관심도
      </p>
    </div>
  );
}

export function TrendExplorer() {
  const [groups, setGroups] = useState<GroupInput[]>([emptyGroup()]);
  const [period, setPeriod] = useState<1 | 3 | 6>(3);
  const [state, setState] = useState<FetchTrendState>({});
  const [isPending, startTransition] = useTransition();

  const addPreset = (preset: CategoryPreset) => {
    setGroups((prev) => {
      if (prev.length >= MAX_GROUPS) return prev;
      const target = prev.findIndex((g) => !g.groupName && !g.keywords);
      const filled: GroupInput = { id: crypto.randomUUID(), groupName: preset.name, keywords: preset.keywords.join(", ") };
      if (target >= 0) {
        const next = [...prev];
        next[target] = filled;
        return next;
      }
      return [...prev, filled];
    });
  };

  const addEmptyGroup = () => {
    setGroups((prev) => (prev.length >= MAX_GROUPS ? prev : [...prev, emptyGroup()]));
  };

  const removeGroup = (id: string) => {
    setGroups((prev) => (prev.length <= 1 ? prev : prev.filter((g) => g.id !== id)));
  };

  const updateGroup = (id: string, field: "groupName" | "keywords", value: string) => {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, [field]: value } : g)));
  };

  const handleSubmit = () => {
    setState({});
    startTransition(async () => {
      const payload = groups.map((g) => ({
        groupName: g.groupName,
        keywords: g.keywords.split(",").map((k) => k.trim()).filter(Boolean),
      }));
      const result = await fetchTrendAction(payload, period);
      setState(result);
    });
  };

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-xs font-medium text-neutral-700">카테고리 프리셋으로 채우기</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => addPreset(preset)}
              disabled={groups.length >= MAX_GROUPS}
              className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-neutral-700">비교할 키워드 그룹 (최대 {MAX_GROUPS}개)</p>
          <Button type="button" variant="secondary" onClick={addEmptyGroup} disabled={groups.length >= MAX_GROUPS}>
            + 직접 입력
          </Button>
        </div>

        {groups.map((group) => (
          <div key={group.id} className="flex flex-col gap-2 rounded-lg border border-dashed border-neutral-300 p-3 sm:flex-row sm:items-center">
            <Input
              value={group.groupName}
              onChange={(e) => updateGroup(group.id, "groupName", e.target.value)}
              placeholder="그룹명 (예: 주방용품)"
              className="sm:w-40"
            />
            <Input
              value={group.keywords}
              onChange={(e) => updateGroup(group.id, "keywords", e.target.value)}
              placeholder="키워드를 쉼표로 구분 (예: 에어프라이어, 블렌더)"
              className="flex-1"
            />
            <Button type="button" variant="ghost" onClick={() => removeGroup(group.id)} disabled={groups.length <= 1}>
              삭제
            </Button>
          </div>
        ))}
      </section>

      <section className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-medium text-neutral-700">조회 기간</p>
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setPeriod(opt.value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
              period === opt.value
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </section>

      <Button type="button" onClick={handleSubmit} disabled={isPending}>
        {isPending ? "조회 중..." : "트렌드 조회"}
      </Button>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}

      {state.results && state.results.length > 0 && (
        <section className="space-y-2">
          <p className="text-[11px] text-neutral-400">
            {state.fromCache ? "캐시된 결과입니다 (최근 24시간 이내 같은 조건으로 조회된 값)" : "방금 새로 조회한 결과입니다"}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {state.results.map((group) => (
              <TrendCard key={group.title} group={group} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
