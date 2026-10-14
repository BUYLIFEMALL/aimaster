import "server-only";
import { createAdminClient } from "../supabase/admin";
import { dbFailure } from "./api";
import type { z } from "zod";
import { projectInputSchema, glossaryInputSchema } from "./model";
export async function saveProject(
  userId: string,
  input: z.infer<typeof projectInputSchema>,
) {
  const { data, error } = await createAdminClient().rpc("dt_save_project", {
    p_user_id: userId,
    p_id: input.id,
    p_revision: input.revision,
    p_title: input.title,
    p_payload: input.payload,
  });
  if (error) dbFailure(error.code);
  return data;
}
export async function saveGlossary(
  userId: string,
  input: z.infer<typeof glossaryInputSchema>,
) {
  const { data, error } = await createAdminClient().rpc("dt_save_glossary", {
    p_user_id: userId,
    p_id: input.id,
    p_revision: input.revision,
    p_name: input.name,
    p_entries: input.entries,
  });
  if (error) dbFailure(error.code);
  return data;
}
export async function claimOperation(
  userId: string,
  operationId: string,
  hash: string,
  kind: string,
) {
  const { data, error } = await createAdminClient().rpc("dt_claim_operation", {
    p_user_id: userId,
    p_operation_id: operationId,
    p_input_hash: hash,
    p_kind: kind,
  });
  if (error) dbFailure(error.code);
  return data;
}
export async function finishOperation(
  userId: string,
  operationId: string,
  hash: string,
  success: boolean,
) {
  const { error } = await createAdminClient().rpc("dt_finish_operation", {
    p_user_id: userId,
    p_operation_id: operationId,
    p_input_hash: hash,
    p_success: success,
  });
  if (error) dbFailure(error.code);
}
