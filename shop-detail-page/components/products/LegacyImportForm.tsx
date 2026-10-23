"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { uploadImageDirect, uploadCustomSectionImage } from "@/lib/uploadImageClient";
import { importLegacyProductAction } from "@/lib/actions/products";
import { addCustomSectionImageAction } from "@/lib/actions/images";

// v1.16(이커머스 병합 E1): AI 12단 상세페이지(detail-page-12p)의 JSON 백업 파일을 상품으로 옮긴다.
// 12단 백업 형식: DetailPageProject[] (detail-page-12p/src/types/detail.ts). AI 호출 없음.

interface LegacyScene {
  index?: number;
  imageUrl?: string;
}
interface LegacyProject {
  id?: string;
  title?: string;
  platform?: "coupang" | "smartstore";
  productData?: {
    productName?: string;
    originalPrice?: number;
    salePrice?: number;
    description?: string;
    targetAudience?: string;
    toneAndManner?: string;
    specDocContent?: string;
    productImages?: string[];
  };
  scenes?: LegacyScene[];
}

const SAMPLE_PROJECT_ID = "sample-titanium-firepit-12p";
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

/** 12단이 저장한 data: 주소 이미지를 파일로 바꾼다. SVG 대체 그림·외부 주소는 null. */
function dataUrlToFile(dataUrl: string | undefined, name: string): File | null {
  const m = dataUrl?.match(/^data:([^;,]+);base64,(.+)$/);
  if (!m || !ALLOWED.has(m[1])) return null;
  const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
  const ext = m[1].split("/")[1];
  return new File([bytes], `${name}.${ext}`, { type: m[1] });
}

function realScenes(p: LegacyProject) {
  return (p.scenes ?? []).filter((s) => dataUrlToFile(s.imageUrl, "probe") !== null);
}

export function LegacyImportForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [projects, setProjects] = useState<LegacyProject[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setLog([]);
    setDone(false);
    try {
      const parsed = JSON.parse(await file.text());
      const list: LegacyProject[] = (Array.isArray(parsed) ? parsed : [parsed]).filter(
        (p: LegacyProject) => p && p.id !== SAMPLE_PROJECT_ID && Array.isArray(p.scenes),
      );
      if (list.length === 0) {
        setError("가져올 12단 프로젝트가 없습니다. 12단 화면에서 내려받은 백업 파일(detail_page_12p_backup_….json)인지 확인해 주세요.");
      }
      setProjects(list);
    } catch {
      setError("JSON 파일을 읽지 못했습니다. 12단 백업 파일인지 확인해 주세요.");
    }
  }

  async function runImport() {
    setRunning(true);
    setError(null);
    const lines: string[] = [];
    const push = (s: string) => {
      lines.push(s);
      setLog([...lines]);
    };
    try {
      for (const p of projects) {
        const name = p.title || p.productData?.productName || "(이름 없음)";
        const scenes = realScenes(p);
        const sourceFile =
          (p.productData?.productImages ?? []).map((u, i) => dataUrlToFile(u, `source-${i}`)).find(Boolean) ??
          dataUrlToFile(scenes[0]?.imageUrl, "source");
        if (!sourceFile) {
          push(`⏭️ ${name}: 실제 이미지가 없어 건너뜀(대체 그림만 있음)`);
          continue;
        }
        const up = await uploadImageDirect(sourceFile);
        if (!up.url) {
          push(`❌ ${name}: 대표이미지 올리기 실패 — ${up.error ?? "알 수 없는 오류"}`);
          continue;
        }
        const created = await importLegacyProductAction({
          title: p.title ?? "",
          productName: p.productData?.productName ?? "",
          originalPrice: p.productData?.originalPrice,
          salePrice: p.productData?.salePrice,
          description: p.productData?.description,
          targetAudience: p.productData?.targetAudience,
          toneAndManner: p.productData?.toneAndManner,
          specDocContent: p.productData?.specDocContent,
          platform: p.platform === "smartstore" ? "smartstore" : "coupang",
          sourceImageUrl: up.url,
        });
        if (!created.productId) {
          push(`❌ ${name}: 상품 저장 실패 — ${created.error ?? "알 수 없는 오류"}`);
          continue;
        }
        let attached = 0;
        for (const s of scenes) {
          const t = created.templates?.find((x) => x.section_order === s.index);
          const f = dataUrlToFile(s.imageUrl, `scene-${s.index}`);
          if (!t || !f) continue;
          const img = await uploadCustomSectionImage(created.productId, t.section_key, f);
          if (!img.url) continue;
          const res = await addCustomSectionImageAction(created.productId, t.id, img.url);
          if (!res.error) attached += 1;
        }
        push(`✅ ${name}: 상품 저장, 장면 이미지 ${attached}/${scenes.length}장`);
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "가져오는 중 오류가 발생했습니다.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-3">
        <h2 className="text-sm sm:text-base font-bold text-slate-900">1. 12단에서 백업 파일 내려받기</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          AI 12단 상세페이지는 결과를 <b>그 브라우저에만</b> 저장했습니다. 12단을 쓰던 같은 브라우저에서{" "}
          <a href="https://detail-12p.buylife.xyz" target="_blank" rel="noreferrer" className="font-bold text-blue-600 underline">
            detail-12p.buylife.xyz
          </a>
          를 열고 「내 12단 자료 백업 내려받기」를 눌러 JSON 파일을 받으세요.
        </p>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-3">
        <h2 className="text-sm sm:text-base font-bold text-slate-900">2. 백업 파일 올리기</h2>
        <input ref={inputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFile} />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={running}
          className="text-sm font-bold px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-white disabled:opacity-50"
        >
          📂 JSON 백업 파일 선택
        </button>
        {projects.length > 0 && (
          <ul className="text-xs text-slate-600 space-y-1">
            {projects.map((p, i) => (
              <li key={p.id ?? i}>
                • {p.title || p.productData?.productName || "(이름 없음)"} —{" "}
                {p.platform === "smartstore" ? "스마트스토어 9단" : "쿠팡 12단"}, 실제 이미지 {realScenes(p).length}장
              </li>
            ))}
          </ul>
        )}
        {error && <p className="text-xs font-semibold text-rose-700 bg-rose-50 rounded-lg p-3 border border-rose-200">{error}</p>}
      </div>

      {projects.length > 0 && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-3">
          <h2 className="text-sm sm:text-base font-bold text-slate-900">3. 가져오기</h2>
          <p className="text-xs text-slate-500">
            AI를 다시 부르지 않으므로 요금이 들지 않습니다. 12단의 장면 카피 문구는 이미지 위에 따로 얹던 방식이라 옮겨지지 않고,
            이미지와 상품 정보만 옮겨집니다. 옮긴 상품도 오늘부터 30일 뒤 자동 삭제됩니다.
          </p>
          <button
            type="button"
            onClick={runImport}
            disabled={running || done}
            className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl"
          >
            {running ? "가져오는 중..." : done ? "가져오기 완료" : `📦 ${projects.length}개 프로젝트 가져오기`}
          </button>
          {log.length > 0 && (
            <ul className="text-xs text-slate-700 space-y-1 bg-slate-50 rounded-lg p-3 border border-slate-200">
              {log.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          )}
          {done && (
            <Link href="/products" className="inline-block text-sm font-bold text-blue-600 underline">
              상품 목록에서 확인하기 →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
