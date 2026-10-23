import pptxgen from "pptxgenjs";
import { BaseSlide } from "./types";

export async function exportToPptx(
  slides: BaseSlide[],
  presentationTitle: string = "AI 프레젠테이션"
): Promise<void> {
  if (!slides || slides.length === 0) {
    throw new Error("내보낼 슬라이드 데이터가 없습니다.");
  }

  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_16x9";
  pptx.title = presentationTitle;

  const PRIMARY_COLOR = "2563EB"; // Blue 600
  const DARK_TEXT = "1E293B"; // Slate 800
  const MUTED_TEXT = "64748B"; // Slate 500
  const BG_LIGHT = "F8FAFC"; // Slate 50
  const CARD_BG = "FFFFFF";

  slides.forEach((slide, index) => {
    const s = pptx.addSlide();
    s.background = { color: "FFFFFF" };

    // 스피커 노트 추가
    if (slide.notes) {
      s.addNotes(slide.notes);
    }

    const titleText = slide.title || `슬라이드 #${index + 1}`;
    const subheadText = slide.subhead || "";

    switch (slide.type) {
      case "title": {
        // 표지 슬라이드
        s.background = { color: BG_LIGHT };
        s.addText(titleText, {
          x: "10%",
          y: "35%",
          w: "80%",
          h: 1.5,
          fontSize: 38,
          bold: true,
          color: PRIMARY_COLOR,
          align: "center",
          valign: "middle",
        });

        if (subheadText) {
          s.addText(subheadText, {
            x: "10%",
            y: "52%",
            w: "80%",
            h: 0.8,
            fontSize: 20,
            color: DARK_TEXT,
            align: "center",
          });
        }

        const dateStr = slide.date || new Date().toISOString().split("T")[0].replace(/-/g, ".");
        s.addText(dateStr, {
          x: "10%",
          y: "68%",
          w: "80%",
          h: 0.5,
          fontSize: 14,
          color: MUTED_TEXT,
          align: "center",
        });
        break;
      }

      case "section": {
        // 간지 (섹션 구분 슬라이드)
        s.background = { color: "1E293B" };
        const sectionNo = slide.sectionNo ? `0${slide.sectionNo}` : `0${index}`;
        s.addText(sectionNo, {
          x: "10%",
          y: "28%",
          w: "80%",
          h: 1.2,
          fontSize: 64,
          bold: true,
          color: "334155",
          align: "center",
        });
        s.addText(titleText, {
          x: "10%",
          y: "48%",
          w: "80%",
          h: 1.2,
          fontSize: 36,
          bold: true,
          color: "FFFFFF",
          align: "center",
        });
        break;
      }

      case "closing": {
        // 클로징 슬라이드
        s.background = { color: "1E293B" };
        s.addText("감사합니다", {
          x: "10%",
          y: "38%",
          w: "80%",
          h: 1.2,
          fontSize: 44,
          bold: true,
          color: "FFFFFF",
          align: "center",
        });
        s.addText("Thank You for Listening", {
          x: "10%",
          y: "54%",
          w: "80%",
          h: 0.6,
          fontSize: 20,
          color: "94A3B8",
          align: "center",
        });
        break;
      }

      case "compare": {
        // 대비 비교 (As-Is / To-Be 또는 좌/우)
        addSlideHeader(s, titleText, subheadText, PRIMARY_COLOR, DARK_TEXT);

        const leftTitle = slide.leftTitle || "비교 A";
        const rightTitle = slide.rightTitle || "비교 B";
        const leftItems: string[] = slide.leftItems || [];
        const rightItems: string[] = slide.rightItems || [];

        // 좌측 카드
        s.addShape(pptx.ShapeType.roundRect, {
          x: "6%",
          y: "25%",
          w: "42%",
          h: "65%",
          fill: { color: "F1F5F9" },
          line: { color: "CBD5E1", width: 1 },
        });
        s.addText(leftTitle, {
          x: "8%",
          y: "28%",
          w: "38%",
          h: 0.5,
          fontSize: 18,
          bold: true,
          color: "334155",
        });
        const leftBullets = leftItems.map((item) => ({ text: item, options: { bullet: true, fontSize: 13, color: DARK_TEXT } }));
        s.addText(leftBullets, { x: "8%", y: "36%", w: "38%", h: "50%", valign: "top" });

        // 우측 카드
        s.addShape(pptx.ShapeType.roundRect, {
          x: "52%",
          y: "25%",
          w: "42%",
          h: "65%",
          fill: { color: "EFF6FF" },
          line: { color: "BFDBFE", width: 1 },
        });
        s.addText(rightTitle, {
          x: "54%",
          y: "28%",
          w: "38%",
          h: 0.5,
          fontSize: 18,
          bold: true,
          color: PRIMARY_COLOR,
        });
        const rightBullets = rightItems.map((item) => ({ text: item, options: { bullet: true, fontSize: 13, color: DARK_TEXT } }));
        s.addText(rightBullets, { x: "54%", y: "36%", w: "38%", h: "50%", valign: "top" });
        break;
      }

      case "process":
      case "processList": {
        addSlideHeader(s, titleText, subheadText, PRIMARY_COLOR, DARK_TEXT);
        const steps: string[] = slide.steps || [];
        const count = Math.min(steps.length, 5) || 1;
        const boxWidth = (88 - (count - 1) * 3) / count;

        steps.forEach((step, i) => {
          const posX = 6 + i * (boxWidth + 3);
          s.addShape(pptx.ShapeType.roundRect, {
            x: `${posX}%`,
            y: "32%",
            w: `${boxWidth}%`,
            h: "50%",
            fill: { color: "F8FAFC" },
            line: { color: i === 0 ? PRIMARY_COLOR : "CBD5E1", width: 1.5 },
          });
          s.addText(`STEP 0${i + 1}`, {
            x: `${posX}%`,
            y: "36%",
            w: `${boxWidth}%`,
            h: 0.4,
            fontSize: 12,
            bold: true,
            color: PRIMARY_COLOR,
            align: "center",
          });
          s.addText(step, {
            x: `${posX + 1}%`,
            y: "44%",
            w: `${boxWidth - 2}%`,
            h: "34%",
            fontSize: 13,
            color: DARK_TEXT,
            align: "center",
            valign: "middle",
          });
        });
        break;
      }

      case "kpi": {
        addSlideHeader(s, titleText, subheadText, PRIMARY_COLOR, DARK_TEXT);
        const items = slide.items || [];
        const count = Math.min(items.length, 4) || 1;
        const cardW = (88 - (count - 1) * 3) / count;

        items.forEach((item: any, i: number) => {
          const posX = 6 + i * (cardW + 3);
          s.addShape(pptx.ShapeType.roundRect, {
            x: `${posX}%`,
            y: "32%",
            w: `${cardW}%`,
            h: "50%",
            fill: { color: "EFF6FF" },
            line: { color: "BFDBFE", width: 1.5 },
          });
          s.addText(item.label || `지표 ${i + 1}`, {
            x: `${posX}%`,
            y: "36%",
            w: `${cardW}%`,
            h: 0.4,
            fontSize: 14,
            bold: true,
            color: "3B82F6",
            align: "center",
          });
          s.addText(item.value || "-", {
            x: `${posX}%`,
            y: "45%",
            w: `${cardW}%`,
            h: 0.8,
            fontSize: 28,
            bold: true,
            color: "1E293B",
            align: "center",
          });
          if (item.change) {
            s.addText(item.change, {
              x: `${posX}%`,
              y: "62%",
              w: `${cardW}%`,
              h: 0.4,
              fontSize: 12,
              bold: true,
              color: item.status === "good" ? "10B981" : item.status === "bad" ? "EF4444" : MUTED_TEXT,
              align: "center",
            });
          }
        });
        break;
      }

      case "table": {
        addSlideHeader(s, titleText, subheadText, PRIMARY_COLOR, DARK_TEXT);
        const headers: string[] = slide.headers || [];
        const rows: string[][] = slide.rows || [];

        if (headers.length > 0) {
          const tableData = [
            headers.map((h) => ({ text: h, options: { bold: true, fill: "3B82F6", color: "FFFFFF", fontSize: 12 } })),
            ...rows.map((row) =>
              row.map((cell) => ({ text: cell, options: { fontSize: 11, color: DARK_TEXT } }))
            ),
          ];

          s.addTable(tableData, {
            x: "6%",
            y: "28%",
            w: "88%",
            h: "58%",
            border: { pt: 0.5, color: "CBD5E1" },
            fill: { color: "FFFFFF" },
          });
        }
        break;
      }

      default: {
        // content, cards, headerCards, timeline, agenda 등 일반 및 리스트형
        addSlideHeader(s, titleText, subheadText, PRIMARY_COLOR, DARK_TEXT);

        const points: string[] =
          slide.points ||
          slide.items?.map((it: any) => (typeof it === "string" ? it : `${it.title || ""}: ${it.desc || ""}`)) ||
          slide.milestones?.map((m: any) => `[${m.date || ""}] ${m.label || ""}`) ||
          [];

        if (points.length > 0) {
          s.addShape(pptx.ShapeType.roundRect, {
            x: "6%",
            y: "26%",
            w: "88%",
            h: "64%",
            fill: { color: "F8FAFC" },
            line: { color: "E2E8F0", width: 1 },
          });

          const bulletItems = points.map((p) => ({
            text: p,
            options: {
              bullet: true,
              fontSize: 14,
              color: DARK_TEXT,
              breakLine: true,
            },
          }));

          s.addText(bulletItems, {
            x: "9%",
            y: "30%",
            w: "82%",
            h: "54%",
            valign: "top",
          });
        }
        break;
      }
    }

    // 출처 표기 (Source)
    if (slide.source) {
      s.addText(slide.source, {
        x: "6%",
        y: "93%",
        w: "88%",
        h: 0.3,
        fontSize: 9,
        color: MUTED_TEXT,
      });
    }
  });

  const fileName = `${presentationTitle.replace(/[^a-zA-Z0-9가-힣_-]/g, "_")}_${new Date().toISOString().split("T")[0]}.pptx`;
  await pptx.writeFile({ fileName });
}

function addSlideHeader(
  slide: any,
  title: string,
  subhead: string,
  primaryColor: string,
  darkTextColor: string
) {
  slide.addText(title, {
    x: "6%",
    y: "6%",
    w: "88%",
    h: 0.6,
    fontSize: 22,
    bold: true,
    color: primaryColor,
  });

  if (subhead) {
    slide.addText(subhead, {
      x: "6%",
      y: "14%",
      w: "88%",
      h: 0.45,
      fontSize: 13,
      color: darkTextColor,
    });
  }
}
