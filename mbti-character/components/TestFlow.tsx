"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Question } from "@/lib/questions";
import { scoreAnswers, type Answers } from "@/lib/scoring";
import { QuestionCard } from "@/components/QuestionCard";
import { ProgressBar } from "@/components/ProgressBar";

export function TestFlow({ questions }: { questions: Question[] }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});

  const question = questions[step];
  const isLast = step === questions.length - 1;

  function handleAnswer(score: number) {
    const nextAnswers = { ...answers, [question.id]: score };
    setAnswers(nextAnswers);

    if (isLast) {
      const result = scoreAnswers(questions, nextAnswers);
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
            {step + 1} / {questions.length}
          </span>
        </div>
        <ProgressBar current={step + 1} total={questions.length} />
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
