import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import {
  authorize,
  AppError,
  failure,
  readBody,
  NO_STORE,
} from "@/lib/translation/api";
import { requestSchema } from "@/lib/translation/model";
import { resolveApiKey } from "@/lib/apiKeys";
import { claimOperation, finishOperation } from "@/lib/translation/repository";
import { generate } from "@/lib/translation/gemini";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 110;
export async function POST(request: NextRequest) {
  try {
    const input = await readBody(request, requestSchema, 512 * 1024),
      user = await authorize();
    if (input.kind === "reverse" && input.options.sourceLanguage === "auto")
      throw new AppError(
        "역번역할 원문 언어를 선택하거나 먼저 번역을 실행해주세요.",
      );
    const key = await resolveApiKey(user.id);
    if (!key) throw new AppError("본인 Gemini 키를 등록해주세요.", 400, true);
    const hash = createHash("sha256")
      .update(JSON.stringify(input))
      .digest("hex");
    const claim = await claimOperation(
      user.id,
      input.operationId,
      hash,
      input.kind,
    );
    if (claim !== "claimed")
      throw new AppError(
        claim === "done"
          ? "이미 처리한 요청입니다. 자동으로 다시 호출하지 않았습니다."
          : "이 요청이 진행 중이거나 이미 실패했습니다. 결과를 확인한 뒤 새 작업으로 실행해주세요.",
        409,
      );
    let result;
    try {
      result = await generate(key, input);
    } catch (e) {
      await finishOperation(user.id, input.operationId, hash, false).catch(
        () => {},
      );
      throw e;
    }
    // A validated paid result must survive a temporary ledger completion failure.
    // The claimed row remains processing and still blocks replay of this request ID.
    await finishOperation(user.id, input.operationId, hash, true).catch(
      () => {},
    );
    return NextResponse.json(result, { headers: NO_STORE });
  } catch (e) {
    return failure(e);
  }
}
