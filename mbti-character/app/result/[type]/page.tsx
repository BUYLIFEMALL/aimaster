import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CHARACTERS, ALL_TYPE_CODES } from "@/lib/characters";
import { requireProgramAccess } from "@/lib/access";
import { getUserApiKey } from "@/lib/apiKeys";
import { ResultInteractive } from "@/components/ResultInteractive";

// 로그인 여부(쿠키)에 따라 접근을 막아야 하는 페이지라 빌드 타임에 미리 정적 생성할 수 없다
// — generateStaticParams를 쓰지 않고 매 요청마다 동적으로 렌더링한다.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mbti-character.vercel.app";

// 공유 링크(?img=)로 넘어온 이미지 URL이 실제로 우리 Supabase Storage 버킷 것인지 검증한다 —
// 검증 없이 그대로 og:image에 반영하면, 조작된 img 파라미터로 임의 이미지를 우리 페이지의
// 공유 미리보기에 끼워넣을 수 있게 된다.
const TRUSTED_IMAGE_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/mbti-character-images/`;

function getCharacter(typeParam: string) {
  const code = typeParam.toUpperCase();
  return ALL_TYPE_CODES.includes(code) ? CHARACTERS[code] : null;
}

function getTrustedImageUrl(img: string | undefined): string | null {
  if (!img) return null;
  return img.startsWith(TRUSTED_IMAGE_PREFIX) ? img : null;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}): Promise<Metadata> {
  const { type: typeParam } = await params;
  const character = getCharacter(typeParam);
  if (!character) return {};

  const { img } = await searchParams;
  const title = `나와 닮은 캐릭터는 ${character.name} (${character.code})`;
  const description = character.quote;
  const ogImageUrl = getTrustedImageUrl(img) ?? `${SITE_URL}/api/og?type=${character.code}`;

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
  const user = await requireProgramAccess();

  const { type: typeParam } = await params;
  const character = getCharacter(typeParam);
  if (!character) notFound();

  const [strengths, geminiKey] = await Promise.all([searchParams, getUserApiKey(user.id, "gemini")]);
  const shareUrlBase = `${SITE_URL}/result/${character.code}`;
  const fallbackOgImageUrl = `${SITE_URL}/api/og?type=${character.code}`;
  const initialImageUrl = getTrustedImageUrl(strengths.img);

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <ResultInteractive
        character={character}
        hasApiKey={!!geminiKey}
        initialImageUrl={initialImageUrl}
        shareUrlBase={shareUrlBase}
        fallbackOgImageUrl={fallbackOgImageUrl}
        strengths={strengths}
      />
    </div>
  );
}
