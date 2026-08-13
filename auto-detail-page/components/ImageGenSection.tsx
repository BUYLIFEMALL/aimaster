"use client";

import { useState } from "react";
import Link from "next/link";
import { UploadedImage } from "@/types/product";

type Platform = "nanobanana" | "replicate" | "gpt-image-1";
type AspectRatio = "1:1" | "4:3" | "3:4" | "16:9" | "9:16";

const PLATFORMS: {
  id: Platform;
  name: string;
  desc: string;
}[] = [
  { id: "nanobanana", name: "나노바나나", desc: "Gemini 2.5 Flash" },
  { id: "replicate", name: "Replicate", desc: "FLUX 2 Dev" },
  { id: "gpt-image-1", name: "GPT Image 1", desc: "OpenAI" },
];

const ASPECT_RATIOS: { value: AspectRatio; label: string }[] = [
  { value: "1:1", label: "1:1 정방형" },
  { value: "4:3", label: "4:3 가로" },
  { value: "16:9", label: "16:9 와이드" },
  { value: "3:4", label: "3:4 세로" },
  { value: "9:16", label: "9:16 모바일" },
];

interface Props {
  productName: string;
  description: string;
  keySellingPoints: string[];
  onImageGenerated: (image: UploadedImage) => void;
}

// AI 이미지 생성 플랫폼별 API 키는 더 이상 브라우저(localStorage)가 아니라
// /settings에 등록해둔 본인 키를 서버가 조회해서 사용한다 (AIMaster 플랫폼 공용
// user_api_keys 재사용 — 관리자 키로 폴백하지 않음. auto-detail-page/README.md 참고).
export default function ImageGenSection({
  productName,
  description,
  keySellingPoints,
  onImageGenerated,
}: Props) {
  const [platform, setPlatform] = useState<Platform>("nanobanana");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generatedImage, setGeneratedImage] = useState<{
    src: string;
    base64: string;
    mediaType: string;
  } | null>(null);

  // 제품 정보로 프롬프트 자동 생성
  const autoGeneratePrompt = () => {
    const parts = [
      productName && `제품: ${productName}`,
      description && description.slice(0, 150),
      keySellingPoints.filter(Boolean).length > 0 &&
        `특징: ${keySellingPoints.filter(Boolean).join(", ")}`,
    ].filter(Boolean);

    const base = parts.join(". ");
    setPrompt(
      `${base}. 고품질 제품 사진, 흰 배경, 전문 상업 광고 스타일, 선명하고 깔끔한 이미지`
    );
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("프롬프트를 입력하거나 자동 생성 버튼을 클릭하세요.");
      return;
    }

    setLoading(true);
    setError("");
    setGeneratedImage(null);

    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, prompt, aspectRatio }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "이미지 생성에 실패했습니다.");
        return;
      }

      setGeneratedImage({
        src: `data:${data.mediaType};base64,${data.base64}`,
        base64: data.base64,
        mediaType: data.mediaType,
      });
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleUse = () => {
    if (!generatedImage) return;
    const ext = generatedImage.mediaType.split("/")[1] || "png";
    onImageGenerated({
      base64: generatedImage.base64,
      mediaType: generatedImage.mediaType as UploadedImage["mediaType"],
      name: `ai-${platform}-${Date.now()}.${ext}`,
    });
    setGeneratedImage(null);
  };

  return (
    <div className="space-y-4">
      {/* 플랫폼 선택 */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          이미지 생성 플랫폼
        </label>
        <div className="grid grid-cols-3 gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlatform(p.id)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                platform === p.id
                  ? "border-purple-500 bg-purple-50"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
            >
              <div className="text-sm font-semibold text-gray-800">
                {p.name}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{p.desc}</div>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-400">
          이 플랫폼의 API 키가 등록되어 있지 않다면{" "}
          <Link href="/settings" className="text-purple-500 hover:text-purple-700 font-medium">
            설정 페이지
          </Link>
          에서 먼저 등록해주세요.
        </p>
      </div>

      {/* 비율 선택 */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          이미지 비율
        </label>
        <div className="flex flex-wrap gap-2">
          {ASPECT_RATIOS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setAspectRatio(r.value)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                aspectRatio === r.value
                  ? "border-purple-500 bg-purple-50 text-purple-700 font-medium"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* 프롬프트 */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-semibold text-gray-700">
            이미지 프롬프트
          </label>
          <button
            type="button"
            onClick={autoGeneratePrompt}
            className="text-xs text-purple-500 hover:text-purple-700 font-medium"
          >
            ✨ 제품 정보로 자동 생성
          </button>
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="프롬프트를 직접 입력하거나 위 버튼으로 자동 생성하세요"
          rows={3}
          className="input resize-none"
        />
      </div>

      {/* 생성 버튼 */}
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold rounded-xl disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            생성 중... (최대 50초 소요)
          </>
        ) : (
          "🎨 AI 이미지 생성"
        )}
      </button>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* 생성된 이미지 미리보기 */}
      {generatedImage && (
        <div className="border-2 border-purple-200 rounded-xl overflow-hidden">
          <img
            src={generatedImage.src}
            alt="AI 생성 이미지"
            className="w-full"
          />
          <div className="p-3 bg-purple-50 flex gap-2">
            <button
              type="button"
              onClick={handleUse}
              className="flex-1 py-2 px-4 bg-purple-500 text-white font-semibold rounded-lg hover:bg-purple-600 transition-colors text-sm"
            >
              ✓ 상세페이지에 사용하기
            </button>
            <button
              type="button"
              onClick={() => setGeneratedImage(null)}
              className="py-2 px-3 text-gray-500 hover:text-gray-700 text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
