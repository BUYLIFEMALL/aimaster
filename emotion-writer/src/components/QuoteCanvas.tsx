"use client";

import { useEffect, useRef, useState } from "react";
import { renderQuote, renderQuoteAt, canvasBlob } from "@/lib/studio/render";
import { CHANNEL_SIZES, channelFileName, channelZipNames, type ChannelSize } from "@/lib/studio/channels";
import { createZip } from "@/lib/studio/zip";
import { useBandGrid } from "./useBandColor";
import { adviseOverlay, bestPosition, fixPlan, POSITIONS, zipOverlayPlan } from "@/lib/studio/readability";
import { ratioSize, type Ratio, type Design } from "@/lib/studio/config";
import { Download, Image as ImageIcon, Loader2, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { instaPostLink, instaRatioOk } from "@/lib/instaHandoff";
import { bananaBackgroundLink } from "@/lib/studio/bananaLink";

export function QuoteCanvas({
  image,
  quote,
  ratio,
  design,
  busy,
}: {
  image: string;
  quote: string;
  ratio: Ratio;
  design: Design;
  busy: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const identity = JSON.stringify([quote, ratio, design]);
  const [result, setResult] = useState({ identity: "", image: "", error: "" });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  // v1.24: 크기마다 배경을 그 비율로 잘라 글자 대비를 따로 계산 — 4.5:1 미만이면 ⚠
  const bandGrid = useBandGrid(image, CHANNEL_SIZES);
  const channelAdvice = (id: string) => {
    const bg = bandGrid?.[`${id}|${design.position}`];
    return bg ? adviseOverlay(bg, design.color, design.overlay) : null;
  };
  // v1.24: 전체 ZIP 전에 대비가 부족한 크기가 있으면 한 번 묻는다(화면 안 안내, 브라우저 확인창 아님)
  const [zipAsk, setZipAsk] = useState(false);
  const zipPlan = zipOverlayPlan(CHANNEL_SIZES.map((c) => channelAdvice(c.id)));
  // v1.24: 「글자 자리 바꿔 받기」 — 대비가 부족한 크기만 대비가 가장 좋은 자리로(지금 어둡기 기준)
  const POS_LABEL: Record<Design["position"], string> = { top: "위", center: "가운데", bottom: "아래" };
  const moves: Record<string, Design["position"]> = {};
  for (const c of CHANNEL_SIZES) {
    const adv = channelAdvice(c.id);
    if (!adv || adv.ok || !bandGrid) continue;
    const bands = Object.fromEntries(POSITIONS.map((p) => [p, bandGrid[`${c.id}|${p}`] ?? null]));
    const best = bestPosition(bands, design.color, design.overlay, design.position);
    if (best) moves[c.id] = best.position;
  }
  const moveCount = Object.keys(moves).length;
  // v1.24: 「자리 옮기고 어둡기도 올리기」 — 대비가 부족한 크기마다 자리 이동 + 그래도 모자라면 그 크기만 어둡기 올림
  type SizeFix = { position?: Design["position"]; overlay?: number };
  const fixes: Record<string, SizeFix> = {};
  for (const c of CHANNEL_SIZES) {
    const adv = channelAdvice(c.id);
    if (!adv || adv.ok || !bandGrid) continue;
    const bands = Object.fromEntries(POSITIONS.map((p) => [p, bandGrid[`${c.id}|${p}`] ?? null]));
    const plan = fixPlan(bands, design.color, design.overlay, design.position);
    if (plan) fixes[c.id] = { position: plan.position !== design.position ? plan.position : undefined, overlay: plan.overlay !== design.overlay ? plan.overlay : undefined };
  }
  const fixCount = Object.keys(fixes).length;
  const fixAddsOverlay = Object.values(fixes).some((f) => f.overlay !== undefined);

  useEffect(() => {
    if (!image || !quote) return;
    let cancelled = false;
    const draft = document.createElement("canvas");
    renderQuote(draft, image, quote, ratio, design)
      .then(() => {
        if (cancelled || !canvas.current) return;
        canvas.current.width = draft.width;
        canvas.current.height = draft.height;
        const ctx = canvas.current.getContext("2d");
        if (!ctx) throw new Error("미리보기 캔버스를 만들지 못했습니다.");
        ctx.drawImage(draft, 0, 0);
        setResult({ identity, image, error: "" });
      })
      .catch((e) => {
        if (!cancelled)
          setResult({
            identity,
            image,
            error:
              e instanceof Error ? e.message : "미리보기를 만들지 못했습니다.",
          });
      });
    return () => {
      cancelled = true;
    };
  }, [image, quote, ratio, design, identity]);

  const ready = Boolean(
    image &&
      quote &&
      result.identity === identity &&
      result.image === image &&
      !result.error,
  );
  const size = ratioSize(ratio);

  async function download(format: "png" | "jpeg") {
    if (!canvas.current || !ready || busy || saving) return;
    setSaving(true);
    setNotice("");
    try {
      const blob = await canvasBlob(canvas.current, format);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `감성글귀-${ratio.replace(":", "x")}-${Date.now()}.${format === "jpeg" ? "jpg" : "png"}`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(
        "이미지 파일을 준비했습니다. 브라우저 다운로드 목록을 확인해 주세요.",
      );
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : "이미지를 저장하지 못했습니다.",
      );
    } finally {
      setSaving(false);
    }
  }

  // v1.18: 같은 글귀·배경·디자인을 다른 채널 크기로 다시 그려 JPG로 받는다(AI 재호출 없음)
  async function downloadChannel(c: ChannelSize) {
    if (!ready || busy || saving) return;
    setSaving(true);
    setNotice("");
    try {
      const draft = document.createElement("canvas");
      await renderQuoteAt(draft, image, quote, { width: c.width, height: c.height }, design);
      const blob = await canvasBlob(draft, "jpeg");
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = channelFileName(c);
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(`${c.label}(${c.width}×${c.height}) 크기로 다시 배치해 저장했습니다.`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "다른 크기로 만들지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  // v1.24: 「다른 크기로 받기」 전체를 ZIP 하나로 — 공용 기준 코드 store-zip 사본(AI 재호출 없음)
  async function downloadAllChannels(overlayOverride?: number, perSize?: Record<string, { position?: Design["position"]; overlay?: number }>) {
    if (!ready || busy || saving) return;
    setZipAsk(false);
    // 「어둡기 올리고 받기」·「글자 자리 바꿔 받기」는 ZIP만 바꿔 그린다(화면 설정은 그대로)
    const zipDesign = overlayOverride !== undefined ? { ...design, overlay: overlayOverride } : design;
    setSaving(true);
    setNotice("");
    try {
      const names = channelZipNames();
      const entries = [];
      for (const [i, c] of CHANNEL_SIZES.entries()) {
        const draft = document.createElement("canvas");
        await renderQuoteAt(draft, image, quote, { width: c.width, height: c.height }, perSize?.[c.id] ? { ...zipDesign, ...Object.fromEntries(Object.entries(perSize[c.id]).filter(([, v]) => v !== undefined)) } : zipDesign);
        const blob = await canvasBlob(draft, "jpeg");
        entries.push({ name: names.files[i], data: new Uint8Array(await blob.arrayBuffer()) });
      }
      const zip = createZip(entries);
      const url = URL.createObjectURL(new Blob([zip as BlobPart], { type: "application/zip" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = names.zip;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      const moved = perSize
        ? CHANNEL_SIZES.filter((c) => perSize[c.id]).map((c) => {
            const f = perSize[c.id];
            return `${c.label}(${[f.position ? `${POS_LABEL[f.position]}로` : "", f.overlay !== undefined ? `어둡기 ${f.overlay}%` : ""].filter(Boolean).join(" · ")})`;
          })
        : [];
      setNotice(
        moved.length
          ? `${entries.length}가지 크기를 ZIP 하나로 저장했습니다. 바꿔 그린 크기: ${moved.join(", ")}(화면 설정은 그대로).`
          : overlayOverride !== undefined
            ? `배경 어둡기 ${overlayOverride}%로 ${entries.length}가지 크기를 ZIP 하나로 저장했습니다(화면 설정은 그대로).`
            : `${entries.length}가지 크기를 ZIP 하나로 저장했습니다.`,
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "ZIP을 만들지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  // v1.17: INSTA 포스팅으로 보내기 — INSTA 「직접 첨부」와 같은 본인 폴더에 JPG로 올린 뒤 새 글 화면을 연다
  async function sendToInsta() {
    if (!canvas.current || !ready || busy || saving || !instaRatioOk(ratio)) return;
    setSaving(true);
    setNotice("");
    const win = window.open("about:blank", "_blank");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다. 다시 로그인해 주세요.");
      const blob = await canvasBlob(canvas.current, "jpeg");
      const path = `${user.id}/${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage.from("insta-post-images").upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (error) throw new Error(`이미지를 올리지 못했습니다: ${error.message}`);
      const url = supabase.storage.from("insta-post-images").getPublicUrl(path).data.publicUrl;
      const target = instaPostLink(url, quote);
      if (win) win.location.href = target; else window.location.href = target;
      setNotice("INSTA 포스팅 새 글 화면을 열었습니다. 내용을 확인하고 저장하거나 게시하세요.");
    } catch (e) {
      win?.close();
      setNotice(e instanceof Error ? e.message : "인스타로 보내지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div
        className="preview-frame"
        style={{
          aspectRatio: ratio.replace(":", "/"),
          maxWidth: Math.min(420, (660 * size.width) / size.height),
        }}
      >
        <canvas
          ref={canvas}
          className={ready ? "quote-canvas" : "quote-canvas invisible"}
          aria-label="완성된 감성 글귀 이미지 미리보기"
        />
        {!ready && (
          <div className="preview-message">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-rose-400 mb-3 shadow-inner">
              {image && quote ? (
                <Loader2 className="h-6 w-6 animate-spin text-rose-400" />
              ) : (
                <ImageIcon className="h-6 w-6 text-slate-400" />
              )}
            </div>
            <strong>
              {result.identity === identity &&
              result.image === image &&
              result.error
                ? result.error
                : image && quote
                  ? "글꼴과 이미지를 합성하고 있습니다…"
                  : "문구와 배경을 선택해 주세요"}
            </strong>
            <p>
              {image && quote
                ? "고해상도 캔버스에 렌더링 중입니다"
                : "선택한 문구를 아름다운 배경 위에 담아드립니다"}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 mt-2">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
          {size.width} × {size.height}px
        </span>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          {ratio} 비율
        </span>
      </div>

      <div className="button-row">
        <button
          className="primary flex items-center justify-center gap-2"
          disabled={!ready || busy || saving}
          onClick={() => download("png")}
        >
          <Download size={16} />
          <span>PNG 저장</span>
        </button>
        <button
          className="flex items-center justify-center gap-2"
          disabled={!ready || busy || saving}
          onClick={() => download("jpeg")}
        >
          <Download size={16} />
          <span>JPG 저장</span>
        </button>
        <button
          className="flex items-center justify-center gap-2"
          disabled={!ready || busy || saving || !instaRatioOk(ratio)}
          onClick={() => void sendToInsta()}
          title={instaRatioOk(ratio) ? "INSTA 포스팅 새 글로 보내기(이미지 + 글귀 캡션)" : "인스타 피드는 1:1 비율만 올릴 수 있어요"}
        >
          <Send size={16} />
          <span>인스타에 올리기</span>
        </button>
      </div>
      {/* v1.24: 이 글귀 분위기의 배경을 바나나 캔버스에서(아이디어 칸만 채움, 자동 생성 없음) */}
      {quote && bananaBackgroundLink(quote) && (
        <p className="text-center text-xs">
          <a href={bananaBackgroundLink(quote)!} target="_blank" rel="noopener noreferrer" data-banana-bg className="font-semibold text-rose-700 underline underline-offset-2">
            🍌 이 글귀 분위기의 배경을 바나나 캔버스에서 만들기
          </a>
        </p>
      )}
      {!instaRatioOk(ratio) && ready && (
        <p className="status-note centered">인스타에 올리려면 비율을 1:1로 바꿔 주세요(인스타 피드는 9:16·3:4 세로 비율을 받지 않습니다).</p>
      )}

      {ready && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold text-slate-400 text-center">📐 다른 크기로 받기 — 같은 글귀를 채널 규격에 맞게 다시 배치(AI 비용 없음)</p>
          {CHANNEL_SIZES.some((c) => { const a = channelAdvice(c.id); return a !== null && !a.ok; }) && (
            <p className="text-[11px] text-center text-amber-700" data-weak-note>⚠ 표시 크기는 글자가 놓이는 자리의 배경이 밝아 대비가 4.5:1에 못 미칩니다. 버튼에 마우스를 올리면 수치가 보입니다.</p>
          )}
          <div className="flex flex-wrap justify-center gap-2">
            {CHANNEL_SIZES.map((c) => {
              const adv = channelAdvice(c.id);
              const weak = adv !== null && !adv.ok;
              return (
              <button
                key={c.id}
                type="button"
                className="text-xs px-3 py-1.5 inline-flex items-center gap-1.5 whitespace-nowrap"
                disabled={busy || saving}
                onClick={() => void downloadChannel(c)}
                data-weak-contrast={weak ? adv.contrast : undefined}
                title={weak ? `${c.width}×${c.height} — 글자 대비 ${adv.contrast}:1로 읽기 어려울 수 있어요. 배경 어둡기를 올려 보세요.` : `${c.width}×${c.height} JPG로 저장`}
              >
                {/* v1.22: 실제 비율대로 그린 작은 상자(긴 변 16px) — 크기를 한눈에 고르게 */}
                <span
                  aria-hidden
                  className="inline-block shrink-0 rounded-[3px] border-[1.5px] border-current opacity-70"
                  style={{ width: Math.round((16 * c.width) / Math.max(c.width, c.height)), height: Math.round((16 * c.height) / Math.max(c.width, c.height)) }}
                />
                {c.label}
                {weak && <span aria-label={`대비 ${adv.contrast}:1 부족`}>⚠</span>}
              </button>
              );
            })}
            <button
              type="button"
              className="text-xs px-3 py-1.5 inline-flex items-center gap-1.5 whitespace-nowrap font-semibold"
              disabled={busy || saving}
              onClick={() => (zipPlan.weak > 0 ? setZipAsk(true) : void downloadAllChannels())}
              title={`${CHANNEL_SIZES.length}가지 크기를 JPG로 만들어 ZIP 하나로 저장`}
            >
              📦 전체 {CHANNEL_SIZES.length}가지 ZIP 1개로
            </button>
          </div>
          {zipAsk && zipPlan.weak > 0 && (
            <div className="status-note warning text-center" role="alert" data-zip-ask>
              ⚠ {zipPlan.weak}가지 크기는 글자가 잘 안 보일 수 있습니다.
              <span className="mt-1 flex flex-wrap justify-center gap-2">
                <button type="button" disabled={busy || saving} onClick={() => void downloadAllChannels()}>그대로 받기</button>
                {zipPlan.raiseTo !== null && (
                  <button type="button" disabled={busy || saving} onClick={() => void downloadAllChannels(zipPlan.raiseTo!)}>어둡기 {zipPlan.raiseTo}%로 올리고 받기</button>
                )}
                {moveCount > 0 && (
                  <button type="button" disabled={busy || saving} data-zip-move={moveCount} onClick={() => void downloadAllChannels(undefined, Object.fromEntries(Object.entries(moves).map(([id, position]) => [id, { position }])))}>글자 자리 바꿔 받기({moveCount}가지)</button>
                )}
                {fixCount > 0 && fixAddsOverlay && (
                  <button type="button" disabled={busy || saving} data-zip-fix={fixCount} onClick={() => void downloadAllChannels(undefined, fixes)}>자리 옮기고 어둡기도 올리고 받기({fixCount}가지)</button>
                )}
                <button type="button" onClick={() => setZipAsk(false)}>취소</button>
              </span>
            </div>
          )}
        </div>
      )}

      {notice && (
        <p role="status" className="status-note centered">
          {notice}
        </p>
      )}
    </>
  );
}
