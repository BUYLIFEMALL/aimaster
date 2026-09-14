"use client";

import { useEffect, useState } from "react";
import { IMAGE_STYLES } from "@/lib/imageStyles";
import type { Character } from "@/lib/characters";

// 로그인이 없는 사이트라 API 키를 저장할 "회원"이 없다 — 서버 DB 대신 이 브라우저의
// localStorage에만 남겨서, 같은 브라우저로 재방문했을 때 다시 입력하지 않아도 되게 한다.
const STORAGE_KEY = "mbti-character:gemini-api-key";

export function CharacterImageGenerator({ character }: { character: Character }) {
  const [apiKey, setApiKey] = useState("");
  const [saveKey, setSaveKey] = useState(true);
  const [styleId, setStyleId] = useState(IMAGE_STYLES[0].id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setApiKey(saved);
    } catch {}
  }, []);

  async function handleGenerate() {
    if (!apiKey.trim()) {
      setError("Gemini API 키를 입력해주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-character-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim(), typeCode: character.code, styleId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "이미지 생성에 실패했습니다.");

      setImageUrl(json.imageDataUrl);
      try {
        if (saveKey) localStorage.setItem(STORAGE_KEY, apiKey.trim());
        else localStorage.removeItem(STORAGE_KEY);
      } catch {}
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 mb-8">
      <h2 className="text-sm font-bold text-neutral-900 mb-1">🎨 AI로 {character.name} 실제로 보기</h2>
      <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
        본인의 Gemini API 키로 무료로 생성할 수 있어요 (
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-neutral-600"
        >
          키 발급받기
        </a>
        ). 입력한 키는 이 브라우저에만 저장되고 서버에는 저장되지 않습니다.
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
          <div className="grid grid-cols-2 gap-2">
            {IMAGE_STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStyleId(s.id)}
                className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                  styleId === s.id
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">Gemini API 키</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIza..."
            className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-sm"
          />
          <label className="flex items-center gap-1.5 mt-1.5 text-[11px] text-neutral-400">
            <input
              type="checkbox"
              checked={saveKey}
              onChange={(e) => setSaveKey(e.target.checked)}
            />
            이 브라우저에 키 저장하기
          </label>
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
