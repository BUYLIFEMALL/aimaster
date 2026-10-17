"use client";

// StudioPage에서 옮긴 「dashboard」 화면 (2026-10-17 파일 나누기, 화면·동작 변경 없음)
import type { Studio } from "./useStudio";

export function DashboardView({ s }: { s: Studio }) {
  const { titleRecommendations, history, openMenu, loadTitleRecommendation, reuseDraft, completedInputCount } = s;
  return (
    <section className="dashboard-overview" id="dashboard">
          <section className="dashboard-intro card">
            <div><span className="eyebrow">SEO BLOG WORKSPACE</span><h2 className="card-title">콘텐츠 제작 현황</h2></div>
            <p>제목 추천부터 블로그(원문) 생성, 편집, Chrome 확장 전송까지 한 곳에서 관리합니다.</p>
            <div className="dashboard-actions"><button type="button" className="secondary" onClick={() => openMenu("title")}>🔎 제목 추천 시작</button><button type="button" className="primary compact" onClick={() => openMenu("new-draft")}>📝 새 글 만들기</button></div>
          </section>
          <div className="dashboard-stats" aria-label="콘텐츠 제작 통계">
            <div><strong>{history.length}</strong><span>생성한 블로그(원문)</span></div>
            <div><strong>{titleRecommendations.length}</strong><span>제목 추천 기록</span></div>
            <div><strong>{completedInputCount}</strong><span>확장 입력 완료</span></div>
          </div>
          <section className="dashboard-guide card"><h2 className="card-title">사용방법</h2><ol><li><button type="button" onClick={() => window.location.href = "/settings#api-key"}>API키등록·플랫폼연동</button>에서 본인 OpenAI·Claude·Gemini API 키를 등록합니다.</li><li><button type="button" onClick={() => openMenu("title")}>제목 추천</button>에서 주제와 핵심 키워드를 바탕으로 제목을 고릅니다.</li><li><button type="button" onClick={() => openMenu("new-draft")}>새 글 만들기</button>에서 블로그(원문)·대표·본문 이미지를 검토하고 편집합니다.</li><li>수정 내용을 저장한 뒤 Chrome 확장으로 전송하고 네이버 최종 발행은 직접 확인합니다.</li></ol></section>
          <div className="dashboard-recent-heading">최근 활동</div>
          <div className="dashboard-activity-grid">
            <section className="dashboard-activity card"><div className="card-head"><h2 className="card-title">최근 제목 추천</h2><button type="button" className="text-button" onClick={() => openMenu("title")}>전체 보기 →</button></div>{titleRecommendations.length === 0 ? <p className="history-empty">아직 저장된 제목 추천이 없습니다.</p> : <div className="history-list">{titleRecommendations.slice(0, 5).map((recommendation) => <button type="button" key={recommendation.id} className="history-item" onClick={() => { loadTitleRecommendation(recommendation); openMenu("title"); }}><span><strong>{recommendation.selected_title || recommendation.titles[0]?.title || "제목 추천"}</strong><small>{recommendation.topic}</small></span><time>{recommendation.created_at ? new Date(recommendation.created_at).toLocaleDateString("ko-KR") : "방금"}</time></button>)}</div>}</section>
            <section className="dashboard-activity card"><div className="card-head"><h2 className="card-title">최근 생성한 블로그(원문)</h2><button type="button" className="text-button" onClick={() => openMenu("history")}>전체 보기 →</button></div>{history.length === 0 ? <p className="history-empty">아직 생성한 블로그(원문)이 없습니다.</p> : <div className="history-list">{history.slice(0, 5).map((draft) => <button type="button" key={draft.id} className="history-item" onClick={() => reuseDraft(draft)}><span><strong>{draft.title}</strong><small>{draft.topic}</small></span><time>{draft.created_at ? new Date(draft.created_at).toLocaleDateString("ko-KR") : "방금"}</time></button>)}</div>}</section>
          </div>
        </section>
  );
}
