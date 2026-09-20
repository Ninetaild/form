import{useEffect,useState}from'react';
type Kit={file:string;title:string;uploadedAt:string;uploadedDate:string;url:string};type KitJson={version:number;title:string;forms:any[]};type UploadedKit={file:string;title:string;uploadedAt:string;uploadedDate:string;url:string;kit:KitJson};
const GITHUB_API='https://api.github.com/repos/Ninetaild/form';
const toKstDate=(iso:string)=>{const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit'}).formatToParts(new Date(iso));const m=p.find(x=>x.type==='month')?.value||'01';const d=p.find(x=>x.type==='day')?.value||'01';return `${m}-${d}`;};
const loadKitCatalog=async():Promise<Kit[]>=>{
 const r=await fetch(`${GITHUB_API}/contents/public/kits/src?ref=main`,{headers:{Accept:'application/vnd.github+json'}});if(!r.ok)throw 0;
 const entries=await r.json() as {name:string;download_url:string}[];
 const jsons=entries.filter(x=>/\.json$/i.test(x.name)&&true);
 const kits=await Promise.all(jsons.map(async x=>{
   const [data,commits]=await Promise.all([
     fetch(x.download_url).then(r=>{if(!r.ok)throw 0;return r.json() as Promise<KitJson>}),
     fetch(`${GITHUB_API}/commits?path=public/kits/src/${encodeURIComponent(x.name)}&per_page=1`,{headers:{Accept:'application/vnd.github+json'}}).then(r=>{if(!r.ok)throw 0;return r.json() as Promise<any[]>})
   ]);
   const uploadedAt=commits[0]?.commit?.committer?.date||commits[0]?.commit?.author?.date;if(!uploadedAt)throw 0;
   return {file:x.name,title:data.title||x.name,uploadedAt,uploadedDate:toKstDate(uploadedAt),url:x.download_url};
 }));
 return kits.sort((a,b)=>b.uploadedAt.localeCompare(a.uploadedAt));
};
const WEB_ORIGIN='https://ninetaild.github.io';
const resolve=(u:string,n:string,num:string)=>{const raw=String(u||'').trim().replaceAll('{{name}}',encodeURIComponent(n)).replaceAll('{{num}}',encodeURIComponent(num)).replaceAll('{{phone}}',encodeURIComponent(num));if(/^https?:\/\//i.test(raw))return raw;if(/^\/\//.test(raw))return location.protocol+raw;return 'https://'+raw.replace(/^\/+/, '');};
const send=(type:string,payload:any={})=>window.postMessage({source:'form-routine-kit-web',type,...payload},WEB_ORIGIN);

const noticeSections=[
  {title:'1. 이 서비스가 하는 일',body:'Form Routine Kit은 사용자가 선택한 폼 페이지를 브라우저에서 분석하고, 사용자가 만든 Kit에 따라 이름·전화번호 등 사용자가 직접 입력한 값을 해당 폼에 자동으로 입력하거나 선택하는 브라우저 확장 프로그램입니다. 입력·제출 대상은 사용자가 선택한 외부 웹사이트의 폼입니다.'},
  {title:'2. 개인정보를 개발자 서버로 수집하지 않습니다',body:'현재 이 프로젝트에는 이름·전화번호 등의 입력값을 개발자 서버로 전송하거나 자체 데이터베이스에 저장하는 기능이 없습니다. 별도의 Google Analytics, 광고 추적, 개인정보 전송용 외부 API도 사용하지 않습니다. 다만 이것은 대상 웹사이트가 개인정보를 수집하지 않는다는 의미가 아닙니다. 폼을 제출하면 입력한 정보는 해당 이벤트·서비스 운영자 등 대상 사이트의 서버로 전달될 수 있습니다.'},
  {title:'3. 브라우저에 임시 저장될 수 있습니다',body:'실행할 Kit과 현재 실행 위치, 사용자가 입력한 이름·번호 등 실행에 필요한 정보는 확장 프로그램의 브라우저 저장 영역에 임시 저장됩니다. 기본적으로 세션 저장소를 사용하고, 브라우저가 세션 저장소를 지원하지 않는 경우 로컬 저장소를 대체 사용합니다. 따라서 이 확장 프로그램을 사용하는 기기 자체에 정보가 남을 가능성이 있습니다. 공용 PC에서는 사용하지 않는 것을 권장하며, 민감한 정보는 꼭 필요한 경우에만 입력하세요.'},
  {title:'4. 확장 프로그램 권한 안내',body:'현재 확장 프로그램은 storage 권한으로 브라우저 내 실행 정보를 저장하고, tabs 권한으로 현재 탭을 확인하거나 새 탭을 여는 데 사용합니다. 또한 폼 자동화를 위해 모든 웹사이트(<all_urls>)에 콘텐츠 스크립트를 실행할 수 있는 권한을 요청합니다. 이 권한은 브라우저가 웹페이지의 문항·입력란·버튼을 읽고 자동 입력을 수행하기 위해 필요합니다. 현재 코드에서는 이 권한으로 수집한 입력값을 개발자 서버로 전송하는 기능을 두고 있지 않지만, 사용자는 설치 전에 이 넓은 페이지 접근 권한을 이해해야 합니다.'},
  {title:'5. 외부 사이트로 전송되는 정보',body:'Kit 실행 과정에서 실제 개인정보가 전달되는 곳은 사용자가 선택한 대상 폼 페이지입니다. 예를 들어 이름이나 전화번호를 입력하고 제출하면 그 정보는 해당 사이트의 운영자·수탁자·제3자 등 대상 사이트가 정한 처리 주체에게 전달될 수 있습니다. 대상 사이트의 개인정보처리방침, 이용약관, 이벤트 안내를 확인한 뒤 사용하세요. Form Routine Kit 개발자는 대상 사이트의 개인정보 처리 방식을 통제하지 않습니다.'},
  {title:'6. 동의·약관·제3자 제공은 반드시 확인하세요',body:'브라우저 확장 프로그램이 자동으로 입력한다고 해서 사용자의 동의가 자동으로 성립하는 것은 아닙니다. 특히 개인정보 수집·이용, 개인정보 제3자 제공, 마케팅 수신, 약관 동의와 같은 항목은 내용을 직접 확인하고 본인의 의사에 따라 선택해야 합니다. 동의하지 않는 내용이 포함된 경우 실행을 중단하거나 해당 항목을 직접 수정하세요. 대상 사이트의 동의 화면을 최종적으로 확인하는 책임은 사용자에게 있습니다.'},
  {title:'7. 자동 제출에 관한 안내',body:'Kit에는 다음·제출 버튼을 자동으로 누르는 동작이 포함될 수 있습니다. 자동 입력·자동 제출은 대상 사이트의 이용약관이나 이벤트 운영정책에 의해 제한될 수 있습니다. 자동 실행 전에 입력값, 선택 항목, 동의 여부, 제출 대상을 반드시 확인하세요. 잘못된 Kit을 사용하면 원하지 않는 정보가 제출될 수 있습니다.'},
  {title:'8. 권한과 동작을 직접 확인할 수 있습니다',body:'확장 프로그램은 현재 페이지의 문항과 선택지를 분석하여 자동 Kit을 만들 수 있습니다. 사용자는 확장 프로그램 팝업에서 어떤 문항과 동작이 Kit에 포함되는지 확인할 수 있습니다. 권한이 필요 이상으로 넓다고 판단되거나 대상 사이트를 신뢰할 수 없다면 설치·실행하지 마세요.'},
  {title:'9. 브라우저 호환성',body:'현재 배포본은 Chromium 계열 브라우저(Chrome, Edge, Opera, Brave 등)를 중심으로 만들어져 있습니다. Firefox와 Safari는 동일한 확장 프로그램 파일로 완전히 동일하게 동작한다고 보장하지 않으며 별도의 호환 작업이 필요합니다. 사용 중인 브라우저에서 동작을 확인한 뒤 사용하세요.'},
  {title:'10. 사용 전 최종 확인',body:'이 안내를 확인한 뒤에도 사용자는 (1) 입력할 개인정보가 필요한 범위인지, (2) 대상 사이트가 신뢰할 수 있는지, (3) 동의·제3자 제공 내용을 이해했는지, (4) 자동 제출할 내용이 정확한지 직접 확인해야 합니다. 이 확인란은 법률상 동의 자체를 대신하는 것이 아니라, 위 안내를 읽고 서비스의 데이터 처리 방식과 확장 프로그램 권한을 이해했다는 확인입니다.'}
];

export default function App(){
 const[ks,setKs]=useState<Kit[]>([]),[uploadedKits,setUploadedKits]=useState<UploadedKit[]>([]),[file,setFile]=useState(''),[date,setDate]=useState(''),[name,setName]=useState(''),[num,setNum]=useState(''),[ok,setOk]=useState(false),[status,setStatus]=useState('');
 const[noticeOpen,setNoticeOpen]=useState(true),[noticeReady,setNoticeReady]=useState(false),[noticeEnd,setNoticeEnd]=useState(false);
 useEffect(()=>{loadKitCatalog().then(x=>{setKs(x);setDate(x[0]?.uploadedDate||'');setFile(x[0]?.file||'')}).catch(()=>setStatus('Kit 목록을 읽지 못했습니다.'))},[]);
 const dates=[...new Set(ks.map(k=>k.uploadedDate))];
 const allDates=uploadedKits.length?['내 파일',...dates]:dates;
 const dateKs=date==='내 파일'?uploadedKits.map(k=>k):ks.filter(k=>k.uploadedDate===date).sort((a,b)=>{const an=Number(a.file.replace(/\D/g,'')),bn=Number(b.file.replace(/\D/g,''));return (Number.isFinite(an)?an:Infinity)-(Number.isFinite(bn)?bn:Infinity)||a.file.localeCompare(b.file)});
 const currentIndex=Math.max(0,dateKs.findIndex(k=>k.file===file));
 const selectDate=(d:string)=>{setDate(d);const first=d==='내 파일'?uploadedKits[0]:ks.find(k=>k.uploadedDate===d);setFile(first?.file||'')};
 const uploadKit=async(e:React.ChangeEvent<HTMLInputElement>)=>{const files=[...Array.from(e.target.files||[])];e.target.value='';if(!files.length)return;const loaded:UploadedKit[]=[];for(const f of files){try{const kit=JSON.parse(await f.text()) as KitJson;if(!Array.isArray(kit?.forms)||!kit.forms.length||!kit.forms.every((x:any)=>x&&typeof x.url==='string'&&Array.isArray(x.steps)))continue;const stamp=new Date().toISOString();loaded.push({file:'local:'+stamp+':'+f.name,title:kit.title||f.name.replace(/\.json$/i,''),uploadedAt:stamp,uploadedDate:'내 파일',url:'',kit});}catch{}}if(!loaded.length){setStatus('사용할 수 있는 Form Routine Kit JSON을 찾지 못했습니다.');return}setUploadedKits(x=>[...loaded,...x]);setDate('내 파일');setFile(loaded[0].file);setStatus(loaded.length+'개의 JSON Kit을 추가했습니다.');};
 const moveKit=(delta:number)=>{if(!dateKs.length)return;const next=(currentIndex+delta+dateKs.length)%dateKs.length;setFile(dateKs[next].file)};
 const waitForExtension=()=>new Promise<boolean>(resolveReady=>{let done=false,attempts=0;let timer=0;let timeout=0;
 const finish=(v:boolean)=>{if(done)return;done=true;clearInterval(timer);clearTimeout(timeout);window.removeEventListener('message',on);resolveReady(v)};
 const on=(e:MessageEvent)=>{if(e.source!==window||e.origin!==location.origin||e.data?.source!=='form-routine-kit-extension')return;if(e.data.type==='pong'||e.data.type==='ready')finish(true)};
 window.addEventListener('message',on);
 const ping=()=>{attempts++;send('ping');if(attempts>=15)clearInterval(timer)};
 timer=window.setInterval(ping,200);timeout=window.setTimeout(()=>finish(false),3500);ping();
 });
 const prepare=()=>new Promise<{ok:boolean;message?:string}>(resolveReady=>{let done=false,attempts=0;let timer=0;let timeout=0;const requestId='prep-'+Date.now()+'-'+Math.random().toString(36).slice(2);
 const finish=(v:{ok:boolean;message?:string})=>{if(done)return;done=true;clearInterval(timer);clearTimeout(timeout);window.removeEventListener('message',on);resolveReady(v)};
 const on=(e:MessageEvent)=>{if(e.source!==window||e.origin!==location.origin||e.data?.source!=='form-routine-kit-extension'||e.data.requestId!==requestId)return;if(e.data.type==='prepared')finish({ok:true});if(e.data.type==='prepare-error')finish({ok:false,message:e.data.message})};
 window.addEventListener('message',on);
 const payload={kit:window.__formRoutinePayload?.kit,queue:window.__formRoutinePayload?.queue||[],name:window.__formRoutinePayload?.name||'',num:window.__formRoutinePayload?.num||''};
 const sendPrepare=()=>{attempts++;send('prepare',{payload,requestId});if(attempts>=15)clearInterval(timer)};
 timer=window.setInterval(sendPrepare,250);timeout=window.setTimeout(()=>finish({ok:false,message:'확장 프로그램 응답 시간 초과'}),4500);sendPrepare();
 });
 const run=async()=>{let tab:Window|null=null;try{setStatus('확장 프로그램 연결을 확인하는 중…');const selectedIndex=Math.max(0,dateKs.findIndex(k=>k.file===file));const ordered=dateKs.slice(selectedIndex);if(!ordered.length)throw 0;const loaded=await Promise.all(ordered.map(async k=>({kit:('kit' in k?k.kit:await fetch('./kits/src/'+k.file).then(r=>{if(!r.ok)throw 0;return r.json() as Promise<KitJson>})),file:k.file})));const first=loaded[0]?.kit?.forms?.[0];if(!first?.url)throw 0;
 tab=window.open('about:blank','_blank');if(!tab){setStatus('새 창이 차단되었습니다. 브라우저의 팝업 허용 후 다시 실행하세요.');return}
 window.__formRoutinePayload={kit:loaded[0].kit,queue:loaded.slice(1).map(x=>x.kit),name:name.trim(),num:num.trim()};
 const connected=await waitForExtension();if(!connected){delete window.__formRoutinePayload;tab.close();setStatus('확장 프로그램이 이 페이지에 연결되지 않았습니다. 확장 프로그램을 다시 로드한 뒤 이 페이지도 새로고침해 주세요.');return}
 setStatus('실행 정보를 확장 프로그램에 전달하는 중…');const prepared=await prepare();delete window.__formRoutinePayload;
 if(!prepared.ok){tab.close();setStatus(prepared.message?('실행 정보 전달 실패: '+prepared.message):'실행 정보를 확장 프로그램에 전달하지 못했습니다. 확장 프로그램과 이 페이지를 모두 새로고침한 뒤 재시도해 주세요.');return}
 tab.location.href=resolve(first.url,name.trim(),num.trim());setStatus('확장 프로그램 연결 및 Kit 전달 완료. 새 창의 첫 페이지에서 루틴을 자동 실행합니다.')}catch{delete window.__formRoutinePayload;if(tab&&!tab.closed)tab.close();setStatus('Kit을 읽거나 실행하지 못했습니다.')}};
 return <main className="shell">
  {noticeOpen&&<div className="noticeOverlay" role="dialog" aria-modal="true" aria-labelledby="noticeTitle">
   <div className="noticeModal">
    <div className="noticeHeader"><div><span className="noticeBadge">필수 안내</span><h2 id="noticeTitle">개인정보 · 확장 프로그램 권한 안내</h2><p>실행 전에 아래 내용을 확인해 주세요.</p></div></div>
    <div className="noticeScroll" onScroll={e=>{const el=e.currentTarget;if(el.scrollTop+el.clientHeight>=el.scrollHeight-12)setNoticeEnd(true)}}>
      {noticeSections.map(s=><section className="noticeSection" key={s.title}><h3>{s.title}</h3><p>{s.body}</p></section>)}
      <div className="noticeLast">위 안내의 내용을 확인했습니다. 특히 브라우저 저장, 대상 사이트로의 정보 전달, 확장 프로그램의 페이지 접근 권한 및 자동 제출 가능성을 이해했습니다.</div>
    </div>
    <div className="noticeFooter"><p className="noticeHint">{noticeEnd?'안내를 끝까지 확인했습니다. 아래 확인 버튼을 눌러 주세요.':'안내를 끝까지 읽어야 확인 버튼을 누를 수 있습니다. 아래로 스크롤해 주세요.'}</p><button className="primary noticeConfirm" disabled={!noticeEnd} onClick={()=>{setNoticeReady(true);setNoticeOpen(false)}}>안내 내용을 확인했습니다</button></div>
   </div>
  </div>}
  <section className="card"><h1>Form Routine Kit</h1><p className="muted">사용자는 Kit을 선택하고 이름·번호를 입력한 뒤 실행만 합니다.</p>
   <button className="noticeAgain" type="button" onClick={()=>{setNoticeOpen(true);setNoticeEnd(false)}}>개인정보·권한 안내 다시 보기</button>
   <div className="uploadRow"><label className="uploadButton">JSON Kit 추가<input type="file" accept=".json,application/json" multiple onChange={uploadKit}/></label><span className="muted">저장한 Kit JSON을 추가</span></div>
   <label>업로드일<select value={date} onChange={e=>selectDate(e.target.value)}>{allDates.map(d=><option key={d} value={d}>{d}</option>)}</select></label>
   <div className="kitNavigator"><button type="button" disabled={!dateKs.length} onClick={()=>moveKit(-1)}>‹</button><span>{dateKs.length ? `${currentIndex+1} / ${dateKs.length}` : ''}</span><button type="button" disabled={!dateKs.length} onClick={()=>moveKit(1)}>›</button></div>
   <label>Kit<select value={file} onChange={e=>setFile(e.target.value)}>{dateKs.map(k=><option key={k.file} value={k.file}>{k.title}</option>)}</select></label>
   <label>이름<input value={name} onChange={e=>setName(e.target.value)}/></label>
   <label>번호<input value={num} onChange={e=>setNum(e.target.value)}/></label>
   <label className="check"><input type="checkbox" checked={ok} disabled={!noticeReady} onChange={e=>setOk(e.target.checked)}/> 안내 내용을 확인했습니다.</label>
   {!noticeReady&&<p className="lockHint">먼저 필수 안내를 열어 끝까지 확인한 뒤 체크할 수 있습니다.</p>}
   <button className="primary" disabled={!ok||!file} onClick={run}>Kit 실행</button>
   <a className="download" href="./download/form-routine-kit-extension.zip" download>Chrome 확장 프로그램 ZIP 다운로드</a><p className="status">{status}</p>
  </section>
 </main>
}
declare global{interface Window{__formRoutinePayload?:any}}
