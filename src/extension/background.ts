let panelWindowId:number|null=null;
let panelTargetTabId:number|null=null;
const tabRoutines=new Map<number,{form:any,pattern:string,webTabId:number}>();

const originPattern=(url:string)=>{
 try{const u=new URL(url);if(!/^https?:$/.test(u.protocol))return null;return u.origin+'/*'}catch{return null}
};
const log=(webTabId:number,message:string,level:'info'|'ok'|'warn'|'error'='info')=>{
 const payload={message,level,time:new Date().toLocaleTimeString('ko-KR',{hour12:false})};
 try{chrome.tabs.sendMessage(webTabId,{cmd:'ui-log',payload})}catch{}
};
const badgeOn=()=>{chrome.action.setBadgeText({text:'●'});chrome.action.setBadgeBackgroundColor({color:'#16a34a'});chrome.action.setTitle({title:'Form Routine Kit 실행 중'})};
const badgeOff=()=>{chrome.action.setBadgeText({text:''});chrome.action.setTitle({title:'Form Routine Kit 실행 상태'})};
const refreshBadge=()=>{if(tabRoutines.size)badgeOn();else badgeOff()};

async function removeHost(pattern:string){
 try{await chrome.permissions.remove({origins:[pattern]})}catch{}
}
async function inject(tabId:number){
 await chrome.scripting.executeScript({target:{tabId},files:['content.js']});
}
async function waitPermission(pattern:string,webTabId:number,tabId:number){
 for(let i=0;i<60;i++){
  if(await chrome.permissions.contains({origins:[pattern]}))return true;
  await new Promise(r=>setTimeout(r,500));
 }
 log(webTabId,'사이트 접근 권한이 허용되지 않아 작업을 중지했습니다.','warn');
 try{await chrome.tabs.remove(tabId)}catch{}
 return false;
}
async function prepareTab(tabId:number,form:any,webTabId:number){
 const pattern=originPattern(String(form.url||''));
 if(!pattern)throw new Error('지원하지 않는 대상 URL입니다.');
 log(webTabId,'대상 페이지를 열었습니다: '+new URL(form.url).origin);
 try{
  await chrome.permissions.addHostAccessRequest({tabId,pattern});
  log(webTabId,'사이트 접근 권한을 요청했습니다: '+pattern);
 }catch(e:any){throw new Error('사이트 접근 권한을 요청하지 못했습니다: '+String(e?.message||e||''))}
 if(!await waitPermission(pattern,webTabId,tabId))throw new Error('사이트 접근 권한이 필요합니다.');
 log(webTabId,'사이트 접근 권한이 허용되었습니다. 페이지에 기능을 연결합니다.','ok');
 await inject(tabId);
 await new Promise(r=>setTimeout(r,250));
 const entry={form,pattern,webTabId};tabRoutines.set(tabId,entry);
 refreshBadge();
 log(webTabId,'자동 입력 준비가 완료되었습니다.','ok');
 void runRoutineInTab(tabId,entry);
}

async function rememberTargetTab(){
 try{
  const w=await chrome.windows.getLastFocused({populate:true});
  if(panelWindowId!==null&&w.id===panelWindowId)return panelTargetTabId;
  const tab=w.tabs?.find(t=>t.active&&t.id!=null);
  if(tab?.id!=null){panelTargetTabId=tab.id;return tab.id}
 }catch{}
 return panelTargetTabId;
}
async function runRoutineInTab(tabId:number,entry:{form:any,pattern:string,webTabId:number}){
 try{
  const r=await chrome.tabs.sendMessage(tabId,{cmd:'run',payload:{form:entry.form}});
  if(r?.manual||r?.ok){
   log(entry.webTabId,r?.ok?'정해진 답변 입력이 완료되었습니다. 다음/제출/동의는 직접 확인하세요.':'사용자 확인이 필요한 항목에서 자동 입력을 중지했습니다.',r?.ok?'ok':'warn');
   await removeHost(entry.pattern);
   tabRoutines.delete(tabId);refreshBadge();
   log(entry.webTabId,'작업을 종료하고 사이트 접근 권한을 제거했습니다.','ok');try{chrome.tabs.sendMessage(entry.webTabId,{cmd:'ui-finished'})}catch{}
   return r
  }
 }catch(e:any){log(entry.webTabId,'대상 페이지와 통신하지 못했습니다: '+String(e?.message||e||''),'warn')}
 return null;
}
chrome.action.onClicked.addListener(async()=>{
 await rememberTargetTab();
 if(panelWindowId!==null){try{const w=await chrome.windows.get(panelWindowId);if(w?.id){await chrome.windows.update(w.id,{focused:true});return}}catch{}panelWindowId=null}
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
 const entry=tabRoutines.get(tabId)!;
 void runRoutineInTab(tabId,entry).then(r=>{if(!r&&tabRoutines.has(tabId)){setTimeout(()=>{if(tabRoutines.has(tabId))void runRoutineInTab(tabId,entry)},700);setTimeout(()=>{if(tabRoutines.has(tabId))void runRoutineInTab(tabId,entry)},1800)}});
});
chrome.tabs.onRemoved.addListener(async tabId=>{
 const entry=tabRoutines.get(tabId);if(entry){await removeHost(entry.pattern);log(entry.webTabId,'대상 탭이 닫혀 작업을 종료했습니다.','warn')}
 tabRoutines.delete(tabId);refreshBadge();
});
chrome.runtime.onMessage.addListener((m:any,s,send)=>{
 if(m.cmd==='prepare-run'){
  const forms=(m.payload?.kit?.forms||[]).filter((f:any)=>String(f.url||'').trim());
  const webTabId=s.tab?.id??panelTargetTabId??-1;
  if(!forms.length){send({ok:false,message:'실행할 폼이 없습니다.'});return false}
  badgeOn();
  log(webTabId,'실행을 시작했습니다. 대상 사이트 권한을 확인합니다.');
  void (async()=>{
   try{
    for(const form of forms){
     const tab=await chrome.tabs.create({url:String(form.url).trim(),active:true});
     if(tab.id!=null)await prepareTab(tab.id,form,webTabId);
    }
    log(webTabId,forms.length+'개 대상 페이지의 실행 준비가 완료되었습니다.','ok');
    send({ok:true,message:forms.length+'개 대상 페이지를 준비했습니다.'});
   }catch(e:any){
    log(webTabId,'실행 준비 중 오류: '+String(e?.message||e||'알 수 없는 오류'),'error');
    refreshBadge();
    send({ok:false,message:String(e?.message||e||'실행 준비에 실패했습니다.')});
   }
  })();
  return true;
 }
 if(m.cmd==='run-routines'){
  const forms=(m.forms||[]).filter((f:any)=>String(f.url||'').trim());
  const webTabId=s.tab?.id??panelTargetTabId??-1;
  if(!forms.length){send({ok:false,message:'실행할 루틴이 없습니다.'});return false}
  badgeOn();
  void (async()=>{for(const form of forms){try{const tab=await chrome.tabs.create({url:String(form.url).trim(),active:true});if(tab.id!=null)await prepareTab(tab.id,form,webTabId)}catch(e:any){log(webTabId,'루틴 준비 실패: '+String(e?.message||e||''),'error')}}send({ok:true,message:forms.length+'개 루틴 URL을 준비했습니다.'})})();
  return true;
 }
 if(m.cmd==='stop-all'){
  const entries=[...tabRoutines.entries()];
  void (async()=>{
   for(const [tabId,entry] of entries){
    try{await chrome.tabs.sendMessage(tabId,{cmd:'stop'})}catch{}
    await removeHost(entry.pattern);
    log(entry.webTabId,'중지 요청을 전달했습니다.','warn');
    tabRoutines.delete(tabId);
   }
   refreshBadge();
   send({ok:true,message:'실행을 중지했습니다.'});
  })();
  return true;
 }
 return false;
});
