const BASE='./kits/';
const $=id=>document.getElementById(id);
async function loadKits(){
  const list=await fetch(BASE+'index.json',{cache:'no-store'}).then(r=>r.json());
  $('kitSelect').replaceChildren(...list.map(x=>{const o=document.createElement('option');o.value=x.file;o.textContent=x.title||x.file;return o;}));
}
$('agree').addEventListener('change',()=>{$('start').disabled=!$('agree').checked;});
$('start').addEventListener('click',async()=>{
  const kit=await fetch(BASE+$('kitSelect').value,{cache:'no-store'}).then(r=>r.json());
  if(!kit.forms?.length)return;
  const payload={kit,name:$('name').value.trim(),phone:$('phone').value.replace(/\D/g,'')};
  // 개인정보는 이 페이지에서 서버로 전송하지 않습니다. 확장 프로그램에 전달할 때만 사용합니다.
  localStorage.removeItem('formRoutineSensitive');
  sessionStorage.setItem('formRoutinePayload',JSON.stringify(payload));
  $('status').textContent='Kit을 준비했습니다. 확장 프로그램을 설치한 뒤 첫 번째 폼 URL을 열어 실행하세요.';
  window.open(kit.forms[0].url,'_blank','noopener');
});
loadKits().catch(e=>$('status').textContent='Kit 목록을 불러오지 못했습니다.');
