"use client";

// M5-1b 몰 주소 — 하위 도메인(<몰>.buylife.xyz, 자동)과 자기 도메인(예: myshop.co.kr, 운영사가 등록 → 플랫폼이 연결)
import { useState, useTransition } from "react";
import { saveDomainAction, type DomainState } from "./domain-actions";

export default function DomainForm({ slug, domain, subdomainUrl, gated }: { slug: string; domain: string; subdomainUrl: string | null; gated: boolean }) {
  const [value, setValue] = useState(domain);
  const [state, setState] = useState<DomainState>({ error: null, message: null, domain });
  const [pending, start] = useTransition();
  const saved = state.domain;
  const apex = saved && saved.split(".").length === 2;

  const save = (next: string) => start(async () => {
    const r = await saveDomainAction(slug, next);
    setState(r);
    if (!r.error) setValue(r.domain);
  });

  return (
    <fieldset className="rounded-lg border p-4" data-domain-setting>
      <legend className="px-1 text-sm font-semibold">🌐 몰 주소</legend>
      <p className="text-sm text-gray-700">
        기본 주소: {subdomainUrl ? <a href={subdomainUrl} target="_blank" rel="noreferrer" className="font-mono text-blue-700 underline" data-subdomain-url>{subdomainUrl}</a> : <span className="font-mono">/s/{slug}</span>}
      </p>
      <label className="mt-3 block text-sm font-medium" htmlFor="custom-domain">자기 도메인(선택)</label>
      <div className="mt-1 flex flex-wrap gap-2">
        <input id="custom-domain" value={value} onChange={(e) => setValue(e.target.value)} placeholder="예: myshop.co.kr" className="min-h-11 min-w-0 flex-1 rounded border px-3 font-mono text-sm" disabled={pending} data-domain-input />
        <button type="button" onClick={() => save(value)} disabled={pending} className="min-h-11 rounded bg-gray-900 px-4 text-sm text-white">{pending ? "저장 중…" : "저장"}</button>
        {saved && <button type="button" onClick={() => save("")} disabled={pending} className="min-h-11 px-2 text-sm text-red-700">지우기</button>}
      </div>
      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      {state.message && <p className="mt-2 text-sm text-green-700">{state.message}</p>}
      {saved && (
        <div className="mt-3 rounded bg-gray-50 p-3 text-sm text-gray-700" data-dns-guide>
          <p className="font-semibold">도메인을 산 곳(가비아·카페24·Cloudflare 등)의 DNS 설정에 아래 한 줄을 넣어 주세요.</p>
          <table className="mt-2 w-full text-left font-mono text-xs">
            <thead><tr><th className="pr-3">종류</th><th className="pr-3">이름</th><th>값</th></tr></thead>
            <tbody>
              {apex
                ? <tr><td className="pr-3">A</td><td className="pr-3">@</td><td>76.76.21.21</td></tr>
                : <tr><td className="pr-3">CNAME</td><td className="pr-3">{saved.split(".")[0]}</td><td>cname.vercel-dns.com</td></tr>}
            </tbody>
          </table>
          <ul className="mt-2 list-disc pl-5 text-xs text-gray-600">
            <li>DNS를 넣은 뒤 플랫폼이 이 주소를 연결합니다. 연결 전에는 접속되지 않습니다.</li>
            <li>자기 도메인에서는 로그인이 그 주소에서만 유지됩니다(기본 주소와 로그인이 따로).</li>
            {gated && <li>지금은 AIMaster 회원 전용 운영 중이라 자기 도메인으로는 로그인 화면이 열리지 않습니다. 공개 몰로 바뀐 뒤 쓸 수 있습니다.</li>}
          </ul>
        </div>
      )}
    </fieldset>
  );
}
