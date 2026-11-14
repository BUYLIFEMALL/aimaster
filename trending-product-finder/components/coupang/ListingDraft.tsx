"use client";

// E2-2 상품명·태그 초안 — 회원이 누를 때만 회원 본인 Claude 키로 1번 부르고, 결과는 화면에서 고쳐 쓰고 복사한다(저장·자동 전송 없음).
// 규칙 검사(길이·반복·홍보 문구·꾸밈 기호)는 고칠 때마다 바로 다시 본다.
import { useState } from "react";
import { draftListingAction, type DraftResult } from "@/lib/actions/registerHelper";
import { checkTitle, cleanTags, MAX_TAGS, type ListingMarket } from "@/lib/listingRules";

type Related = { keyword: string; searches: number; usedInSample: number };

export function ListingDraft({ market, keyword, words, related, priceMedian, names }: { market: ListingMarket; keyword: string; words: string[]; related: Related[]; priceMedian: number | null; names: string[] }) {
  const [note, setNote] = useState("");
  const [draft, setDraft] = useState<DraftResult | null>(null);
  const [titles, setTitles] = useState<string[]>([]);
  const [tagText, setTagText] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [needsKey, setNeedsKey] = useState(false);
  const [copied, setCopied] = useState("");

  async function run() {
    setLoading(true);
    setMessage("");
    setNeedsKey(false);
    const result = await draftListingAction({ market, keyword, topWords: words, related, priceMedian, sampleNames: names, note });
    setLoading(false);
    if (result.error || !result.draft) {
      setMessage(result.error ?? "초안을 만들지 못했습니다.");
      setNeedsKey(Boolean(result.needsKey));
      return;
    }
    setDraft(result.draft);
    setTitles(result.draft.titles);
    setTagText(result.draft.tags.join(", "));
  }

  async function copy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      setMessage("복사하지 못했습니다. 글을 직접 선택해 복사해 주세요.");
    }
  }

  const tags = cleanTags(tagText.split(/[,\n]/));

  return (
    <div className="mt-3 rounded-lg bg-mx-raised p-3">
      <p className="text-xs font-bold text-mx-text">✨ 상품명·태그 초안 (내 Claude 키, 누를 때 1번)</p>
      <p className="mt-1 text-[11px] text-mx-muted">
        위 낱말·가격대{related.length ? "·연관 키워드" : ""}와 표본 상품명 {names.length}개를 근거로 상품명 3개·태그 {MAX_TAGS}개를 만듭니다. 1번에 약 10~30원(내 Claude 키). 연관 키워드를 먼저 불러오면 태그가 더 좋아집니다.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={200}
          placeholder="내 상품 특징(선택) — 예: 접이식, 알루미늄, 120kg 지지"
          className="min-w-0 flex-1 rounded border border-mx-border bg-transparent px-2 py-1.5 text-sm text-mx-text"
        />
        <button type="button" onClick={run} disabled={loading || !keyword.trim()} className="mx-btn-primary whitespace-nowrap px-3 py-2 text-xs font-bold disabled:opacity-50">
          {loading ? "만드는 중…" : draft ? "다시 만들기" : "초안 만들기"}
        </button>
      </div>
      <p className="mt-1 text-[11px] text-mx-muted">특징 칸에 적은 사양만 상품명에 넣습니다. 적지 않은 용량·소재·인증은 AI가 지어내지 않게 했지만, 올리기 전에 꼭 실제 상품과 맞는지 확인하세요.</p>
      {message && (
        <p className="mt-2 text-xs text-[#fca5a5]">
          {message}
          {needsKey && (
            <>
              {" "}
              <a href="https://www.buylife.xyz/api-settings" target="_blank" rel="noopener noreferrer" className="font-bold text-[#93c5fd] hover:underline">API 설정 열기 ↗</a>
            </>
          )}
        </p>
      )}

      {draft && (
        <div className="mt-3 space-y-2">
          {titles.map((title, index) => {
            const issues = checkTitle(title, market);
            return (
              <div key={index} className="rounded border border-mx-border p-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-mx-muted">{index + 1}</span>
                  <input
                    value={title}
                    onChange={(event) => setTitles((prev) => prev.map((t, i) => (i === index ? event.target.value : t)))}
                    className="min-w-0 flex-1 rounded border border-mx-border bg-transparent px-2 py-1 text-sm text-mx-text"
                  />
                  <span className="whitespace-nowrap text-[11px] text-mx-muted">{[...title.trim()].length}자</span>
                  <button type="button" onClick={() => copy(title.trim(), `t${index}`)} className="whitespace-nowrap rounded border border-mx-border px-2 py-1 text-[11px] font-bold text-mx-link">
                    {copied === `t${index}` ? "복사됨" : "복사"}
                  </button>
                </div>
                {issues.length > 0 ? (
                  <ul className="mt-1 space-y-0.5 pl-5 text-[11px]">
                    {issues.map((issue) => (
                      <li key={issue.text} className={issue.level === "error" ? "text-[#fca5a5]" : "text-[#fcd34d]"}>⚠ {issue.text}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 pl-5 text-[11px] text-[#86efac]">✓ 규칙 검사 통과</p>
                )}
              </div>
            );
          })}

          <div className="rounded border border-mx-border p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-mx-text">🏷 태그 {tags.length}/{MAX_TAGS}</span>
              <button type="button" onClick={() => copy(tags.join(","), "tags")} className="rounded border border-mx-border px-2 py-1 text-[11px] font-bold text-mx-link">
                {copied === "tags" ? "복사됨" : "쉼표로 복사"}
              </button>
            </div>
            <textarea
              value={tagText}
              onChange={(event) => setTagText(event.target.value)}
              rows={2}
              className="mt-1 w-full rounded border border-mx-border bg-transparent px-2 py-1 text-xs text-mx-text"
            />
            <div className="mt-1 flex flex-wrap gap-1">
              {tags.map((tag) => (
                <span key={tag} className="rounded bg-mx-primary/10 px-1.5 py-0.5 text-[11px] text-mx-text">#{tag}</span>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-mx-muted">쉼표로 나눕니다. 같은 태그·20자 넘는 태그는 빼고 {MAX_TAGS}개까지만 셉니다. 스마트스토어는 카테고리·브랜드 이름이 든 태그를 거절할 수 있습니다.</p>
          </div>
          {draft.reason && <p className="text-[11px] text-mx-muted">근거: {draft.reason}</p>}
        </div>
      )}
    </div>
  );
}
