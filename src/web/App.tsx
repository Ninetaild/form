import{useEffect,useState}from'react';

type Kit={file:string;title:string;uploadedAt:string;uploadedDate:string;url:string};
type KitJson={version:number;title:string;forms:any[]};
type LocalKit={file:string;title:string;uploadedAt:string;uploadedDate:string;url:string;kit:KitJson};

const WEB_ORIGIN='https://ninetaild.github.io';
const send=(type:string,payload:any={})=>window.postMessage({source:'form-routine-kit-web',type,...payload},WEB_ORIGIN);
const kstDate=(iso:string)=>{const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(iso));return[p.find(x=>x.type==='year')?.value||'0000',p.find(x=>x.type==='month')?.value||'01',p.find(x=>x.type==='day')?.value||'01'].join('-')};
const readCatalog=async():Promise<Kit[]>=>{
 const r=await fetch('./kits/index.json',{cache:'no-store',headers:{Accept:'application/json'}});if(!r.ok)throw new Error('Kit 목록을 읽지 못했습니다: '+r.status);
 const a=await r.json();if(!Array.isArray(a))throw new Error('Kit 목록 형식이 올바르지 않습니다.');
 return a.filter((x:any)=>typeof x?.file==='string'&&/^[^/\\]+\.json$/i.test(x.file)).map((x:any)=>{const at=typeof x.uploadedAt==='string'&&x.uploadedAt?x.uploadedAt:'1970-01-01T00:00:00.000Z';return{file:x.file,title:x.title||x.file,uploadedAt:at,uploadedDate:/^\d{4}-\d{2}-\d{2}$/.test(x.uploadedDate||'')?x.uploadedDate:kstDate(at),url:'./kits/src/'+encodeURIComponent(x.file)}}).sort((a:any,b:any)=>b.uploadedAt.localeCompare(a.uploadedAt));
};
const notice=[
 ['1. 개인정보를 받지 않습니다','홈페이지에는 이름·전화번호·주소·이메일을 입력하는 칸이 없습니다. Kit에 {{name}} 또는 {{phone}}이 들어 있어도 실제 개인정보를 요구하지 않고 해당 입력을 건너뜁니다.'],
 ['2. 개발자 서버로 보내지 않습니다','이 프로젝트는 사용자의 개인정보를 개발자 서버나 자체 데이터베이스로 전송·저장하지 않습니다. 대상 이벤트 사이트가 직접 처리하는 정보는 별도로 확인해야 합니다.'],
 ['3. JSON Kit 읽기','홈페이지는 먼저 정적 kits/index.json을 읽고, 선택한 JSON만 다시 읽습니다. 잘못된 JSON은 목록에서 제외하고 사용자가 추가한 JSON은 브라우저 메모리에서만 읽습니다.'],
 ['4. 확장 프로그램 권한','확장 프로그램은 모든 웹사이트에 접근할 수 있는 권한을 사용합니다. 이 권한은 선택한 Kit의 대상 페이지에서 자동 입력·선택 기능을 수행하기 위해 필요합니다. 확장 프로그램은 웹페이지의 내용을 읽고 변경할 수 있으므로, 설치 전에 브라우저가 표시하는 권한 경고를 확인해 주세요.'],
 ['5. 권한 제거','정해진 답변 입력이 끝나거나 사용자가 중지하면 해당 사이트의 호스트 권한을 제거하고 작업을 종료합니다.'],
 ['6. 직접 확인할 항목','개인정보 동의, 제3자 제공, 약관, CAPTCHA, 다음·최종 제출 등 사용자의 의사 확인이 필요한 동작은 자동으로 실행하지 않습니다.'],
 ['7. 권한 거절','브라우저의 사이트 접근 권한 요청을 거절하면 자동 입력은 실행되지 않습니다.'],
 ['8. 마지막 확인','응모 내용과 대상 사이트의 개인정보처리방침·이용약관을 직접 확인한 뒤 실행해 주세요. 이 안내는 법률상 동의를 대신하지 않습니다.']
] as const;

export default function App(){
 const[kits,setKits]=useState<Kit[]>([]),[locals,setLocals]=useState<LocalKit[]>([]),[file,setFile]=useState(''),[date,setDate]=useState(''),[checked,setChecked]=useState(false),[status,setStatus]=useState(''),[logs,setLogs]=useState<string[]>([]),[running,setRunning]=useState(false);
 const[noticeOpen,setNoticeOpen]=useState(true),[noticeEnd,setNoticeEnd]=useState(false),[noticeReady,setNoticeReady]=useState(false);
 useEffect(()=>{const on=(e:MessageEvent)=>{if(e.source!==window||e.origin!==location.origin||e.data?.source!=='form-routine-kit-extension')return;if(e.data.type==='log'){const p=e.data.payload||{};setLogs(x=>[...x,`[${p.time||''}] ${p.message||''}`].slice(-80));setRunning(true)}if(e.data.type==='stopped'){setRunning(false);setStatus('실행을 중지했습니다.')}if(e.data.type==='finished'){setRunning(false)}};window.addEventListener('message',on);return()=>window.removeEventListener('message',on)},[]);
 useEffect(()=>{readCatalog().then(a=>{setKits(a);setDate(a[0]?.uploadedDate||'');setFile(a[0]?.file||'')}).catch(e=>setStatus(e.message||'Kit 목록을 읽지 못했습니다.'))},[]);
 const dates=[...new Set(kits.map(x=>x.uploadedDate))],dateList=locals.length?['내 파일',...dates]:dates;
 const shown=date==='내 파일'?locals:kits.filter(x=>x.uploadedDate===date);
 const chooseDate=(d:string)=>{setDate(d);const x=d==='내 파일'?locals[0]:kits.find(k=>k.uploadedDate===d);setFile(x?.file||'')};
 const addFiles=async(e:React.ChangeEvent<HTMLInputElement>)=>{const fs=[...Array.from(e.target.files||[])];e.target.value='';const a:LocalKit[]=[];for(const f of fs){try{const k=JSON.parse(await f.text());if(!Array.isArray(k?.forms)||!k.forms.length||!k.forms.every((x:any)=>x&&typeof x.url==='string'&&Array.isArray(x.steps)))continue;const t=new Date().toISOString();a.push({file:'local:'+t+':'+f.name,title:k.title||f.name,uploadedAt:t,uploadedDate:'내 파일',url:'',kit:k})}catch{}}if(a.length){setLocals(x=>[...a,...x]);setDate('내 파일');setFile(a[0].file);setStatus(a.length+'개의 JSON Kit을 브라우저에서 읽었습니다.')}else setStatus('사용할 수 있는 JSON Kit을 찾지 못했습니다.')};
 const waitExtension=()=>new Promise<boolean>(resolve=>{let done=false,n=0;const on=(e:MessageEvent)=>{if(e.source===window&&e.origin===location.origin&&e.data?.source==='form-routine-kit-extension'&&(e.data.type==='ready'||e.data.type==='pong')){done=true;clearInterval(t);clearTimeout(to);window.removeEventListener('message',on);resolve(true)}};const t=window.setInterval(()=>{if(!done){send('ping');if(++n>=15)clearInterval(t)}},200);const to=window.setTimeout(()=>{if(!done){done=true;clearInterval(t);window.removeEventListener('message',on);resolve(false)}},3500);window.addEventListener('message',on);send('ping')});
 const prepare=()=>new Promise<boolean>(resolve=>{const id='p-'+Date.now();let done=false;const on=(e:MessageEvent)=>{if(e.source!==window||e.origin!==location.origin||e.data?.source!=='form-routine-kit-extension'||e.data.requestId!==id)return;if(e.data.type==='prepared'){done=true;cleanup();resolve(true)}if(e.data.type==='prepare-error'){done=true;cleanup();setStatus(e.data.message||'실행 준비에 실패했습니다.');resolve(false)}};const cleanup=()=>{clearInterval(t);clearTimeout(to);window.removeEventListener('message',on)};let n=0;const t=window.setInterval(()=>{if(!done){send('prepare',{requestId:id,payload:window.__formRoutinePayload});if(++n>=15)clearInterval(t)}},250);const to=window.setTimeout(()=>{if(!done){done=true;cleanup();setStatus('확장 프로그램 응답 시간이 초과되었습니다.');resolve(false)}},4500);window.addEventListener('message',on);send('prepare',{requestId:id,payload:window.__formRoutinePayload})});
 const stop=()=>{send('stop');setRunning(false);setStatus('중지 요청을 보냈습니다.');};
 const run=async()=>{const item=shown.find(x=>x.file===file);if(!item){setStatus('Kit을 선택해 주세요.');return}try{const k='kit'in item?item.kit:await fetch(item.url,{cache:'no-store'}).then(async r=>{if(!r.ok)throw new Error('JSON 읽기 실패: '+r.status);return r.json()});if(!Array.isArray(k.forms)||!k.forms.length)throw new Error('실행할 폼이 없습니다.');window.__formRoutinePayload={kit:k,queue:[]};setStatus('확장 프로그램 연결을 확인하는 중…');if(!await waitExtension()){delete window.__formRoutinePayload;setStatus('확장 프로그램을 새로고침한 뒤 다시 시도해 주세요.');return}setLogs([]);setRunning(true);setStatus('대상 폼을 새 탭으로 여는 중…');const ok=await prepare();delete window.__formRoutinePayload;if(ok)setStatus('실행 중입니다. 아래 로그에서 진행 상황을 확인하세요.')}catch(e:any){delete window.__formRoutinePayload;setStatus(e.message||'Kit 실행에 실패했습니다.')}};
 return <main className="shell">
  {noticeOpen&&<div className="noticeOverlay" role="dialog" aria-modal="true"><div className="noticeModal"><div className="noticeHeader"><span className="noticeBadge">필수 안내</span><h2>개인정보 · 확장 프로그램 권한 안내</h2><p>Kit 목록을 읽고 실행하기 전에 확인해 주세요.</p></div><div className="noticeScroll" onScroll={e=>{const x=e.currentTarget;if(x.scrollTop+x.clientHeight>=x.scrollHeight-12)setNoticeEnd(true)}}>{notice.map(([t,b])=><section className="noticeSection" key={t}><h3>{t}</h3><p>{b}</p></section>)}<div className="noticeLast">안내를 끝까지 확인했습니다.</div></div><div className="noticeFooter"><p className="noticeHint">{noticeEnd?'안내를 끝까지 확인했습니다.':'끝까지 스크롤해 주세요.'}</p><button className="primary noticeConfirm" disabled={!noticeEnd} onClick={()=>{setNoticeReady(true);setNoticeOpen(false)}}>안내 내용을 확인했습니다</button></div></div></div>}
  <section className="card"><h1>이벤트 응모 도우미</h1><p className="muted">개인정보를 받지 않고, Kit의 정해진 답변만 입력합니다.</p><button className="noticeAgain" onClick={()=>{setNoticeOpen(true);setNoticeEnd(false)}}>개인정보·권한 안내 다시 보기</button>
   <div className="uploadRow"><label className="uploadButton">JSON Kit 추가<input type="file" accept=".json,application/json" multiple onChange={addFiles}/></label><span className="muted">브라우저에서만 읽습니다.</span></div>
   <label>업로드일<select value={date} onChange={e=>chooseDate(e.target.value)}>{dateList.map(d=><option key={d} value={d}>{d}</option>)}</select></label>
   <label>Kit<select value={file} onChange={e=>setFile(e.target.value)}>{shown.map(k=><option key={k.file} value={k.file}>{k.title}</option>)}</select></label>
   <label className="check"><input type="checkbox" disabled={!noticeReady} checked={checked} onChange={e=>setChecked(e.target.checked)}/> 안내 내용을 확인했습니다.</label>
   {!noticeReady&&<p className="lockHint">먼저 필수 안내를 끝까지 확인해 주세요.</p>}
   <button className="primary" disabled={!checked||!file||running} onClick={run}>Kit 실행</button>{running&&<button className="primary" onClick={stop} style={{marginTop:8,background:'#b91c1c'}}>■ 실행 중지</button>}<div style={{marginTop:12,padding:10,border:'1px solid #ddd',borderRadius:8,background:'#fafafa'}}><div style={{fontWeight:700,fontSize:13,display:'flex',alignItems:'center',gap:7}}><span style={{width:10,height:10,borderRadius:'50%',background:running?'#16a34a':'#9ca3af',display:'inline-block'}}/>통신 기록 / 실행 로그</div><pre style={{whiteSpace:'pre-wrap',fontSize:11,lineHeight:1.5,maxHeight:220,overflow:'auto',margin:'8px 0 0'}}>{logs.length?logs.join('\n'):'실행 전에는 기록이 없습니다.'}</pre></div><p className="muted" style={{fontSize:12}}>개인정보처리방침 · <a href="./privacy.html" target="_blank" rel="noreferrer">Privacy</a> · <a href="./terms.html" target="_blank" rel="noreferrer">이용약관</a></p><a className="download" href="./download/form-routine-kit-extension.zip" download>Chrome 확장 프로그램 ZIP 다운로드</a><p className="status">{status}</p>
  </section>
 </main>;
}
declare global{interface Window{__formRoutinePayload?:any}}
