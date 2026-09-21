import{useState}from'react';

type ChoiceItem={text:string;selector?:string;value?:string};
type Q={index:number;number:number|null;question:string;rawQuestion?:string;selector?:string;inputSelector?:string;inputs:any[];choices:string[];choiceItems?:ChoiceItem[];required?:boolean;types?:string[];role?:string};
type Step={type:string;question?:string;questionNumber?:number|null;selector?:string;inputSelector?:string;answer?:string|string[];text?:string;checked?:boolean;manual?:boolean;nextUrl?:string;choices?:string[];choiceItems?:ChoiceItem[];required?:boolean};
type Form={url:string;title?:string;steps:Step[];nextUrl?:string};
type Kit={version:number;title:string;forms:Form[]};

const web='https://ninetaild.github.io/form/';
const originPattern=(url:string)=>{try{const u=new URL(url);if(!/^https?:$/.test(u.protocol))return null;return u.origin+'/*'}catch{return null}};
const requestOrigins=async(origins:string[])=>{const unique=[...new Set(origins)].filter(Boolean);if(!unique.length)return false;const missing:string[]=[];for(const origin of unique){try{if(!(await chrome.permissions.contains({origins:[origin]})))missing.push(origin)}catch{missing.push(origin)}}if(!missing.length)return true;try{return await chrome.permissions.request({origins:missing})}catch{return false}};
const requestCurrentSiteAccess=async()=>{try{const tabs=await chrome.tabs.query({active:true,currentWindow:true}),tab=tabs[0],pattern=originPattern(String(tab?.url||''));if(!pattern)return{ok:false,message:'현재 탭은 웹사이트 권한을 요청할 수 없는 페이지입니다.'};const granted=await requestOrigins([pattern]);return granted?{ok:true,message:'현재 사이트의 페이지 권한을 허용했습니다.'}:{ok:false,message:'사이트 권한이 허용되지 않았습니다.'}}catch{return{ok:false,message:'사이트 권한 요청에 실패했습니다.'}}};
const save=(name:string,data:any)=>{const u=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};
const clean=(s:any)=>String(s??'').replace(/\\s+/g,' ').trim();
const parseDeveloperHtml=(html:string):Step[]=>{
 const d=new DOMParser().parseFromString(html,'text/html');
 const els=[...d.querySelectorAll('input,textarea,select,button,[role="button"],[role="radio"],[role="checkbox"],option')];
 const out:Step[]=[];
 const groups=new Map<string,Element[]>();
 for(const el of els){
  const type=(el as HTMLInputElement).type||el.getAttribute('role')||el.tagName.toLowerCase();
  if(type==='hidden')continue;
  const fieldRoot=el.closest('[data-question],[data-field],fieldset,dl[class*="survey_box"],.survey_box,.nsv_survey_question,.question,.field');
  const groupName=(el as HTMLInputElement).name||fieldRoot?.getAttribute('data-question')||fieldRoot?.getAttribute('data-field');
  const identity=(el as HTMLElement).id||el.getAttribute('aria-label')||el.getAttribute('placeholder')||el.getAttribute('name')||el.getAttribute('title')||'field';
  const key=/radio|checkbox|option/i.test(type)?'choice:'+(groupName||identity):'field:'+identity;
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key)!.push(el);
 }
 for(const arr of groups.values()){
  const first=arr[0];
  const rawType=(first as HTMLInputElement).type||first.getAttribute('role')||first.tagName.toLowerCase();
  const container=first.closest('[data-question],[data-field],fieldset,dl[class*="survey_box"],.survey_box,.question,.field')||first.parentElement;
  const containerText=clean(container?.textContent||'');
  const heading=container?.querySelector('legend,[role="heading"],[class*="question_title"],[data-question-title]')?.textContent;
  const elementText=clean(first.textContent||'');
  const title=clean((/button/i.test(rawType)?elementText:'')||heading||first.getAttribute('title')||first.getAttribute('aria-label')||first.closest('label')?.textContent||first.getAttribute('placeholder')||first.getAttribute('name')||'입력 항목');
  const items=arr.map(x=>{
   const label=x.closest('label');
   const text=clean(label?.textContent||x.getAttribute('aria-label')||x.getAttribute('data-label')||x.getAttribute('title')||x.getAttribute('value')||x.textContent||x.parentElement?.textContent||'');
   return{text,value:(x as HTMLInputElement).value||'',selector:(x as HTMLElement).id?'#'+CSS.escape((x as HTMLElement).id):undefined,checked:(x as HTMLInputElement).checked===true};
  }).filter(x=>x.text);
  const nameLike=/^(이름|성명|성함|닉네임)$/i.test(clean(title));
  const phoneLike=/(연락처|전화번호|휴대전화|휴대폰|핸드폰)/i.test(clean(title));
  if(/radio|checkbox|option/i.test(rawType)){
   const checkedItems=items.filter(x=>x.checked).map(x=>x.text);
   const single=/최대\s*1\s*개\s*선택|한\s*가?지\s*만\s*선택|한개만\s*선택/i.test(title+' '+containerText);
   const role=/checkbox/i.test(rawType)?'checkbox':'choice';
   const answer=role==='checkbox'?checkedItems:(checkedItems[0]||'');
   out.push({type:role,question:title,answer,choiceItems:items,choices:items.map(x=>x.text),checked:true,manual:/동의|개인정보|약관/i.test(title)});
  }else if(/button/i.test(rawType)){
   out.push({type:'action',text:title,question:title,selector:first.id?'#'+CSS.escape((first as HTMLElement).id):undefined,manual:/제출|저장|확인|완료/i.test(title)});
  }else{
   const type=/textarea/i.test(rawType)?'text':/number|tel/i.test(rawType)?'num':/email/i.test(rawType)?'text':'text';
   let answer=(first as HTMLInputElement).value||'';
   if(first.tagName.toLowerCase()==='textarea')answer=(first as HTMLTextAreaElement).value||first.textContent||'';
   if(first.tagName.toLowerCase()==='select'){
     const selected=[...(first as HTMLSelectElement).options].filter(o=>o.selected).map(o=>o.textContent?.trim()||o.value);
     answer=selected.join(', ');
   }
   if(nameLike&&answer)answer='{{name}}';
   else if(phoneLike&&answer)answer='{{phone}}';
   out.push({type:nameLike?'name':phoneLike?'num':type,question:title,answer,selector:first.id?'#'+CSS.escape((first as HTMLElement).id):undefined,inputSelector:first.id?'#'+CSS.escape((first as HTMLElement).id):undefined,checked:true});
  }
 }
 return out;
};

export default function Popup(){
 const[s,setS]=useState('개발자 도구에서 가져온 HTML을 붙여 넣어 루틴을 만드세요.');
 const[steps,setSteps]=useState<Step[]>([]);
 const[title,setTitle]=useState('새 Form Routine Kit');
 const[url,setUrl]=useState('');
 const[nextUrl,setNextUrl]=useState('');
 const[dev,setDev]=useState('');
 const[devOpen,setDevOpen]=useState(true);
 const[routines,setRoutines]=useState<Form[]>([]);
 const[activeRoutine,setActiveRoutine]=useState(0);

 const upd=(i:number,p:Partial<Step>)=>setSteps(x=>x.map((v,n)=>n===i?{...v,...p}:v));
 const remove=(i:number)=>setSteps(x=>x.filter((_,n)=>n!==i));
 const move=(i:number,d:number)=>setSteps(x=>{const y=[...x],j=i+d;if(j<0||j>=y.length)return y;[y[i],y[j]]=[y[j],y[i]];return y});
 const snapshot=():Form=>({url:url.trim(),title:'루틴 '+(activeRoutine+1),steps,nextUrl:nextUrl.trim()||undefined});
 const persistCurrent=(list:Form[])=>{const copy=[...list];copy[activeRoutine]=snapshot();setRoutines(copy);return copy};
 const switchRoutine=(i:number)=>{const copy=persistCurrent(routines);const f=copy[i]||{url:'',title:'루틴 '+(i+1),steps:[],nextUrl:''};setActiveRoutine(i);setSteps(f.steps||[]);setUrl(f.url||'');setNextUrl(f.nextUrl||'');setS('루틴 '+(i+1)+'을 편집합니다.')};
 const addRoutine=()=>{const copy=persistCurrent(routines);const f:Form={url:'',title:'루틴 '+(copy.length+1),steps:[],nextUrl:''};const next=[...copy,f];setRoutines(next);setActiveRoutine(next.length-1);setSteps([]);setUrl('');setNextUrl('');setS('루틴 '+next.length+'을 추가했습니다.')};
 const addDev=()=>{const parsed=parseDeveloperHtml(dev);if(!parsed.length){setS('개발자 도구 HTML에서 항목을 찾지 못했습니다.');return}setSteps(x=>[...x,...parsed]);setDev('');setS(parsed.length+'개 항목을 추가했습니다. 객관식은 아래에서 선택지를 지정할 수 있습니다.')};
 const captureCurrent=async()=>{
  try{
   const tabs=await chrome.tabs.query({active:true,currentWindow:true}),tab=tabs[0];
   if(!tab?.id){setS('현재 탭을 찾지 못했습니다.');return}
   const access=await requestCurrentSiteAccess();
   if(!access.ok){setS(access.message);return}
   const r=await chrome.tabs.sendMessage(tab.id,{cmd:'capture-form'});
   if(!r?.ok){setS(r?.message||'현재 폼을 읽지 못했습니다.');return}
   const form=r.form;
   setUrl(form.url||'');setSteps(form.steps||[]);setS('현재 작성된 폼 상태를 가져왔습니다. 이름은 {{name}}, 연락처는 {{phone}}으로 저장했습니다.');
  }catch{setS('현재 페이지의 폼을 읽지 못했습니다. 확장 프로그램을 새로고침한 뒤 대상 폼에서 다시 시도해 주세요.')}
 };
 const openAll=async()=>{const copy=[...routines];copy[activeRoutine]=snapshot();setRoutines(copy);const forms=copy.filter(f=>f.url);if(!forms.length){setS('열 수 있는 URL이 있는 루틴이 없습니다.');return}const patterns=forms.map(f=>originPattern(String(f.url||''))).filter((x):x is string=>!!x);if(!await requestOrigins(patterns)){setS('루틴에 필요한 사이트 권한이 허용되지 않았습니다.');return}try{const r=await chrome.runtime.sendMessage({cmd:'run-routines',forms});setS(r?.ok?r.message||forms.length+'개 루틴을 실행했습니다.':'루틴 실행에 실패했습니다.');}catch{setS('루틴 실행 연결에 실패했습니다. 확장 프로그램을 새로고침해 주세요.')}};
 const build=():Kit=>{const copy=[...routines];copy[activeRoutine]=snapshot();return{version:5,title,forms:copy.map((f,i)=>({...f,title:'루틴 '+(i+1),steps:f.steps||[]}))}};

 return <main style={{width:410,padding:14,fontFamily:'system-ui',boxSizing:'border-box'}}>
  <h3>Form Routine Kit</h3>
  <button style={{width:'100%',padding:8}} onClick={()=>chrome.tabs.create({url:web})}>Kit 실행 화면</button>
  <button style={{width:'100%',padding:10,marginTop:6,background:'#f3f4f6',border:'1px solid #d1d5db',borderRadius:6}} onClick={async()=>{const r=await requestCurrentSiteAccess();setS(r.message)}}>현재 사이트 페이지 권한 허용</button>
  <p style={{fontSize:11,color:'#666',margin:'5px 0 8px'}}>현재 열려 있는 웹사이트만 권한을 요청합니다. 모든 사이트 권한을 미리 받지 않습니다.</p>
  <p style={{fontSize:12,color:'#555'}}>페이지 읽기와 마우스 선택 없이, 개발자 도구 HTML만으로 루틴을 구성합니다.</p>
  <button style={{width:'100%',padding:10,background:'#2563eb',color:'#fff',border:0,borderRadius:6}} onClick={()=>setDevOpen(v=>!v)}>① 개발자 도구 HTML {devOpen?'닫기':'열기'}</button>
  <button style={{width:'100%',padding:10,marginTop:6}} onClick={captureCurrent}>② 현재 작성된 폼 상태 가져오기</button>
  {devOpen&&<div style={{marginTop:8}}>
   <textarea style={{width:'100%',minHeight:150,boxSizing:'border-box'}} value={dev} onChange={e=>setDev(e.target.value)} placeholder={'개발자 도구에서 input/label/option 등의 HTML을 복사해 붙여넣으세요.\n예: <input type="checkbox" value="남성"><label>남성</label>'}/>
   <button onClick={addDev} style={{width:'100%',padding:8,marginTop:5}}>HTML에서 항목 추가</button>
  </div>}
  <p style={{fontSize:12,color:'#555'}}>{s}</p>
  <label style={{fontSize:12}}>Kit 이름</label>
  <input style={{width:'100%',padding:7,boxSizing:'border-box'}} value={title} onChange={e=>setTitle(e.target.value)}/>
  <div style={{display:'flex',gap:4,margin:'8px 0',flexWrap:'wrap'}}>
   {Array.from({length:Math.max(1,routines.length)},(_,i)=><button key={i} onClick={()=>switchRoutine(i)} style={{fontWeight:activeRoutine===i?'bold':'normal'}}>루틴 {i+1}</button>)}
   <button onClick={addRoutine}>+ 루틴 추가</button>
   <button onClick={openAll}>모든 루틴 실행</button>
  </div>
  <label style={{fontSize:12}}>페이지 주소</label>
  <input style={{width:'100%',padding:7,boxSizing:'border-box'}} value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://form.naver.com/response/..."/>
  <label style={{fontSize:12}}>리디렉션/다음 주소 (참고)</label>
  <input style={{width:'100%',padding:7,boxSizing:'border-box'}} value={nextUrl} onChange={e=>setNextUrl(e.target.value)} placeholder="https://tr.ee/... 또는 다음 루틴 URL"/>
  <h4>루틴 {activeRoutine+1} 항목 ({steps.length})</h4>
  {steps.map((st,i)=><div key={i} style={{border:'1px solid #aaa',padding:8,margin:'6px 0',borderRadius:6}}>
   <div style={{fontSize:11,color:'#777'}}>#{i+1}{st.required?' · 필수':''}</div>
   <label style={{fontSize:11}}>항목/문항</label>
   <input style={{width:'100%',boxSizing:'border-box'}} value={st.question||st.text||''} onChange={e=>upd(i,st.type==='action'?{text:e.target.value}:{question:e.target.value})}/>
   <select style={{width:'100%',marginTop:5}} value={st.type} onChange={e=>{const type=e.target.value;upd(i,{type,answer:type==='name'?'{{name}}':type==='num'?'{{phone}}':type==='agreement'?st.answer:st.answer,manual:type==='agreement'?true:st.manual})}}>
    <option value="choice">객관식</option><option value="checkbox">체크박스</option><option value="agreement">동의</option><option value="text">텍스트</option><option value="name">이름</option><option value="num">전화번호</option><option value="action">다음/제출</option>
   </select>
   {st.manual&&<p style={{fontSize:12,color:'#8a3d00'}}>사용자가 직접 확인/선택/제출</p>}
   {st.type==='action'?<><input style={{width:'100%'}} value={st.text||''} onChange={e=>upd(i,{text:e.target.value})} placeholder="버튼"/><label style={{fontSize:12}}><input type="checkbox" checked={!!st.manual} onChange={e=>upd(i,{manual:e.target.checked})}/> 사용자가 직접 제출</label></>:st.type==='checkbox'&&!!st.choiceItems?.length&&!st.manual?<div>{st.choiceItems!.map((x,j)=>{const arr=Array.isArray(st.answer)?st.answer:[];return <label key={j} style={{display:'block',fontSize:12}}><input type="checkbox" checked={arr.includes(x.text)} onChange={e=>upd(i,{answer:e.target.checked?[...arr,x.text]:arr.filter(v=>v!==x.text)})}/>{x.text}</label>})}</div>:!!st.choiceItems?.length&&!st.manual?<select style={{width:'100%',marginTop:5}} value={Array.isArray(st.answer)?st.answer[0]:st.answer||''} onChange={e=>upd(i,{answer:e.target.value})}><option value="">선택하세요</option>{st.choiceItems!.map((x,j)=><option key={j} value={x.text}>{x.text}</option>)}</select>:!st.manual?<input style={{width:'100%'}} value={Array.isArray(st.answer)?st.answer.join(','):st.answer||''} onChange={e=>upd(i,{answer:e.target.value})} placeholder="{{name}}, {{phone}} 또는 직접 입력"/>:null}
   <div style={{display:'flex',gap:4,marginTop:5}}><button onClick={()=>move(i,-1)} disabled={i===0}>↑</button><button onClick={()=>move(i,1)} disabled={i===steps.length-1}>↓</button><button onClick={()=>remove(i)}>삭제</button></div>
  </div>)}
  <button style={{width:'100%',padding:10,marginTop:8}} onClick={()=>save('form-routine-kit.json',build())}>JSON 저장</button>
 </main>
}