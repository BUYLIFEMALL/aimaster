import { openAIGenerationParams } from './openaiRequestParams';
export type Provider = 'openai'|'anthropic'|'gemini';
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
  const response=await fetcher(url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(45000),headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)});
  if(!response.ok) { await response.body?.cancel();throw new Error('Provider request unconfirmed'); }
  const reader=response.body?.getReader();if(!reader)throw new Error('Empty provider response');
  const chunks:Uint8Array[]=[];let bytes=0;
  try {for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>262144)throw new Error('Provider response too large');chunks.push(value);}}
  catch(error){await reader.cancel().catch(()=>{});throw error;}
  const json=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  let output:unknown;
  if(provider==='openai') {if(json.choices?.[0]?.finish_reason!=='stop')throw new Error('Incomplete response');output=json.choices[0].message?.content;}
  else if(provider==='anthropic'){if(json.stop_reason!=='end_turn')throw new Error('Incomplete response');output=json.content?.filter((p:{type:string})=>p.type==='text').map((p:{text:string})=>p.text).join('');}
  else {if(json.candidates?.[0]?.finishReason!=='STOP')throw new Error('Incomplete response');output=json.candidates[0].content?.parts?.map((p:{text?:string})=>p.text??'').join('');}
  if(typeof output!=='string' || output.length>65536)throw new Error('Invalid provider output');
  return JSON.parse(output);
}
