import { requireProgramAccess } from "@/lib/access";
import { getUserApiKey, maskApiKey } from "@/lib/apiKeys";
import { DrawFlow } from "@/components/DrawFlow";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DrawPage() {
  const user = await requireProgramAccess();

  const [geminiRaw, openaiRaw] = await Promise.all([
    getUserApiKey(user.id, "gemini"),
    getUserApiKey(user.id, "openai"),
  ]);

  const geminiMasked = geminiRaw ? maskApiKey(geminiRaw) : null;
  const openaiMasked = openaiRaw ? maskApiKey(openaiRaw) : null;

  return <DrawFlow initialGeminiKey={geminiMasked} initialOpenaiKey={openaiMasked} />;
}
