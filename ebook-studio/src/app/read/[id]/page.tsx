"use client";

import React, { useEffect, useState, use } from "react";
import { EbookProject } from "@/lib/types";
import { buildStandaloneHtml } from "@/lib/template";
import { Loader2 } from "lucide-react";

interface ReadPageProps {
  params: Promise<{ id: string }>;
}

export default function ReadPage({ params }: ReadPageProps) {
  const resolvedParams = use(params);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);

  useEffect(() => {
    // 1. 로컬 저장소에서 현재 프로젝트 확인
    try {
      const saved = localStorage.getItem("ebook_studio_current_project");
      if (saved) {
        const project: EbookProject = JSON.parse(saved);
        setHtmlContent(buildStandaloneHtml(project));
        return;
      }
    } catch (e) {
      console.warn("Failed to load project:", e);
    }

    // 2. 기본 샘플 책 렌더링
    const defaultSample: EbookProject = {
      id: resolvedParams.id,
      title: "통찰하는 기계, 질문하는 리더",
      subtitle: "AI 시대, 리더의 새로운 역할을 탐구하다",
      author: "김지훈",
      chapters: [
        {
          id: "ch-1",
          title: "제1장. 지시하는 관리자에서 질문하는 리더로",
          summary: "인공지능이 경영의 영역으로 들어오면서 리더에게 요구되는 역량이 근본적으로 변하고 있습니다.",
          content: `### 1.1 패러다임의 대전환
기술의 변화만큼 중요한 것은 자신의 변화입니다. 도구를 도입하기 전에 팀의 일하는 방식과 리더의 역할을 다시 정의해야 합니다.

> "훌륭한 리더는 좋은 답을 가진 사람이 아니라, 핵심을 찌르는 좋은 질문을 던질 줄 아는 사람이다."

이제 리더의 진정한 경쟁력은 문제를 날카롭게 정의하는 프레이밍(Framing) 역량에 있습니다.`,
          takeaways: ["문제를 정의하는 질문자로 전환하세요."],
          questions: ["우리 팀의 본질적 문제는 무엇인가요?"],
        },
      ],
      style: {
        theme: "warm",
        font: "notoSans",
        skin: "classic",
        leading: 1.7,
        size: 17,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setHtmlContent(buildStandaloneHtml(defaultSample));
  }, [resolvedParams.id]);

  if (!htmlContent) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-900 text-white">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <iframe
      srcDoc={htmlContent}
      title="E-book Reader"
      className="w-full h-screen border-0"
      sandbox="allow-scripts allow-modals"
    />
  );
}
