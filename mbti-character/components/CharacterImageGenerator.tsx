"use client";

import { useEffect, useState } from "react";
import { IMAGE_STYLES, STYLE_PREFERENCE_STORAGE_KEY } from "@/lib/imageStyles";
import type { Character } from "@/lib/characters";
import { ApiKeyRequiredModal } from "@/components/settings/ApiKeyRequiredModal";
import { StyleButtonGrid } from "@/components/StyleButtonGrid";

export function CharacterImageGenerator({
  character,
  hasApiKey,
}: {
  character: Character;
  hasApiKey: boolean;
}) {
  const [styleId, setStyleId] = useState(IMAGE_STYLES[0].id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);

  // 랜딩 페이지(StylePreferencePicker)에서 미리 골라둔 스타일이 있으면 그걸 기본값으로
  // 이어받는다.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STYLE_PREFERENCE_STORAGE_KEY);
      if (saved && IMAGE_STYLES.some((s) => s.id === saved)) setStyleId(saved);
    } catch {}
  }, []);

  function handleSelectStyle(id: string) {
    setStyleId(id);
    try {
      localStorage.setItem(STYLE_PREFERENCE_STORAGE_KEY, id);
    } catch {}
  }

  async function handleGenerate() {
    if (!hasApiKey) {
      setShowKeyModal(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-character-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typeCode: character.code, styleId }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.code === "NO_API_KEY") {
          setShowKeyModal(true);
          return;
        }
        throw new Error(json.error ?? "이미지 생성에 실패했습니다.");
      }
      setImageUrl(json.imageDataUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 mb-8">
      {showKeyModal && <ApiKeyRequiredModal onClose={() => setShowKeyModal(false)} />}

      <h2 className="text-sm font-bold text-neutral-900 mb-1">🎨 AI로 {character.name} 실제로 보기</h2>
      <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
        {hasApiKey ? (
          "등록해둔 본인 Gemini API 키로 생성됩니다."
        ) : (
          <>
            먼저{" "}
            <a href="/settings" className="underline hover:text-neutral-600">
              설정
            </a>
            에서 본인의 Gemini API 키를 등록해주세요.
          </>
        )}
      </p>

      {imageUrl && (
        <div className="mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- Gemini가 base64 데이터 URL로 반환하므로 next/image 최적화 대상이 아니다 */}
          <img src={imageUrl} alt={character.name} className="w-full rounded-xl" />
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div>
          <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">캐릭터 스타일</label>
          <StyleButtonGrid selectedId={styleId} onSelect={handleSelectStyle} />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="px-6 py-3 rounded-2xl bg-neutral-900 text-white font-bold text-sm hover:bg-neutral-800 transition-colors disabled:opacity-50"
        >
          {loading ? "생성 중... (최대 30초)" : "✨ AI 캐릭터 이미지 생성하기"}
        </button>
      </div>
    </div>
  );
}
