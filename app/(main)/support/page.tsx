"use client";

import { useState } from "react";
import { Mail, MessageCircle, Clock, HelpCircle, Send, Check } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import GoldGradientText from "@/components/ui/GoldGradientText";
import GoldButton from "@/components/ui/GoldButton";

const CONTACT_INFO = [
  {
    icon: Mail,
    title: "이메일",
    value: "support@buylife.xyz",
    desc: "평일 24시간 이내 답변",
  },
  {
    icon: MessageCircle,
    title: "카카오톡",
    value: "@aimaster",
    desc: "실시간 상담 가능",
  },
  {
    icon: Clock,
    title: "운영 시간",
    value: "평일 09:00 ~ 18:00",
    desc: "주말/공휴일 제외",
  },
];

const FAQ = [
  {
    q: "결제 후 바로 이용할 수 있나요?",
    a: "네, 결제 완료 즉시 프로그램에 접근할 수 있습니다. 대시보드에서 구독 중인 프로그램을 확인하세요.",
  },
  {
    q: "구독을 취소하면 환불이 되나요?",
    a: "구독 시작 7일 이내 취소 시 전액 환불됩니다. 7일 이후에는 남은 기간에 대한 환불이 불가합니다.",
  },
  {
    q: "프로그램 사용 중 문제가 발생하면?",
    a: "이 페이지의 문의 양식 또는 카카오톡/이메일로 연락해주세요. 최대한 빠르게 도움을 드리겠습니다.",
  },
  {
    q: "팀/기업 계정이 필요합니다",
    a: "엔터프라이즈 플랜에서 팀 계정을 지원합니다. 문의 양식으로 요구사항을 알려주시면 맞춤 제안을 드립니다.",
  },
  {
    q: "커스텀 개발도 가능한가요?",
    a: "네, 비즈니스에 맞춘 맞춤형 자동화 솔루션 개발이 가능합니다. '커스텀' 페이지에서 자세한 내용을 확인하세요.",
  },
];

const INQUIRY_TYPES = [
  "결제/환불 문의",
  "프로그램 이용 문의",
  "기술 지원",
  "커스텀 솔루션 상담",
  "어필리에이트 문의",
  "기타",
];

export default function SupportPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    type: INQUIRY_TYPES[0],
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");

    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "전송 실패");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "문의 전송에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/30 text-gold text-sm font-medium mb-6">
          <HelpCircle size={14} />
          고객지원
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-white mb-4">
          무엇을 <GoldGradientText>도와</GoldGradientText>드릴까요?
        </h1>
        <p className="text-subtext text-lg max-w-2xl mx-auto">
          궁금한 점이나 문제가 있으시면 언제든 문의해주세요.
          빠르고 정확하게 도움을 드리겠습니다.
        </p>
      </div>

      {/* Contact Info */}
      <div className="grid md:grid-cols-3 gap-6 mb-16">
        {CONTACT_INFO.map(({ icon: Icon, title, value, desc }) => (
          <GlassCard key={title} className="text-center">
            <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center mx-auto mb-3">
              <Icon size={22} className="text-gold" />
            </div>
            <h3 className="text-white font-bold mb-1">{title}</h3>
            <p className="text-gold font-medium mb-1">{value}</p>
            <p className="text-subtext text-sm">{desc}</p>
          </GlassCard>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* Contact Form */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">
            문의 <GoldGradientText>양식</GoldGradientText>
          </h2>

          {submitted ? (
            <GlassCard glow className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">문의가 접수되었습니다</h3>
              <p className="text-subtext mb-6">
                빠른 시일 내에 입력하신 이메일로 답변 드리겠습니다.
              </p>
              <GoldButton variant="outline" onClick={() => setSubmitted(false)}>
                추가 문의하기
              </GoldButton>
            </GlassCard>
          ) : (
            <GlassCard>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-subtext mb-1.5">이름</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="input-dark w-full"
                      placeholder="홍길동"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-subtext mb-1.5">이메일</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="input-dark w-full"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-subtext mb-1.5">문의 유형</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="input-dark w-full"
                  >
                    {INQUIRY_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-subtext mb-1.5">문의 내용</label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="input-dark w-full h-36 resize-none"
                    placeholder="문의 내용을 자세히 적어주세요"
                    required
                  />
                </div>

                {error && (
                  <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                    {error}
                  </p>
                )}

                <GoldButton type="submit" fullWidth disabled={sending}>
                  <Send size={16} />
                  {sending ? "전송 중..." : "문의 보내기"}
                </GoldButton>
              </form>
            </GlassCard>
          )}
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">
            자주 묻는 <GoldGradientText>질문</GoldGradientText>
          </h2>
          <div className="space-y-4">
            {FAQ.map(({ q, a }) => (
              <GlassCard key={q} className="p-5">
                <h3 className="text-white font-semibold mb-2 text-sm">{q}</h3>
                <p className="text-subtext text-sm leading-relaxed">{a}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
