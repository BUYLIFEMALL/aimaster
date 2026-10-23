// 2026-10-21 병합 A: Website Scraper(ghost-scraper)에서 옮김 — 웹 크롤링 자동화 「한 페이지 분석」(/inspect).
/** CSV 다운로드 헬퍼 */
export function downloadCsv(data: string[][], filename: string): void {
  if (typeof window === "undefined") return;
  const csvContent =
    "\uFEFF" +
    data
      .map((row) =>
        row
          .map((cell) => {
            const str = String(cell ?? "").replace(/"/g, '""');
            return `"${str}"`;
          })
          .join(",")
      )
      .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
