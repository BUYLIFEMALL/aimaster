import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const SEED_PROMPTS = [
  // AI 이미지 스튜디오
  {
    program_slug: "ai-image-studio",
    category: "실사 포토리얼리즘",
    title: "8K 네이처 포트레이트",
    prompt_text: "Ultra-realistic 8K photo of a East Asian model in nature, cinematic sunlight, 85mm lens, f/1.8, bokeh effect, natural skin texture, dramatic shadow",
    description: "인물과 자연 배경의 조화를 강조하는 8K 고화질 실사 프롬프트",
    tags: ["실사", "포트레이트", "8K", "자연광"],
    sort_order: 1,
  },
  {
    program_slug: "ai-image-studio",
    category: "3D 디지털 아트",
    title: "시네마틱 미래도시 3D",
    prompt_text: "Futuristic cyberpunk floating city, Octane Render 3D style, volumetric fog, neon blue and orange light, masterpiece, highly detailed",
    description: "옥테인 렌더 스타일의 화려한 3D 입체 미래도시",
    tags: ["3D", "시네마틱", "옥테인렌더", "미래도시"],
    sort_order: 2,
  },
  {
    program_slug: "ai-image-studio",
    category: "수채화 파스텔",
    title: "동화 속 노을 오두막",
    prompt_text: "Warm pastel watercolor painting of a cozy wooden cottage in a flower garden at dusk, soft pink sky, gentle brushstrokes, whimsical fairytale atmosphere",
    description: "따뜻하고 몽환적인 수채화 파스텔 톤 동화 풍경",
    tags: ["수채화", "파스텔", "동화", "풍경"],
    sort_order: 3,
  },

  // AI 자동 블로그 (ai-auto-blog)
  {
    program_slug: "ai-auto-blog",
    category: "SEO 전문 가이드",
    title: "초보자도 쉽게 따라하는 완벽 가이드",
    prompt_text: "당신은 IT/테크 분야 전문 블로거입니다. '{keyword}'에 관한 상세하고 친절한 가이드 글을 작성해주세요. 서론에서는 독자의 흥미를 끌고, 본문에서는 3가지 핵심 팁을 소제목(H2, H3)과 깔끔한 체크리스트로 정리하며, 결론에서는 요약과 함께 댓글 참여를 유도해주세요.",
    description: "네이버 및 구글 SEO 최적화 블로그 원문 작성 프롬프트",
    tags: ["SEO", "가이드", "IT/테크", "정보성"],
    sort_order: 1,
  },
  {
    program_slug: "ai-auto-blog",
    category: "후기 및 리뷰",
    title: "솔직 사용 후기 및 장단점 비교",
    prompt_text: "실제 사용자가 직접 경험한 솔직 후기 스타일로 '{keyword}'에 대해 글을 씁니다. 대화체(~했어요, ~입니다)를 사용하여 친근감을 주며, 실생활 활용성, 장점 3가지, 단점 1가지, 총평 별점을 5점 만점으로 작성해주세요.",
    description: "친근한 대화체와 가독성 높은 체계적 리뷰 구조",
    tags: ["리뷰", "사용후기", "대화체", "장단점"],
    sort_order: 2,
  },

  // 쓰레드 자동화 (auto-threads-posting)
  {
    program_slug: "auto-threads-posting",
    category: "바이럴 공감 글",
    title: "요즘 직장인 폭풍 공감 숏폼 텍스트",
    prompt_text: "Threads에서 조회수가 폭발하는 공감형 글을 씁니다. 150자 이내로 한 줄씩 띄어쓰기를 활용해 가독성을 높이고, 직장인들의 일상과 자기계발 인쇄글 스타일로 강렬한 한 방이 있는 명언으로 마무리하세요. 한글로 작성하고 관련 해시태그 3개 포함.",
    description: "Threads 알고리즘에 최적화된 높은 참여 유도용 숏폼",
    tags: ["Threads", "바이럴", "공감", "직장인"],
    sort_order: 1,
  },

  // 음악 자동화 (music-automation)
  {
    program_slug: "music-automation",
    category: "신스팝 / K-POP",
    title: "청량한 여름 밤 신스팝",
    prompt_text: "Upbeat Korean Synthpop, bright synthesizer melody, punchy bassline, catchy chorus, energetic vocal, 128 bpm, summer night vibe",
    description: "Suno AI에 그대로 입력 가능한 고음질 청량 신스팝 스타일",
    tags: ["신스팝", "K-POP", "Suno", "여름"],
    sort_order: 1,
  },
];

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const serviceClient = createServiceClient();

  // 기존 시드 프롬프트가 있는지 확인
  const { data: existing } = await serviceClient.from("program_prompts").select("id").limit(1);

  if (!existing || existing.length === 0) {
    const { data, error } = await serviceClient
      .from("program_prompts")
      .insert(SEED_PROMPTS)
      .select("*");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, count: data.length, seeded: true });
  }

  return NextResponse.json({ success: true, message: "이미 프롬프트가 존재합니다.", seeded: false });
}
