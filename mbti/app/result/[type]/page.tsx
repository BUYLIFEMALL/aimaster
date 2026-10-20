import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PERSONALITY_TYPES, ALL_TYPE_CODES } from "@/lib/types";
import { ShareButtons } from "@/components/ShareButtons";
import { requireProgramAccess } from "@/lib/access";
import { CHARACTER_RESULT_URL, tarotDrawLink, typeResultLink } from "@/lib/programLinks";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://personality-code.buylife.xyz";
// v1.21: 결과 → 캐릭코드(같은 유형 캐릭터) · AIMaster 타로점(3장 리딩)으로 이어 가기. 유형·지표 비율·질문만 보낸다.

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

// 2026-10-16: 결과 화면도 로그인 + 이용 권한 확인(정적 생성 대신 매 요청 판정)
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

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
  await requireProgramAccess();
  const { type: typeParam } = await params;
  const type = getType(typeParam);
  if (!type) notFound();

  const strengths = await searchParams;
  const shareUrl = `${SITE_URL}/result/${type.code}`;
  const isFullTest = strengths.mode === "full";
  const ogImageUrl = `${SITE_URL}/api/og?type=${type.code}`;

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
            const raw = Number(strengths[dim] ?? 50);
            const strength = Number.isFinite(raw) ? Math.max(0, Math.min(100, Math.round(raw))) : 50;
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

      <NextSteps code={type.code} epithet={type.epithet} strengths={strengths} />

      <div className="flex flex-col items-center gap-4">
        <ShareButtons
          shareUrl={shareUrl}
          shareText={`나의 성격코드는 ${type.code} - ${type.epithet}! 너도 확인해봐`}
          shareDescription={type.oneLiner}
          imageUrl={ogImageUrl}
        />
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

function NextSteps({ code, epithet, strengths }: { code: string; epithet: string; strengths: Record<string, string | undefined> }) {
  // 공용 programLinks — 지표(EI·SN·TF·JP)만 0~100으로 넘긴다
  const characterHref = typeResultLink(CHARACTER_RESULT_URL, code, Object.fromEntries(Object.keys(DIMENSION_LABELS).map((dim) => [dim, strengths[dim]])), "personality-code");
  const question = `성격코드 ${code}(${epithet})인 나에게 지금 필요한 흐름과 조언은 무엇일까요?`;
  const tarotHref = tarotDrawLink(question, "personality-code");
  return (
    <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-amber-50 p-5 mb-8">
      <h2 className="text-sm font-bold text-neutral-900 mb-1">✨ 이어서 보기</h2>
      <p className="text-xs text-neutral-500 mb-4 leading-relaxed">
        같은 유형으로 다른 AIMaster 프로그램에서 이어 볼 수 있어요. 유형과 지표 비율만 넘어가며, 캐릭터 그림·타로 카드는 각 프로그램에서 직접 눌러야 만들어집니다.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <a href={characterHref} target="_blank" rel="noopener noreferrer"
          className="flex-1 text-center rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-neutral-700">
          🎭 캐릭코드에서 내 캐릭터 보기
        </a>
        <a href={tarotHref} target="_blank" rel="noopener noreferrer"
          className="flex-1 text-center rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700">
          🃏 타로점에서 3장 뽑기
        </a>
      </div>
    </div>
  );
}
