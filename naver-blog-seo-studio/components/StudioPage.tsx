"use client";

import { CategoryManagerModal } from "@/components/categories/CategoryManagerModal";
import { useStudio } from "@/components/studio/useStudio";
import { StudioSidebar } from "@/components/studio/StudioSidebar";
import { DashboardView } from "@/components/studio/DashboardView";
import { TitleView } from "@/components/studio/TitleView";
import { NewDraftView } from "@/components/studio/NewDraftView";
import { OptimizeView } from "@/components/studio/OptimizeView";
import { HistoryView } from "@/components/studio/HistoryView";
import { ResearchView } from "@/components/studio/ResearchView";
import { StyleView } from "@/components/studio/StyleView";

// 2026-10-17 파일 나누기: 상태·처리 함수는 useStudio, 화면 5개는 components/studio/*View.tsx로 옮김(동작 변경 없음)
export default function StudioPage({ email }: { email: string }) {
  const s = useStudio();
  const { activeMenu, message, history, categoryManageOpen, setCategoryManageOpen, seoCategories, saveSeoCategories, openMenu, historyCategoryCounts } = s;

  return (
    <div className="studio-shell">
      <StudioSidebar email={email} active={activeMenu} onSelect={openMenu} />

      <main className="main">
        <div className="topline">
          <div>
            <div className="eyebrow">Naver blog content studio</div>
            <h1>검색 의도를 읽고,<br />내 이야기로 작성해보세요.</h1>
            <p className="lede">주제 선정부터 SEO 검수까지 한 화면에서 준비합니다.</p>
          </div>
          <div className="account" title={email}>👤 {email}</div>
        </div>

        {activeMenu === "dashboard" && <DashboardView s={s} />}

        {activeMenu === "title" && <TitleView s={s} />}

        {activeMenu === "new-draft" && <NewDraftView s={s} />}

        {activeMenu === "research" && <ResearchView s={s} />}

        {activeMenu === "my-style" && <StyleView s={s} />}

        {activeMenu === "draft" && <OptimizeView s={s} />}

        {activeMenu === "history" && <HistoryView s={s} />}

        {message && <div className="notice workspace-notice" role="status">{message}</div>}
        {categoryManageOpen && <CategoryManagerModal categories={seoCategories} counts={historyCategoryCounts} onSave={saveSeoCategories} onClose={() => setCategoryManageOpen(false)} />}
      </main>
    </div>
  );
}

