import{useEffect,useState}from'react';
type Kit={file:string;title:string};
type KitJson={version:number;title:string;forms:any[]};
const resolve=(u:string,n:string,num:string)=>String(u||'').replaceAll('{{name}}',encodeURIComponent(n)).replaceAll('{{num}}',encodeURIComponent(num));
export default function App(){
 const[ks,setKs]=useState<Kit[]>([]),[file,setFile]=useState(''),[name,setName]=useState(''),[num,setNum]=useState(''),[ok,setOk]=useState(false),[status,setStatus]=useState('');
 useEffect(()=>{fetch('./kits/index.json').then(r=>{if(!r.ok)throw 0;return r.json()}).then((x:Kit[])=>{setKs(x);setFile(x[0]?.file||'')}).catch(()=>setStatus('Kit 목록을 읽지 못했습니다.'))},[]);
 const run=async()=>{
  let tab:Window|null=null;
  try{
   const kit=await fetch('./kits/'+file).then(r=>{if(!r.ok)throw 0;return r.json()}) as KitJson;
   const first=kit.forms?.[0];if(!first?.url)throw 0;
   const payload={kit,name:name.trim(),num:num.trim()};
   window.postMessage({source:'form-routine-kit-web',type:'prepare',payload},'*');
   await new Promise(r=>setTimeout(r,150));
   tab=window.open(resolve(first.url,name.trim(),num.trim()),'_blank');
   if(!tab){setStatus('새 탭이 차단되었습니다. 브라우저의 팝업 허용 후 다시 실행하세요.');return}
   setStatus('Kit 실행 준비 완료. 첫 페이지를 열고 루틴을 이어갑니다.');
  }catch{setStatus('Kit을 읽거나 실행하지 못했습니다.');}
 };
 return <main className="shell"><section className="card"><h1>Form Routine Kit</h1><p className="muted">사용자는 Kit을 선택하고 이름·번호를 입력한 뒤 실행만 합니다.</p><label>Kit<select value={file} onChange={e=>setFile(e.target.value)}>{ks.map(k=><option key={k.file} value={k.file}>{k.title}</option>)}</select></label><label>이름<input value={name} onChange={e=>setName(e.target.value)}/></label><label>번호<input value={num} onChange={e=>setNum(e.target.value)}/></label><label className="check"><input type="checkbox" checked={ok} onChange={e=>setOk(e.target.checked)}/> 안내 내용을 확인했습니다.</label><button className="primary" disabled={!ok||!file} onClick={run}>Kit 실행</button><a className="download" href="./download/form-routine-kit-extension.zip" download>Chrome 확장 프로그램 ZIP 다운로드</a><p className="status">{status}</p></section></main>
}