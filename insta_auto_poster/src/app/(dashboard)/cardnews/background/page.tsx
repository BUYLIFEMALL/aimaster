"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ImagePlus, Loader2, RefreshCw } from "lucide-react";
import { IMAGE_MODELS } from "@/lib/cardnews/ai/imageModels";
import { CardCanvas } from "@/components/cardnews/studio/CardCanvas";
import { useStudio } from "@/components/cardnews/studio/ProjectProvider";
import { PhotoSearchPanel } from "@/components/cardnews/studio/PhotoSearchPanel";
import { BTN_GHOST, BTN_PRIMARY, Card, ErrorNote, Field, INPUT, NeedPlan, SELECT, StepHeader } from "@/components/cardnews/studio/ui";

type PageState = { loading: boolean; error?: string };

export default function BackgroundPage() {
  const { project, update, keys } = useStudio();
  const { plan, style, pages } = project;
  const [extra, setExtra] = useState("");
  const [state, setState] = useState<Record<string, PageState>>({});
  const [confirmAll, setConfirmAll] = useState(false);
  const [needKey, setNeedKey] = useState(false);
  const runningAll = useRef(false);

  if (!plan.topic.trim() || pages.length === 0) return <NeedPlan>먼저 1단계 기획과 2단계 문구를 마쳐주세요.</NeedPlan>;

  const geminiReady = keys ? keys.gemini : true;
  const anyLoading = Object.values(state).some((s) => s.loading);
  const missing = pages.filter((p) => !p.imageUrl).length;

  const generateOne = async (pageId: string): Promise<boolean> => {
    const index = pages.findIndex((p) => p.id === pageId);
    if (index < 0) return false;
    setState((s) => ({ ...s, [pageId]: { loading: true } }));
    try {
      const res = await fetch("/api/cardnews/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: { category: plan.category, topic: plan.topic, ratio: plan.ratio },
          style,
          imageModel: project.imageModel,
          headline: pages[index].headline,
          pageIndex: index,
          pageCount: pages.length,
          extra,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.needApiKey) setNeedKey(true);
        setState((s) => ({ ...s, [pageId]: { loading: false, error: data.error || "배경을 만들지 못했습니다." } }));
        return false;
      }
      const url = data.url as string;
      update((d) => ({
        ...d,
        pages: d.pages.map((p) => (p.id === pageId ? { ...p, imageUrl: url, imageUrls: [...(p.imageUrls ?? []), url].slice(-6) } : p)),
      }));
      setState((s) => ({ ...s, [pageId]: { loading: false } }));
      return true;
    } catch {
      setState((s) => ({ ...s, [pageId]: { loading: false, error: "네트워크 오류로 배경을 만들지 못했습니다." } }));
      return false;
    }
  };

  // 전체 생성: 아직 배경이 없는 페이지만 2장씩 동시에 만든다. 한 장이 실패해도 나머지는 계속한다.
  const generateAll = async () => {
    setConfirmAll(false);
    if (runningAll.current) return;
    runningAll.current = true;
    setNeedKey(false);
    const queue = pages.filter((p) => !p.imageUrl).map((p) => p.id);
    const worker = async () => {
      for (;;) {
        const id = queue.shift();
        if (!id) return;
        await generateOne(id);
      }
    };
    await Promise.all([worker(), worker()]);
    runningAll.current = false;
  };

  // 무료 사진(v1.63): 고른 사진을 AI 배경과 똑같이 그 장의 배경·만든 이미지 목록에 넣는다.
  const addPhoto = (pageId: string, url: string) =>
    update((d) => ({
      ...d,
      pages: d.pages.map((p) => (p.id === pageId ? { ...p, imageUrl: url, imageUrls: [...(p.imageUrls ?? []), url].slice(-6) } : p)),
    }));

  const selectImage = (pageId: string, url: string) =>
    update((d) => ({ ...d, pages: d.pages.map((p) => (p.id === pageId ? { ...p, imageUrl: url } : p)) }));

  const model = IMAGE_MODELS.find((m) => m.value === project.imageModel) ?? IMAGE_MODELS[0];

  return (
    <div className="space-y-6">
      <StepHeader step={4} title="배경 생성" desc="페이지마다 배경 이미지를 AI로 만들거나 무료 사진(Pixabay·Pexels)에서 고릅니다. 글자는 이미지에 넣지 않고 우리가 위에 얹습니다." />

      <Card className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="이미지 모델(Gemini)">
            <select className={SELECT} value={model.value} onChange={(e) => update((d) => ({ ...d, imageModel: e.target.value }))}>
              {IMAGE_MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="추가 요청(선택)" hint="모든 배경에 함께 반영됩니다. 예: 따뜻한 조명, 책상 위 장면">
            <input className={INPUT} value={extra} maxLength={200} onChange={(e) => setExtra(e.target.value)} />
          </Field>
        </div>

        {!geminiReady && (
          <ErrorNote message="배경 이미지를 만들려면 Gemini API 키가 필요합니다." needKey />
        )}
        {needKey && <ErrorNote message="Gemini API 키를 등록해야 배경을 만들 수 있습니다." needKey />}

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled={anyLoading || !geminiReady || missing === 0} onClick={() => setConfirmAll(true)} className={BTN_PRIMARY}>
            {anyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} 전체 배경 자동 생성
          </button>
          <span className="text-xs text-gray-500">{missing === 0 ? "모든 페이지에 배경이 있습니다. 마음에 안 드는 장만 다시 만들 수 있습니다." : `배경이 없는 ${missing}장을 만듭니다.`}</span>
        </div>

        {confirmAll && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p>
              <b>{missing}장</b>의 배경을 {model.label.split("·")[0].trim()}로 만듭니다. 회원님 본인의 Gemini 계정으로 이미지 생성이 <b>{missing}회</b> 호출되며 요금이 청구될 수 있습니다. 진행할까요?
            </p>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => void generateAll()} className={BTN_PRIMARY}>
                {missing}장 생성 시작
              </button>
              <button type="button" onClick={() => setConfirmAll(false)} className={BTN_GHOST}>
                취소
              </button>
            </div>
          </div>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {pages.map((p, i) => {
          const st = state[p.id];
          return (
            <Card key={p.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-700">
                  {i + 1} / {pages.length}
                </span>
                <button type="button" disabled={st?.loading || !geminiReady || anyLoading} onClick={() => void generateOne(p.id)} className={`${BTN_GHOST} px-3 py-1.5 text-xs`}>
                  {st?.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  {p.imageUrl ? "다시 생성" : "배경 생성"}
                </button>
              </div>
              <div className="relative">
                <CardCanvas page={p} style={style} ratio={plan.ratio} />
                {st?.loading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 text-xs font-bold text-white">
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> 생성 중…
                  </div>
                )}
              </div>
              {st?.error && <ErrorNote message={st.error} />}
              <PhotoSearchPanel defaultQuery={p.headline || plan.topic} ratio={plan.ratio} disabled={st?.loading} onPicked={(url) => addPhoto(p.id, url)} />
              {(p.imageUrls?.length ?? 0) > 1 && (
                <div>
                  <p className="mb-1 text-[11px] text-gray-500">만든 이미지(눌러서 선택)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {p.imageUrls!.map((u) => (
                      <button key={u} type="button" onClick={() => selectImage(p.id, u)} className={`h-12 w-10 overflow-hidden rounded border-2 ${u === p.imageUrl ? "border-violet-600" : "border-transparent"}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={u} alt="" className="h-full w-full object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Link href="/cardnews/export" className={BTN_PRIMARY}>
          다음: 내보내기 →
        </Link>
      </div>
    </div>
  );
}
