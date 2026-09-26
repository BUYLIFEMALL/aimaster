"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProgramAccess, logProgramUsage } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import { getDisclosureText } from "@/lib/ai/affiliateGenerator";
import { generatePostImage } from "@/lib/ai/generator";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AffiliatePlatform } from "@/types/product";

export interface ViralPostItem {
  id: string;
  authorHandle: string;
  authorName: string;
  avatarUrl?: string;
  content: string;
  likes: number;
  replies: number;
  reposts: number;
  postedAtAgo: string;
  postedDaysAgo: number; // 1, 3, 7, 30
  viralBadge: "viral" | "exploding" | "rising";
  viralScore: number;
  estimatedViews: number; // 추정 조회수 (예: 15,000)
  category: string;
  isSaved?: boolean;
}

const CURATED_VIRAL_POSTS: ViralPostItem[] = [
  {
    id: "v-daiso-01",
    authorHandle: "daiso_lover_kr",
    authorName: "다이소 탐험가",
    content: "다이소 가면 다른 거 다 필요없고 이거 3개는 무조건 집어오세요 ㅋㅋㅋ\n1. 스텐 스크래퍼: 냄비 굳은 때 1초 컷\n2. 틈새 세척솔: 창틀 묵은 때 대박 깔끔\n3. 실리콘 배수구 덮개: 악취 바로 차단됨!!\n천원의 행복 그 자체 ㄷㄷ",
    likes: 3840,
    replies: 412,
    reposts: 280,
    postedAtAgo: "5시간 전",
    postedDaysAgo: 1,
    viralBadge: "exploding",
    viralScore: 99,
    estimatedViews: 45000,
    category: "다이소",
  },
  {
    id: "v-costco-01",
    authorHandle: "costco_queen",
    authorName: "코스트코 매니아",
    content: "코스트코 신상 식품 코너 난리 낸 가성비 폭발 꿀템 🍖\n이 가격에 이 양이 실화냐 소리 절로 나옴 ㅋㅋㅋ 주말에 가시면 무조건 카트에 담으세요!! 재고 금방 빠집니다 🔥",
    likes: 2150,
    replies: 230,
    reposts: 145,
    postedAtAgo: "1일 전",
    postedDaysAgo: 1,
    viralBadge: "viral",
    viralScore: 95,
    estimatedViews: 28000,
    category: "코스트코",
  },
  {
    id: "v-muji-01",
    authorHandle: "minimal_muji",
    authorName: "무인양품 픽",
    content: "무인양품(MUJI)에서 숨겨진 삶의 질 향상 꿀템 💡\n아크릴 서랍장이랑 솜사탕 타올 꼭 사세요. 방 분위기도 원목 느낌으로 정갈해지고 정리정돈 1초 만에 깔끔해집니다!",
    likes: 1820,
    replies: 195,
    reposts: 110,
    postedAtAgo: "2일 전",
    postedDaysAgo: 2,
    viralBadge: "rising",
    viralScore: 92,
    estimatedViews: 22000,
    category: "무인양품",
  },
  {
    id: "v-donki-01",
    authorHandle: "tokyo_donki_pick",
    authorName: "돈키호테 꿀팁",
    content: "일본 여행 돈키호테 필수 쇼핑리스트 TOP 5 🇯🇵\n유명한 의약품 말고 뷰티/생활 소품 중에 진짜 대박인 것들만 싹 다 털어옴 ㅋㅋㅋ 한국 와서 쓰는데 대만족!",
    likes: 4200,
    replies: 510,
    reposts: 390,
    postedAtAgo: "3일 전",
    postedDaysAgo: 3,
    viralBadge: "exploding",
    viralScore: 100,
    estimatedViews: 58000,
    category: "돈키호테",
  },
  {
    id: "v-coupang-01",
    authorHandle: "shopping_master_kr",
    authorName: "쇼핑 마스터",
    content: "솔직히 이거 안 쓰면 손해임 ㄷㄷ 쿠팡에서 산 꿀템 3가지 정리해봄!\n1. 실리콘 밀폐용기: 계란찜도 바로 됨\n2. 논슬립 러그: 청소기로 밀어도 안 움직임\n3. 다회용 수세미: 거품 대박 잘 남\n진짜 자취생 필수템 추천!",
    likes: 1420,
    replies: 184,
    reposts: 95,
    postedAtAgo: "2시간 전",
    postedDaysAgo: 1,
    viralBadge: "exploding",
    viralScore: 98,
    estimatedViews: 18000,
    category: "쿠팡",
  },
  {
    id: "v-ali-01",
    authorHandle: "living_hacks_daily",
    authorName: "생활꿀팁 매거진",
    content: "알리익스프레스 1만원 이하 삶의 질 급상승 꿀템 ㅋㅋㅋ\n이거 진짜 물건이네. 가성비 완전 미쳤음...\n주변에 선물용으로도 찰떡이라 5개 재구입함 🔥",
    likes: 980,
    replies: 142,
    reposts: 68,
    postedAtAgo: "3시간 전",
    postedDaysAgo: 1,
    viralBadge: "viral",
    viralScore: 94,
    estimatedViews: 12000,
    category: "알리",
  },
];

export async function getViralPostsAction(options?: {
  keyword?: string;
  dateRange?: "1d" | "1w" | "1m" | "all";
  sortBy?: "likes" | "replies" | "reposts" | "viralScore";
  minViews?: number;
}): Promise<{ posts: ViralPostItem[] }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const savedIds = new Set<string>();

  // 1. Try tap_saved_posts first
  const { data: savedData, error: savedErr } = await (supabase as any)
    .from("tap_saved_posts")
    .select("post_id")
    .eq("user_id", user.id);

  if (!savedErr && savedData && savedData.length > 0) {
    (savedData as Array<{ post_id: string }>).forEach((s) => savedIds.add(s.post_id));
  } else {
    // Fallback: tap_posts table (status: 'draft', content prefix '[TAP_TREND_SAVED]')
    const { data: fallbackData } = await (supabase as any)
      .from("tap_posts")
      .select("content")
      .eq("user_id", user.id)
      .eq("status", "draft")
      .like("content", "[TAP_TREND_SAVED]%");

    (fallbackData || []).forEach((row: { content: string }) => {
      try {
        const jsonStr = row.content.replace("[TAP_TREND_SAVED]\n", "").trim();
        const parsed = JSON.parse(jsonStr);
        if (parsed.postId) savedIds.add(parsed.postId);
      } catch {
        // ignore JSON parse error
      }
    });
  }

  let filtered = [...CURATED_VIRAL_POSTS];

  if (options?.keyword && options.keyword.trim() !== "" && options.keyword !== "전체") {
    const kw = options.keyword.replace("#", "").trim();
    const result = filtered.filter(
      (p) =>
        p.category.includes(kw) ||
        p.content.includes(kw) ||
        p.authorName.includes(kw)
    );
    if (result.length > 0) filtered = result;
  }

  if (options?.dateRange && options.dateRange !== "all") {
    const maxDays = options.dateRange === "1d" ? 1 : options.dateRange === "1w" ? 7 : 30;
    filtered = filtered.filter((p) => p.postedDaysAgo <= maxDays);
  }

  if (options?.minViews && options.minViews > 0) {
    filtered = filtered.filter((p) => p.estimatedViews >= options.minViews!);
  }

  const sortBy = options?.sortBy || "viralScore";
  filtered.sort((a, b) => {
    if (sortBy === "likes") return b.likes - a.likes;
    if (sortBy === "replies") return b.replies - a.replies;
    if (sortBy === "reposts") return b.reposts - a.reposts;
    return b.viralScore - a.viralScore;
  });

  const postsWithSaved = filtered.map((p) => ({
    ...p,
    isSaved: savedIds.has(p.id),
  }));

  return { posts: postsWithSaved };
}

export async function toggleBookmarkAction(post: ViralPostItem): Promise<{ isSaved: boolean; error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  // 1. Try tap_saved_posts first
  const { data: existing, error: checkErr } = await (supabase as any)
    .from("tap_saved_posts")
    .select("id")
    .eq("user_id", user.id)
    .eq("post_id", post.id)
    .maybeSingle();

  if (!checkErr) {
    if (existing) {
      const { error: delErr } = await (supabase as any)
        .from("tap_saved_posts")
        .delete()
        .eq("id", (existing as any).id)
        .eq("user_id", user.id);
      if (!delErr) return { isSaved: false };
    } else {
      const { error: insErr } = await (supabase as any).from("tap_saved_posts").insert({
        user_id: user.id,
        post_id: post.id,
        author_handle: post.authorHandle,
        author_name: post.authorName,
        content: post.content,
        likes: post.likes,
        replies: post.replies,
        reposts: post.reposts,
        category: post.category,
      });
      if (!insErr) return { isSaved: true };
    }
  }

  // Fallback: tap_posts table (guaranteed to exist!)
  const { data: fallbackExisting } = await (supabase as any)
    .from("tap_posts")
    .select("id, content")
    .eq("user_id", user.id)
    .eq("status", "draft")
    .like("content", `[TAP_TREND_SAVED]%${post.id}%`);

  const match = (fallbackExisting || []).find((row: { id: string; content: string }) => {
    try {
      const jsonStr = row.content.replace("[TAP_TREND_SAVED]\n", "").trim();
      const parsed = JSON.parse(jsonStr);
      return parsed.postId === post.id;
    } catch {
      return false;
    }
  });

  if (match) {
    await (supabase as any).from("tap_posts").delete().eq("id", match.id).eq("user_id", user.id);
    return { isSaved: false };
  } else {
    const payload = {
      postId: post.id,
      authorHandle: post.authorHandle,
      authorName: post.authorName,
      content: post.content,
      likes: post.likes,
      replies: post.replies,
      reposts: post.reposts,
      category: post.category,
    };
    const { error: insErr } = await (supabase as any).from("tap_posts").insert({
      user_id: user.id,
      status: "draft",
      content: `[TAP_TREND_SAVED]\n${JSON.stringify(payload)}`,
    });

    if (insErr) {
      console.error("Bookmark toggle error:", insErr);
      return { isSaved: false, error: insErr.message };
    }
    return { isSaved: true };
  }
}

export async function getSavedBookmarksAction(): Promise<{ posts: ViralPostItem[] }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  // 1. Try tap_saved_posts first
  const { data, error } = await (supabase as any)
    .from("tap_saved_posts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (!error && data && data.length > 0) {
    const posts: ViralPostItem[] = (data as any[]).map((row) => ({
      id: row.post_id,
      authorHandle: row.author_handle,
      authorName: row.author_name,
      content: row.content,
      likes: row.likes,
      replies: row.replies,
      reposts: row.reposts,
      postedAtAgo: "보관함",
      postedDaysAgo: 1,
      viralBadge: "viral",
      viralScore: 95,
      estimatedViews: 25000,
      category: row.category || "일반",
      isSaved: true,
    }));
    return { posts };
  }

  // Fallback: tap_posts table
  const { data: fallbackData } = await (supabase as any)
    .from("tap_posts")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "draft")
    .like("content", "[TAP_TREND_SAVED]%")
    .order("created_at", { ascending: false });

  const posts: ViralPostItem[] = [];
  (fallbackData || []).forEach((row: { content: string }) => {
    try {
      const jsonStr = row.content.replace("[TAP_TREND_SAVED]\n", "").trim();
      const item = JSON.parse(jsonStr);
      posts.push({
        id: item.postId,
        authorHandle: item.authorHandle,
        authorName: item.authorName,
        content: item.content,
        likes: item.likes,
        replies: item.replies,
        reposts: item.reposts,
        postedAtAgo: "보관함",
        postedDaysAgo: 1,
        viralBadge: "viral",
        viralScore: 95,
        estimatedViews: 25000,
        category: item.category || "일반",
        isSaved: true,
      });
    } catch {
      // ignore
    }
  });

  return { posts };
}

export async function getUserProductsAction(): Promise<{ products: any[]; error?: string }> {
  try {
    const user = await requireProgramAccess();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("affiliate_products")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return { products: [], error: error.message };
    return { products: data || [] };
  } catch (err) {
    return { products: [], error: err instanceof Error ? err.message : "상품 목록 조회 실패" };
  }
}

export interface GenerateBenchmarkInput {
  viralContent: string;
  productName: string;
  affiliateUrl: string;
  platform: AffiliatePlatform;
  price?: number;
  personaDescription?: string;
  aiProvider?: "openai" | "gemini" | "anthropic";
  aiModel?: string;
}

export async function generateBenchmarkCaptionAction(
  input: GenerateBenchmarkInput
): Promise<{ caption?: string; error?: string }> {
  const user = await requireProgramAccess();

  if (!input.viralContent || !input.productName || !input.affiliateUrl) {
    return { error: "필수 입력 항목이 누락되었습니다." };
  }

  const provider = input.aiProvider || "openai";
  const personaDesc = input.personaDescription || "친근하고 현실적인 쇼핑 추천 톤";
  const disclosureText = getDisclosureText(input.platform) || "(광고) 제휴 활동으로 수수료를 받을 수 있습니다.";

  const prompt = `You are a Master Viral Threads Marketer.
[PERSONA TONE & STYLE]: ${personaDesc}

Analyze the following VIRAL Threads post:
"""
${input.viralContent}
"""

Now, rewrite a BRAND NEW viral Threads affiliate post for this product:
- Product Name: ${input.productName}
- Platform: ${input.platform}
${input.price ? `- Price: ${input.price.toLocaleString()}원` : ""}

RULES:
1. Replicate the viral hook style and sentence rhythm of the reference viral post, while strictly adopting the assigned PERSONA TONE & STYLE.
2. Keep body content length under 380 characters.
3. Language: Natural Korean.
4. Output ONLY the post body text without legal disclosures or URL links.`;

  try {
    const supabase = await createClient();

    if (provider === "anthropic") {
      let claudeKey = await resolveApiKey(supabase, user.id, "anthropic" as any);
      if (!claudeKey) {
        const { data: keyRow } = await (supabase as any)
          .from("user_api_keys")
          .select("api_key")
          .eq("user_id", user.id)
          .in("provider", ["anthropic", "claude"])
          .maybeSingle();
        claudeKey = keyRow?.api_key || null;
      }
      if (!claudeKey) {
        return { error: "Anthropic (Claude) API 키가 없습니다. 설정 페이지에서 본인 키를 등록해주세요." };
      }

      let actualModel = input.aiModel || "claude-sonnet-5";
      if (actualModel === "claude-sonnet-5") actualModel = "claude-3-5-sonnet-20241022";
      if (actualModel === "claude-haiku-4-5") actualModel = "claude-3-5-haiku-20241022";
      if (actualModel === "claude-opus-5") actualModel = "claude-3-5-sonnet-20241022";

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": claudeKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: actualModel,
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Claude API 호출 실패");
      }

      const bodyText = data.content?.[0]?.text?.trim() || "";
      if (!bodyText) throw new Error("Claude가 캡션을 생성하지 못했습니다.");

      const ctaText = input.platform === "coupang" ? "지금 쿠팡에서 확인" : "지금 바로 확인하기";
      const finalCaption = `${disclosureText}\n\n${bodyText}\n\n${ctaText} ${input.affiliateUrl}`;

      await logProgramUsage({
        userId: user.id,
        action: "ai_generate_viral_benchmark_anthropic",
        metadata: { productName: input.productName, platform: input.platform, model: input.aiModel },
      });

      return { caption: finalCaption };
    } else if (provider === "gemini") {
      const geminiKey = await resolveApiKey(supabase, user.id, "gemini");
      if (!geminiKey) {
        return { error: "Gemini API 키가 없습니다. 설정 페이지에서 본인 키를 등록해주세요." };
      }

      let actualModel = input.aiModel || "gemini-3.7-flash";
      if (actualModel.startsWith("gemini-3") || actualModel.startsWith("gemini-2.5")) {
        actualModel = actualModel.includes("pro") ? "gemini-1.5-pro" : "gemini-1.5-flash";
      }

      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: actualModel });

      const result = await model.generateContent(prompt);
      const bodyText = result.response.text().trim();

      const ctaText = input.platform === "coupang" ? "지금 쿠팡에서 확인" : "지금 바로 확인하기";
      const finalCaption = `${disclosureText}\n\n${bodyText}\n\n${ctaText} ${input.affiliateUrl}`;

      await logProgramUsage({
        userId: user.id,
        action: "ai_generate_viral_benchmark_gemini",
        metadata: { productName: input.productName, platform: input.platform, model: input.aiModel },
      });

      return { caption: finalCaption };
    } else {
      const openAiKey = await resolveApiKey(supabase, user.id, "openai");
      if (!openAiKey) {
        return { error: "OpenAI API 키가 없습니다. 설정 페이지에서 본인 키를 등록해주세요." };
      }

      const openai = new OpenAI({ apiKey: openAiKey });
      let actualModel = input.aiModel || "gpt-5.6-luna";
      if (actualModel === "gpt-5.6-luna" || actualModel === "gpt-5.6-terra" || actualModel === "gpt-4.1") actualModel = "gpt-4o";
      if (actualModel === "gpt-5.6-sol") actualModel = "gpt-4o";
      if (actualModel === "o3") actualModel = "o3-mini";

      const completion = await openai.chat.completions.create({
        model: actualModel,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
      });

      const bodyText = completion.choices[0]?.message?.content?.trim() || "";
      if (!bodyText) {
        throw new Error("AI가 캡션을 생성하지 못했습니다.");
      }

      const ctaText = input.platform === "coupang" ? "지금 쿠팡에서 확인" : "지금 바로 확인하기";
      const finalCaption = `${disclosureText}\n\n${bodyText}\n\n${ctaText} ${input.affiliateUrl}`;

      await logProgramUsage({
        userId: user.id,
        action: "ai_generate_viral_benchmark_openai",
        metadata: { productName: input.productName, platform: input.platform, model: input.aiModel },
      });

      return { caption: finalCaption };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI 캡션 생성 실패";
    return { error: msg };
  }
}

export async function createDirectBenchmarkPostAction(input: {
  content: string;
  productName: string;
  productId?: string;
  platform: AffiliatePlatform;
  affiliateUrl: string;
}): Promise<{ postId?: string; error?: string }> {
  try {
    const user = await requireProgramAccess();
    const supabase = await createClient();

    let imageUrl: string | null = null;

    if (input.productId) {
      const { data: prod } = await supabase
        .from("affiliate_products")
        .select("image_url")
        .eq("id", input.productId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (prod?.image_url) {
        imageUrl = prod.image_url;
      }
    }

    if (!imageUrl) {
      try {
        const geminiKey = await resolveApiKey(supabase, user.id, "gemini");
        if (geminiKey) {
          const prompt = `${input.productName} high quality realistic product showcase photo, modern style, clean lighting`;
          const imgResult = await generatePostImage({ prompt }, geminiKey);
          const ext = imgResult.mimeType.split("/")[1] ?? "png";
          const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

          const { error: uploadErr } = await supabase.storage
            .from("post-images")
            .upload(path, Buffer.from(imgResult.base64, "base64"), {
              contentType: imgResult.mimeType,
              upsert: false,
            });

          if (!uploadErr) {
            const { data } = supabase.storage.from("post-images").getPublicUrl(path);
            imageUrl = data.publicUrl;
          }
        }
      } catch {
        // ignore image gen failure and save post text
      }
    }

    const { data: inserted, error } = await supabase
      .from("tap_posts")
      .insert({
        user_id: user.id,
        product_id: input.productId || null,
        content: input.content,
        image_url: imageUrl,
        status: "draft",
      })
      .select("id")
      .single();

    if (error || !inserted) {
      return { error: error?.message || "게시글 저장에 실패했습니다." };
    }

    await logProgramUsage({
      userId: user.id,
      action: "create_benchmark_post_direct",
      metadata: { postId: inserted.id, productName: input.productName },
    });

    return { postId: inserted.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "게시글 저장 실패" };
  }
}
