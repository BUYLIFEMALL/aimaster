"use client";

import { useState } from "react";
import { Download, Loader2, Sparkles, Copy, Check, ExternalLink, MessageSquareText, Hash } from "lucide-react";
import { renderCardToBlob } from "@/lib/cardnews/renderClient";
import { buildZip } from "@/lib/cardnews/zip";
import { CardCanvas } from "@/components/cardnews/studio/CardCanvas";
import { useStudio } from "@/components/cardnews/studio/ProjectProvider";
import { BTN_GHOST, BTN_PRIMARY, Card, ErrorNote, NeedPlan, StepHeader } from "@/components/cardnews/studio/ui";
import { InstagramPublishPanel } from "@/components/cardnews/studio/InstagramPublishPanel";

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function safeName(title: string): string {
  return title.replace(/[\\/:*?"<>|]+/g, "_").trim().slice(0, 40) || "cardnews";
}

export default function ExportPage() {
  const { project, update } = useStudio();
  const { plan, style, pages, title, engine, caption } = project;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 인스타그램 캡션 생성 상태
  const [captionBusy, setCaptionBusy] = useState(false);
  const [captionError, setCaptionError] = useState<string | null>(null);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedHashtags, setCopiedHashtags] = useState(false);

  if (!plan.topic.trim() || pages.length === 0) return <NeedPlan>먼저 1단계 기획과 2단계 문구를 마쳐주세요.</NeedPlan>;

  const noBg = pages.filter((p) => !p.imageUrl).length;
  const fileName = (i: number) => `${safeName(title)}-${String(i + 1).padStart(2, "0")}.png`;

  const downloadOne = async (i: number) => {
    setBusy(pages[i].id);
    setError(null);
    try {
      saveBlob(await renderCardToBlob(pages[i], style, plan.ratio, pages[i].imageUrl), fileName(i));
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장하지 못했습니다.");
    } finally {
      setBusy(null);
    }
  };

  const downloadAll = async () => {
    setBusy("all");
    setError(null);
    try {
      for (let i = 0; i < pages.length; i++) {
        saveBlob(await renderCardToBlob(pages[i], style, plan.ratio, pages[i].imageUrl), fileName(i));
        await new Promise((r) => setTimeout(r, 400));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장하지 못했습니다.");
    } finally {
      setBusy(null);
    }
  };

  const downloadZip = async () => {
    setBusy("zip");
    setError(null);
    try {
      const entries = [];
      for (let i = 0; i < pages.length; i++) {
        entries.push({ name: fileName(i), blob: await renderCardToBlob(pages[i], style, plan.ratio, pages[i].imageUrl) });
      }
      saveBlob(await buildZip(entries), `${safeName(title)}.zip`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장하지 못했습니다.");
    } finally {
      setBusy(null);
    }
  };

  // 인스타그램 캡션 및 해시태그 AI 생성 핸들러
  const handleGenerateCaption = async () => {
    setCaptionBusy(true);
    setCaptionError(null);
    try {
      const res = await fetch("/api/cardnews/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          engine,
          pages: pages.map((p) => ({ headline: p.headline, sub: p.sub })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "인스타그램 캡션 생성에 실패했습니다.");
      if (data.caption) {
        update((p) => ({ ...p, caption: data.caption }));
      }
    } catch (e) {
      setCaptionError(e instanceof Error ? e.message : "캡션을 생성하지 못했습니다.");
    } finally {
      setCaptionBusy(false);
    }
  };

  // 캡션 전체 복사
  const handleCopyFullCaption = () => {
    if (!caption?.fullCaption) return;
    navigator.clipboard.writeText(caption.fullCaption);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  // 해시태그만 복사
  const handleCopyHashtags = () => {
    if (!caption?.hashtags?.length) return;
    navigator.clipboard.writeText(caption.hashtags.join(" "));
    setCopiedHashtags(true);
    setTimeout(() => setCopiedHashtags(false), 2000);
  };

  return (
    <div className="space-y-6">
      <StepHeader
        step={5}
        title="내보내기 & 인스타 발행 준비"
        desc="완성된 카드를 고화질 PNG 파일로 저장하고, 인스타그램 업로드용 피드 캡션과 해시태그를 원클릭으로 준비합니다."
      />

      {/* 1. 이미지 다운로드 바 */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <h3 className="text-xs font-bold text-gray-800">카드뉴스 이미지 파일 다운로드</h3>
          <span className="text-[11px] text-gray-400 font-medium">규격: {plan.ratio === "4:5" ? "세로 피드 (1080×1350)" : "정방형 (1080×1080)"}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled={busy !== null} onClick={() => void downloadAll()} className={BTN_PRIMARY}>
            {busy === "all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} 전체 {pages.length}장 PNG 받기
          </button>
          <button type="button" disabled={busy !== null} onClick={() => void downloadZip()} className={BTN_GHOST}>
            {busy === "zip" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} 전체 ZIP 한 번에 받기
          </button>
          <span className="text-xs text-gray-500">ZIP은 압축 파일 1개로 저장됩니다. 개별 PNG는 브라우저 다운로드 권한을 허용해주세요.</span>
        </div>
        {noBg > 0 && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">배경이 없는 {noBg}장은 색 배경으로 저장됩니다. 4단계에서 배경을 만들면 더 좋은 결과가 나옵니다.</p>}
        {error && <ErrorNote message={error} />}
      </Card>

      {/* 2. 인스타그램 피드 캡션 & 해시태그 자동 패키지 (신규 탑재) */}
      <Card className="space-y-4 border-violet-200 bg-linear-to-b from-violet-50/30 to-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-linear-to-tr from-amber-500 via-rose-500 to-purple-600 text-white shadow-2xs">
              <MessageSquareText className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">인스타그램 피드 캡션 & 해시태그 AI 패키지</h3>
              <p className="text-[11px] text-gray-500">카드뉴스 내용에 딱 맞는 후킹 첫 줄, 본문 요약, 참여 유도 문구와 타겟 해시태그 25개를 한 번에 작성합니다.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={captionBusy}
              onClick={() => void handleGenerateCaption()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-violet-700 disabled:opacity-50 transition"
            >
              {captionBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-amber-300" />}
              <span>{caption ? "캡션 다시 생성" : "✨ 인스타 캡션 & 해시태그 AI 생성"}</span>
            </button>
            <a
              href="https://www.instagram.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
            >
              <span>인스타그램 열기</span>
              <ExternalLink className="h-3 w-3 text-gray-400" />
            </a>
          </div>
        </div>

        {captionError && <ErrorNote message={captionError} />}

        {caption ? (
          <div className="space-y-3 pt-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                <span className="rounded-md bg-purple-100 px-2 py-0.5 text-purple-700 font-extrabold text-[11px]">AI 캡션 완성</span>
                <span>인스타에 바로 붙여넣을 수 있는 완성본입니다.</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyHashtags}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
                >
                  {copiedHashtags ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Hash className="h-3.5 w-3.5 text-gray-400" />}
                  <span>{copiedHashtags ? "해시태그 복사됨!" : "해시태그만 복사"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyFullCaption}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1 text-xs font-bold text-white hover:bg-gray-800 transition"
                >
                  {copiedCaption ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedCaption ? "전체 캡션 복사 완료!" : "전체 캡션 원클릭 복사"}</span>
                </button>
              </div>
            </div>

            {/* 캡션 본문 프리뷰 에디터/박스 */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-xs text-gray-800 leading-relaxed font-sans shadow-2xs whitespace-pre-wrap">
              {caption.fullCaption}
            </div>

            {/* 해시태그 칩 목록 */}
            {caption.hashtags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {caption.hashtags.map((tag, idx) => (
                  <span key={idx} className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="py-4 text-center text-xs text-gray-400">
            상단의 <strong className="text-violet-600">[✨ 인스타 캡션 & 해시태그 AI 생성]</strong> 버튼을 누르면 인스타 피드 게시용 본문과 해시태그가 자동 작성됩니다.
          </div>
        )}
      </Card>

      {/* 2-1. 인스타그램에 바로 올리기(v1.18) */}
      <InstagramPublishPanel />

      {/* 3. 개별 카드 갤러리 */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {pages.map((p, i) => (
          <Card key={p.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-700">
                {i + 1} / {pages.length} {i === 0 ? "(표지)" : i === pages.length - 1 ? "(마무리)" : ""}
              </span>
              <button type="button" disabled={busy !== null} onClick={() => void downloadOne(i)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                {busy === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} PNG
              </button>
            </div>
            <CardCanvas page={p} style={style} ratio={plan.ratio} />
          </Card>
        ))}
      </div>
    </div>
  );
}
