const WEB_ORIGINS=new Set(['https://ninetaild.github.io']);
const isWeb=(e:MessageEvent)=>e.source===window&&WEB_ORIGINS.has(e.origin)&&e.data?.source==='form-routine-kit-web';
const post=(type:string,payload:any={})=>window.postMessage({source:'form-routine-kit-extension',type,...payload},location.origin);
post('ready');

const norm=(s:any)=>String(s??'').replace(/\s+/g,' ').trim().toLowerCase();
const clean=(s:any)=>String(s??'').replace(/\s+/g,' ').replace(/^\s*답변\s*필수\s*/i,'').replace(/^\s*\d+\s*[.)、:\-]?\s*/,'').trim();
const visible=(e:Element)=>{const x=e as HTMLElement,r=x.getBoundingClientRect(),c=getComputedStyle(x);return r.width>0&&r.height>0&&c.display!=='none'&&c.visibility!=='hidden'};
const text=(e:Element)=>String(e.textContent||((e as HTMLInputElement).value)||e.getAttribute('aria-label')||e.getAttribute('title')||'').replace(/\s+/g,' ').trim();
const isControl=(e:Element)=>['input','textarea','select'].includes(e.tagName.toLowerCase())||e.matches('[contenteditable="true"],[role="textbox"],[role="radio"],[role="checkbox"],[role="option"]');
const controls=(root:Element)=>{const own=isControl(root)?[root]:[];return[...new Set([...own,...root.querySelectorAll('input,textarea,select,[contenteditable="true"],[role="textbox"],[role="radio"],[role="checkbox"],[role="option"]')])].filter(visible)};
const fieldRoot=(e:Element)=>e.closest('fieldset,[data-question],[data-question-id],[data-field],[data-field-id],[data-testid*="question"],[class*="question"],[class*="field"],dl[class*="survey_box"],.survey_box,.form-group,.form-item,.question-item,.question,.field')||e.parentElement||e;
const groups=()=>[...new Set([...document.querySelectorAll('fieldset,[data-question],[data-question-id],[data-field],[data-field-id],[data-testid*="question"],[class*="question"],[class*="field"],dl[class*="survey_box"],.survey_box,.form-group,.form-item,.question-item,.question,.field')].filter(visible).filter(x=>controls(x).length).concat(controls(document.body).map(fieldRoot).filter(visible)))];

function find(q:string,selector?:string){
 if(selector){try{const e=document.querySelector(selector);if(e&&visible(e))return e}catch{}}
 const raw=String(q||'').trim(),wanted=clean(raw),n=norm(wanted);
 if(raw){try{const direct=document.getElementById(raw)||document.querySelector('[data-question-id="'+CSS.escape(raw)+'"],[data-question="'+CSS.escape(raw)+'"]');if(direct&&visible(direct))return direct}catch{}}
 const num=raw.match(/(?:답변\s*필수\s*)?(\d+)\s*[.)、:\-]?/i)?.[1];
 const gs=groups();
 if(num){const hit=gs.find(c=>{const h=c.querySelector('.nsv_survey_reply_question_title,[role="heading"],legend,[class*="question_title"],[data-question-title]');return String(h?.textContent||c.textContent||'').match(/(?:답변\s*필수\s*)?\d+\s*[.)、:\-]?/i)?.[0]?.match(/\d+/)?.[0]===num});if(hit)return hit}
 return gs.filter(c=>{const h=c.querySelector('.nsv_survey_reply_question_title,[role="heading"],legend,[class*="question_title"],[data-question-title],label');const t=norm(clean(h?.textContent||c.textContent||''));return t===n||t.includes(n)||n.includes(t)}).sort((a,b)=>text(a).length-text(b).length)[0]||null;
}
function setValue(e:HTMLInputElement|HTMLTextAreaElement,v:string){const p=e instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;const setter=Object.getOwnPropertyDescriptor(p,'value')?.set;setter?setter.call(e,v):e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))}
function choose(root:Element,answer:string,selector?:string){
 let el:Element|null=null;
 if(selector){try{el=document.querySelector(selector)}catch{}}
 const n=norm(answer);
 if(!el){const xs=[...(root.matches('input[type="radio"],input[type="checkbox"],[role="option"],[role="radio"],[role="checkbox"]')?[root]:[]),...root.querySelectorAll('input[type="radio"],input[type="checkbox"],label,[role="option"],[role="radio"],[role="checkbox"],option')];el=xs.find(x=>norm(text(x))===n)||xs.find(x=>norm(text(x)).includes(n)||n.includes(norm(text(x))))||null}
 if(!el)return false;
 const input=el.matches('input')?el as HTMLInputElement:el.querySelector('input') as HTMLInputElement|null;
 if(input){if(!input.checked)input.click();input.dispatchEvent(new Event('change',{bubbles:true}));return true}
 if(el instanceof HTMLOptionElement){el.selected=true;el.parentElement?.dispatchEvent(new Event('input',{bubbles:true}));el.parentElement?.dispatchEvent(new Event('change',{bubbles:true}));return true}
 (el as HTMLElement).click();return true;
}
const waitFor=async<T>(fn:()=>T|null|undefined,tries=18)=>{for(let i=0;i<tries;i++){const v=fn();if(v)return v;await new Promise(r=>setTimeout(r,350))}return null};
const personal=(v:any)=>/^\{\{(?:name|phone)\}\}$/.test(String(v??'').trim());

async function runForm(form:any){
 for(const s of form.steps||[]){
  const info=String(s.question||'')+' '+String(s.answer||'');
  if(s.manual||s.type==='agreement'||/개인정보.*동의|제3자.*제공|마케팅.*동의|약관.*동의/i.test(info))return{ok:false,manual:true,message:'개인정보·약관·동의 항목은 직접 확인해 주세요.'};
  if(s.type==='action'){
   const a=String(s.text||s.question||'');
   if(s.manual||/제출|확인|완료|다음|삭제|초기화|리셋|지우기|clear|reset/i.test(a))return{ok:false,manual:true,message:'다음·제출·동의·삭제 동작은 자동으로 실행하지 않습니다.'};
   continue;
  }
  const raw=s.answer;
  if(personal(raw))continue;
  const values=Array.isArray(raw)?raw.filter((v:any)=>!personal(v)).map(String):[String(raw??'')];
  if(!values.length)continue;
  const r=await waitFor(()=>find(s.question||'',s.selector));
  if(!r)return{ok:false,message:'문항을 찾지 못했습니다: '+s.question};
  if(['choice','checkbox'].includes(s.type)){
   for(const v of values){const item=s.choiceItems?.find((x:any)=>norm(x.text)===norm(v)||norm(x.text).includes(norm(v))||norm(v).includes(norm(x.text)));if(!await waitFor(()=>choose(r,v,item?.selector)))return{ok:false,message:'선택하지 못했습니다: '+s.question}}
  }else{
   const e=await waitFor<Element>(()=>{try{return s.inputSelector?document.querySelector(s.inputSelector):isControl(r)?r:r.querySelector('textarea,input:not([type="radio"]):not([type="checkbox"]):not([type="hidden"]),select,[contenteditable="true"],[role="textbox"]')}catch{return null}});
   if(!e)return{ok:false,message:'입력란을 찾지 못했습니다: '+s.question};
   const a=values[0]||'';
   if(e.tagName==='SELECT'){const sel=e as HTMLSelectElement,o=[...sel.options].find(x=>norm(x.text)===norm(a)||norm(x.value)===norm(a));if(!o)return{ok:false,message:'선택지를 찾지 못했습니다: '+s.question};sel.value=o.value;sel.dispatchEvent(new Event('input',{bubbles:true}));sel.dispatchEvent(new Event('change',{bubbles:true}))}
   else if((e as HTMLElement).isContentEditable){(e as HTMLElement).textContent=a;e.dispatchEvent(new InputEvent('input',{bubbles:true,data:a,inputType:'insertText'}))}
   else if(e instanceof HTMLInputElement||e instanceof HTMLTextAreaElement)setValue(e,a);
  }
 }
 return{ok:true,message:'정해진 답변 입력 완료',advanced:false};
}
function toast(r:any){const old=document.getElementById('form-routine-kit-status');old?.remove();const b=document.createElement('div');b.id='form-routine-kit-status';b.textContent=r?.ok?'정해진 답변 입력 완료 · 작업 종료':'입력이 중단되었습니다 · 다음/제출/동의는 직접 확인해 주세요';Object.assign(b.style,{position:'fixed',zIndex:'2147483647',right:'16px',bottom:'16px',maxWidth:'420px',padding:'12px 14px',borderRadius:'10px',background:'#111827',color:'#fff',font:'600 13px/1.45 system-ui,sans-serif'});(document.body||document.documentElement).append(b);setTimeout(()=>b.remove(),5000)}
let done=false;
function cssPath(el:Element){
 const h=el as HTMLElement;if(h.id)return '#'+CSS.escape(h.id);
 const attrs=['data-testid','data-test','aria-label','name','placeholder'];
 for(const a of attrs){const v=h.getAttribute(a);if(v){const q=h.tagName.toLowerCase()+'['+a+'="'+CSS.escape(v)+'"]';if(document.querySelectorAll(q).length===1)return q}}
 return '';
}
function labelFor(el:Element){
 const h=el as HTMLElement,id=h.id;
 if(id){const l=document.querySelector('label[for="'+CSS.escape(id)+'"]');if(l)return text(l)}
 const l=el.closest('label');if(l)return text(l);
 return el.getAttribute('aria-label')||el.getAttribute('title')||el.getAttribute('placeholder')||'';
}
function captureForm(){
 const elements=[...document.querySelectorAll('input,textarea,select,[contenteditable="true"],[role="textbox"],[role="radio"],[role="checkbox"]')].filter(visible);
 const seen=new Set<string>(),steps:any[]=[];
 for(const el of elements){
  const input=el as HTMLInputElement;
  if(['hidden','submit','button','reset','file','image'].includes(input.type))continue;
  const name=input.name||'', id=input.id||'', key=name+'|'+id+'|'+el.tagName;
  if((input.type==='radio'||input.type==='checkbox')&&seen.has(key))continue;
  if(input.type==='radio'||input.type==='checkbox')seen.add(key);
  const root=fieldRoot(el), qEl=root.querySelector('.nsv_survey_reply_question_title,[role="heading"],legend,[class*="question_title"],[data-question-title],label');
  const q=clean(text(qEl||root)||labelFor(el)||name||id||'입력 항목');
  const type=input.type==='radio'?'choice':input.type==='checkbox'?'checkbox':el.tagName==='SELECT'?'select':'text';
  if(type==='choice'||type==='checkbox'){
   const items=[...root.querySelectorAll('input[type="'+input.type+'"],label,[role="radio"],[role="checkbox"]')].filter(visible).map(x=>({text:text(x)||labelFor(x),value:(x as HTMLInputElement).value||'',selector:cssPath(x)})).filter(x=>x.text);
   if(steps.some(s=>s.question===q&&s.type===type))continue;
   const selected=[...root.querySelectorAll('input[type="'+input.type+'"]')].filter((x:any)=>x.checked).map(x=>{const a=items.find(i=>i.selector===cssPath(x));return a?.text||x.value||''}).filter(Boolean);
   steps.push({type,question:q,selector:cssPath(root),choiceItems:items,answer:type==='checkbox'?selected:(selected[0]||'')});
  }else if(type==='select'){
   const s=el as HTMLSelectElement,o=s.options[s.selectedIndex];steps.push({type:'choice',question:q,inputSelector:cssPath(el),choiceItems:[...s.options].map(x=>({text:text(x),value:x.value,selector:cssPath(x)})).filter(x=>x.text),answer:o?text(o):''});
  }else{
   const value=(el as HTMLInputElement).value||((el as HTMLElement).textContent||'');
   const nameLike=/^(이름|성명|성함|닉네임)$/.test(clean(q)),phoneLike=/(연락처|전화번호|휴대전화|휴대폰|핸드폰)/.test(q);
   steps.push({type:nameLike?'name':phoneLike?'num':'text',question:q,inputSelector:cssPath(el),answer:nameLike?'{{name}}':phoneLike?'{{phone}}':value});
  }
 }
 return{version:7,title:document.title,forms:[{url:location.href,title:document.title,steps}]};
}
chrome.runtime.onMessage.addListener((m:any,_s,send)=>{if(m.cmd==='capture-form'){try{send({ok:true,form:captureForm()})}catch(err){send({ok:false,message:String((err as any)?.message||err||'폼을 읽지 못했습니다.')})}return true}if(m.cmd!=='run'||done)return false;done=true;runForm(m.payload.form||m.payload).then(r=>{toast(r);send(r)}).catch(()=>{const r={ok:false,message:'입력 중 오류가 발생했습니다.'};toast(r);send(r)});return true});
window.addEventListener('message',e=>{if(!isWeb(e))return;if(e.data.type==='ping'){post('pong');return}if(e.data.type==='prepare'){const requestId=e.data.requestId;chrome.runtime.sendMessage({cmd:'prepare-run',payload:e.data.payload||{}},r=>r?.ok?post('prepared',{requestId}):post('prepare-error',{requestId,message:r?.message||'실행 준비에 실패했습니다.'}))}});
