const norm=(s:string)=>(s||'').replace(/\s+/g,' ').trim().toLowerCase();
const cleanQ=(s:string)=>String(s||'').replace(/^\s*\d+\s*[.)、]\s*/,'').trim();
const vis=(e:Element)=>{const x=e as HTMLElement,r=x.getBoundingClientRect(),c=getComputedStyle(x);return r.width>0&&r.height>0&&c.display!=='none'&&c.visibility!=='hidden'};
const cs=()=>[...document.querySelectorAll('[role="group"],fieldset,.nsv_survey_item,.nsv_survey_item_inner,form')].filter(vis);
const textOf=(x:Element)=>((x.textContent||(x as HTMLInputElement).value||'').replace(/\s+/g,' ').trim());
function analyze(){
 const questions=cs().filter(c=>c.querySelector('input,textarea,select,[contenteditable="true"]')).map((c,index)=>{
   const h=c.querySelector('[role="heading"],.nsv_survey_reply_question_title,legend,[class*="question"],[class*="title"]');
   const choices=[...c.querySelectorAll('label,[role="option"],[role="radio"],[role="checkbox"],option')].filter(vis).map(textOf).filter(Boolean);
   const inputs=[...c.querySelectorAll('textarea,input:not([type="radio"]):not([type="checkbox"]),select,[contenteditable="true"]')].filter(vis).map(x=>({tag:x.tagName.toLowerCase(),type:(x as HTMLInputElement).type||'',placeholder:(x as HTMLInputElement).placeholder||'',value:(x as HTMLInputElement).value||''}));
   return{index,question:cleanQ(textOf(h||c)),inputs,choices:[...new Set(choices)].slice(0,50)}
 });
 const buttons=[...document.querySelectorAll('button,[role="button"],input[type="submit"],input[type="button"],a')].filter(vis).map(x=>({text:textOf(x),type:(x as HTMLInputElement).type||'',tag:x.tagName.toLowerCase()})).filter(x=>x.text);
 return{url:location.href,title:document.title,questions,buttons:[...new Map(buttons.map(x=>[x.text,x])).values()].slice(0,50)}
}
function find(q:string){const n=norm(cleanQ(q));return cs().filter(c=>norm(cleanQ(c.textContent||'')).includes(n)).sort((a,b)=>(a.textContent||'').length-(b.textContent||'').length)[0]||null}
function val(e:HTMLInputElement|HTMLTextAreaElement,v:string){const p=e instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;const set=Object.getOwnPropertyDescriptor(p,'value')?.set;set?set.call(e,v):e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))}
function choose(root:Element,a:string,checked=true){
 const n=norm(a);
 const all=[...root.querySelectorAll('label,[role="option"],[role="radio"],[role="checkbox"],option')];
 const el=all.find(x=>norm(textOf(x))===n)||all.find(x=>norm(textOf(x)).includes(n));
 if(!el)return false;
 if(el instanceof HTMLOptionElement){el.selected=checked;el.parentElement?.dispatchEvent(new Event('change',{bubbles:true}));return true}
 const input=el.matches('input')?el as HTMLInputElement:el.querySelector('input') as HTMLInputElement|null;
 if(input){if(input.checked!==checked)input.click();else el.dispatchEvent(new Event('change',{bubbles:true}));return true}
 (el as HTMLElement).click();return true
}
const tpl=(v:any,p:any)=>String(v??'').replaceAll('{{name}}',p?.name||'').replaceAll('{{num}}',p?.num||'').replaceAll('{{phone}}',p?.num||'');
const matches=(template:string)=>{const raw=tpl(template,{name:'',num:''});try{const t=new URL(raw,location.href);return t.origin===location.origin&&t.pathname===location.pathname}catch{return location.href.startsWith(raw)}};
function clickButton(label:string){const n=norm(label);const els=[...document.querySelectorAll('button,[role="button"],input[type="submit"],input[type="button"],a')].filter(vis);const el=els.find(x=>norm(textOf(x))===n)||els.find(x=>norm(textOf(x)).includes(n));if(!el)return false;(el as HTMLElement).click();return true}
async function runForm(form:any,p:any,onAdvance?:()=>Promise<void>){
 for(const s of form.steps||[]){
  if(s.type==='action'){const okTarget=!!(s.text||s.answer);if(!okTarget)return{ok:false,message:'실행할 버튼 이름이 없습니다.'};if(onAdvance)await onAdvance();const ok=clickButton(tpl(s.text||s.answer,p));if(!ok)return{ok:false,message:'버튼을 찾지 못했습니다: '+(s.text||s.answer)};if(s.nextUrl)setTimeout(()=>{location.href=tpl(s.nextUrl,p)},100);return{ok:true,message:'다음 동작을 실행했습니다.',advanced:true}}
  const r=find(s.question||'');if(!r)return{ok:false,message:'문항을 찾지 못했습니다: '+s.question};
  const rawAnswer=s.answer;const values=Array.isArray(rawAnswer)?rawAnswer.map((v:any)=>tpl(v,p)):tpl(rawAnswer,p);const a=Array.isArray(values)?values[0]||'':values;
  if(['choice','checkbox','agreement'].includes(s.type)){const vals=Array.isArray(values)?values:[a];for(const v of vals){if(!choose(r,v,s.checked!==false))return{ok:false,message:'선택하지 못했습니다: '+s.question}}}
  else{const e=r.querySelector('textarea,input:not([type="radio"]):not([type="checkbox"]):not([type="hidden"]),select,[contenteditable="true"]') as HTMLInputElement|HTMLTextAreaElement|null;if(!e)return{ok:false,message:'입력란을 찾지 못했습니다: '+s.question};if((e as HTMLSelectElement).tagName==='SELECT'){const o=[...(e as HTMLSelectElement).options].find(o=>norm(o.text)===norm(a)||norm(o.value)===norm(a));if(!o)return{ok:false,message:'선택지를 찾지 못했습니다: '+s.question};(e as HTMLSelectElement).value=o.value;e.dispatchEvent(new Event('change',{bubbles:true}))}else val(e,a)}
 }
 return{ok:true,message:'입력 완료',advanced:false}
}
async function executePending(p:any){
 const i=Math.max(0,p?.cursor||0),forms=p?.kit?.forms||[],form=forms[i];
 if(!form)return;
 if(!matches(tpl(form.url,p)))return;
 const next={...p,cursor:i+1};const result=await runForm(form,p,async()=>{await chrome.storage.session.set({pendingRun:next})});if(result.advanced){}else await chrome.storage.session.remove('pendingRun');
 window.postMessage({source:'form-routine-kit-extension',type:'status',message:result.message},'*')
}
chrome.runtime.onMessage.addListener((m,_s,send)=>{if(m.cmd==='analyze'){send(analyze());return}if(m.cmd==='run'){runForm(m.payload.form||m.payload,m.payload).then(send);return true}if(m.cmd==='get-analysis'){chrome.storage.session.get('lastAnalysis').then(x=>send(x.lastAnalysis||null));return true}});
window.addEventListener('message',e=>{if(e.source!==window||e.data?.source!=='form-routine-kit-web')return;if(e.data.type==='analyze-current-tab')chrome.runtime.sendMessage({cmd:'web-analyze'}).catch(()=>{});if(e.data.type==='prepare'){chrome.storage.session.set({pendingRun:{...e.data.payload,cursor:0}}).then(()=>window.postMessage({source:'form-routine-kit-extension',type:'status',message:'실행 정보를 저장했습니다.'},'*')).catch(()=>{})}if(e.data.type==='get-analysis')chrome.runtime.sendMessage({cmd:'get-analysis'}).then(a=>window.postMessage({source:'form-routine-kit-extension',type:'analysis',analysis:a},'*')).catch(()=>{})});
chrome.storage.session.get('pendingRun').then(x=>executePending(x.pendingRun)).catch(()=>{});