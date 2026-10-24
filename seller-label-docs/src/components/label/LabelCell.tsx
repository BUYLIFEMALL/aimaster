"use client";

import { toSVG } from "bwip-js/browser";
import { bwipOptions, checkCodeValue } from "@/lib/label/barcode";
import { fillTemplate } from "@/lib/label/layout";
import type { LabelTemplate } from "@/lib/label/template";

const svgCache = new Map<string, string>();

/** 바코드·QR을 SVG 글자로 만든다(같은 값은 다시 만들지 않음). 실패하면 null. */
export function codeSvg(type: LabelTemplate["code"], value: string): string | null {
  if (type === "none" || checkCodeValue(type, value)) return null;
  const key = `${type}|${value}`;
  const hit = svgCache.get(key);
  if (hit) return hit;
  try {
    const svg = toSVG(bwipOptions(type, value));
    if (svgCache.size > 3000) svgCache.clear();
    svgCache.set(key, svg);
    return svg;
  } catch {
    return null;
  }
}

/** 라벨 한 칸의 내용. 크기는 부모(칸)가 정하고 여기서는 mm 단위 글·코드만 배치한다. */
export function LabelCell({ template, record }: { template: LabelTemplate; record: Record<string, string> }) {
  const pad = `${template.paddingMm}mm`;
  if (template.kind === "food") {
    const rows = template.food.map((f) => ({ label: f.label, value: fillTemplate(f.value, record) })).filter((f) => f.value.trim());
    return (
      <div style={{ padding: pad, fontSize: `${template.fontPt}pt`, lineHeight: 1.25, height: "100%", boxSizing: "border-box" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <th style={{ border: "0.2mm solid #000", padding: "0.4mm 0.8mm", textAlign: "left", whiteSpace: "nowrap", verticalAlign: "top", fontWeight: 700, width: "1%" }}>{r.label}</th>
                <td style={{ border: "0.2mm solid #000", padding: "0.4mm 0.8mm", wordBreak: "keep-all", overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const lines = fillTemplate(template.text, record).split("\n");
  const value = fillTemplate(template.codeValue, record);
  const svg = codeSvg(template.code, value);
  const twoD = template.code === "qrcode" || template.code === "datamatrix";
  const right = template.codePos === "right";
  const codeBox = svg ? (
    <div
      style={{
        flex: "0 0 auto",
        width: right || twoD ? `${template.codeSizeMm}mm` : "100%",
        height: twoD ? `${template.codeSizeMm}mm` : right ? "auto" : `${template.codeSizeMm}mm`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  ) : null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: right ? "row" : "column",
        gap: "1.5mm",
        padding: pad,
        height: "100%",
        boxSizing: "border-box",
        alignItems: right ? "center" : template.align === "center" ? "center" : "stretch",
      }}
    >
      <div style={{ flex: "1 1 auto", minWidth: 0, textAlign: template.align, fontSize: `${template.fontPt}pt`, lineHeight: 1.3, overflow: "hidden" }}>
        {lines.map((line, i) => (
          <div key={i} style={{ fontWeight: template.boldFirst && i === 0 ? 700 : 400, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {line || " "}
          </div>
        ))}
      </div>
      {codeBox}
    </div>
  );
}
