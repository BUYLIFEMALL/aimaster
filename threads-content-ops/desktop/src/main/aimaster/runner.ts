import type { AgentInvocation, AgentInvocationResult } from '../codex/runner';
import type { CodexHealth } from '../../shared/domain';
import type { CredentialManager } from '../services/settings';

const endpoint = `${(process.env.AIMASTER_API_BASE_URL ?? 'https://www.buylife.xyz').replace(/\/$/, '')}/api/threads-content-ops/generate`;

/** Calls AIMaster with a member personal token; never stores or receives an OpenAI key. */
export class AIMasterAgentRunner {
  constructor(private readonly credentials: CredentialManager) {}
  async initialize(): Promise<void> {}
  async health(): Promise<CodexHealth> {
    const stored = await this.credentials.status(['aimasterToken']);
    return stored.aimasterToken?.stored ? { installed:true, version:'AIMaster API', message:'AIMaster account is connected.' } : { installed:false, failure:'NOT_FOUND', message:'Register an AIMaster personal access token first.' };
  }
  cancelAll(): number { return 0; }
  async run(invocation: AgentInvocation): Promise<AgentInvocationResult> {
    const token = await this.credentials.get('aimasterToken');
    if (!token) throw new Error('Register an AIMaster personal access token first.');
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), invocation.settings.timeoutSeconds * 1_000);
    try {
      const response = await fetch(endpoint, { method:'POST', headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'}, body:JSON.stringify({role:invocation.role,prompt:invocation.prompt}), signal:controller.signal });
      const body = await response.json().catch(() => null) as {result?:AgentInvocationResult['result'];error?:string;message?:string;usage?:{input_tokens?:number;output_tokens?:number}}|null;
      if (!response.ok || !body?.result) throw new Error(body?.message ?? body?.error ?? 'AIMaster generation failed.');
      const inputTokens=body.usage?.input_tokens, outputTokens=body.usage?.output_tokens;
      return {result:body.result,inputTokens,outputTokens,totalTokens:inputTokens!==undefined&&outputTokens!==undefined?inputTokens+outputTokens:undefined};
    } finally { clearTimeout(timeout); }
  }
}
