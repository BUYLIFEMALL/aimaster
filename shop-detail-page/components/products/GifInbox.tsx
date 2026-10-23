"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GIF_SENDER_ORIGIN, MSG_READY, readFileMessage } from "@/lib/gifHandoff";
import { applySectionSequence } from "@/lib/sectionOrder";
import { uploadCustomSectionImage } from "@/lib/uploadImageClient";
import { addCustomSectionImageAction } from "@/lib/actions/images";

type Product = {
  id: string;
  product_label: string | null;
  name: string | null;
  layout_preset: string | null;
  section_sequence: string[] | null;
};

type Template = {
  id: string;
  section_key: string;
  section_name: string;
  section_order: number;
  layout_preset: string;
};

type Received = { name: string; file: Blob; preview: string };

/**
 * v1.28: GIF 자동화 창이 열어 준 이 창에서 GIF를 받는다(공용 gif-handoff 약속).
 * 저장은 기존 섹션 직접 올리기와 같은 경로 — 본인 폴더에 올리고 그 섹션의 새 버전으로 추가.
 */
export function GifInbox({ products, templates }: { products: Product[]; templates: Template[] }) {
  const [received, setReceived] = useState<Received | null>(null);
  const [receiveError, setReceiveError] = useState<string | null>(null);
  const [hasOpener, setHasOpener] = useState(true);
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [templateId, setTemplateId] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedProductId, setSavedProductId] = useState<string | null>(null);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const r = readFileMessage(e.origin, e.data);
      if (!r) return;
      if ("error" in r) {
        setReceiveError(r.error);
        return;
      }
      setReceiveError(null);
      setSavedProductId(null);
      setReceived((prev) => {
        if (prev) URL.revokeObjectURL(prev.preview);
        return { name: r.name, file: r.file, preview: URL.createObjectURL(r.file) };
      });
    }
    window.addEventListener("message", onMessage);
    // 받을 준비가 됐다고 GIF 자동화 창에 알린다(그 창 주소로만).
    if (window.opener) window.opener.postMessage({ type: MSG_READY }, GIF_SENDER_ORIGIN);
    else setHasOpener(false);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const product = products.find((p) => p.id === productId);
  const sections = useMemo(() => {
    if (!product) return [];
    const preset = product.layout_preset ?? "shop15";
    return applySectionSequence(
      templates.filter((t) => t.layout_preset === preset),
      product.section_sequence,
    );
  }, [product, templates]);
  const template = sections.find((t) => t.id === templateId) ?? sections[0];

  async function save() {
    if (!received || !product || !template) return;
    setSaving(true);
    setSaveError(null);
    const file = new File([received.file], received.name, { type: "image/gif" });
    const up = await uploadCustomSectionImage(product.id, template.section_key, file);
    if (up.error || !up.url) {
      setSaving(false);
      setSaveError(up.error ?? "올리지 못했습니다.");
      return;
    }
    const res = await addCustomSectionImageAction(product.id, template.id, up.url);
    setSaving(false);
    if (res.error) {
      setSaveError(res.error);
      return;
    }
    setSavedProductId(product.id);
  }

  if (!received) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
        {receiveError ? (
          <p className="text-rose-600 font-bold">{receiveError}</p>
        ) : hasOpener ? (
          <p>GIF를 기다리는 중입니다…</p>
        ) : (
          <p>
            상세페이지 GIF 자동화에서 변환을 마친 뒤 「🛍 상세페이지로」를 눌러 주세요. 이 창은 그 버튼으로 열려야 GIF를 받을 수
            있습니다.
          </p>
        )}
        <a
          href="https://video-to-gif.buylife.xyz/dashboard"
          className="mt-4 inline-block text-xs font-bold text-blue-600 hover:text-blue-800"
        >
          상세페이지 GIF 자동화 열기 →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <div className="rounded-xl bg-slate-50 p-3 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={received.preview} alt={received.name} className="mx-auto max-h-64 max-w-full rounded-lg" />
        <p className="mt-2 text-xs text-slate-500">
          {received.name} · {(received.file.size / 1024 / 1024).toFixed(2)} MB
        </p>
      </div>

      {products.length === 0 ? (
        <p className="text-sm text-slate-600">
          아직 상품이 없습니다.{" "}
          <Link href="/products/new" className="font-bold text-blue-600">
            새 상품을 먼저 만들어 주세요
          </Link>
          . 이 창을 열어 둔 채 만들고 돌아오면 됩니다.
        </p>
      ) : (
        <>
          <label className="block text-xs font-bold text-slate-700">
            상품
            <select
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                setTemplateId("");
                setSavedProductId(null);
              }}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.product_label || p.name || "이름 없는 상품"}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-bold text-slate-700">
            넣을 섹션
            <select
              value={template?.id ?? ""}
              onChange={(e) => {
                setTemplateId(e.target.value);
                setSavedProductId(null);
              }}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal"
            >
              {sections.map((t, i) => (
                <option key={t.id} value={t.id}>
                  {String(i + 1).padStart(2, "0")}. {t.section_name}
                </option>
              ))}
            </select>
          </label>

          {saveError && <p className="text-xs font-bold text-rose-600">{saveError}</p>}

          {savedProductId ? (
            <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
              ✅ 「{template?.section_name}」 섹션에 넣었습니다.{" "}
              <Link href={`/products/${savedProductId}`} className="font-bold underline">
                상품 화면에서 보기
              </Link>
            </div>
          ) : (
            <button
              type="button"
              onClick={save}
              disabled={saving || !template}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "넣는 중…" : "이 섹션에 넣기"}
            </button>
          )}
          <p className="text-[11px] text-slate-400">
            움직이는 GIF는 「섹션별 ZIP」에 원본 그대로 들어가고, 세로 롱 이미지·HTML에는 첫 장면으로 들어갑니다.
          </p>
        </>
      )}
    </div>
  );
}
