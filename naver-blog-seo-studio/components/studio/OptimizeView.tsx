"use client";

// StudioPage에서 옮긴 「draft」 화면 (2026-10-17 파일 나누기, 화면·동작 변경 없음)
import { SEO_PERSONAS } from "@/lib/ai/personas";
import type { Studio } from "./useStudio";

export function OptimizeView({ s }: { s: Studio }) {
  const { topic, keywords, pending, personaId, setPersonaId, customPersona, setCustomPersona, generateImageWithDraft, setGenerateImageWithDraft, existingBody, setExistingBody, optimizeMode, setOptimizeMode, optimizationKeywords, setOptimizationKeywords, optimizationDraftId, sourceUrl, setSourceUrl, sourceTitle, sourcePending, analysisPending, contentAnalysis, analysisTopic, setAnalysisTopic, analysisKeywords, setAnalysisKeywords, optimizePending, optimized, history, draftSaving, imagePending, optimizeExisting, loadGeneratedDraftForOptimization, extractFromUrl, analyzeExisting, saveOptimizationAsDraft, createDraftFromAnalysis } = s;
  return (
    <section className="optimize-card card" id="draft">
          <div className="card-head"><div><h2 className="card-title">기존 글 최적화</h2><p className="section-description">내 글을 다듬거나, 권한 있는 외부 글을 분석해 새로운 SEO 블로그(원문)을 만듭니다.</p></div><span className="card-caption">3가지 작업 방식</span></div>
          <div className="optimize-tabs" role="tablist" aria-label="기존 글 작업 방식">
            <button type="button" role="tab" aria-selected={optimizeMode === "direct"} className={optimizeMode === "direct" ? "selected" : ""} onClick={() => setOptimizeMode("direct")}>내 글 바로 최적화</button>
            <button type="button" role="tab" aria-selected={optimizeMode === "analyze"} className={optimizeMode === "analyze" ? "selected" : ""} onClick={() => setOptimizeMode("analyze")}>붙여넣기 분석 후 재작성</button>
            <button type="button" role="tab" aria-selected={optimizeMode === "url"} className={optimizeMode === "url" ? "selected" : ""} onClick={() => setOptimizeMode("url")}>URL에서 가져와 재작성</button>
          </div>

          {optimizeMode === "url" && <div className="optimize-mode-panel">
            <div className="field"><label htmlFor="source-url">블로그 글 주소</label><input id="source-url" type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://blog.naver.com/..." /></div>
            <p className="freshness-note">본문은 주제·키워드·구조 분석에만 임시 사용하며 서버에 원문을 보관하거나 문장을 그대로 복제하지 않습니다. 로그인·유료벽·접근 제한 글은 직접 붙여넣어주세요.</p>
            <button type="button" className="secondary" onClick={() => void extractFromUrl()} disabled={sourcePending}>{sourcePending ? "글 가져오는 중..." : "글 가져오기"}</button>
            {sourceTitle && <p className="source-result">가져온 글: <strong>{sourceTitle}</strong></p>}
            {existingBody && <><textarea className="optimize-input" value={existingBody} onChange={(event) => setExistingBody(event.target.value)} aria-label="가져온 글 본문" /><button type="button" className="primary" onClick={() => void analyzeExisting()} disabled={analysisPending}>{analysisPending ? "핵심 분석 중..." : "핵심 분석 후 새 글 만들기"}</button></>}
          </div>}

          {optimizeMode === "direct" && <div className="optimize-mode-panel">
            <div className="field"><label htmlFor="optimization-history">내 생성 기록에서 불러오기</label><select id="optimization-history" value={optimizationDraftId} onChange={(event) => loadGeneratedDraftForOptimization(event.target.value)}><option value="">기존 글 가져오기</option>{history.map((draft) => <option key={draft.id} value={draft.id}>{draft.title} · {draft.created_at ? new Date(draft.created_at).toLocaleDateString("ko-KR") : "방금"}</option>)}</select><small>{history.length ? "선택하면 저장된 제목·본문·키워드를 가져옵니다. 최근 30일 기록을 표시합니다." : "최근 30일 안에 저장된 블로그(원문)이 없습니다. 아래에 원문을 직접 붙여넣을 수 있습니다."}</small></div>
            <div className="field"><label htmlFor="optimize-keywords">보강할 핵심 키워드 (선택)</label><input id="optimize-keywords" value={optimizationKeywords} onChange={(event) => setOptimizationKeywords(event.target.value)} placeholder="쉼표로 구분해 입력하세요" /></div>
            <div className="field"><label htmlFor="optimize-persona">글쓰기 페르소나</label><select id="optimize-persona" value={personaId} onChange={(event) => setPersonaId(event.target.value)}>{SEO_PERSONAS.map((persona) => <option key={persona.id} value={persona.id}>{persona.name}</option>)}<option value="custom">✍️ 커스텀 페르소나 직접 입력</option></select></div>
            {personaId === "custom" && <div className="field"><label htmlFor="optimize-custom-persona">커스텀 페르소나</label><input id="optimize-custom-persona" value={customPersona} maxLength={500} onChange={(event) => setCustomPersona(event.target.value)} placeholder="예: 초보자에게 차분하게 설명하는 실무 멘토" /></div>}
            <textarea className="optimize-input" value={existingBody} onChange={(event) => setExistingBody(event.target.value)} placeholder="내가 작성한 기존 네이버 블로그 글을 붙여넣으세요 (50자 이상)" />
            <button type="button" className="secondary" onClick={() => void optimizeExisting()} disabled={optimizePending || (personaId === "custom" && !customPersona.trim())}>{optimizePending ? "최적화 중..." : "내 글 SEO 최적화"}</button>
            {optimized && <div className="optimize-result"><h3>{optimized.title}</h3><pre>{optimized.body}</pre><h4>개선한 점</h4><ul>{optimized.improvements.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul><label className="image-with-draft-option"><input type="checkbox" checked={generateImageWithDraft} onChange={(event) => setGenerateImageWithDraft(event.target.checked)} /> <span><strong>대표 이미지 생성 (나노바나나)</strong><small>선택한 제목을 바탕으로 블로그(원문)과 대표 이미지를 함께 생성합니다.</small></span></label><button type="button" className="primary" onClick={() => void saveOptimizationAsDraft()} disabled={draftSaving || imagePending}>{draftSaving ? "블로그(원문) 저장 중..." : imagePending ? "대표 이미지 생성 중..." : "이 결과를 블로그(원문)으로 저장하고 편집하기"}</button></div>}
          </div>}

          {optimizeMode === "analyze" && <div className="optimize-mode-panel">
            <p className="freshness-note">원문에서 핵심 주제·핵심/연관 키워드·검색 의도·보완점을 먼저 추출합니다. 분석 결과는 수정할 수 있고, 원문을 그대로 복제하지 않는 새 블로그(원문)을 생성합니다.</p>
            <textarea className="optimize-input" value={existingBody} onChange={(event) => setExistingBody(event.target.value)} placeholder="분석할 기존 글을 붙여넣으세요 (50자 이상)" />
            <button type="button" className="secondary" onClick={() => void analyzeExisting()} disabled={analysisPending}>{analysisPending ? "핵심 분석 중..." : "핵심 주제·키워드 분석하기"}</button>
          </div>}

          {contentAnalysis && (optimizeMode === "analyze" || optimizeMode === "url") && <section className="analysis-result" aria-labelledby="analysis-result-title">
            <div><h3 id="analysis-result-title">원문 핵심 분석</h3><span>확인·수정 후 새 글을 생성하세요.</span></div>
            <div className="analysis-edit-grid"><div className="field"><label htmlFor="analysis-topic">핵심 주제</label><input id="analysis-topic" value={analysisTopic} onChange={(event) => setAnalysisTopic(event.target.value)} /></div><div className="field"><label htmlFor="analysis-keywords">핵심·연관 키워드</label><input id="analysis-keywords" value={analysisKeywords} onChange={(event) => setAnalysisKeywords(event.target.value)} /></div></div>
            <dl className="analysis-list"><div><dt>검색 의도</dt><dd>{contentAnalysis.searchIntent || "확인이 필요합니다."}</dd></div><div><dt>독자 대상</dt><dd>{contentAnalysis.targetReader || "확인이 필요합니다."}</dd></div><div><dt>추천 구조</dt><dd>{contentAnalysis.outline.join(" · ") || "글 구조를 직접 구성해주세요."}</dd></div><div><dt>기존 글 강점</dt><dd>{contentAnalysis.strengths.join(" · ") || "확인이 필요합니다."}</dd></div><div><dt>보완점</dt><dd>{contentAnalysis.improvements.join(" · ") || "확인이 필요합니다."}</dd></div></dl>
            <div className="field"><label htmlFor="analysis-persona">새 글 페르소나</label><select id="analysis-persona" value={personaId} onChange={(event) => setPersonaId(event.target.value)}>{SEO_PERSONAS.map((persona) => <option key={persona.id} value={persona.id}>{persona.name}</option>)}<option value="custom">✍️ 커스텀 페르소나 직접 입력</option></select></div>
            {personaId === "custom" && <div className="field"><label htmlFor="analysis-custom-persona">커스텀 페르소나</label><input id="analysis-custom-persona" value={customPersona} maxLength={500} onChange={(event) => setCustomPersona(event.target.value)} /></div>}
            <label className="image-with-draft-option"><input type="checkbox" checked={generateImageWithDraft} onChange={(event) => setGenerateImageWithDraft(event.target.checked)} /> <span><strong>대표 이미지 생성 (나노바나나)</strong><small>선택한 제목을 바탕으로 블로그(원문)과 대표 이미지를 함께 생성합니다.</small></span></label>
            <button type="button" className="primary" onClick={() => void createDraftFromAnalysis()} disabled={pending || (personaId === "custom" && !customPersona.trim())}>{pending ? "새 글 생성 중..." : "이 분석으로 새로운 SEO 블로그(원문) 만들기"}</button>
          </section>}
          <p className="optimization-safety">AI 결과는 블로그(원문)입니다. 가격·날짜·정책·의학·법률 등 사실은 직접 확인하고, 네이버 최종 발행은 내용을 검토한 뒤 직접 진행하세요.</p>
        </section>
  );
}
