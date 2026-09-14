"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QUESTIONS } from "@/lib/questions";
import { scoreAnswers, type Answers } from "@/lib/scoring";
import { QuestionCard } from "@/components/QuestionCard";
import { ProgressBar } from "@/components/ProgressBar";

export default function TestPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});

  const question = QUESTIONS[step];
  const isLast = step === QUESTIONS.length - 1;

  function handleAnswer(score: number) {
    const nextAnswers = { ...answers, [question.id]: score };
    setAnswers(nextAnswers);

    if (isLast) {
      const result = scoreAnswers(nextAnswers);
      const strengthParams = result.dimensions
        .map((d) => `${d.dimension}=${d.strength}`)
        .join("&");
      router.push(`/result/${result.type}?${strengthParams}`);
      return;
    }

    // 다음 문항으로 넘어가기 전 살짝 텀을 줘서 선택 피드백이 보이게 한다.
    setTimeout(() => setStep((s) => s + 1), 150);
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2 text-xs text-neutral-400">
          <span>
            {step + 1} / {QUESTIONS.length}
          </span>
        </div>
        <ProgressBar current={step + 1} total={QUESTIONS.length} />
      </div>

      <QuestionCard
        key={question.id}
        text={question.text}
        value={answers[question.id]}
        onAnswer={handleAnswer}
      />
    </div>
  );
}
