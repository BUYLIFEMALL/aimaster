import { notFound } from "next/navigation";
import { Workbench } from "@/components/Workbench";
import { STEPS } from "@/components/navigation";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default async function WorkspacePage({ params }: { params: Promise<{ step: string }> }) { const { step } = await params; if (!STEPS.some(x => x.id === step)) notFound(); return <Workbench step={step}/>; }
