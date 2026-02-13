import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import GoldGradientText from "@/components/ui/GoldGradientText";
import ProgramForm from "@/components/admin/ProgramForm";
import { createClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProgramPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: program } = await supabase
    .from("programs")
    .select("*, pricing_plans(*)")
    .eq("id", id)
    .single();

  if (!program) notFound();

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
          프로그램 <GoldGradientText>수정</GoldGradientText>
        </h1>
        <p className="text-subtext mt-1">{program.name}</p>
      </div>
      <ProgramForm program={program} />
    </div>
  );
}
