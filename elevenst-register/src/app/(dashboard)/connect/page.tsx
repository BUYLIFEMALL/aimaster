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
      <PageHeader emoji="🔑" title="API키등록·플랫폼연동" description="11번가 API 키와 내 고정 IP를 한 번 등록하고, 연결 시험으로 11번가가 받아들이는지 확인합니다." />

      <Box n={1} title="11번가 API 키">
        <p className="text-[13px] text-slate-600">
          11번가 셀러오피스 로그인 → OPEN API 센터 › 「API 관리」에서 키를 확인합니다(키 보기는 2차 인증 뒤). 키는 발급 후 약 1년이면 만료되니 「API 관리」의 만료일을 확인해 주세요.{" "}
          <a href="https://openapi.11st.co.kr/openapi/OpenApiServiceRegister.tmall" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-bold text-indigo-700 hover:underline">
            API 관리 열기 <ExternalLink size={11} />
          </a>
        </p>
        <KeyForm kind="elevenst" shown={s.elevenstKey} />
      </Box>

      <Box n={2} title="내 고정 IP(Fixie) 주소">
        <p className="text-[13px] text-slate-600">
          11번가는 「API 관리」에 등록된 IP에서 온 요청만 받습니다. 우리 서버는 나가는 IP가 바뀌므로 회원님 본인 Fixie 계정의 고정 IP로 내보냅니다. Fixie 화면의 주소(http://fixie:…)를 그대로 넣어 주세요.{" "}
          <a href="https://usefixie.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-bold text-indigo-700 hover:underline">
            Fixie <ExternalLink size={11} />
          </a>
        </p>
        <KeyForm kind="proxy" shown={s.proxy} />
      </Box>

      <Box n={3} title="11번가에 내 고정 IP 등록 → 연결 시험">
        <ol className="ml-5 list-decimal space-y-1 text-[13px] text-slate-600">
          <li>11번가 「API 관리 › 접속권한」에서 「IP 직접 입력」을 <b>사용</b>으로 고릅니다.</li>
          <li>「실서버 IP」 칸에 Fixie 화면의 고정 IP 2개를 세미콜론(;)으로 이어 넣고 저장합니다.</li>
          <li>아래 「연결 시험」을 누릅니다. 출고지·반품/교환지 주소를 읽기만 합니다.</li>
        </ol>
        <ConnectionTest ready={Boolean(s.elevenstKey)} />
      </Box>

      <Notice tone="warn">⚠️ 연결 시험이 「거절」로 실패하면 화면에 지금 11번가로 나가는 IP를 함께 보여 드립니다. 그 IP가 「실서버 IP」 칸에 있는지 확인해 주세요.</Notice>
    </div>
  );
}
