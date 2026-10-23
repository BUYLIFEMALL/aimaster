import { unicodeLength, MAX_SOURCE } from "./model";
// Only walk supported text nodes from an inert document. Raw HTML is never rendered.
export function docxHtmlToMarkdown(html: string) {
  const document = new DOMParser().parseFromString(html, "text/html");
  const walk = (node: Node, depth = 0): string => {
    if (depth > 50) throw new Error("문서 구조가 너무 복잡합니다.");
    if (node.nodeType === 3) return node.textContent ?? "";
    if (!(node instanceof Element)) return "";
    const tag = node.tagName.toLowerCase();
    if (
      [
        "script",
        "style",
        "iframe",
        "object",
        "embed",
        "img",
        "svg",
        "link",
      ].includes(tag)
    )
      return "";
    const value = Array.from(node.childNodes)
      .map((n) => walk(n, depth + 1))
      .join("");
    if (/^h[1-6]$/.test(tag))
      return `${"#".repeat(Number(tag[1]))} ${value.trim()}\n\n`;
    if (tag === "p") return `${value.trim()}\n\n`;
    if (tag === "br") return "\n";
    if (tag === "strong" || tag === "b") return `**${value}**`;
    if (tag === "em" || tag === "i") return `*${value}*`;
    if (tag === "li")
      return `${node.parentElement?.tagName === "OL" ? "1." : "-"} ${value.trim()}\n`;
    if (tag === "ul" || tag === "ol") return value + "\n";
    if (tag === "table") {
      const rows = Array.from(node.querySelectorAll("tr")).map((row) =>
        Array.from(row.children)
          .filter((c) => ["TD", "TH"].includes(c.tagName))
          .map((c) =>
            walk(c, depth + 1)
              .trim()
              .replaceAll("|", "\\|")
              .replace(/\n+/g, " "),
          ),
      );
      if (!rows.length) return "";
      const width = Math.max(...rows.map((r) => r.length));
      const normalized = rows.map((r) =>
        Array.from({ length: width }, (_, i) => r[i] ?? ""),
      );
      return (
        [normalized[0], Array(width).fill("---"), ...normalized.slice(1)]
          .map((r) => `| ${r.join(" | ")} |`)
          .join("\n") + "\n\n"
      );
    }
    return value;
  };
  return Array.from(document.body.childNodes)
    .map((n) => walk(n))
    .join("")
    .trim();
}
export async function importDocument(
  file: File,
  onProgress: (message: string) => void = () => {},
) {
  if (file.size > 5 * 1024 * 1024)
    throw new Error("파일은 5MB까지 불러올 수 있습니다.");
  if (!/\.(txt|pdf|docx)$/i.test(file.name))
    throw new Error("TXT, PDF, DOCX 파일만 불러올 수 있습니다.");
  const buffer = await file.arrayBuffer();
  return new Promise<string>((resolve, reject) => {
    const worker = new Worker("/workers/import.worker.js", { type: "module" });
    const finish = (error?: string, text?: string) => {
      clearTimeout(timer);
      worker.terminate();
      error ? reject(new Error(error)) : resolve(text ?? "");
    };
    const timer = setTimeout(
      () => finish("파일 읽기가 오래 걸립니다. 문서를 나누어주세요."),
      30_000,
    );
    worker.onerror = () =>
      finish(
        "문서 읽기 기능을 준비하지 못했습니다. 새로고침 후 다시 시도해주세요.",
      );
    worker.onmessage = ({ data }) => {
      if (data.progress) {
        onProgress(data.progress);
        return;
      }
      if (data.error) {
        finish(data.error);
        return;
      }
      try {
        const text = data.html
          ? docxHtmlToMarkdown(data.html)
          : String(data.text ?? "").trim();
        if (!text.trim()) throw new Error("문서에 텍스트가 없습니다.");
        if (unicodeLength(text) > MAX_SOURCE)
          throw new Error(
            "추출한 원문이 20,000자를 넘습니다. 문서를 나누어주세요.",
          );
        finish(undefined, text);
      } catch (e) {
        finish(e instanceof Error ? e.message : "문서를 읽지 못했습니다.");
      }
    };
    worker.postMessage({ buffer, name: file.name }, [buffer]);
  });
}
