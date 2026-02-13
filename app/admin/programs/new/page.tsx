import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import GoldGradientText from "@/components/ui/GoldGradientText";
import ProgramForm from "@/components/admin/ProgramForm";

export default function NewProgramPage() {
  return (
    <div>
      <div className="mb-8">
        <Link
          href="/admin/programs"
          className="inline-flex items-center gap-2 text-subtext hover:text-white text-sm mb-4 transition-colors"
        >
          <ArrowLeft size={14} />
          프로그램 목록
        </Link>
        <h1 className="text-2xl font-bold text-white">
          새 <GoldGradientText>프로그램</GoldGradientText> 등록
        </h1>
        <p className="text-subtext mt-1">새로운 마케팅 자동화 프로그램을 등록하세요</p>
      </div>
      <ProgramForm />
    </div>
  );
}
