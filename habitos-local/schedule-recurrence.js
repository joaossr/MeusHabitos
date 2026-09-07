(() => {
  const KEY = 'habitos_schedule_v1';
  const DAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const DAY_CODES = ['SU','MO','TU','WE','TH','FR','SA'];
  let editId = null;
  let observerBusy = false;

  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
  const save = events => localStorage.setItem(KEY, JSON.stringify(events));
  const pad = n => String(n).padStart(2,'0');
  const iso = d => { const x = new Date(d); return `${x.getFullYear()}-${pad(x.getMonth()+1)}-${pad(x.getDate())}`; };
  const parse = s => { const [y,m,d] = String(s).split('-').map(Number); return new Date(y,m-1,d); };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const min = t => { const [h,m] = String(t || '00:00').split(':').map(Number); return h*60+m; };

  function normalize(e) {
    if (!e) return null;
    return { ...e, recurrence: e.recurrence || { type:'none', interval:1, daysOfWeek:[], endType:'never', endDate:'', count:null } };
  }

  function recurrenceLabel(r) {
    if (!r || !r.type || r.type === 'none') return '';
    if (r.type === 'daily') return 'Todos os dias';
    if (r.type === 'weekdays') return 'Segunda a sexta';
    if (r.type === 'weekly') return r.interval === 1 ? 'Toda semana' : `A cada ${r.interval} semanas`;
    if (r.type === 'monthly') return r.monthMode === 'weekday' ? `${ordinal(r.position)} ${DAYS[r.weekday]} de cada mês` : (r.interval === 1 ? 'Todo mês' : `A cada ${r.interval} meses`);
    if (r.type === 'custom') return `A cada ${r.interval} ${r.unit === 'day' ? 'dia(s)' : r.unit === 'week' ? 'semana(s)' : 'mês(es)'}`;
    return '';
  }
  function ordinal(n) { return ({1:'Primeira',2:'Segunda',3:'Terceira',4:'Quarta',-1:'Última'})[n] || `${n}ª`; }

  function matches(e, date) {
    const r = normalize(e).recurrence;
    if (r.type === 'none') return date === e.date;
    if (date < e.date) return false;
    if (r.endType === 'date' && r.endDate && date > r.endDate) return false;
    const start = parse(e.date), d = parse(date);
    const diffDays = Math.round((d-start)/86400000);
    if (r.endType === 'count' && r.count && occurrenceIndex(e,date) > Number(r.count)) return false;
    if (r.type === 'daily') return diffDays >= 0 && diffDays % Math.max(1,Number(r.interval)||1) === 0;
    if (r.type === 'weekdays') return d.getDay() >= 1 && d.getDay() <= 5 && diffDays >= 0;
    if (r.type === 'weekly') {
      const interval = Math.max(1,Number(r.interval)||1);
      const weeks = Math.floor(diffDays/7);
      const days = (r.daysOfWeek && r.daysOfWeek.length) ? r.daysOfWeek.map(Number) : [start.getDay()];
      return weeks >= 0 && weeks % interval === 0 && days.includes(d.getDay());
    }
    if (r.type === 'monthly') {
      const months = (d.getFullYear()-start.getFullYear())*12 + d.getMonth()-start.getMonth();
      if (months < 0 || months % Math.max(1,Number(r.interval)||1) !== 0) return false;
      if (r.monthMode === 'weekday') {
        if (d.getDay() !== Number(r.weekday)) return false;
        const pos = Number(r.position) === -1 ? lastWeekdayPosition(d) : Math.ceil(d.getDate()/7);
        return pos === Number(r.position);
      }
      return d.getDate() === start.getDate() || (start.getDate() > daysInMonth(d) && d.getDate() === daysInMonth(d));
    }
    if (r.type === 'custom') {
      const interval = Math.max(1,Number(r.interval)||1);
      if (r.unit === 'day') return diffDays % interval === 0;
      if (r.unit === 'week') return Math.floor(diffDays/7) % interval === 0 && (r.daysOfWeek?.length ? r.daysOfWeek.map(Number).includes(d.getDay()) : d.getDay() === start.getDay());
      const months = (d.getFullYear()-start.getFullYear())*12 + d.getMonth()-start.getMonth();
      return months >= 0 && months % interval === 0 && d.getDate() === Math.min(start.getDate(), daysInMonth(d));
    }
    return false;
  }
  function daysInMonth(d) { return new Date(d.getFullYear(),d.getMonth()+1,0).getDate(); }
  function lastWeekdayPosition(d) { return Math.ceil((daysInMonth(d)-d.getDate()+1)/7) === 1 ? -1 : -1; }
  function occurrenceIndex(e,date) {
    let count = 0; const d = parse(e.date), target = parse(date);
    while (d <= target) { if (matchesIgnoringCount(e,iso(d))) count++; d.setDate(d.getDate()+1); }
    return count;
  }
  function matchesIgnoringCount(e,date) {
    const copy = normalize(e); const end = copy.recurrence.endType; copy.recurrence.endType='never'; const ok=matches(copy,date); copy.recurrence.endType=end; return ok;
  }

  function rrule(e) {
    const r = normalize(e).recurrence;
    if (r.type === 'none') return '';
    const parts=[];
    if (r.type === 'daily') parts.push('FREQ=DAILY', `INTERVAL=${Math.max(1,Number(r.interval)||1)}`);
    if (r.type === 'weekdays') parts.push('FREQ=WEEKLY','BYDAY=MO,TU,WE,TH,FR');
    if (r.type === 'weekly') { parts.push('FREQ=WEEKLY',`INTERVAL=${Math.max(1,Number(r.interval)||1)}`); const ds=(r.daysOfWeek?.length?r.daysOfWeek:[parse(e.date).getDay()]).map(n=>DAY_CODES[n]).join(','); parts.push(`BYDAY=${ds}`); }
    if (r.type === 'monthly') {
      parts.push('FREQ=MONTHLY',`INTERVAL=${Math.max(1,Number(r.interval)||1)}`);
      if (r.monthMode === 'weekday') parts.push(`BYDAY=${Number(r.position)}${DAY_CODES[Number(r.weekday)]}`); else parts.push(`BYMONTHDAY=${parse(e.date).getDate()}`);
    }
    if (r.type === 'custom') { parts.push(`FREQ=${r.unit==='day'?'DAILY':r.unit==='week'?'WEEKLY':'MONTHLY'}`,`INTERVAL=${Math.max(1,Number(r.interval)||1)}`); if(r.unit==='week') parts.push(`BYDAY=${(r.daysOfWeek?.length?r.daysOfWeek:[parse(e.date).getDay()]).map(n=>DAY_CODES[n]).join(',')}`); }
    if (r.endType === 'count' && r.count) parts.push(`COUNT=${Number(r.count)}`);
    if (r.endType === 'date' && r.endDate) parts.push(`UNTIL=${r.endDate.replaceAll('-','')}T235959`);
    return parts.join(';');
  }

  function uiFor(e) {
    const r = normalize(e).recurrence;
    const days = r.daysOfWeek || [parse(e.date).getDay()];
    return `<div class="field full recurrence-box" id="ncRecurrenceBox">
      <label>Repetição</label>
      <select id="ncRecurrenceType">
        <option value="none" ${r.type==='none'?'selected':''}>Não repetir</option>
        <option value="daily" ${r.type==='daily'?'selected':''}>Todos os dias</option>
        <option value="weekdays" ${r.type==='weekdays'?'selected':''}>Segunda a sexta</option>
        <option value="weekly" ${r.type==='weekly'?'selected':''}>Toda semana</option>
        <option value="biweekly" ${r.type==='weekly'&&Number(r.interval)===2?'selected':''}>A cada 2 semanas</option>
        <option value="triweekly" ${r.type==='weekly'&&Number(r.interval)===3?'selected':''}>A cada 3 semanas</option>
        <option value="monthly" ${r.type==='monthly'&&r.monthMode!=='weekday'?'selected':''}>Todo mês</option>
        <option value="bimonthly" ${r.type==='monthly'&&Number(r.interval)===2?'selected':''}>A cada 2 meses</option>
        <option value="quarterly" ${r.type==='monthly'&&Number(r.interval)===3?'selected':''}>A cada 3 meses</option>
        <option value="custom" ${r.type==='custom'?'selected':''}>Personalizado</option>
      </select>
      <div id="ncRecurrenceOptions"></div>
      <div class="recurrence-preview" id="ncRecurrencePreview"></div>
    </div>`;
  }

  function renderOptions() {
    const type = document.getElementById('ncRecurrenceType')?.value;
    const box = document.getElementById('ncRecurrenceOptions'); if(!box) return;
    const date = document.getElementById('ncDate')?.value || iso(new Date());
    const e = read().find(x=>x.id===editId) || {date};
    const r = normalize(e).recurrence;
    let html='';
    if(['weekly','biweekly','triweekly'].includes(type)) {
      const selected = type==='biweekly'?[...(r.daysOfWeek||[parse(date).getDay()])] : type==='triweekly'?[...(r.daysOfWeek||[parse(date).getDay()])] : (r.daysOfWeek||[parse(date).getDay()]);
      html += `<div class="recurrence-sub"><span>Dias da semana</span><div class="weekday-picker">${DAYS.map((d,i)=>`<button type="button" class="weekday-btn ${selected.map(Number).includes(i)?'active':''}" data-weekday="${i}">${d}</button>`).join('')}</div></div>`;
    }
    if(type==='monthly' || type==='bimonthly' || type==='quarterly') {
      html += `<div class="recurrence-sub"><span>Repetir por</span><select id="ncMonthMode"><option value="day" ${r.monthMode!=='weekday'?'selected':''}>Mesmo dia do mês</option><option value="weekday" ${r.monthMode==='weekday'?'selected':''}>Posição de um dia da semana</option></select></div>`;
      html += `<div id="ncMonthExtra"></div>`;
    }
    if(type==='custom') html += `<div class="custom-row"><label>A cada <input id="ncRecInterval" type="number" min="1" value="${Math.max(1,Number(r.interval)||1)}"></label><select id="ncRecUnit"><option value="day" ${r.unit==='day'?'selected':''}>dia(s)</option><option value="week" ${r.unit==='week'?'selected':''}>semana(s)</option><option value="month" ${r.unit==='month'?'selected':''}>mês(es)</option></select></div>`;
    if(type!=='none') html += `<div class="custom-row"><label>Termina <select id="ncEndType"><option value="never" ${r.endType!=='date'&&r.endType!=='count'?'selected':''}>Nunca</option><option value="date" ${r.endType==='date'?'selected':''}>Em uma data</option><option value="count" ${r.endType==='count'?'selected':''}>Após ocorrências</option></select></label><span id="ncEndValue"></span></div>`;
    box.innerHTML=html;
    if(type==='monthly'||type==='bimonthly'||type==='quarterly') renderMonthExtra();
    renderEndValue();
    updatePreview();
    box.querySelectorAll('.weekday-btn').forEach(b=>b.onclick=()=>{b.classList.toggle('active');updatePreview();});
    document.getElementById('ncMonthMode')?.addEventListener('change',renderMonthExtra);
    document.getElementById('ncEndType')?.addEventListener('change',renderEndValue);
    document.getElementById('ncRecInterval')?.addEventListener('input',updatePreview);
    document.getElementById('ncRecUnit')?.addEventListener('change',updatePreview);
  }
  function renderMonthExtra(){
    const el=document.getElementById('ncMonthExtra'); if(!el) return;
    const mode=document.getElementById('ncMonthMode')?.value;
    const e=read().find(x=>x.id===editId)||{}; const r=normalize(e).recurrence; const d=parse(document.getElementById('ncDate')?.value||e.date||iso(new Date()));
    if(mode==='weekday') el.innerHTML=`<div class="custom-row"><select id="ncPosition">${[[1,'Primeira'],[2,'Segunda'],[3,'Terceira'],[4,'Quarta'],[-1,'Última']].map(([v,t])=>`<option value="${v}" ${Number(r.position)===v?'selected':''}>${t}</option>`).join('')}</select><select id="ncWeekday">${DAYS.map((x,i)=>`<option value="${i}" ${Number(r.weekday??d.getDay())===i?'selected':''}>${x}</option>`).join('')}</select></div>`;
    else el.innerHTML='<small>O evento será repetido no mesmo dia de cada mês.</small>';
    updatePreview();
  }
  function renderEndValue(){
    const type=document.getElementById('ncEndType')?.value, el=document.getElementById('ncEndValue'); if(!el) return;
    const e=read().find(x=>x.id===editId)||{}; const r=normalize(e).recurrence;
    if(type==='date') el.innerHTML=`<input id="ncEndDate" type="date" value="${r.endDate||''}">`;
    else if(type==='count') el.innerHTML=`<input id="ncCount" type="number" min="1" value="${r.count||10}" placeholder="10">`;
    else el.innerHTML='';
    el.querySelector('input')?.addEventListener('input',updatePreview);
    updatePreview();
  }
  function collectRecurrence(){
    const type=document.getElementById('ncRecurrenceType')?.value||'none';
    if(type==='none') return {type:'none',interval:1,daysOfWeek:[],endType:'never',endDate:'',count:null};
    let base={type,interval:1,daysOfWeek:[],endType:document.getElementById('ncEndType')?.value||'never',endDate:document.getElementById('ncEndDate')?.value||'',count:Number(document.getElementById('ncCount')?.value)||null};
    if(type==='weekdays') return {...base,type:'weekdays',daysOfWeek:[1,2,3,4,5]};
    if(type==='weekly'||type==='biweekly'||type==='triweekly') return {...base,type:'weekly',interval:type==='biweekly'?2:type==='triweekly'?3:1,daysOfWeek:[...document.querySelectorAll('.weekday-btn.active')].map(b=>Number(b.dataset.weekday))};
    if(type==='monthly'||type==='bimonthly'||type==='quarterly') return {...base,type:'monthly',interval:type==='bimonthly'?2:type==='quarterly'?3:1,monthMode:document.getElementById('ncMonthMode')?.value||'day',position:Number(document.getElementById('ncPosition')?.value)||1,weekday:Number(document.getElementById('ncWeekday')?.value)||0};
    return {...base,type:'custom',interval:Number(document.getElementById('ncRecInterval')?.value)||1,unit:document.getElementById('ncRecUnit')?.value||'week',daysOfWeek:[...document.querySelectorAll('.weekday-btn.active')].map(b=>Number(b.dataset.weekday))};
  }
  function updatePreview(){
    const el=document.getElementById('ncRecurrencePreview'); if(!el) return;
    const fake={date:document.getElementById('ncDate')?.value||iso(new Date()),recurrence:collectRecurrence()};
    const label=recurrenceLabel(fake.recurrence); el.textContent=label ? `↻ ${label}${rrule(fake)?` · Google Calendar: ${rrule(fake)}`:''}` : 'Evento único';
  }

  function injectRecurrence(){
    const form=document.getElementById('ncTitle');
    if(!form || document.getElementById('ncRecurrenceBox')) return;
    const wrap=form.closest('.form-grid'); if(!wrap) return;
    wrap.insertAdjacentHTML('beforeend',uiFor(read().find(x=>x.id===editId)||{date:document.getElementById('ncDate')?.value||iso(new Date())}));
    const type=document.getElementById('ncRecurrenceType'); type.onchange=renderOptions; renderOptions();
    document.getElementById('ncDate')?.addEventListener('change',updatePreview);
  }

  function saveWithRecurrence(){
    const title=document.getElementById('ncTitle')?.value.trim(), date=document.getElementById('ncDate')?.value, start=document.getElementById('ncStart')?.value, end=document.getElementById('ncEnd')?.value;
    if(!title)return alert('Informe o título do evento.'); if(!date)return alert('Informe a data.'); if(min(end)<=min(start))return alert('O horário final precisa ser maior que o inicial.');
    const events=read(), old=events.find(e=>e.id===editId)||{}, data={...old,id:editId||`ev_${Date.now()}`,title,date,start,end,category:document.getElementById('ncCat')?.value||old.category||'Outro',habitId:document.getElementById('ncHabit')?.value||'',notes:document.getElementById('ncNotes')?.value.trim()||'',color:old.color||'#0087FF',recurrence:collectRecurrence()};
    const idx=events.findIndex(e=>e.id===data.id); if(idx>=0) events[idx]=data; else events.push(data); save(events);
    if(typeof window.closeModal==='function') window.closeModal();
    const c=document.getElementById('content'); if(c && typeof window.openPage==='undefined') { c.dispatchEvent(new Event('schedule:refresh')); }
    setTimeout(renderVisibleRecurrences,20);
  }

  function renderVisibleRecurrences(){
    if(observerBusy)return; const content=document.getElementById('content'); if(!content || !content.querySelector('.nc-calendar'))return;
    observerBusy=true;
    try {
      document.querySelectorAll('.nc-recurring-event').forEach(x=>x.remove());
      const events=read().map(normalize); const dayEls=[...document.querySelectorAll('.nc-day')];
      dayEls.forEach((dayEl,i)=>{
        const head=dayEl.querySelector('.nc-day-head strong'); if(!head)return;
        const weekStartText=[...document.querySelectorAll('.nc-week-day')][i]?.querySelector('b')?.textContent;
        const dEls=[...document.querySelectorAll('.nc-week-day')]; const dHeader=dEls[i]; if(!dHeader)return;
        const body=dayEl.querySelector('.nc-day-body'); if(!body)return;
        const dateText=dHeader.parentElement?.dataset?.date;
        const yearMonth=(()=>{const current=parse(document.querySelector('.nc-week-day.today')?.dataset?.date||iso(new Date())); return current;})();
        let d;
        const currentDays=[...document.querySelectorAll('.nc-week-day')];
        const label=Number(dHeader.querySelector('b')?.textContent); const ref=weekReference(); d=new Date(ref); d.setDate(ref.getDate()-ref.getDay()+i);
        const date=iso(d);
        events.filter(e=>e.recurrence?.type&&e.recurrence.type!=='none'&&matches(e,date)&&date!==e.date).sort((a,b)=>min(a.start)-min(b.start)).forEach(e=>{
          const block=document.createElement('button'); block.type='button'; block.className='nc-event nc-recurring-event'; const top=Math.max(0,(min(e.start)-360)/60*72); const height=Math.max(38,(min(e.end)-min(e.start))/60*72); block.style.cssText=`top:${top}px;height:${height}px;border-left-color:${e.color||'#0087FF'}`; block.dataset.seriesId=e.id; block.innerHTML=`<b>↻ ${esc(e.title)}</b><span>${esc(e.start)} — ${esc(e.end)}</span>${e.habitId?'<small>✓ hábito</small>':''}`; block.onclick=ev=>{ev.stopPropagation();editId=e.id;openRecurringEditor(e);}; body.appendChild(block);
        });
      });
    } finally { observerBusy=false; }
  }
  function weekReference(){ const t=document.querySelector('.nc-week-day.today'); if(t && t.classList.contains('today')) return parse(t.dataset.date||iso(new Date())); const event=read()[0]; return event?.date?parse(event.date):new Date(); }

  function openRecurringEditor(e){
    if(typeof window.openModal!=='function') return;
    const r=normalize(e).recurrence;
    const html=`<div class="modal-head"><h3>Editar evento recorrente</h3><button class="icon-btn" onclick="closeModal()">×</button></div><div class="form-grid"><div class="field full"><label>Título</label><input id="ncTitle" value="${esc(e.title)}"></div><div class="field"><label>Data</label><input id="ncDate" type="date" value="${e.date}"></div><div class="field"><label>Categoria</label><input id="ncCat" value="${esc(e.category||'Outro')}"></div><div class="field"><label>Início</label><input id="ncStart" type="time" value="${e.start}"></div><div class="field"><label>Fim</label><input id="ncEnd" type="time" value="${e.end}"></div><div class="field full"><label>Repetição</label><div class="recurrence-static">↻ ${esc(recurrenceLabel(r))}</div></div><div class="field full"><label>Hábito vinculado</label><input id="ncHabit" value="${esc(e.habitId||'')}"></div><div class="field full"><label>Observações</label><textarea id="ncNotes">${esc(e.notes||'')}</textarea></div></div><div class="modal-actions"><button class="btn danger" id="ncDeleteSeries">Excluir série</button><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn primary" id="ncSave">Salvar evento</button></div>`;
    window.openModal(html); document.getElementById('ncSave').onclick=saveWithRecurrence; document.getElementById('ncDeleteSeries').onclick=()=>{if(confirm('Excluir toda a série recorrente?')){save(read().filter(x=>x.id!==e.id));window.closeModal();setTimeout(renderVisibleRecurrences,20);}};
  }

  document.addEventListener('click', e => {
    const eventBtn=e.target.closest('[data-event-id]');
    if(eventBtn){ editId=eventBtn.dataset.eventId; }
    if(e.target.closest('#ncAdd')) editId=null;
    if(e.target.closest('#ncSave') && document.getElementById('ncRecurrenceBox')) { e.preventDefault(); e.stopImmediatePropagation(); saveWithRecurrence(); }
  }, true);

  const mo=new MutationObserver(()=>{ if(observerBusy)return; if(document.getElementById('ncTitle')) setTimeout(injectRecurrence,0); if(document.querySelector('.nc-calendar')) setTimeout(renderVisibleRecurrences,0); });
  mo.observe(document.body,{subtree:true,childList:true});
  window.addEventListener('resize',()=>setTimeout(renderVisibleRecurrences,50));
})();
