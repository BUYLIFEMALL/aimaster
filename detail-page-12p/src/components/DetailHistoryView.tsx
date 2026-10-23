"use client";

import { useState } from "react";
import {
  FolderDown,
  Trash2,
  ExternalLink,
  Layers,
  Calendar,
  Sparkles,
  Download,
  Upload,
  ShoppingBag,
  Rocket,
  Search,
} from "lucide-react";
import { DetailPageProject } from "@/types/detail";

interface DetailHistoryViewProps {
  projects: DetailPageProject[];
  onSelectProject: (project: DetailPageProject) => void;
  onDeleteProject: (projectId: string) => void;
  onImportProjects: (imported: DetailPageProject[]) => void;
  onNewProject: () => void;
}

export function DetailHistoryView({
  projects,
  onSelectProject,
  onDeleteProject,
  onImportProjects,
  onNewProject,
}: DetailHistoryViewProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = projects.filter((p) =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 전체 프로젝트 JSON 내보내기
  const handleExportBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projects, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `detail_page_12p_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // 백업 파일 가져오기
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          onImportProjects(parsed);
          alert(`${parsed.length}개의 프로젝트를 성공적으로 복원했습니다.`);
        } else {
          alert("올바른 백업 JSON 파일 형식이 아닙니다.");
        }
      } catch (err: any) {
        alert(`가져오기 실패: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* 1. 상단 타이틀 & 백업 액션 바 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg md:text-xl font-black text-slate-900 flex items-center gap-2">
            <FolderDown className="w-5 h-5 text-blue-600" />
            3. 보관함 & 백업 동기화
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            제작된 모든 12단 상세페이지 프로젝트를 관리하고 언제든 스튜디오에서 다시 열어 수정할 수 있습니다.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <label className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 shadow-2xs">
            <Upload className="w-3.5 h-3.5" />
            JSON 복원
            <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
          </label>

          <button
            type="button"
            onClick={handleExportBackup}
            disabled={projects.length === 0}
            className="px-3 py-2 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            JSON 백업
          </button>

          <button
            type="button"
            onClick={onNewProject}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />새 상세페이지 제작
          </button>
        </div>
      </div>

      {/* 2. 검색 바 */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="상품명으로 보관함 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-2xs"
        />
      </div>

      {/* 3. 프로젝트 카드 목록 */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((proj) => {
            const completed = proj.scenes.filter((s) => !!s.imageUrl).length;
            const total = proj.scenes.length;
            const firstImg = proj.scenes.find((s) => !!s.imageUrl)?.imageUrl;

            return (
              <div
                key={proj.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  {/* 카드 상단 썸네일 */}
                  <div className="h-40 bg-slate-100 border-b border-slate-100 relative overflow-hidden flex items-center justify-center">
                    {firstImg ? (
                      <img src={firstImg} alt={proj.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-4">
                        <Layers className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                        <span className="text-xs text-slate-400 font-medium">이미지 미생성</span>
                      </div>
                    )}
                    <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-bold backdrop-blur-xs">
                      {proj.platform === "coupang" ? "쿠팡 12단" : "스마트스토어 9단"}
                    </span>
                    <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-white/90 text-slate-800 text-[10px] font-bold shadow-xs">
                      {completed}/{total} 렌더링
                    </span>
                  </div>

                  {/* 정보 본문 */}
                  <div className="p-4 space-y-2">
                    <h3 className="font-bold text-slate-900 text-sm line-clamp-2">
                      {proj.title}
                    </h3>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(proj.createdAt).toLocaleDateString()}</span>
                    </div>

                    {proj.productData.salePrice && (
                      <p className="text-xs font-black text-rose-600">
                        {proj.productData.salePrice.toLocaleString()}원
                        {proj.productData.discountRate ? ` (${proj.productData.discountRate}% OFF)` : ""}
                      </p>
                    )}
                  </div>
                </div>

                {/* 하단 버튼 */}
                <div className="p-4 pt-0 border-t border-slate-50 flex items-center justify-between gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => onSelectProject(proj)}
                    className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> 스튜디오 열기
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`'${proj.title}' 프로젝트를 삭제하시겠습니까?`)) {
                        onDeleteProject(proj.id);
                      }
                    }}
                    className="p-2 border border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-xl transition-colors"
                    title="프로젝트 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
          <FolderDown className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">
            {searchTerm ? "검색 결과가 없습니다." : "보관된 상세페이지 프로젝트가 없습니다."}
          </h3>
          <p className="text-xs text-slate-500">
            '1. 제품 정보 입력'에서 상품명을 입력하고 12단 상세페이지를 기획해보세요!
          </p>
          <button
            type="button"
            onClick={onNewProject}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            첫 상세페이지 만들기
          </button>
        </div>
      )}
    </div>
  );
}
