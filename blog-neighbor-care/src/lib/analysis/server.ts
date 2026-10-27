import 'server-only';
import { authorizeMember } from '../access';
import { createAdminClient } from '../supabase/admin';
import { resolveApiKey } from './memberApiKeys';
import { generateJson } from './provider';
import type { AnalysisDependencies } from './api';
export const analysisDependencies:AnalysisDependencies={
  member:authorizeMember,
  key:(userId,provider)=>resolveApiKey(createAdminClient(),userId,provider),
  generate:generateJson,
  rpc:async(userId,operation,payload)=>{
    const {data,error}=await createAdminClient().rpc('bnc_analysis_dispatch',{p_user_id:userId,p_operation:operation,p_payload:payload});
    return {data,error};
  },
};
