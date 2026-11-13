import { requireProgramAccess } from "@/lib/access";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { getSetupStatus } from "@/lib/setupStatus";
import { KeyForm } from "@/components/KeyForm";
import { ConnectionTest } from "@/components/ConnectionTest";
import { ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function Box({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-50 text-xs font-black text-[#FA0050]">
          {n}
        </span>
        <h2 className="text-base font-extrabold text-slate-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default async function ConnectPage() {
  const user = await requireProgramAccess();
  const s = await getSetupStatus(user.id);
  return (
    <div className="space-y-5">
      <PageHeader emoji="🔑" title="API키등록·플랫폼연동" description="11번가 공식 OPEN API 키를 등록하고 연결 시험으로 정상 통신을 확인합니다." />

      <Box n={1} title="11번가 OPEN API 키 등록">
        <p className="text-[13px] text-slate-600 leading-relaxed">
          11번가 셀러오피스 로그인 → OPEN API 센터 › 「API 관리」 › 「인증하기」(2차 인증) 후 발급된 키를 그대로 입력합니다. 키는 1년 주기로 갱신되므로 만료일을 확인해 주세요.{" "}
          <a href="https://openapi.11st.co.kr/openapi/OpenApiServiceRegister.tmall" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-[#FA0050] hover:underline">
            <span>11번가 API 관리 페이지 바로가기</span>
            <ExternalLink size={12} />
          </a>
        </p>
        <KeyForm shown={s.elevenstKey} />
      </Box>

      <Box n={2} title="11번가 연결 시험 (API 유효성 점검)">
        <p className="text-[13px] text-slate-600">출고지·반품/교환지 주소를 읽기만 하므로 11번가 상점에 어떠한 데이터도 생성되거나 변경되지 않는 안전한 읽기 전용 검사입니다.</p>
        <ConnectionTest ready={Boolean(s.elevenstKey)} />
      </Box>

      <Notice tone="tip">
        💡 <b>국내 서울 서버 직접 연결</b>: 11번가는 해외 IP 접근을 원천 차단하므로, 본 시스템은 서울 리전 전용 백엔드에서 11번가와 직접 통신합니다. 고정 프록시(Fixie) 없이도 언제나 안정적으로 동작합니다.
      </Notice>
    </div>
  );
}
