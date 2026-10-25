"use client";

// 🏛 실거래가 비교용 공공데이터 키(선택, 2026-10-25 v1.19). 회원 본인 키가 있으면 그 키로, 없으면 운영자 공용 키로 비교한다(주인님 승인).
// 공용 user_api_keys data_go_kr_service_key — 부동산 실거래 프로그램과 같은 이름이라 한 번 등록하면 함께 쓴다.
import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePublicDataKeyAction, savePublicDataKeyAction } from "@/lib/actions/notify";

export default function PublicDataKeyCard({ hasKey }: { hasKey: boolean }) {
  const router = useRouter();
  const [state, action, saving] = useActionState(async (prev: { error?: string; success?: string }, fd: FormData) => {
    const r = await savePublicDataKeyAction(prev, fd);
    if (r.success) router.refresh();
    return r;
  }, {});
  const [del, startDel] = useTransition();
  return (
    <div className="ra-hint ra-pd-card">
      <strong>{hasKey ? "✅ 내 공공데이터 키로 비교 중" : "⚪ 키 없이도 비교돼요 — 운영자 공용 키 사용 중"}</strong>
      <span>매매 매물마다 같은 단지·면적대의 최근 6개월 <b>국토교통부 실거래가</b>와 비교해 「실거래 대비 ▲8% 높음」처럼 보여 드려요. 회원님 매물은 보내지 않고, 단지 이름·지역 코드만 써요.</span>
      <span>사용자가 많아져 공용 키 한도에 걸릴 때를 대비해 <b>본인 키를 넣어 두면 더 안정적</b>이에요(무료): 공공데이터포털 → 「국토교통부_아파트 매매 실거래가 자료」 활용신청 → 마이페이지의 <b>일반 인증키</b> 복사.</span>
      <form action={action} className="ra-inline-form">
        <div className="field"><label htmlFor="pdKey">🔑 공공데이터 일반 인증키(선택)</label><input id="pdKey" name="pdKey" autoComplete="off" placeholder={hasKey ? "새 키로 바꾸려면 붙여 넣기" : "Decoding 또는 Encoding 키"} /></div>
        <button className="secondary" type="submit" disabled={saving}>{saving ? "저장 중..." : "키 저장"}</button>
        {hasKey && <button className="secondary" type="button" disabled={del} onClick={() => startDel(async () => { await deletePublicDataKeyAction(); router.refresh(); })}>키 지우기</button>}
        <a className="secondary ra-link-btn" href="https://www.data.go.kr/tcs/dss/selectDataSetList.do?keyword=%EC%95%84%ED%8C%8C%ED%8A%B8%20%EB%A7%A4%EB%A7%A4%20%EC%8B%A4%EA%B1%B0%EB%9E%98%EA%B0%80" target="_blank" rel="noopener noreferrer">🏛 활용신청 열기 ↗</a>
      </form>
      {state.error && <p className="ra-msg ra-err">{state.error}</p>}
      {state.success && <p className="ra-msg ra-ok">{state.success}</p>}
    </div>
  );
}
