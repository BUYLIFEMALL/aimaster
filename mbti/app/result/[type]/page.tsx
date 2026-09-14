import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PERSONALITY_TYPES, ALL_TYPE_CODES } from "@/lib/types";
import { ShareButtons } from "@/components/ShareButtons";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mbti.vercel.app";

const DIMENSION_LABELS: Record<string, string> = {
  EI: "외향-내향",
  SN: "감각-직관",
  TF: "사고-감정",
  JP: "판단-인식",
};

function getType(typeParam: string) {
  const code = typeParam.toUpperCase();
  return ALL_TYPE_CODES.includes(code) ? PERSONALITY_TYPES[code] : null;
}

export function generateStaticParams() {
  return ALL_TYPE_CODES.map((type) => ({ type }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string }>;
}): Promise<Metadata> {
  const { type: typeParam } = await params;
  const type = getType(typeParam);
  if (!type) return {};

  const title = `나의 성격코드는 ${type.code} - ${type.epithet}`;
  const description = type.oneLiner;
  const ogImageUrl = `${SITE_URL}/api/og?type=${type.code}`;

  return {
    title,
    description,
    openGraph: { title, description, images: [ogImageUrl] },
    twitter: { card: "summary_large_image", title, description, images: [ogImageUrl] },
  };
}

export default async function ResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { type: typeParam } = await params;
  const type = getType(typeParam);
  if (!type) notFound();

  const strengths = await searchParams;
  const shareUrl = `${SITE_URL}/result/${type.code}`;
  const isFullTest = strengths.mode === "full";

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <div className="rounded-3xl overflow-hidden shadow-lg mb-8">
        <div
          className="px-6 py-10 text-center text-white"
          style={{ background: `linear-gradient(135deg, ${type.color}, #111827)` }}
        >
          {isFullTest && (
            <span className="inline-block mb-3 px-3 py-1 rounded-full bg-white/20 text-[11px] font-bold tracking-wide">
              ✅ 정식판(60문항) 결과
            </span>
          )}
          <div className="text-6xl mb-3">{type.emoji}</div>
          <p className="text-sm opacity-80 mb-1">나의 성격코드는</p>
          <h1 className="text-4xl font-black mb-2">{type.code}</h1>
          <p className="text-lg font-bold">{type.epithet}</p>
        </div>
        <div className="bg-white px-6 py-6">
          <p className="text-center text-neutral-700 font-medium mb-4">{type.oneLiner}</p>
          <p className="text-sm text-neutral-500 leading-relaxed">{type.description}</p>
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
                  <div
                    className="h-full rounded-full bg-neutral-900"
                    style={{ width: `${strength}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 mb-8">
        <h2 className="text-sm font-bold text-neutral-900 mb-3">나의 강점</h2>
        <div className="flex flex-wrap gap-2">
          {type.strengths.map((s) => (
            <span
              key={s}
              className="px-3 py-1.5 rounded-full bg-neutral-100 text-xs font-semibold text-neutral-700"
            >
              #{s}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <ShareButtons shareUrl={shareUrl} shareText={`나의 성격코드는 ${type.code} - ${type.epithet}! 너도 확인해봐`} />
        <Link
          href={isFullTest ? "/test/full" : "/test"}
          className="text-sm text-neutral-400 hover:text-neutral-700 underline"
        >
          다시 검사하기
        </Link>
      </div>
    </div>
  );
}
