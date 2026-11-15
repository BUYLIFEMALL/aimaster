"use client";

// M2-5 이용약관·개인정보 처리방침 편집 — 「기본 서식 넣기」로 사업자 정보가 채워진 초안을 넣고 고쳐 저장한다
import { useActionState, useState } from "react";
import { POLICY_KINDS, POLICY_LABEL, POLICY_MAX, POLICY_PATH, type PolicyKind } from "@/lib/policies";
import { savePolicyAction, type PolicyState } from "./policy-actions";

const INITIAL: PolicyState = { error: null, message: null };

function One({ slug, kind, body, template, viewHref }: { slug: string; kind: PolicyKind; body: string; template: string; viewHref: string }) {
  const [state, action, pending] = useActionState(savePolicyAction.bind(null, slug, kind), INITIAL);
  const [text, setText] = useState(body);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const putTemplate = () => {
    // 이미 쓴 내용이 있으면 한 번 더 눌러야 바뀜(브라우저 확인 창 대신)
    if (text && !confirmReplace) return setConfirmReplace(true);
    setText(template);
    setConfirmReplace(false);
  };
  return (
    <form action={action} className="space-y-2" data-policy={kind}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold">{POLICY_LABEL[kind]}</h3>
        <span className="text-xs text-gray-500">{text ? `${text.length.toLocaleString("ko-KR")}자` : "비어 있음(유저 화면에 안 보임)"}</span>
        {body && (
          <a href={viewHref} target="_blank" rel="noreferrer" className="text-xs text-blue-700 underline">유저 화면 보기 ↗</a>
        )}
        <button type="button" onClick={putTemplate} className="ml-auto rounded border px-2 py-1 text-xs" data-policy-template>
          {confirmReplace ? "지금 내용을 지우고 서식으로 바꾸기" : "기본 서식 넣기"}
        </button>
      </div>
      <textarea name="body" value={text} onChange={(e) => setText(e.target.value)} maxLength={POLICY_MAX} rows={10} className="w-full rounded border px-3 py-2 font-mono text-xs leading-5" />
      <div className="flex items-center gap-3">
        <button disabled={pending} className="min-h-10 rounded bg-gray-900 px-4 py-1.5 text-sm text-white disabled:opacity-50">
          {pending ? "저장 중…" : `${POLICY_LABEL[kind]} 저장`}
        </button>
        {state.error && <span className="text-sm text-red-600">{state.error}</span>}
        {state.message && <span className="text-sm text-green-700" data-policy-saved>{state.message}</span>}
      </div>
    </form>
  );
}

export default function PolicyForm({
  slug,
  base,
  bodies,
  templates,
  resale,
}: {
  slug: string;
  base: string;
  bodies: Record<PolicyKind, string>;
  templates: Record<PolicyKind, string>;
  resale: boolean;
}) {
  return (
    <fieldset className="space-y-4 rounded-lg border p-4" data-policy-form>
      <legend className="px-1 text-sm font-semibold">📜 이용약관·개인정보 처리방침</legend>
      {resale ? (
        <p className="text-sm text-gray-600">분양몰은 본사(판매·발송 주체)의 약관과 개인정보 처리방침을 그대로 보여 줍니다. 고칠 일이 있으면 본사에 요청해 주세요.</p>
      ) : (
        <>
          <p className="text-sm text-gray-600">
            유저 화면 바닥글과 회원 가입 화면에 링크됩니다. 「기본 서식 넣기」는 공정위 전자상거래 표준약관·개인정보 처리방침 작성 지침의 일반 목차로 만든 <b>초안</b>이며 법률 검토를 거친 문서가 아닙니다 — 사업장에 맞게 고쳐 쓰세요(「[ ]」 칸은 꼭 채워 주세요).
          </p>
          {POLICY_KINDS.map((k) => (
            <One key={k} slug={slug} kind={k} body={bodies[k]} template={templates[k]} viewHref={`${base}${POLICY_PATH[k]}`} />
          ))}
        </>
      )}
    </fieldset>
  );
}
