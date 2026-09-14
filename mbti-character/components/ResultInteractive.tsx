"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Character } from "@/lib/characters";
import { IMAGE_STYLES, STYLE_PREFERENCE_STORAGE_KEY } from "@/lib/imageStyles";
import { StyleButtonGrid } from "@/components/StyleButtonGrid";
import { ApiKeyRequiredModal } from "@/components/settings/ApiKeyRequiredModal";
import { ShareButtons } from "@/components/ShareButtons";

const DIMENSION_LABELS: Record<string, string> = {
  EI: "외향-내향",
  SN: "감각-직관",
  TF: "사고-감정",
  JP: "판단-인식",
};

/**
 * 검사 결과 화면의 동적인 부분(캐릭터 비주얼, 스타일 선택, 공유)을 전부 이 하나의 클라이언트
 * 컴포넌트가 담당한다 — "설문조사를 끝내면 이모티콘 대신 자동으로 생성된 캐릭터 이미지가
 * 표시되고, 공유하면 그 이미지가 포함돼야 한다"는 요구(2026-09-14)를 만족하려면, 생성된
 * 이미지 URL 하나를 히어로 비주얼과 공유 버튼이 함께 참조해야 하기 때문이다 — 서버
 * 컴포넌트로 두 곳을 나눠서는 상태를 공유할 수 없어서, 정적인 문구(성향 지표/특징 포함)도
 * 함께 이 컴포넌트 안으로 옮겼다.
 */
export function ResultInteractive({
  character,
  hasApiKey,
  initialImageUrl,
  shareUrlBase,
  fallbackOgImageUrl,
  strengths,
}: {
  character: Character;
  hasApiKey: boolean;
  initialImageUrl: string | null;
  shareUrlBase: string;
  fallbackOgImageUrl: string;
  strengths: Record<string, string | undefined>;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [styleId, setStyleId] = useState(IMAGE_STYLES[0].id);
  const [showKeyModal, setShowKeyModal] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STYLE_PREFERENCE_STORAGE_KEY);
      if (saved && IMAGE_STYLES.some((s) => s.id === saved)) setStyleId(saved);
    } catch {}
  }, []);

  async function generate(withStyleId: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-character-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typeCode: character.code, styleId: withStyleId }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.code === "NO_API_KEY") {
          setShowKeyModal(true);
          return;
        }
        throw new Error(json.error ?? "이미지 생성에 실패했습니다.");
      }
      setImageUrl(json.imageUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  // 검사가 끝나고 이 결과 화면에 처음 도달했을 때(공유 링크로 들어와 이미 이미지가 있는
  // 경우가 아니라면), API 키가 등록돼 있으면 곧바로 자동 생성한다 — 버튼을 눌러야만
  // 생성되던 방식에서 "결과가 곧 캐릭터 이미지"가 되도록 바꾼 것(2026-09-14 요청).
  useEffect(() => {
    if (!initialImageUrl && hasApiKey) {
      generate(styleId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSelectStyle(id: string) {
    setStyleId(id);
    try {
      localStorage.setItem(STYLE_PREFERENCE_STORAGE_KEY, id);
    } catch {}
  }

  function handleRegenerateClick() {
    if (!hasApiKey) {
      setShowKeyModal(true);
      return;
    }
    generate(styleId);
  }

  const shareImageUrl = imageUrl ?? fallbackOgImageUrl;
  const shareUrl = imageUrl ? `${shareUrlBase}?img=${encodeURIComponent(imageUrl)}` : shareUrlBase;

  return (
    <>
      {showKeyModal && <ApiKeyRequiredModal onClose={() => setShowKeyModal(false)} />}

      <div className="rounded-3xl overflow-hidden shadow-lg mb-8">
        <div
          className="px-6 py-10 text-center text-white"
          style={{ background: `linear-gradient(135deg, ${character.color}, #111827)` }}
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage 공개 URL이라 next/image 최적화 대상이 아니다
            <img
              src={imageUrl}
              alt={character.name}
              className="w-40 h-40 mx-auto mb-3 rounded-2xl object-cover shadow-lg"
            />
          ) : loading ? (
            <div className="w-40 h-40 mx-auto mb-3 rounded-2xl bg-white/10 flex items-center justify-center animate-pulse">
              <span className="text-4xl">{character.emoji}</span>
            </div>
          ) : (
            <div className="text-6xl mb-3">{character.emoji}</div>
          )}
          {loading && <p className="text-xs opacity-70 mb-2">AI 캐릭터 이미지 생성 중... (최대 30초)</p>}
          <p className="text-sm opacity-80 mb-1">나와 닮은 캐릭터는</p>
          <h1 className="text-4xl font-black mb-1">{character.name}</h1>
          <p className="text-sm opacity-80 mb-3">{character.role}</p>
          <span className="inline-block px-5 py-2 rounded-full bg-white/20 text-3xl font-black tracking-widest">
            {character.code}
          </span>
        </div>
        <div className="bg-white px-6 py-6">
          <p className="text-center text-neutral-700 font-medium mb-4">&ldquo;{character.quote}&rdquo;</p>
          <p className="text-sm text-neutral-500 leading-relaxed">{character.description}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 mb-8">
        <h2 className="text-sm font-bold text-neutral-900 mb-1">🎨 캐릭터 이미지</h2>
        <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
          {hasApiKey ? (
            "스타일을 바꿔서 다시 생성할 수 있어요."
          ) : (
            <>
              <a href="/settings" className="underline hover:text-neutral-600">
                설정
              </a>
              에서 Gemini API 키를 등록하면 나만의 캐릭터 이미지를 만들 수 있어요.
            </>
          )}
        </p>
        <div className="flex flex-col gap-3">
          <StyleButtonGrid selectedId={styleId} onSelect={handleSelectStyle} />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="button"
            onClick={handleRegenerateClick}
            disabled={loading}
            className="px-6 py-3 rounded-2xl bg-neutral-900 text-white font-bold text-sm hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            {loading ? "생성 중..." : imageUrl ? "🔄 이 스타일로 다시 생성" : "✨ AI 캐릭터 이미지 생성하기"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 mb-6">
        <h2 className="text-sm font-bold text-neutral-900 mb-4">나의 성향 지표</h2>
        <div className="space-y-3">
          {Object.entries(DIMENSION_LABELS).map(([dim, label]) => {
            const strength = Number(strengths[dim] ?? 50);
            return (
              <div key={dim}>
                <div className="flex justify-between text-xs text-neutral-500 mb-1">
                  <span>{label}</span>
                  <span>{strength}%</span>
                </div>
                <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                  <div className="h-full rounded-full bg-neutral-900" style={{ width: `${strength}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 mb-8">
        <h2 className="text-sm font-bold text-neutral-900 mb-3">{character.name}의 특징</h2>
        <div className="flex flex-wrap gap-2">
          {character.traits.map((t) => (
            <span key={t} className="px-3 py-1.5 rounded-full bg-neutral-100 text-xs font-semibold text-neutral-700">
              #{t}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <ShareButtons
          shareUrl={shareUrl}
          shareText={`나와 닮은 캐릭터는 ${character.name}(${character.code})! 너도 확인해봐`}
          shareDescription={character.quote}
          imageUrl={shareImageUrl}
        />
        <Link href="/test" className="text-sm text-neutral-400 hover:text-neutral-700 underline">
          다시 검사하기
        </Link>
      </div>
    </>
  );
}
