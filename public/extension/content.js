// Form Routine Kit content script.
// 개인정보는 외부 서버로 전송하지 않습니다.
// 문항 내부의 사람이 읽을 수 있는 텍스트를 기준으로 입력 요소를 찾습니다.

const norm = s => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();

function visible(el) {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden';
}

function containers() {
  return [...document.querySelectorAll(
    '[role="group"], fieldset, .nsv_survey_item, .nsv_survey_item_inner, form'
  )].filter(visible);
}

function findContainer(question) {
  const q = norm(question);
  if (!q) return null;
  const all = containers();
  return all.find(c => norm(c.innerText).includes(q)) || null;
}

function labelsIn(root) {
  return [...(root || document).querySelectorAll('label')].filter(visible);
}

function findChoice(root, answer) {
  const a = norm(answer);
  if (!a) return null;

  const labels = labelsIn(root);
  return labels.find(l => norm(l.innerText) === a) ||
         labels.find(l => norm(l.innerText).includes(a)) ||
         [...(root || document).querySelectorAll('[role="option"],[role="radio"],[role="checkbox"]')]
           .find(e => norm(e.innerText) === a || norm(e.innerText).includes(a));
}

function textInputs(root) {
  return [...(root || document).querySelectorAll(
    'textarea, input:not([type="radio"]):not([type="checkbox"]):not([type="submit"]):not([type="button"]), [contenteditable="true"]'
  )].filter(visible);
}

function setValue(el, value) {
  el.focus();
  if (el.isContentEditable) {
    el.textContent = value;
  } else {
    const proto = el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) setter.call(el, value);
    else el.value = value;
  }
  el.dispatchEvent(new InputEvent('input', {bubbles:true, inputType:'insertText', data:value}));
  el.dispatchEvent(new Event('change', {bubbles:true}));
}

function choose(root, answer) {
  const target = findChoice(root, answer);
  if (!target) return false;
  const control = target.control || (target.htmlFor ? document.getElementById(target.htmlFor) : null);
  (control || target).click();
  return true;
}

function findButton(words) {
  const wanted = words.map(norm);
  return [...document.querySelectorAll(
    'button, [role="button"], input[type="submit"], input[type="button"], a'
  )].filter(visible).find(el => {
    const t = norm(el.innerText || el.value || el.getAttribute('aria-label'));
    return wanted.includes(t) || wanted.some(w => t.includes(w));
  });
}

function clickNext() {
  const el = findButton(['다음','next']);
  if (el) { el.click(); return true; }
  return false;
}

function clickSubmit() {
  const el = findButton(['제출','응답 제출','완료','submit']);
  if (el) { el.click(); return true; }
  return false;
}

function resolveTemplate(value, payload) {
  return String(value ?? '')
    .replaceAll('{{name}}', payload.name || '')
    .replaceAll('{{phone}}', payload.phone || '')
    .replaceAll('{{num}}', payload.phone || '');
}

async function runSteps(steps, payload) {
  for (const step of steps || []) {
    const root = findContainer(step.question || '');
    if (!root) return {ok:false, message:'문항을 찾지 못했습니다: ' + step.question};

    const answer = resolveTemplate(step.answer, payload);
    let ok = false;

    if (['choice','checkbox','agreement'].includes(step.type)) {
      ok = choose(root, answer);
    } else if (['text','phone'].includes(step.type)) {
      const inputs = textInputs(root);
      const el = inputs[0];
      if (el) { setValue(el, answer); ok = true; }
    }

    if (!ok) return {ok:false, message:'입력하지 못했습니다: ' + step.question};
    await new Promise(r => setTimeout(r, 180));
  }
  return {ok:true};
}

async function runForm(form, payload) {
  const pages = form.pages || [{steps: form.steps || [], next: false, submit: true}];
  const pageIndex = Number(sessionStorage.getItem('frk_page') || 0);
  const page = pages[pageIndex];

  if (!page) {
    sessionStorage.removeItem('frk_page');
    return {ok:false, message:'실행할 페이지가 없습니다.'};
  }

  const result = await runSteps(page.steps, payload);
  if (!result.ok) return result;

  if (page.next) {
    sessionStorage.setItem('frk_page', String(pageIndex + 1));
    if (!clickNext()) return {ok:false, message:'다음 버튼을 찾지 못했습니다.'};
    return {ok:true, message:'다음 페이지로 이동합니다.'};
  }

  sessionStorage.removeItem('frk_page');
  if (page.submit !== false) {
    if (!clickSubmit()) return {ok:false, message:'제출 버튼을 찾지 못했습니다.'};
  }
  return {ok:true, message:'루틴 처리 완료'};
}

async function run(payload) {
  const forms = payload.kit?.forms || [];
  const currentUrl = location.href;
  let index = Number(sessionStorage.getItem('frk_form') || 0);

  while (index < forms.length && !currentUrl.startsWith(forms[index].url)) index++;
  if (index >= forms.length) return {ok:false, message:'현재 페이지와 일치하는 Kit URL이 없습니다.'};

  const result = await runForm(forms[index], payload);
  if (!result.ok) return result;

  if (!forms[index].pages && index + 1 < forms.length) {
    sessionStorage.setItem('frk_form', String(index + 1));
    await new Promise(r => setTimeout(r, 500));
    location.href = forms[index + 1].url;
    return {ok:true, message:'다음 폼으로 이동합니다.'};
  }

  if (index + 1 < forms.length && !forms[index].pages?.length) {
    sessionStorage.setItem('frk_form', String(index + 1));
  } else {
    sessionStorage.removeItem('frk_form');
  }
  return result;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.cmd === 'analyze') {
    const inputs = [...document.querySelectorAll('textarea,input,select,[contenteditable="true"]')].filter(visible);
    const buttons = [...document.querySelectorAll('button,[role="button"],input[type="submit"],input[type="button"]')].filter(visible);
    sendResponse({
      summary: '입력 요소 ' + inputs.length + '개, 버튼 ' + buttons.length + '개를 발견했습니다.',
      inputs: inputs.map((el,i) => ({
        index:i,
        tag:el.tagName.toLowerCase(),
        placeholder:el.getAttribute('placeholder') || '',
        type:el.getAttribute('type') || ''
      }))
    });
    return;
  }

  if (message.cmd === 'start' || message.cmd === 'continue') {
    run(message.payload).then(sendResponse).catch(e => sendResponse({ok:false,message:e.message}));
    return true;
  }
});
