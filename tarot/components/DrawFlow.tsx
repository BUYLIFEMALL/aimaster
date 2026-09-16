"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { drawThreeCardSpread, serializeDraw } from "@/lib/deck";

/**
 * 카드 뽑기 화면. 질문을 선택 입력받고 "카드 뽑기"를 누르면 78장 중 3장을 뽑아
 * 과거-현재-미래 스프레드를 만든 뒤 /result로 이동한다. 셔플/뒤집기는 framer-motion 같은
 * 별도 라이브러리 없이 순수 CSS 애니메이션(globals.css의 card-shuffle-anim)으로 연출한다 —
 * MVP 범위에서 과한 투자를 피하기 위한 의도적 선택.
 */
export function DrawFlow() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [isShuffling, setIsShuffling] = useState(false);

  function handleDraw() {
    if (isShuffling) return;
    setIsShuffling(true);

    // 셔플 애니메이션을 잠깐 보여준 뒤 결과 페이지로 이동한다.
    window.setTimeout(() => {
      const drawn = drawThreeCardSpread();
      const params = new URLSearchParams();
      params.set("cards", serializeDraw(drawn));
      if (question.trim()) params.set("q", question.trim().slice(0, 300));
      router.push(`/result?${params.toString()}`);
    }, 900);
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🔮</div>
        <h1 className="text-2xl font-black text-neutral-900 mb-2">카드 3장을 뽑아볼게요</h1>
        <p className="text-sm text-neutral-500 leading-relaxed">
          마음에 품고 있는 고민이나 궁금한 것을 짧게 적어보세요. (선택 사항이에요)
          <br />
          과거 - 현재 - 미래, 세 장의 카드로 흐름을 짚어드려요.
        </p>
      </div>

      <div className="mb-6">
        <label htmlFor="question" className="mb-2 block text-sm font-medium text-neutral-700">
          오늘 떠오르는 질문이나 고민 (선택)
        </label>
        <textarea
          id="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={300}
          rows={3}
          placeholder="예) 요즘 진로 고민이 많은데, 지금 이 결정이 맞는 방향일까요?"
          className="w-full px-4 py-3 rounded-2xl border border-neutral-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
        />
        <p className="mt-1 text-right text-[11px] text-neutral-300">{question.length}/300</p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div
          className={`flex gap-[-8px] ${isShuffling ? "card-shuffle-anim" : ""}`}
          aria-hidden="true"
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{ marginLeft: i === 0 ? 0 : -24 }}
              className="w-16 h-24 rounded-lg bg-gradient-to-br from-indigo-900 to-purple-800 border-2 border-indigo-950/40 shadow-md flex items-center justify-center text-xl"
            >
              🌙
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={handleDraw}
          disabled={isShuffling}
          className="w-full max-w-xs px-8 py-4 rounded-2xl bg-neutral-900 text-white font-bold text-lg hover:bg-neutral-800 transition-colors disabled:opacity-60"
        >
          {isShuffling ? "카드를 섞는 중..." : "🃏 카드 뽑기"}
        </button>
      </div>
    </div>
  );
}
