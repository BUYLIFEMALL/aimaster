import type { ProjectData } from "@/types/svs";

/** 프로젝트 전체를 마크다운 문자열로 만듭니다. */
export function buildProjectMarkdown(data: ProjectData): string {
  const { analysis, selectedIdea: idea, scenes, promptsResult, scriptConfig } = data;
  const today = new Date().toISOString().slice(0, 10);

  let md = `# YouTube Shorts 바이럴 기획 · 제작 리포트\n\n`;
  md += `> 생성일: ${today}  \n> 검색 키워드: ${data.search.query || "-"}  \n`;
  if (idea) md += `> 선택 주제: ${idea.title}  \n> 잠재 점수: ${idea.potentialScore}점 (예상 완청 ${idea.expectedRetention})\n`;
  md += `\n---\n\n`;

  if (analysis) {
    md += `## 1. 바이럴 분석\n\n`;
    md += `- 분석 방식: ${analysis.evidence === "video" ? "영상 직접 분석" : "지표·댓글 기반 추정"} (엔진: ${analysis.modelLabel})\n`;
    if (analysis.note) md += `- 참고: ${analysis.note}\n`;
    md += `\n### 11대 바이럴 메커니즘\n\n`;
    analysis.viralMechanisms.forEach((m, i) => {
      md += `${i + 1}. **${m.title}**\n   - 핵심 전술: ${m.tactic}\n   - 상세 분석: ${m.analysis}\n\n`;
    });
    md += `### 구간별 타임라인 전략\n\n`;
    analysis.timelineStrategies.forEach((t) => {
      md += `- **[${t.range}]** ${t.tactic}\n  - 심리 트리거: ${t.psychologicalTrigger}\n`;
    });
    const vs = analysis.visualStyle;
    md += `\n### 시각 연출 DNA\n\n`;
    md += `- 렌즈·화각: ${vs.lensAndFraming}\n- 카메라 무빙: ${vs.cameraMovement}\n- 조명·무드: ${vs.lightingArchitecture}\n`;
    md += `- 컬러·톤: ${vs.colorGrading}\n- 피사체·구도: ${vs.subjectComposition}\n- 질감·렌더 룩: ${vs.textureAesthetic}\n`;
    md += `- 컷 전환·VFX: ${vs.motionVFXPacing}\n- 생성 AI 키워드: ${vs.promptModifiers || "-"}\n`;
    if (analysis.commentInsights.length) {
      md += `\n### 시청자 반응\n\n`;
      analysis.commentInsights.forEach((c) => {
        md += `- [${c.category}] ${c.insight}\n`;
      });
    }
    md += `\n---\n\n`;
  }

  if (idea) {
    md += `## 2. 확정 주제\n\n### ${idea.title}\n\n`;
    md += `- 1초 훅: "${idea.hook}"\n- 훅 공식: ${idea.hookFormula}\n- 전략: ${idea.strategy}\n- 성공 요인: ${idea.whyItWorks}\n`;
    if (data.topicFeedback) md += `- 추가 요청: ${data.topicFeedback}\n`;
    idea.storylineRoadmap.forEach((r) => {
      md += `  - ${r.phase}: ${r.action}\n`;
    });
    md += `\n---\n\n`;
  }

  if (scenes.length) {
    md += `## 3. 대본 (${scriptConfig.durationSec}초 · ${scriptConfig.tone} · 타겟: ${scriptConfig.target || "대중"})\n\n`;
    scenes.forEach((s) => {
      md += `### SCENE ${s.sceneNumber} (${s.time})\n- 나레이션: ${s.narration}\n- 화면 연출: ${s.visual}\n`;
      if (s.caption) md += `- 자막: "${s.caption}"\n`;
      if (s.sfx) md += `- 효과음/BGM: ${s.sfx}\n`;
      md += `\n`;
    });
    md += `---\n\n`;
  }

  if (promptsResult) {
    const b = promptsResult.bgmPrompt;
    if (b) {
      md += `## 4. BGM 프롬프트 (Suno / Udio)\n\n### ${b.title} (${b.bpm})\n\n`;
      md += `- 장르·무드: ${b.genreAndMood}\n- 악기: ${b.instrumentation}\n- 전개: ${b.dynamicStructure}\n- 믹싱: ${b.audioMixingNotes}\n\n`;
      md += "```text\n" + b.sunoPrompt + "\n```\n\n---\n\n";
    }
    md += `## 5. 씬별 이미지 · 영상 프롬프트\n\n`;
    promptsResult.prompts.forEach((p) => {
      md += `### SCENE ${p.sceneNumber}${p.sceneSummary ? ` (${p.sceneSummary})` : ""}\n\n`;
      md += "이미지:\n```text\n" + p.imagePrompt + "\n```\n\n영상:\n```text\n" + p.videoPrompt + "\n```\n\n";
    });
  }

  md += `\n*쇼츠 떡상 분석·대본 자동화 (AIMaster) 로 생성됨*\n`;
  return md;
}

export function downloadMarkdown(data: ProjectData) {
  const title = data.selectedIdea?.title || data.search.query || "shorts_project";
  const safe = title.replace(/[^a-zA-Z0-9가-힣_-]/g, "_").slice(0, 30);
  const md = buildProjectMarkdown(data);
  const url = URL.createObjectURL(new Blob([md], { type: "text/markdown;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `Shorts_${safe}_${new Date().toISOString().slice(0, 10)}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
