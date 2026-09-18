import{useEffect,useState}from'react';

type Kit={file:string;title:string};
type Q={index:number;question:string;inputs:{tag:string;type:string;placeholder:string}[];choices:string[]};
type A={questions:Q[];buttons:string[]};

const send=(m:unknown)=>window.postMessage({source:'form-routine-kit-web',...m},'*');
const resolveUrl=(url:string,name:string,num:string)=>String(url||'').replaceAll('{{name}}',encodeURIComponent(name)).replaceAll('{{num}}',encodeURIComponent(num));

export default function App(){
 const[mode,setMode]=useState<'run'|'build'>('run'),[kits,setKits]=useState<Kit[]>([]),[file,setFile]=useState(''),[name,setName]=useState(''),[num,setNum]=useState(''),[agree,setAgree]=useState(false),[analysis,setAnalysis]=useState<A|null>(null),[answers,setAnswers]=useState<Record<number,string>>({}),[status,setStatus]=useState('');

 useEffect(()=>{
   fetch('./kits/index.json',{cache:'no-store'}).then(r=>r.json()).then((x:Kit[])=>{setKits(x);setFile(x[0]?.file||'')}).catch(()=>setStatus('Kit 목록을 불러오지 못했습니다.'));
   const f=(e:MessageEvent)=>{if(e.source!==window||e.data?.source!=='form-routine-kit-extension')return;if(e.data.type==='analysis')setAnalysis(e.data.analysis);if(e.data.type==='status')setStatus(e.data.message)};
   addEventListener('message',f);return()=>removeEventListener('message',f)
 },[]);

 const run=async()=>{
   const kit=await fetch('./kits/'+file,{cache:'no-store'}).then(r=>r.json());
   const form=kit.forms?.[0];
   if(!form?.url){setStatus('Kit에 폼 URL이 없습니다.');return}
   const targetUrl=resolveUrl(form.url,name.trim(),num.trim());
   send({type:'prepare',payload:{kit,name:name.trim(),num:num.trim()}});
   setStatus('입력값을 확장 프로그램에 전달했습니다. 폼을 엽니다.');
   window.open(targetUrl,'_blank','noopener')
 };

 const analyze=()=>{setStatus('폼 탭을 활성화한 상태에서 읽기를 실행하세요.');send({type:'analyze-current-tab'})};

 const save=()=>{
   if(!analysis)return;
   const steps=analysis.questions.filter(q=>q.question).map(q=>({type:q.choices.length?'choice':(q.inputs[0]?.type==='tel'?'num':'text'),question:q.question,answer:answers[q.index]||''}));
   const kit={version:2,title:'새 Form Routine Kit',forms:[{url:location.href,steps}]};
   const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(kit,null,2)],{type:'application/json'}));a.download='form-routine-kit.json';a.click();setStatus('Kit JSON을 저장했습니다.')
 };

 return <main className="shell"><header><b>Form Routine Kit</b><nav><button className={mode==='run'?'active':''} onClick={()=>setMode('run')}>Kit 실행</button><button className={mode==='build'?'active':''} onClick={()=>setMode('build')}>Kit 만들기</button></nav></header>{mode==='run'?<section className="card"><h1>폼 입력 루틴</h1><p className="muted">Kit URL에 {'{{name}}'}, {'{{num}}'}을 넣으면 이용자가 입력한 값으로 URL이 자동 작성됩니다.</p><label>Kit<select value={file} onChange={e=>setFile(e.target.value)}>{kits.map(k=><option key={k.file} value={k.file}>{k.title}</option>)}</select></label><label>이름<input value={name} onChange={e=>setName(e.target.value)}/></label><label>번호<input value={num} onChange={e=>setNum(e.target.value)} inputMode="numeric"/></label><div className="notice">이름·번호를 개발자 서버에 전송하거나 저장하지 않습니다. 설문 제출 정보는 폼 운영자 또는 명시된 제3자에게 제공될 수 있습니다.</div><label className="check"><input type="checkbox" checked={agree} onChange={e=>setAgree(e.target.checked)}/> 안내 내용을 확인했습니다.</label><button className="primary" disabled={!agree||!file} onClick={run}>확장 프로그램으로 실행</button><a className="download" href="./download/form-routine-kit-extension.zip" download>Chrome 확장 프로그램 ZIP 다운로드</a><p className="status">{status}</p></section>:<section className="card"><h1>현재 폼에서 Kit 만들기</h1><p className="muted">폼 탭을 활성화한 상태에서 확장 프로그램의 ‘현재 페이지 읽기’를 사용하면 질문과 선택지를 읽을 수 있습니다.</p><button className="primary" onClick={analyze}>현재 페이지 읽기</button>{analysis&&<div>{analysis.questions.map(q=><article className="question" key={q.index}><b>{q.question||('문항 '+(q.index+1))}</b>{q.choices.length?<select value={answers[q.index]||''} onChange={e=>setAnswers(a=>({...a,[q.index]:e.target.value}))}><option value="">답변 선택</option>{q.choices.map(c=><option key={c}>{c}</option>)}</select>:<input value={answers[q.index]||''} placeholder={q.inputs[0]?.placeholder||'답변'} onChange={e=>setAnswers(a=>({...a,[q.index]:e.target.value}))}/>}<small>{q.choices.length?'객관식':'주관식'} · {'{{name}}'}, {'{{num}}'} 사용 가능</small></article>)}<button className="primary" onClick={save}>Kit JSON 저장</button></div>}<p className="status">{status}</p></section>}</main>
}