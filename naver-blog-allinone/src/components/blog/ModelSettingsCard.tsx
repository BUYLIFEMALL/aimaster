"use client";

import React from "react";
import { AppSettings, saveStoredSettings } from "@/lib/storage";
import {
  DEFAULT_IMAGE_BY_PLATFORM,
  IMAGE_MODELS,
  IMAGE_PLATFORMS,
  KEY_LABEL,
  TEXT_ENGINES,
  findTextEngine,
  keyOf,
  resolveImageEngine,
  resolveTextEngine,
  type ImagePlatform,
} from "@/lib/blog/models";
import type { TextProvider } from "@/lib/blog/llm";

interface Props {
  settings: AppSettings;
  onSettingsChange: (next: AppSettings) => void;
  onOpenSettings: () => void;
  /** 이미지 모델을 고르지 않는 화면이면 숨긴다 */
  showImage?: boolean;
}

function KeyBadge({ ok }: { ok: boolean }) {
  return (
    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${ok ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>
      {ok ? "키 등록됨" : "키 필요"}
    </span>
  );
}

/** 글 생성 AI(GPT·Claude·Gemini)와 이미지 생성 모델(NanoBanana·GPT Image·FLUX·Z-Image) 선택. 고른 값은 이 브라우저에 자동 저장된다. */
export function ModelSettingsCard({ settings, onSettingsChange, onOpenSettings, showImage = true }: Props) {
  const text = resolveTextEngine(settings);
  const image = resolveImageEngine(settings);
  const textInfo = findTextEngine(text.provider)!;

  const commit = (patch: Partial<AppSettings>) => {
    const next = { ...settings, ...patch };
    saveStoredSettings(next);
    onSettingsChange(next);
  };

  const pickProvider = (provider: TextProvider) => commit({ textProvider: provider, textModelId: findTextEngine(provider)!.models[0].value });

  const pickPlatform = (platform: ImagePlatform) => commit({ imageModelId: DEFAULT_IMAGE_BY_PLATFORM[platform] });
  const imageModels = IMAGE_MODELS.filter((m) => m.platform === image.platform);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/30 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-xs font-bold text-slate-900">🤖 AI 글 생성 엔진 선택 <span className="font-normal text-slate-500">(GPT / Claude / Gemini)</span></h4>
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700">4단계 파이프라인 전체 적용</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {TEXT_ENGINES.map((e) => {
            const active = text.provider === e.provider;
            return (
              <button key={e.provider} type="button" onClick={() => pickProvider(e.provider)} className={`rounded-xl border p-3 text-center transition ${active ? "bg-emerald-600 text-white border-emerald-600 shadow-xs" : "bg-white border-slate-200 hover:border-slate-300"}`}>
                <div className="text-lg">{e.icon}</div>
                <div className="text-xs font-extrabold">{e.label}</div>
                <div className={`text-[10px] ${active ? "text-emerald-100" : "text-slate-500"}`}>{e.sub}</div>
                <div className="mt-1"><KeyBadge ok={Boolean(keyOf(settings, e.provider))} /></div>
              </button>
            );
          })}
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">{textInfo.label} 세부 실행 모델</label>
          <select
            value={text.model}
            onChange={(e) => commit({ textProvider: text.provider, textModelId: e.target.value })}
            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
          >
            {textInfo.models.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        {!text.apiKey && (
          <p className="text-[11px] text-amber-800">
            선택한 {text.label}의 본인 API 키가 없습니다. 다른 AI로 자동 전환하지 않습니다.{" "}
            <button type="button" onClick={onOpenSettings} className="font-bold underline">API키등록·플랫폼연동</button>에서 키를 등록하거나 키가 있는 AI를 선택해주세요.
          </p>
        )}
      </div>

      {showImage && (
        <div className="rounded-2xl border-2 border-pink-200 bg-pink-50/30 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-slate-900">🖼️ 이미지 생성 모델 설정 <span className="font-normal text-slate-500">(NanoBanana · GPT Image · FLUX · Z-Image)</span></h4>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700">이미지 컷 생성에 적용</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {IMAGE_PLATFORMS.map((p) => {
              const active = image.platform === p.id;
              return (
                <button key={p.id} type="button" onClick={() => pickPlatform(p.id)} className={`rounded-xl border p-3 text-center transition ${active ? "bg-blue-600 text-white border-blue-600 shadow-xs" : "bg-white border-slate-200 hover:border-slate-300"}`}>
                  <div className="text-lg">{p.icon}</div>
                  <div className="text-xs font-extrabold">{p.name}</div>
                  <div className={`text-[10px] ${active ? "text-blue-100" : "text-slate-500"}`}>{p.sub}</div>
                  <div className="mt-1"><KeyBadge ok={Boolean(keyOf(settings, p.keyProvider))} /></div>
                </button>
              );
            })}
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">{IMAGE_PLATFORMS.find((p) => p.id === image.platform)?.name} 세부 실행 모델</label>
            <select value={image.model} onChange={(e) => commit({ imageModelId: e.target.value })} className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold">
              {imageModels.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          {!image.apiKey && (
            <p className="text-[11px] text-amber-800">
              이 이미지 모델에는 {KEY_LABEL[image.keyProvider]} API 키가 필요합니다.{" "}
              <button type="button" onClick={onOpenSettings} className="font-bold underline">API키등록·플랫폼연동</button>에서 등록하거나 다른 모델을 선택해주세요.
            </p>
          )}
          <p className="text-[11px] text-slate-500">사람이 등장하면 항상 한국인/동아시아인으로 생성하며, 이미지 안에 글자·워터마크를 넣지 않는 깔끔한 실사로 만듭니다. 선택은 자동으로 저장되어 다음 접속에도 적용됩니다.</p>
        </div>
      )}
    </div>
  );
}
