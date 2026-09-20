const WEB_ORIGINS=new Set(['https://ninetaild.github.io']);
const isWeb=(e:MessageEvent)=>e.source===window&&WEB_ORIGINS.has(e.origin)&&e.data?.source==='form-routine-kit-web';
const post=(type:string,payload:any={})=>window.postMessage({source:'form-routine-kit-extension',type,...payload},location.origin);
post('ready');
const norm=(s:any)=>String(s??'').replace(/\s+/g,' ').trim().toLowerCase();
const cleanQ=(s:any)=>String(s??'').replace(/\s+/g,' ').replace(/^\s*답변\s*필수\s*/i,'').replace(/^\s*\d+\s*[.)、:\-]?\s*/,'').trim();
const qNum=(s:any)=>{const m=String(s??'').match(/(?:답변\s*필수\s*)?(\d+)\s*[.)、:\-]?/i);return m?Number(m[1]):null};
const vis=(e:Element)=>{const x=e as HTMLElement,r=x.getBoundingClientRect(),c=getComputedStyle(x);return r.width>0&&r.height>0&&c.display!=='none'&&c.visibility!=='hidden'};
const textOf=(x:Element)=>String(x.textContent||((x as HTMLInputElement).value)||x.getAttribute('aria-label')||x.getAttribute('title')||'').replace(/\s+/g,' ').trim();
function cssPath(e:Element){const h=e as HTMLElement;if(h.id)return '#'+CSS.escape(h.id);const a=['data-testid','data-test','aria-label','name'].find(k=>h.getAttribute(k));if(a){const v=h.getAttribute(a)!;const s=h.tagName.toLowerCase()+`[${a}="${CSS.escape(v)}"]`;if(document.querySelectorAll(s).length===1)return s}const parts:string[]=[];let n:Element|null=e;for(let i=0;n&&i<6&&n!==document.body;i++,n=n.parentElement){let p=n.tagName.toLowerCase();const cls=[...n.classList].filter(c=>/^[A-Za-z_][\w-]*$/.test(c)&&!/(active|selected|hover|focus|css|hash)/i.test(c)).slice(0,2);if(cls.length)p+='.'+cls.map(CSS.escape).join('.');if(n.parentElement){const same=[...n.parentElement.children].filter(x=>x.tagName===n!.tagName);if(same.length>1)p+=`:nth-of-type(${same.indexOf(n)+1})`}parts.unshift(p);if(document.querySelectorAll(parts.join(' > ')).length===1)break}return parts.join(' > ')}
function controlSelector(x:Element){return cssPath(x)}
function isControl(x:Element){const t=x.tagName.toLowerCase();return ['input','textarea','select'].includes(t)||x.matches('[contenteditable="true"],[role="textbox"],[role="radio"],[role="checkbox"],[role="option"]')}
function controls(root:Element){const own=isControl(root)?[root]:[];return [...new Set([...own,...root.querySelectorAll('input,textarea,select,[contenteditable="true"],[role="textbox"],[role="radio"],[role="checkbox"],[role="option"]')])].filter(vis)}
function labelTextFor(el:Element){
 const id=(el as HTMLElement).id;
 if(id){const l=document.querySelector('label[for="'+CSS.escape(id)+'"]');if(l)return textOf(l)}
 const l=el.closest('label');if(l)return textOf(l);
 const aria=el.getAttribute('aria-label');if(aria)return aria;
 const labelled=el.getAttribute('aria-labelledby');
 if(labelled)return labelled.split(/\s+/).map(id=>document.getElementById(id)).filter(Boolean).map(x=>textOf(x!)).join(' ');
 return '';
}
function fieldRoot(el:Element){
 const direct=el.closest('fieldset,[data-question],[data-question-id],[data-field],[data-field-id],[data-testid*="question"],[class*="question"],[class*="field"],dl[class*="survey_box"],.survey_box,.captchaArea,.form-group,.form-item,.question-item,.question,.field');
 if(direct&&controls(direct).length<=12)return direct;
 const form=el.closest('form');
 let n:Element|null=el;
 for(let i=0;n&&i<5&&n!==form;i++,n=n.parentElement){
   const cs=controls(n);
   if(cs.length>=1&&cs.length<=4){const txt=textOf(n);if(txt.length>=2&&txt.length<=500)return n}
 }
 return el.parentElement||el;
}
function groups(){
 const result:Element[]=[];
 const roots=[...document.querySelectorAll('fieldset,[data-question],[data-question-id],[data-field],[data-field-id],[data-testid*="question"],[class*="question"],[class*="field"],dl[class*="survey_box"],.survey_box,.captchaArea,.form-group,.form-item,.question-item,.question,.field')].filter(vis);
 for(const root of roots){if(controls(root).length)result.push(root)}
 const allControls=controls(document.body);
 for(const el of allControls){
   const root=fieldRoot(el);
   if(!root||!vis(root))continue;
   const rootControls=controls(root);
   if(root===document.body||root.tagName.toLowerCase()==='form'&&rootControls.length>4){
     const type=(el as HTMLInputElement).type||el.getAttribute('role')||el.tagName.toLowerCase();
     const name=(el as HTMLInputElement).name||'';
     if(type==='radio'||type==='checkbox'){
       const same=allControls.filter(x=>((x as HTMLInputElement).type||x.getAttribute('role'))===type&&(x as HTMLInputElement).name===name&&name);
       const grouped=same.map(x=>fieldRoot(x)).find(x=>x!==document.body&&x.tagName.toLowerCase()!=='form');
       if(grouped)result.push(grouped);else result.push(el);
     }else result.push(el);
   }else result.push(root);
 }
 const unique=[...new Set(result)],refined:Element[]=[];
 for(const root of unique){
   const nested=unique.filter(x=>x!==root&&root.contains(x)&&controls(x).length>0);
   if(nested.length){const immediate=nested.filter(x=>!nested.some(y=>y!==x&&x.contains(y)));if(immediate.length)refined.push(...immediate)}
   else refined.push(root);
 }
 return [...new Set(refined)].filter(vis).slice(0,200);
}
function nearbyText(c:Element){
 const first=controls(c)[0];
 if(!first)return '';
 const own=labelTextFor(first);if(own)return own;const title=first.getAttribute('title');if(title)return title;
 const parent=first.parentElement;
 if(parent){
   const direct=[...parent.children];
   const idx=direct.indexOf(first);
   const before=direct.slice(Math.max(0,idx-3),idx).map(textOf).filter(Boolean);
   if(before.length)return before[before.length-1];
 }
 const prev=first.previousElementSibling;if(prev)return textOf(prev);
 return '';
}
function questionHeading(c:Element){return c.querySelector('.nsv_survey_reply_question_title,[role="heading"],legend,[class*="question_title"],[data-question-title],[data-label],label,[aria-label]')}
function choiceElements(c:Element){
 const own=c.matches('input[type="radio"],input[type="checkbox"],[role="option"],[role="radio"],[role="checkbox"],option,label')?[c]:[];
 const native=[...c.querySelectorAll('label,[role="option"],[role="radio"],[role="checkbox"],option')].filter(vis);
 const inputs=[...c.querySelectorAll('input[type="radio"],input[type="checkbox"]')].filter(vis);
 return [...new Set([...own,...native,...inputs])];
}
function analyze(){
 const questions=groups().map((c,index)=>{
   const h=questionHeading(c),first=controls(c)[0],rawQuestion=textOf(h||c)||nearbyText(c)||labelTextFor(first||c)||first?.getAttribute('title')||first?.getAttribute('aria-label')||first?.getAttribute('name')||'';
   const rawInputs=controls(c).filter(x=>!['radio','checkbox','hidden','submit','button','reset','file','image'].includes((x as HTMLInputElement).type));
   const allInputs=controls(c).filter(x=>x.tagName.toLowerCase()!=='option');
   const choiceEls=choiceElements(c);
   const choices=[...new Set(choiceEls.map(x=>textOf(x)||labelTextFor(x)).filter(Boolean))].slice(0,100);
   const choiceItems=choiceEls.map(x=>({text:textOf(x)||labelTextFor(x),selector:cssPath(x),value:(x as HTMLInputElement).value||''})).filter(x=>x.text).slice(0,100);
   const inputs=allInputs.map(x=>({tag:x.tagName.toLowerCase(),type:(x as HTMLInputElement).type||'',name:(x as HTMLInputElement).name||'',id:(x as HTMLElement).id||'',placeholder:(x as HTMLInputElement).placeholder||'',value:(x as HTMLInputElement).value||'',checked:(x as HTMLInputElement).checked===true,required:(x as HTMLInputElement).required===true,ariaLabel:x.getAttribute('aria-label')||'',selector:cssPath(x)}));
   const firstInput=rawInputs.find(x=>(x as HTMLInputElement).type!=='hidden');
   const types=[...new Set(allInputs.map(x=>(x as HTMLInputElement).type||x.tagName.toLowerCase()))];
   const oneChoice=/최대\s*1\s*개\s*선택|한가지만\s*선택|한\s*가지만\s*선택/i.test(rawQuestion)||/최대\s*1\s*개\s*선택|한가지만\s*선택|한\s*가지만\s*선택/i.test(c.getAttribute('aria-label')||''); const role=oneChoice?'radio':allInputs.some(x=>/radio/i.test((x as HTMLInputElement).type||'')||x.getAttribute('role')==='radio')?'radio':allInputs.some(x=>/checkbox/i.test((x as HTMLInputElement).type||'')||x.getAttribute('role')==='checkbox')?'checkbox':allInputs.some(x=>x.tagName.toLowerCase()==='select'||x.getAttribute('role')==='option')?'select':allInputs.some(x=>x.matches('[contenteditable="true"],[role="textbox"]')||['text','email','tel','url','search','number','date','datetime-local','time','month','week'].includes((x as HTMLInputElement).type))?'text':'unknown';
   return{index,number:qNum(rawQuestion),question:cleanQ(rawQuestion),rawQuestion,selector:cssPath(c),inputSelector:firstInput?cssPath(firstInput):'',inputs,types,role,choices,choiceItems,required:/답변\s*필수|필수|required/i.test(rawQuestion)||allInputs.some(x=>(x as HTMLInputElement).required)};
 });
 const buttons=[...document.querySelectorAll('button,[role="button"],input[type="submit"],input[type="button"],input[type="reset"]')].filter(vis).map(x=>({text:textOf(x),type:(x as HTMLInputElement).type||'',tag:x.tagName.toLowerCase(),id:(x as HTMLElement).id||'',selector:cssPath(x)})).filter(x=>x.text);
 return{url:location.href,title:document.title,questions,buttons:[...new Map(buttons.map(x=>[x.selector||x.id||x.text,x])).values()].slice(0,100)}
}
function analyzeRoot(c:Element,index=0){
 const h=questionHeading(c),rawQuestion=textOf(h||c)||nearbyText(c)||labelTextFor(controls(c)[0]||c);
 const rawInputs=controls(c).filter(x=>!['radio','checkbox','hidden','submit','button','reset','file','image'].includes((x as HTMLInputElement).type));
 const allInputs=controls(c).filter(x=>x.tagName.toLowerCase()!=='option');
 const choiceEls=choiceElements(c);
 const choices=[...new Set(choiceEls.map(x=>textOf(x)||labelTextFor(x)).filter(Boolean))].slice(0,100);
 const choiceItems=choiceEls.map(x=>({text:textOf(x)||labelTextFor(x),selector:cssPath(x),value:(x as HTMLInputElement).value||''})).filter(x=>x.text).slice(0,100);
 const inputs=allInputs.map(x=>({tag:x.tagName.toLowerCase(),type:(x as HTMLInputElement).type||'',name:(x as HTMLInputElement).name||'',id:(x as HTMLElement).id||'',placeholder:(x as HTMLInputElement).placeholder||'',value:(x as HTMLInputElement).value||'',checked:(x as HTMLInputElement).checked===true,required:(x as HTMLInputElement).required===true,ariaLabel:x.getAttribute('aria-label')||'',selector:cssPath(x)}));
 const firstInput=rawInputs.find(x=>(x as HTMLInputElement).type!=='hidden');
 const types=[...new Set(allInputs.map(x=>(x as HTMLInputElement).type||x.tagName.toLowerCase()))];
 const oneChoice=/최대\s*1\s*개\s*선택|한가지만\s*선택|한\s*가지만\s*선택/i.test(rawQuestion)||/최대\s*1\s*개\s*선택|한가지만\s*선택|한\s*가지만\s*선택/i.test(c.getAttribute('aria-label')||''); const role=oneChoice?'radio':allInputs.some(x=>/radio/i.test((x as HTMLInputElement).type||'')||x.getAttribute('role')==='radio')?'radio':allInputs.some(x=>/checkbox/i.test((x as HTMLInputElement).type||'')||x.getAttribute('role')==='checkbox')?'checkbox':allInputs.some(x=>x.tagName.toLowerCase()==='select'||x.getAttribute('role')==='option')?'select':allInputs.some(x=>x.matches('[contenteditable="true"],[role="textbox"]')||['text','email','tel','url','search','number','date','datetime-local','time','month','week'].includes((x as HTMLInputElement).type))?'text':'unknown';
 return{index,number:qNum(rawQuestion),question:cleanQ(rawQuestion),rawQuestion,selector:cssPath(c),inputSelector:firstInput?cssPath(firstInput):'',inputs,types,role,choices,choiceItems,required:/답변\s*필수|필수|required/i.test(rawQuestion)||allInputs.some(x=>(x as HTMLInputElement).required)};
}
function pickerLabel(el:Element){return textOf(el)||labelTextFor(el)||el.getAttribute('aria-label')||el.getAttribute('title')||el.tagName.toLowerCase()}
let pickerState:{active:boolean;box?:HTMLDivElement;tip?:HTMLDivElement;last?:Element;cleanup?:()=>void}={active:false};
function stopPicker(){if(!pickerState.active)return;pickerState.cleanup?.();pickerState.active=false;pickerState.box?.remove();pickerState.tip?.remove();pickerState={active:false}}
function startPicker(){
 stopPicker();const box=document.createElement('div'),tip=document.createElement('div');
 Object.assign(box.style,{position:'fixed',zIndex:'2147483646',pointerEvents:'none',border:'2px solid #2563eb',background:'rgba(37,99,235,.10)',display:'none',boxSizing:'border-box',margin:'0',padding:'0'});
 Object.assign(tip.style,{position:'fixed',zIndex:'2147483647',pointerEvents:'none',padding:'6px 8px',borderRadius:'6px',background:'#111827',color:'#fff',font:'12px/1.35 system-ui',maxWidth:'360px',display:'none'});(document.body||document.documentElement).append(box,tip);pickerState={active:true,box,tip};
 const move=(e:MouseEvent)=>{const el=document.elementFromPoint(e.clientX,e.clientY) as Element|null;if(!pickerState.active||!el||el===box||el===tip)return;const target=el.closest('input,textarea,select,button,[role="textbox"],[role="radio"],[role="checkbox"],[role="button"],[contenteditable="true"],label')||el;pickerState.last=target;const r=target.getBoundingClientRect();if(r.width<=0||r.height<=0)return;Object.assign(box.style,{display:'block',left:Math.round(r.left)+'px',top:Math.round(r.top)+'px',width:Math.round(r.width)+'px',height:Math.round(r.height)+'px'});tip.textContent='선택: '+pickerLabel(target);Object.assign(tip.style,{display:'block',left:Math.min(Math.max(6,r.left),Math.max(6,innerWidth-370))+'px',top:Math.min(r.bottom+8,innerHeight-42)+'px'})};
 const click=(e:MouseEvent)=>{if(!pickerState.active)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();const el=pickerState.last;if(!el)return;const root=fieldRoot(el);const q=analyzeRoot(root,0);const button=el.matches('button,[role="button"],input[type="submit"],input[type="button"],input[type="reset"]')?{text:textOf(el),type:(el as HTMLInputElement).type||'',tag:el.tagName.toLowerCase(),selector:cssPath(el)}:null;stopPicker();chrome.runtime.sendMessage({cmd:'picker-result',analysis:{url:location.href,title:document.title,questions:[q],buttons:button?[button]:[]}})};
 const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();stopPicker()}};document.addEventListener('mousemove',move,true);document.addEventListener('click',click,true);document.addEventListener('keydown',key,true);pickerState.cleanup=()=>{document.removeEventListener('mousemove',move,true);document.removeEventListener('click',click,true);document.removeEventListener('keydown',key,true)};
}
function find(q:string,selector?:string){if(selector){try{const e=document.querySelector(selector);if(e&&vis(e))return e}catch{}}const raw=String(q??'').trim(),wanted=cleanQ(raw),n=norm(wanted),num=qNum(raw);if(raw){try{const byName=[...document.querySelectorAll('input[name],textarea[name],select[name]')].find(x=>norm((x as HTMLInputElement).name)===n);if(byName)return byName}catch{}}const gs=groups();if(num!=null){const hit=gs.find(c=>{const h=c.querySelector('.nsv_survey_reply_question_title,[role="heading"],legend,[class*="question_title"],[data-question-title]');return qNum(textOf(h||c))===num});if(hit)return hit}return gs.filter(c=>{const h=c.querySelector('.nsv_survey_reply_question_title,[role="heading"],legend,[class*="question_title"],[data-question-title],label');const t=norm(cleanQ(textOf(h||c)));return t===n||t.includes(n)||n.includes(t)}).sort((a,b)=>textOf(a).length-textOf(b).length)[0]||null}
function val(e:HTMLInputElement|HTMLTextAreaElement,v:string){const proto=e instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;const set=Object.getOwnPropertyDescriptor(proto,'value')?.set;if(set)set.call(e,v);else e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))}
function choose(root:Element,a:string,checked=true,selector?:string){const n=norm(a);let el:Element|null=null;if(selector){try{el=document.querySelector(selector)}catch{}}if(!el){const els=[...(root.matches('input[type="radio"],input[type="checkbox"],[role="option"],[role="radio"],[role="checkbox"]')?[root]:[]),...root.querySelectorAll('input[type="radio"],input[type="checkbox"],label,[role="option"],[role="radio"],[role="checkbox"],option')];el=els.find(x=>norm(textOf(x))===n)||els.find(x=>norm(textOf(x)).includes(n)||n.includes(norm(textOf(x))))||null}if(!el)return false;const input=el.matches('input')?el as HTMLInputElement:el.querySelector('input') as HTMLInputElement|null;if(input){if(input.checked!==checked)input.click();return true}if(el instanceof HTMLOptionElement){el.selected=checked;el.parentElement?.dispatchEvent(new Event('change',{bubbles:true}));return true}(el as HTMLElement).click();return true}
const tpl=(v:any,p:any)=>String(v??'').replaceAll('{{name}}',String(p?.name??'')).replaceAll('{{num}}',String(p?.num??p?.phone??'')).replaceAll('{{phone}}',String(p?.phone??p?.num??''));
const absoluteUrl=(v:any,p:any)=>{const raw=tpl(v,p).trim();if(/^https?:\/\//i.test(raw))return raw;if(/^\/\//.test(raw))return location.protocol+raw;return 'https://'+raw.replace(/^\/+/, '')};
const isNaverFormPage=()=>location.hostname==='form.naver.com'&&location.pathname.startsWith('/response/');
const matches=(template:string)=>{try{const t=new URL(absoluteUrl(template,{})),here=new URL(location.href);if(t.origin===here.origin&&t.pathname===here.pathname)return true;const shortHosts=new Set(['naver.me','m.site.naver.com']);if(shortHosts.has(t.hostname)&&isNaverFormPage())return true;return false}catch{return false}};
function findButton(label:string,selector?:string){if(selector){try{const e=document.querySelector(selector);if(e&&vis(e))return e}catch{}}const n=norm(label),els=[...document.querySelectorAll('button,[role="button"],input[type="submit"],input[type="button"]')].filter(vis);return els.find(x=>norm(textOf(x))===n)||els.find(x=>norm(textOf(x)).includes(n))||els.find(x=>n.includes(norm(textOf(x))))||null}
function clickButton(label:string,selector?:string){const el=findButton(label,selector);if(!el)return false;(el as HTMLElement).click();return true}
const store=async(v:any)=>{try{await chrome.storage.session.set(v);return'session'}catch{await chrome.storage.local.set(v);return'local'}};
const read=async(keys:any)=>{try{const x=await chrome.storage.session.get(keys);if(Object.keys(x||{}).length)return x}catch{}return chrome.storage.local.get(keys)};
const remove=async(keys:any)=>{try{await chrome.storage.session.remove(keys)}catch{}try{await chrome.storage.local.remove(keys)}catch{}};

async function watchManualSubmit(action:any,next:any){
 const target=findButton(tpl(action.text||action.answer,next),action.selector||action.buttonSelector);
 if(!target)return{ok:false,message:'수동 제출 버튼을 찾지 못했습니다: '+(action.text||action.answer||'')};
 let fired=false;
 const advance=async()=>{
   if(fired)return;
   fired=true;
   if(next){
     await store({pendingRun:next});
     const nextForm=next.kit?.forms?.[0];
     if(nextForm?.url)setTimeout(()=>{if(location.href!==absoluteUrl(nextForm.url,next))location.href=absoluteUrl(nextForm.url,next)},300);
     post('status',{message:'제출 버튼 클릭이 확인되었습니다. 다음 차수 페이지를 불러옵니다.'});
   }else{
     await remove('pendingRun');
     post('status',{message:'마지막 제출 버튼 클릭이 확인되었습니다.'});
   }
 };
 const form=target.closest('form');
 if(form)form.addEventListener('submit',()=>{void advance()},{once:true,capture:true});
 target.addEventListener('click',()=>{void advance()},{once:true,capture:true});
 return{ok:false,manual:true,advanced:true,message:'개인정보·제3자 제공 동의는 직접 확인하고 제출 버튼을 눌러 주세요.'};
}

async function runForm(form:any,p:any,onAdvance?:()=>Promise<void>,onManual?:((action:any)=>Promise<any>)){for(let i=0;i<(form.steps||[]).length;i++){const s=form.steps[i];
 if(s.manual||s.type==='agreement'){
   const action=(form.steps||[]).slice(i+1).find((x:any)=>x.type==='action'&&x.manual);
   if(action&&onManual)return onManual(action);
   return{ok:false,manual:true,message:'개인정보·약관·동의 항목은 사용자가 직접 확인하고 선택한 후 제출해 주세요.'};
 }
 if(s.type==='action'){
   const target=tpl(s.text||s.answer,p);if(!target)return{ok:false,message:'실행할 버튼 이름이 없습니다.'};
   if(s.manual&&onManual)return onManual(s);
   if((s.nextUrl||form.nextUrl)&&onManual)return onManual({...s,nextUrl:s.nextUrl||form.nextUrl});
   if(onAdvance)await onAdvance();
   const ok=clickButton(target,s.selector||s.buttonSelector);if(!ok)return{ok:false,message:'버튼을 찾지 못했습니다: '+target};
   return{ok:true,message:'다음/제출 동작을 실행했습니다.',advanced:true}
 }
 const raw=s.answer,values=Array.isArray(raw)?raw.map((v:any)=>tpl(v,p)):tpl(raw,p),a=Array.isArray(values)?values[0]||'':values;
 if(s.type==='name'||s.type==='num'){
   // 이름/연락처는 특정 폼의 CSS 구조가 아니라 공통 검색어로 문항을 찾는다.
   const searchTerm=s.type==='name'?'이름':'연락처';
   const r=find(searchTerm);
   if(!r)return{ok:false,message:'문항을 찾지 못했습니다: '+searchTerm};
   const e=(s.inputSelector?document.querySelector(s.inputSelector):(isControl(r)?r:r.querySelector('textarea,input:not([type="radio"]):not([type="checkbox"]):not([type="hidden"]),select,[contenteditable="true"],[role="textbox"]'))) as HTMLInputElement|HTMLTextAreaElement|null;
   if(!e)return{ok:false,message:'입력란을 찾지 못했습니다: '+searchTerm};
   if((e as HTMLElement).isContentEditable){(e as HTMLElement).textContent=a;e.dispatchEvent(new InputEvent('input',{bubbles:true,data:a,inputType:'insertText'}))}
   else val(e,a);
   continue;
 }
 const r=find(s.question||'',s.selector);if(!r)return{ok:false,message:'문항을 찾지 못했습니다: '+s.question};
 if(['choice','checkbox'].includes(s.type)){const vs=Array.isArray(values)?values:[a];for(const v of vs){const item=s.choiceItems?.find((x:any)=>norm(x.text)===norm(v)||norm(x.text).includes(norm(v))||norm(v).includes(norm(x.text)));if(!choose(r,v,s.checked!==false,item?.selector))return{ok:false,message:'선택하지 못했습니다: '+s.question}}}
 else{const e=(s.inputSelector?document.querySelector(s.inputSelector):(isControl(r)?r:r.querySelector('textarea,input:not([type="radio"]):not([type="checkbox"]):not([type="hidden"]),select,[contenteditable="true"],[role="textbox"]'))) as HTMLInputElement|HTMLTextAreaElement|null;if(!e)return{ok:false,message:'입력란을 찾지 못했습니다: '+s.question};if(e.tagName==='SELECT'){const o=[...(e as HTMLSelectElement).options].find(o=>norm(o.text)===norm(a)||norm(o.value)===norm(a));if(!o)return{ok:false,message:'선택지를 찾지 못했습니다: '+s.question};(e as HTMLSelectElement).value=o.value;e.dispatchEvent(new Event('change',{bubbles:true}))}else if((e as HTMLElement).isContentEditable){(e as HTMLElement).textContent=a;e.dispatchEvent(new InputEvent('input',{bubbles:true,data:a,inputType:'insertText'}))}else val(e,a)}}return{ok:true,message:'입력 완료',advanced:false}}

async function executePending(p:any){
 const i=Math.max(0,p?.cursor||0),forms=p?.kit?.forms||[],form=forms[i];if(!form||!matches(form.url))return;
 const nextForm=i+1<forms.length?{...p,cursor:i+1}:{...p,kit:p?.queue?.[0],queue:(p?.queue||[]).slice(1),cursor:0};
 const next=nextForm?.kit?.forms?.length?nextForm:null;
 const result=await runForm(form,p,async()=>{if(next)await store({pendingRun:next});else await remove('pendingRun')},async(action)=>watchManualSubmit(action,next));
 post('status',{message:result.message});
 if(result.manual){if(result.advanced)return;await store({pendingRun:{...p,paused:true}});return}
 if(result.ok&&result.advanced){if(!next)setTimeout(()=>remove('pendingRun'),1500);return}
 if(result.ok)await remove('pendingRun')
}
function captureFormState(){
 const analysis=analyze();
 const steps:any[]=analysis.questions.map((q:any)=>{
   const inputs=q.inputs||[];
   const textInputs=inputs.filter((x:any)=>!['radio','checkbox','hidden'].includes(x.type));
   const nameLike=/^(이름|성명|성함|닉네임)$/i.test(cleanQ(q.question||''));
   const phoneLike=/(연락처|전화번호|휴대전화|휴대폰|핸드폰)/i.test(q.question||'');
   if(nameLike&&textInputs.some((x:any)=>x.value!=='')) return {...q,type:'name',answer:'{{name}}'};
   if(phoneLike&&textInputs.some((x:any)=>x.value!=='')) return {...q,type:'num',answer:'{{phone}}'};
   if(q.role==='radio'||q.role==='choice'){
     const selected=inputs.find((x:any)=>x.checked);
     const item=(q.choiceItems||[]).find((x:any)=>x.selector===selected?.selector)||q.choiceItems?.find((x:any)=>norm(x.value)===norm(selected?.value));
     return {...q,type:'choice',answer:item?.text||selected?.value||''};
   }
   if(q.role==='checkbox'){
     const selected=inputs.filter((x:any)=>x.checked).map((x:any)=>{const item=(q.choiceItems||[]).find((y:any)=>y.selector===x.selector);return item?.text||x.value||''}).filter(Boolean);
     return {...q,type:'checkbox',answer:selected};
   }
   const first=textInputs[0];
   if(first)return {...q,type:'text',answer:first.value||''};
   return {...q,type:'action',text:q.question||'',manual:true};
 });
 return {version:6,title:analysis.title||document.title,forms:[{url:location.href,title:document.title,steps}]};
}
chrome.runtime.onMessage.addListener((m,_s,send)=>{if(m.cmd==='capture-form'){try{send({ok:true,form:captureFormState()})}catch(err){send({ok:false,message:String((err as any)?.message||err||'폼 상태를 읽지 못했습니다.')})}return true}if(m.cmd==='run'){runForm(m.payload.form||m.payload,m.payload).then(send);return true}return false});

window.addEventListener('message',e=>{if(!isWeb(e))return;if(e.data.type==='ping'){post('pong');return}if(e.data.type==='prepare'){const payload=e.data.payload||{},requestId=e.data.requestId;store({pendingRun:{...payload,cursor:0}}).then(mode=>post('prepared',{requestId,storage:mode})).catch(err=>post('prepare-error',{requestId,message:String(err?.message||err||'저장 실패')}));return}});
const retry=async()=>{for(let i=0;i<30;i++){const x=await read('pendingRun');if(x.pendingRun){if(x.pendingRun.paused)return;await executePending(x.pendingRun);const y=await read('pendingRun');if(!y.pendingRun)return;if(y.pendingRun.paused)return}await new Promise(r=>setTimeout(r,500))}};retry().catch(()=>{});
