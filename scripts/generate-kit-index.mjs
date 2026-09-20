import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root=process.cwd();
const srcDir=path.join(root,'public','kits','src');
const outFile=path.join(root,'public','kits','index.json');

const toKstDate=(iso)=>{
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(iso));
  const y=parts.find(x=>x.type==='year')?.value||'0000';
  const m=parts.find(x=>x.type==='month')?.value||'01';
  const d=parts.find(x=>x.type==='day')?.value||'01';
  return y+'-'+m+'-'+d;
};

const files=fs.readdirSync(srcDir,{withFileTypes:true})
  .filter(x=>x.isFile()&&/\.json$/i.test(x.name))
  .map(x=>x.name)
  .sort((a,b)=>a.localeCompare(b));

const catalog=[];
for(const file of files){
  const full=path.join(srcDir,file);
  try{
    const data=JSON.parse(fs.readFileSync(full,'utf8'));
    let uploadedAt='';
    try{
      uploadedAt=execFileSync('git',['log','-1','--format=%cI','--',path.posix.join('public/kits/src',file)],{cwd:root,encoding:'utf8'}).trim();
    }catch{}
    if(!uploadedAt)uploadedAt=fs.statSync(full).mtime.toISOString();
    catalog.push({
      file,
      title:typeof data.title==='string'&&data.title?data.title:file,
      uploadedAt,
      uploadedDate:toKstDate(uploadedAt)
    });
  }catch(error){
    console.warn('[Kit index] skip invalid JSON:',file,error.message);
  }
}
catalog.sort((a,b)=>b.uploadedAt.localeCompare(a.uploadedAt));
fs.writeFileSync(outFile,JSON.stringify(catalog,null,2)+'\n');
console.log('[Kit index] generated',catalog.length,'entries');
