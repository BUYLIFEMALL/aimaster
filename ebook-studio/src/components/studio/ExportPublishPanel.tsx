"use client";

import React, { useState } from "react";
import {
  Share2,
  Download,
  FileCode,
  Archive,
  BookOpen,
  Printer,
  Copy,
  Check,
  ExternalLink,
  Save,
  Upload,
  Globe,
} from "lucide-react";
import { EbookProject } from "@/lib/types";
import { buildStandaloneHtml, buildWebDeployZip, buildEpubBlob } from "@/lib/template";

interface ExportPublishPanelProps {
  project: EbookProject;
  onRestoreProject: (imported: EbookProject) => void;
}

export function ExportPublishPanel({ project, onRestoreProject }: ExportPublishPanelProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [isExportingEpub, setIsExportingEpub] = useState(false);

  // 1. 단일 HTML 다운로드
  const handleDownloadHtml = () => {
    const htmlString = buildStandaloneHtml(project);
    const blob = new Blob([htmlString], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(project.title || "ebook").replace(/[\\/:*?"<>|\n]/g, " ").trim()}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  // 2. 웹 배포용 ZIP 다운로드
  const handleDownloadZip = async () => {
    setIsExportingZip(true);
    try {
      const zipBlob = await buildWebDeployZip(project);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(project.title || "ebook").replace(/[\\/:*?"<>|\n]/g, " ").trim()} — 웹 배포용.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      console.error("ZIP export failed:", e);
    } finally {
      setIsExportingZip(false);
    }
  };

  // 3. EPUB 다운로드
  const handleDownloadEpub = async () => {
    setIsExportingEpub(true);
    try {
      const epubBlob = await buildEpubBlob(project);
      const url = URL.createObjectURL(epubBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(project.title || "ebook").replace(/[\\/:*?"<>|\n]/g, " ").trim()}.epub`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      console.error("EPUB export failed:", e);
    } finally {
      setIsExportingEpub(false);
    }
  };

  // 4. 인쇄 / PDF 저장 (새 창 띄워 인쇄)
  const handlePrintPdf = () => {
    const htmlString = buildStandaloneHtml(project);
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(htmlString);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);
    }
  };

  // 5. 프로젝트 JSON 내보내기
  const handleExportJson = () => {
    const jsonStr = JSON.stringify(project, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ebook_project_${project.id}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  // 6. 프로젝트 JSON 가져오기
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (imported.title && Array.isArray(imported.chapters)) {
          onRestoreProject(imported);
          alert("전자책 프로젝트를 성공적으로 불러왔습니다!");
        } else {
          alert("올바른 전자책 프로젝트 JSON 파일이 아닙니다.");
        }
      } catch {
        alert("JSON 파싱에 실패했습니다.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* 상단 축하 배너 */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/40 to-white p-5 border border-emerald-100 shadow-2xs">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-100">
            <Check className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900">
              전자책 집필 및 스타일링이 완성되었습니다!
            </h2>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              웹 배포 링크로 독자에게 실시간 공유하거나, 인터넷 없이 어디서나 동작하는 독립형 HTML, Vercel용 ZIP, 모바일 리더용 EPUB, 고해상도 인쇄 PDF로 저장하세요.
            </p>
          </div>
        </div>
      </div>

      {/* 4대 핵심 내보내기 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. 단일 독립 HTML 다운로드 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-2xs hover:border-indigo-300 transition flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <FileCode className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  독립형 단일 HTML 다운로드
                </h3>
                <span className="text-[11px] text-indigo-600 font-semibold">
                  (추천: 더블 클릭만으로 오프라인 즉시 열람)
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              단 하나의 `.html` 파일 안에 본문, 21종 테마 스위치, 폰트 조절, 실시간 검색창, 목차 드로어가 완결 번들링되어 있습니다.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadHtml}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs shadow-indigo-100 transition flex items-center justify-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>단일 HTML 파일 다운로드</span>
          </button>
        </div>

        {/* 2. 웹 배포용 ZIP (Vercel Drop 연동) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-2xs hover:border-slate-300 transition flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                <Archive className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  웹 배포용 ZIP (Vercel Drop)
                </h3>
                <span className="text-[11px] text-sky-600 font-semibold">
                  (원클릭 무료 웹 호스팅)
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              `index.html` 번들을 받아 Vercel Drop(vercel.com/new/drop) 화면에 끌어다 놓으면 누구나 3초 만에 나만의 고유 웹 주소를 만들 수 있습니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadZip}
              disabled={isExportingZip}
              className="flex-1 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>배포용 ZIP 받기</span>
            </button>
            <a
              href="https://vercel.com/new/drop"
              target="_blank"
              rel="noreferrer"
              className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1"
            >
              <span>Vercel 열기</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* 3. 표준 EPUB 다운로드 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-2xs hover:border-amber-300 transition flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  표준 EPUB 전자책 다운로드
                </h3>
                <span className="text-[11px] text-amber-600 font-semibold">
                  (전자책 리더기 호환)
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              밀리의 서재, 리디북스, Apple Books, Calibre 등 표준 e-book 리더 앱에서 바로 열리는 정식 EPUB 3.0 규격 파일입니다.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadEpub}
            disabled={isExportingEpub}
            className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EPUB 파일 다운로드</span>
          </button>
        </div>

        {/* 4. 브라우저 인쇄 / PDF 저장 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-2xs hover:border-rose-300 transition flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <Printer className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  인쇄 / 책 규격 PDF 저장
                </h3>
                <span className="text-[11px] text-rose-600 font-semibold">
                  (소장용 & 종이책 인쇄 규격)
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              네비게이션을 숨기고 챕터별 자동 페이지 나눔(`@media print`)이 적용된 고해상도 PDF를 브라우저 인쇄창을 통해 저장합니다.
            </p>
          </div>

          <button
            type="button"
            onClick={handlePrintPdf}
            className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>인쇄 창 열기 (PDF로 저장)</span>
          </button>
        </div>
      </div>

      {/* 5. 프로젝트 백업 & 복원 JSON */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold text-slate-800">
              프로젝트 원본 백업 및 복원
            </h3>
            <p className="text-[11px] text-slate-500">
              현재 작성 중인 전체 원고, 목차, 스타일 설정을 JSON 파일로 백업해두면 언제든 다시 불러와 수정할 수 있습니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportJson}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5 text-slate-500" />
              <span>프로젝트 JSON 백업</span>
            </button>

            <label className="cursor-pointer px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>JSON 불러오기</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportJson}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
