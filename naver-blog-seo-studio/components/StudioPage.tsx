"use client";

import { CategoryManagerModal } from "@/components/categories/CategoryManagerModal";
import { APP_VERSION } from "@/lib/version";
import { useStudio } from "@/components/studio/useStudio";
import { DashboardView } from "@/components/studio/DashboardView";
import { TitleView } from "@/components/studio/TitleView";
import { NewDraftView } from "@/components/studio/NewDraftView";
import { OptimizeView } from "@/components/studio/OptimizeView";
import { HistoryView } from "@/components/studio/HistoryView";

// 2026-10-17 파일 나누기: 상태·처리 함수는 useStudio, 화면 5개는 components/studio/*View.tsx로 옮김(동작 변경 없음)
export default function StudioPage({ email }: { email: string }) {
  const s = useStudio();
  const { activeMenu, message, history, categoryManageOpen, setCategoryManageOpen, seoCategories, saveSeoCategories, openMenu, historyCategoryCounts } = s;

  return (
    <div className="studio-shell">
      <aside className="sidebar">
        <div>
          <div className="brand"><em>SEO블로그</em> 스튜디오</div>
          <div className="brand-sub">네이버 블로그 콘텐츠 제작 도우미</div>
          <div className="app-version">{APP_VERSION}</div>
          <a className="sidebar-back" href="https://www.buylife.xyz/programs">← 다른 프로그램 보기</a>
        </div>
        <nav className="nav" aria-label="주 메뉴">
          <button type="button" className={`nav-overview ${activeMenu === "dashboard" ? "active" : ""}`} onClick={() => openMenu("dashboard")}>🏠 대시보드</button>
          <div className="nav-flow">
            <button type="button" className={`nav-link ${activeMenu === "title" ? "active" : ""}`} aria-current={activeMenu === "title" ? "page" : undefined} onClick={() => openMenu("title")}><span className="nav-number">1</span><span><strong>🔎 제목 추천</strong><small>검색 의도에 맞는 제목 생성</small></span></button>
            <button type="button" className={`nav-link ${activeMenu === "new-draft" ? "active" : ""}`} aria-current={activeMenu === "new-draft" ? "page" : undefined} onClick={() => openMenu("new-draft")}><span className="nav-number">2</span><span><strong>📝 새 글 만들기</strong><small>AI 블로그(원문) 생성</small></span></button>
            <button type="button" className={`nav-link ${activeMenu === "draft" ? "active" : ""}`} aria-current={activeMenu === "draft" ? "page" : undefined} onClick={() => openMenu("draft")}><span className="nav-number">3</span><span><strong>✨ 기존 글 최적화</strong><small>주제·키워드 분석 후 재작성</small></span></button>
            <button type="button" className={`nav-link ${activeMenu === "history" ? "active" : ""}`} aria-current={activeMenu === "history" ? "page" : undefined} onClick={() => openMenu("history")}><span className="nav-number">4</span><span><strong>📚 생성 기록</strong><small>작성한 블로그(원문) 확인</small></span></button>
          </div>
          <div className="nav-divider" />
          <a className="nav-utility" href="/settings#api-key">🔑 API키등록·플랫폼연동</a>
        </nav>
        <div className="sidebar-account" title={email}>
          <span className="sidebar-account-label">로그인 계정</span>
          <strong>{email}</strong>
        </div>
      </aside>

      <main className="main">
        <div className="topline">
          <div>
            <div className="eyebrow">Naver blog content studio</div>
            <h1>검색 의도를 읽고,<br />내 이야기로 작성해보세요.</h1>
            <p className="lede">주제 선정부터 SEO 검수까지 한 화면에서 준비합니다.</p>
          </div>
          <div className="account">AIMaster 계정 연동 전</div>
        </div>

        {activeMenu === "dashboard" && <DashboardView s={s} />}

        {activeMenu === "title" && <TitleView s={s} />}

        {activeMenu === "new-draft" && <NewDraftView s={s} />}

        {activeMenu === "draft" && <OptimizeView s={s} />}

        {activeMenu === "history" && <HistoryView s={s} />}

        <div className="notice workspace-notice" role="status">{message}</div>
        {categoryManageOpen && <CategoryManagerModal categories={seoCategories} counts={historyCategoryCounts} onSave={saveSeoCategories} onClose={() => setCategoryManageOpen(false)} />}
      </main>
    </div>
  );
}

