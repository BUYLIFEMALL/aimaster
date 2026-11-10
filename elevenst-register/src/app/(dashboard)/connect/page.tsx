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
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <h2 className="text-base font-extrabold text-slate-900">
        {n}. {title}
      </h2>
      {children}
    </section>
  );
}

export default async function ConnectPage() {
  const user = await requireProgramAccess();
  const s = await getSetupStatus(user.id);
  return (
    <div className="space-y-5">
      <PageHeader emoji="🔑" title="API키등록·플랫폼연동" description="11번가 API 키를 한 번 등록하고, 연결 시험으로 11번가가 받아들이는지 확인합니다." />

      <Box n={1} title="11번가 API 키">
        <p className="text-[13px] text-slate-600">
          11번가 셀러오피스 로그인 → OPEN API 센터 › 「API 관리」 › 「인증하기」(2차 인증) 뒤 보이는 키를 그대로 복사해 넣습니다. 키는 발급 후 약 1년이면 만료되니 「API 관리」의 만료일을 확인해 주세요.{" "}
          <a href="https://openapi.11st.co.kr/openapi/OpenApiServiceRegister.tmall" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-bold text-indigo-700 hover:underline">
            API 관리 열기 <ExternalLink size={11} />
          </a>
        </p>
        <KeyForm shown={s.elevenstKey} />
      </Box>

      <Box n={2} title="연결 시험">
        <p className="text-[13px] text-slate-600">출고지·반품/교환지 주소를 읽기만 합니다. 11번가에 아무것도 만들거나 바꾸지 않습니다.</p>
        <ConnectionTest ready={Boolean(s.elevenstKey)} />
      </Box>

      <Notice tone="tip">
        💡 고정 IP(Fixie)는 필요 없습니다. 11번가는 해외 IP 접속을 막기 때문에 이 프로그램은 한국(서울) 서버에서 11번가에 직접 연결합니다. 11번가 「API 관리 › 접속권한」에 이미 넣은 IP는 그대로 두셔도 됩니다.
      </Notice>
    </div>
  );
}
