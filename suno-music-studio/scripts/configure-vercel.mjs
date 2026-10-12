// Run only after explicit approval of these four infrastructure variables.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import { spawnSync } from "node:child_process";
const projectRoot=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const project=JSON.parse(readFileSync(resolve(projectRoot,".vercel/project.json"),"utf8"));
if(!process.argv.includes("--approved")) throw new Error("Explicit environment registration approval is required.");
if(project.projectName!=="suno-music-studio" || project.projectId!=="prj_BHh3me01sTyn12CQJrOgihl7Fyvu") throw new Error("Wrong Vercel project.");
const names=["NEXT_PUBLIC_SUPABASE_URL","NEXT_PUBLIC_SUPABASE_ANON_KEY","SUPABASE_SERVICE_ROLE_KEY","NEXT_PUBLIC_MAIN_SITE_URL"];
const source=readFileSync(resolve(projectRoot,"../.env.local"),"utf8");
const values=Object.fromEntries(names.map(name=>{
  const match=source.match(new RegExp(`^${name}=(.*)$`,"m"));
  let value=match?.[1]?.trim() || "";
  if((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))value=value.slice(1,-1);
  if(name==="NEXT_PUBLIC_MAIN_SITE_URL") value="https://www.buylife.xyz";
  if(!value || /[\r\n]/.test(value)) throw new Error(`Missing infrastructure value: ${name}`);
  return [name,value];
}));
for(const name of names){
  const args=["env","add",name,"production","--scope","buylife","--yes"];
  if(name==="SUPABASE_SERVICE_ROLE_KEY") args.push("--sensitive");
  const result=spawnSync("vercel",args,{cwd:projectRoot,input:values[name],encoding:"utf8",shell:process.platform==="win32",windowsHide:true});
  // Never print captured output, stdin or any credential.
  if(result.status!==0) throw new Error(`Environment registration failed: ${name} (exit ${result.status}). Inspect metadata with vercel env ls.`);
  console.log(`Registered production variable: ${name}`);
}
// Approved local infrastructure reuse, for member-flow checks. Ignored file.
writeFileSync(resolve(projectRoot,".env.local"),names.map(n=>`${n}=${values[n]}`).join("\n")+"\n",{mode:0o600});
console.log("Configured local infrastructure for authenticated checks. No AI keys copied.");
