import Link from "next/link";
import { HelpCircle, ArrowLeft, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import GlassCard from "@/components/ui/GlassCard";
import GoldGradientText from "@/components/ui/GoldGradientText";

export const dynamic = "force-dynamic";
export const metadata = { title: "자주 묻는 질문" };

interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export default async function FaqPage() {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("faq_items")
    .select("id, category, question, answer")
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true });

  const grouped = new Map<string, FaqItem[]>();
  for (const item of (items ?? []) as FaqItem[]) {
    const list = grouped.get(item.category) ?? [];
    list.push(item);
    grouped.set(item.category, list);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        href="/support"
        className="inline-flex items-center gap-2 text-subtext hover:text-white text-sm mb-8 transition-colors"
      >
        <ArrowLeft size={16} />
        고객센터로
      </Link>

      <div className="text-center mb-14">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/30 text-gold text-sm font-medium mb-6">
          <HelpCircle size={14} />
          자주 묻는 질문
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-white mb-4">
          AI 자동화, <GoldGradientText>이렇게</GoldGradientText> 궁금하셨나요?
        </h1>
        <p className="text-subtext text-lg max-w-2xl mx-auto">
          자동화 셋팅 과정에서 회원님들이 가장 많이 물어보시는 질문을 모았습니다.
          원하는 답을 못 찾으셨다면 아래 문의 양식으로 알려주세요.
        </p>
      </div>

      {grouped.size === 0 ? (
        <GlassCard className="text-center py-16">
          <p className="text-subtext">아직 등록된 질문이 없습니다.</p>
        </GlassCard>
      ) : (
        <div className="space-y-10">
          {Array.from(grouped.entries()).map(([category, faqs]) => (
            <section key={category}>
              <h2 className="text-xl font-bold text-white mb-4">
                <GoldGradientText>{category}</GoldGradientText>
              </h2>
              <div className="space-y-3">
                {faqs.map((faq) => (
                  <GlassCard key={faq.id} className="p-0 overflow-hidden">
                    <details className="group">
                      <summary className="flex items-center justify-between gap-4 cursor-pointer list-none px-5 py-4 select-none">
                        <span className="text-white font-semibold text-sm">{faq.question}</span>
                        <ChevronDown
                          size={18}
                          className="text-gold shrink-0 transition-transform duration-200 group-open:rotate-180"
                        />
                      </summary>
                      <div className="px-5 pb-5 text-subtext text-sm leading-relaxed whitespace-pre-line border-t border-white/10 pt-4">
                        {faq.answer}
                      </div>
                    </details>
                  </GlassCard>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="mt-16 text-center">
        <p className="text-subtext mb-4">원하는 답변을 찾지 못하셨나요?</p>
        <Link
          href="/support"
          className="inline-flex items-center gap-2 text-gold font-medium hover:underline"
        >
          고객센터에 직접 문의하기
        </Link>
      </div>
    </div>
  );
}
