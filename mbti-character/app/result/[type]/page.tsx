import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CHARACTERS, ALL_TYPE_CODES } from "@/lib/characters";
import { ShareButtons } from "@/components/ShareButtons";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mbti-character.vercel.app";

const DIMENSION_LABELS: Record<string, string> = {
  EI: "외향-내향",
  SN: "감각-직관",
  TF: "사고-감정",
  JP: "판단-인식",
};

function getCharacter(typeParam: string) {
  const code = typeParam.toUpperCase();
  return ALL_TYPE_CODES.includes(code) ? CHARACTERS[code] : null;
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
  const character = getCharacter(typeParam);
  if (!character) return {};

  const title = `나와 닮은 캐릭터는 ${character.name} (${character.code})`;
  const description = character.quote;
  const ogImageUrl = `${SITE_URL}/api/og?type=${character.code}`;

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
  const character = getCharacter(typeParam);
  if (!character) notFound();

  const strengths = await searchParams;
  const shareUrl = `${SITE_URL}/result/${character.code}`;
  const ogImageUrl = `${SITE_URL}/api/og?type=${character.code}`;

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <div className="rounded-3xl overflow-hidden shadow-lg mb-8">
        <div
          className="px-6 py-10 text-center text-white"
          style={{ background: `linear-gradient(135deg, ${character.color}, #111827)` }}
        >
          <div className="text-6xl mb-3">{character.emoji}</div>
          <p className="text-sm opacity-80 mb-1">나와 닮은 캐릭터는</p>
          <h1 className="text-4xl font-black mb-1">{character.name}</h1>
          <p className="text-sm opacity-80 mb-2">{character.role}</p>
          <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-xs font-bold tracking-widest">
            {character.code}
          </span>
        </div>
        <div className="bg-white px-6 py-6">
          <p className="text-center text-neutral-700 font-medium mb-4">&ldquo;{character.quote}&rdquo;</p>
          <p className="text-sm text-neutral-500 leading-relaxed">{character.description}</p>
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
        <h2 className="text-sm font-bold text-neutral-900 mb-3">{character.name}의 특징</h2>
        <div className="flex flex-wrap gap-2">
          {character.traits.map((t) => (
            <span
              key={t}
              className="px-3 py-1.5 rounded-full bg-neutral-100 text-xs font-semibold text-neutral-700"
            >
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
          imageUrl={ogImageUrl}
        />
        <Link href="/test" className="text-sm text-neutral-400 hover:text-neutral-700 underline">
          다시 검사하기
        </Link>
      </div>
    </div>
  );
}
