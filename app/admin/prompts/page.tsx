import { createServiceClient } from "@/lib/supabase/service";
import GoldGradientText from "@/components/ui/GoldGradientText";
import ProgramPromptsManager from "@/components/admin/ProgramPromptsManager";
import { INITIAL_IMAGE_STUDIO_PROMPTS } from "@/lib/constants/defaultPrompts";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const metadata = { title: "프로그램별 프롬프트 관리 | AI Master Admin" };

const DEFAULT_PROGRAMS = [
  { slug: "ai-image-studio", name: "AI 이미지 스튜디오" },
  { slug: "ai-auto-blog", name: "BLOG(원문)생성 자동화" },
  { slug: "auto-threads-posting", name: "Threads 포스팅 자동화" },
  { slug: "threads-comment-reply", name: "Threads 댓글자동화" },
  { slug: "threads-affiliate-poster", name: "Threads 쇼핑제휴 자동화" },
  { slug: "auto-instagram-posting", name: "INSTA 포스팅 자동화" },
  { slug: "instagram-comment-reply", name: "INSTA 댓글자동화" },
  { slug: "music-automation", name: "음악(SUNO)자동화" },
  { slug: "auto-shorts-posting", name: "YOUTUBE Shots 자동화" },
  { slug: "trending-product-finder", name: "상품소싱 자동화" },
  { slug: "shop-detail-page", name: "상세페이지 자동화" },
  { slug: "stepmail", name: "대량 메일발송 자동화" },
  { slug: "real-estate-sales", name: "부동산 실거래 투자분석" },
  { slug: "tarot-reading", name: "AI 타로" },
  { slug: "naver-cafe-poster", name: "네이버 카페 포스팅 자동화" },
];

export default async function AdminPromptsPage() {
  const supabase = createServiceClient();

  const { data: prompts } = await supabase
    .from("program_prompts")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const { data: programsData } = await supabase
    .from("programs")
    .select("slug, name")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const programsListMap = new Map<string, string>();
  DEFAULT_PROGRAMS.forEach((p) => programsListMap.set(p.slug, p.name));
  if (programsData) {
    programsData.forEach((p) => programsListMap.set(p.slug, p.name));
  }

  const mergedPrograms = Array.from(programsListMap.entries()).map(([slug, name]) => ({
    slug,
    name,
  }));

  // DB 데이터가 비어있으면 초기 예시 프롬프트 세트(INITIAL_IMAGE_STUDIO_PROMPTS)로 자동 매칭
  const initialData = (prompts && prompts.length > 0) ? prompts : INITIAL_IMAGE_STUDIO_PROMPTS;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          <GoldGradientText>프로그램별 프롬프트 추천 & 관리 게시판</GoldGradientText>
        </h1>
        <p className="text-subtext mt-1 text-sm">
          AI Master의 각 자동화 프로그램(이미지 스튜디오, 블로그 생성, 쓰레드 포스팅, 음악 생성 등)에서 활용할 
          추천 프롬프트를 통합 추가·수정·삭제 및 제어할 수 있는 관리 센터입니다.
        </p>
      </div>

      <ProgramPromptsManager initialPrompts={initialData} programsList={mergedPrograms} />
    </div>
  );
}
