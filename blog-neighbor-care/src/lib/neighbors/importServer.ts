import 'server-only';
import {readerDependencies} from '../reader/server';
import {createAdminClient} from '../supabase/admin';
import type {ImportDependencies} from './importApi';
export const importDependencies:ImportDependencies={...readerDependencies,rpc:async(userId,operation,payload)=>{
 const {data,error}=await createAdminClient().rpc('bnc_neighbor_import_dispatch',{p_user_id:userId,p_operation:operation,p_payload:payload});return {data,error};
}};
