let panelWindowId:number|null=null;
let panelTargetTabId:number|null=null;
const tabRoutines=new Map<number,any>();

async function rememberTargetTab(){
 try{
  const w=await chrome.windows.getLastFocused({populate:true});
  if(panelWindowId!==null&&w.id===panelWindowId)return panelTargetTabId;
  const tab=w.tabs?.find(t=>t.active&&t.id!=null);
  if(tab?.id!=null){panelTargetTabId=tab.id;return tab.id}
 }catch{}
 return panelTargetTabId;
}
async function runRoutineInTab(tabId:number,form:any){
 try{
  const r=await chrome.tabs.sendMessage(tabId,{cmd:'run',payload:{form}});
  if(r?.manual||r?.ok){tabRoutines.delete(tabId);return r}
 }catch{}
 return null;
}
chrome.action.onClicked.addListener(async()=>{
 await rememberTargetTab();
 if(panelWindowId!==null){
  try{const w=await chrome.windows.get(panelWindowId);if(w?.id){await chrome.windows.update(w.id,{focused:true});return}}catch{}
  panelWindowId=null;
 }
 const w=await chrome.windows.create({url:chrome.runtime.getURL('panel.html'),type:'popup',width:440,height:780,focused:true});
 panelWindowId=w.id??null;
});
chrome.windows.onRemoved.addListener(id=>{if(id===panelWindowId){panelWindowId=null;panelTargetTabId=null}});
chrome.tabs.onActivated.addListener(async info=>{
 if(panelWindowId===null){panelTargetTabId=info.tabId;return}
 try{const w=await chrome.windows.get(info.windowId);if(w.type!=='popup')panelTargetTabId=info.tabId}catch{}
});
chrome.tabs.onUpdated.addListener((tabId,changeInfo)=>{
 if(changeInfo.status!=='complete'||!tabRoutines.has(tabId))return;
 const form=tabRoutines.get(tabId);
 void runRoutineInTab(tabId,form).then(r=>{
  if(!r){
   setTimeout(()=>{if(tabRoutines.has(tabId))void runRoutineInTab(tabId,form)},700);
   setTimeout(()=>{if(tabRoutines.has(tabId))void runRoutineInTab(tabId,form)},1800);
  }
 });
});
chrome.tabs.onRemoved.addListener(tabId=>tabRoutines.delete(tabId));
chrome.runtime.onMessage.addListener((m,s,send)=>{
 if(m.cmd==='prepare-run'){
  const forms=(m.payload?.kit?.forms||[]).filter((f:any)=>String(f.url||'').trim());
  if(!forms.length){send({ok:false,message:'실행할 폼이 없습니다.'});return false}
  try{
   const opened:number[]=[];
   for(const form of forms){
    const tab=await chrome.tabs.create({url:String(form.url).trim(),active:opened.length===0});
    if(tab.id!=null){tabRoutines.set(tab.id,form);opened.push(tab.id)}
   }
   send({ok:true,message:opened.length+'개 대상 페이지를 준비했습니다.'});
  }catch(e:any){
   send({ok:false,message:'대상 페이지를 열지 못했습니다: '+String(e?.message||e||'알 수 없는 오류')});
  }
  return false;
 }
 if(m.cmd==='run-routines'){
  const forms=(m.forms||[]).filter((f:any)=>String(f.url||'').trim());
  if(!forms.length){send({ok:false,message:'실행할 루틴이 없습니다.'});return false}
  let opened=0;
  forms.forEach((form:any)=>{
   chrome.tabs.create({url:String(form.url).trim(),active:opened===0}).then(tab=>{
    if(tab.id!=null){tabRoutines.set(tab.id,form);opened++}
   });
  });
  send({ok:true,message:forms.length+'개 루틴 URL을 탭으로 열었습니다. 입력/객관식 선택은 자동 실행되고 동의·제출은 직접 진행합니다.'});
  return false;
 }
 if(m.cmd==='picker-result'||m.cmd==='target-tab')return false;
 if(m.cmd==='start-picker'||m.cmd==='analyze-target')return false;
 if(m.cmd==='web-analyze')return false;
 if(m.cmd==='get-analysis'){send({analysis:null,tabId:null});return false}
 return false;
});