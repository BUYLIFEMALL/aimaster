import { openAIGenerationParams } from './openaiRequestParams';
export type Provider = 'openai'|'anthropic'|'gemini';
type FailureReason = 'http_rejected' | 'transport' | 'response_empty' | 'response_too_large' | 'response_json' | 'response_incomplete' | 'output_invalid' | 'output_json';
const failureMessages: Record<FailureReason, string> = {
  http_rejected: 'Provider request unconfirmed', transport: 'Provider request unconfirmed', response_empty: 'Empty provider response',
  response_too_large: 'Provider response too large', response_json: 'Invalid provider response', response_incomplete: 'Incomplete response',
  output_invalid: 'Invalid provider output', output_json: 'Invalid provider output',
};
/** Safe classification only. Never retains raw errors, response bodies or keys. */
export class ProviderFailure extends Error {
  constructor(readonly reason: FailureReason, readonly httpStatus?: number) { super(failureMessages[reason]); }
}
export async function generateJson(provider:Provider, model:string, key:string, system:string, user:string, fetcher:typeof fetch=fetch):Promise<unknown> {
  let url:string,headers:Record<string,string>,body:unknown;
  if(provider==='openai') {
    url='https://api.openai.com/v1/chat/completions';headers={authorization:`Bearer ${key}`};
    body={model,messages:[{role:'system',content:system},{role:'user',content:user}],response_format:{type:'json_object'},...openAIGenerationParams(model,{maxTokens:6000,temperature:0.2})};
  } else if(provider==='anthropic') {
    url='https://api.anthropic.com/v1/messages';headers={'x-api-key':key,'anthropic-version':'2023-06-01'};
    body={model,max_tokens:6000,system,messages:[{role:'user',content:user}]};
  } else {
    if(!/^[a-zA-Z0-9._-]+$/.test(model)) throw new Error('Invalid model');
    url=`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;headers={'x-goog-api-key':key};
    body={systemInstruction:{parts:[{text:system}]},contents:[{role:'user',parts:[{text:user}]}],generationConfig:{maxOutputTokens:6000,responseMimeType:'application/json'}};
  }
  // One bounded attempt. No redirects/retries, no provider response/error bodies in errors or logs.
  let response: Response;
  try { response=await fetcher(url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(45000),headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)}); }
  catch { throw new ProviderFailure('transport'); }
  if(!response.ok) { await response.body?.cancel().catch(()=>{});throw new ProviderFailure('http_rejected',response.status); }
  const reader=response.body?.getReader();if(!reader)throw new ProviderFailure('response_empty');
  const chunks:Uint8Array[]=[];let bytes=0;
  try {for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>262144)throw new ProviderFailure('response_too_large');chunks.push(value);}}
  catch(error){await reader.cancel().catch(()=>{});throw error instanceof ProviderFailure ? error : new ProviderFailure('transport');}
  let json;
  try { json=JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new ProviderFailure('response_json'); }
  let output:unknown;
  if(provider==='openai') {if(json?.choices?.[0]?.finish_reason!=='stop')throw new ProviderFailure('response_incomplete');output=json.choices[0].message?.content;}
  else if(provider==='anthropic'){if(json?.stop_reason!=='end_turn')throw new ProviderFailure('response_incomplete');output=Array.isArray(json.content)?json.content.filter((p:{type:string})=>p?.type==='text').map((p:{text:string})=>p.text).join(''):undefined;}
  else {if(json?.candidates?.[0]?.finishReason!=='STOP')throw new ProviderFailure('response_incomplete');const parts=json.candidates[0].content?.parts;output=Array.isArray(parts)?parts.map((p:{text?:string})=>p?.text??'').join(''):undefined;}
  if(typeof output!=='string' || output.length>65536)throw new ProviderFailure('output_invalid');
  try { return JSON.parse(output); } catch { throw new ProviderFailure('output_json'); }
}
