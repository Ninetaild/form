import{useState}from'react';

type Kit={version:1;eventName:string;url:string;answers:string[]};

const blocked=(s:string)=>/(\\b01[016789]-?\\d{3,4}-?\\d{4}\\b|\\b\\d{2,3}-\\d{3,4}-\\d{4}\\b|[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}|(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주).{0,12}(?:시|군|구).{0,20}(?:동|읍|면)|(?:이름|성명|연락처|전화번호|휴대폰|휴대전화|주소|이메일)\\s*[:：])/i.test(s);

const save=(data:Kit)=>{
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'});
 const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='event-kit.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};

export default function Popup(){
 const[eventName,setEventName]=useState('');
 const[url,setUrl]=useState('');
 const[answers,setAnswers]=useState(['']);
 const[status,setStatus]=useState('');

 const update=(i:number,v:string)=>setAnswers(a=>a.map((x,n)=>n===i?v:x));
 const add=()=>setAnswers(a=>[...a,'']);
 const remove=(i:number)=>setAnswers(a=>a.filter((_,n)=>n!==i));
 const move=(i:number,d:number)=>setAnswers(a=>{const b=[...a],j=i+d;if(j<0||j>=b.length)return a;[b[i],b[j]]=[b[j],b[i]];return b});

 const exportJson=()=>{
  const cleanAnswers=answers.map(x=>x.trim()).filter(Boolean);
  if(!eventName.trim()||!url.trim()||!cleanAnswers.length){setStatus('이벤트명, URL, 정답을 하나 이상 입력해 주세요.');return}
  try{const u=new URL(url.trim());if(!/^https?:$/.test(u.protocol))throw new Error()}catch{setStatus('URL은 http:// 또는 https:// 주소를 입력해 주세요.');return}
  if(blocked(eventName)||blocked(url)||cleanAnswers.some(blocked)){setStatus('개인정보로 보일 수 있는 이름·연락처·주소·이메일 형식은 JSON에 넣지 않습니다. 내용을 확인해 주세요.');return}
  const kit:Kit={version:1,eventName:eventName.trim(),url:url.trim(),answers:cleanAnswers};
  save(kit);setStatus('JSON을 내보냈습니다.');
 };

 return <main style={{width:420,maxWidth:'100%',boxSizing:'border-box',padding:18,fontFamily:'system-ui,sans-serif',color:'#27251f'}}>
  <h1 style={{fontSize:21,margin:'0 0 6px'}}>Event Kit 제작기</h1>
  <p style={{fontSize:12,color:'#756f64',lineHeight:1.6,marginTop:0}}>이벤트명·URL·정답만 직접 입력해 JSON을 만듭니다. 개발자 도구, 웹페이지 읽기, 자동 입력 기능은 사용하지 않습니다.</p>
  <label style={{display:'block',fontWeight:700,fontSize:13,marginTop:14}}>이벤트명</label>
  <input value={eventName} onChange={e=>setEventName(e.target.value)} placeholder="주최사 &lt;이벤트명&gt;" style={{width:'100%',boxSizing:'border-box',padding:10,marginTop:6,border:'1px solid #d7d0c5',borderRadius:9,font: 'inherit'}}/>
  <label style={{display:'block',fontWeight:700,fontSize:13,marginTop:14}}>URL</label>
  <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://example.com/event" style={{width:'100%',boxSizing:'border-box',padding:10,marginTop:6,border:'1px solid #d7d0c5',borderRadius:9,font:'inherit'}}/>
  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:18}}><strong>정답</strong><button onClick={add}>+ 정답 추가</button></div>
  {answers.map((answer,i)=><div key={i} style={{display:'flex',gap:6,marginTop:8}}>
   <input value={answer} onChange={e=>update(i,e.target.value)} placeholder={'정답 '+(i+1)} style={{flex:1,minWidth:0,padding:10,border:'1px solid #d7d0c5',borderRadius:9,font:'inherit'}}/>
   <button onClick={()=>move(i,-1)} disabled={i===0} title="위로">↑</button><button onClick={()=>move(i,1)} disabled={i===answers.length-1} title="아래로">↓</button><button onClick={()=>remove(i)} disabled={answers.length===1}>삭제</button>
  </div>)}
  <button onClick={exportJson} style={{width:'100%',padding:12,marginTop:18,border:0,borderRadius:10,background:'#29261f',color:'#fff',fontWeight:800}}>JSON 내보내기</button>
  <button onClick={()=>{setEventName('');setUrl('');setAnswers(['']);setStatus('')}} style={{width:'100%',padding:10,marginTop:7,border:'1px solid #d7d0c5',borderRadius:10,background:'#fff'}}>새 Kit</button>
  <p style={{fontSize:12,color:'#756f64',lineHeight:1.6,marginBottom:0}}>JSON에는 이름·연락처·주소·이메일 등 개인정보를 넣지 않는 것을 원칙으로 합니다. 정답은 매크로로 수집하지 않고 개발자가 직접 확인하여 작성합니다.</p>
  {status&&<p style={{fontSize:12,marginTop:10}}>{status}</p>}
 </main>;
}
