(() => {
  const KEY='habitos_schedule_v1';
  const DAYS=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const defaults={type:'none',interval:1,unit:'week',daysOfWeek:[],endType:'never',endDate:'',count:null,monthMode:'day',position:1,weekday:1};
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY))||[]}catch{return[]}};
  const getExisting=()=>{const title=document.getElementById('ncTitle')?.value?.trim(),date=document.getElementById('ncDate')?.value,start=document.getElementById('ncStart')?.value,end=document.getElementById('ncEnd')?.value;if(!title||!date)return null;return read().slice().reverse().find(e=>e.title===title&&e.date===date&&e.start===start&&e.end===end)||null};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  function inject(){
    const title=document.getElementById('ncTitle'), form=title?.closest('.form-grid');
    if(!form)return;
    let box=document.getElementById('ncRecurrenceBox');
    const notes=document.getElementById('ncNotes')?.closest('.field');
    if(!box){
      box=document.createElement('div');box.className='field full recurrence-box';box.id='ncRecurrenceBox';
      box.innerHTML='<label>Repetição</label><select id="ncRecurrenceType"><option value="none">Não repetir</option><option value="daily">Todos os dias</option><option value="weekdays">Segunda a sexta</option><option value="weekly">Toda semana</option><option value="biweekly">A cada 2 semanas</option><option value="triweekly">A cada 3 semanas</option><option value="monthly">Todo mês</option><option value="bimonthly">A cada 2 meses</option><option value="quarterly">A cada 3 meses</option><option value="custom">Personalizado</option></select><div id="ncRecurrenceOptions"></div><div class="recurrence-preview" id="ncRecurrencePreview"></div>';
      if(notes)notes.before(box);else form.appendChild(box);
      const existing=getExisting(), r={...defaults,...(existing?.recurrence||{})};
      const t=document.getElementById('ncRecurrenceType');
      t.value=r.type==='weekly'?(+r.interval===2?'biweekly':+r.interval===3?'triweekly':'weekly'):r.type==='monthly'?(+r.interval===2?'bimonthly':+r.interval===3?'quarterly':'monthly'):r.type||'none';
      render(r);
      t.onchange=()=>render(r);
    }
  }
  function render(r){
    const type=document.getElementById('ncRecurrenceType')?.value,box=document.getElementById('ncRecurrenceOptions');if(!box)return;
    const date=document.getElementById('ncDate')?.value||new Date().toISOString().slice(0,10), d=new Date(date+'T12:00:00');
    const selected=(r.daysOfWeek?.length?r.daysOfWeek:[d.getDay()]).map(Number);let h='';
    if(['weekly','biweekly','triweekly'].includes(type))h+=`<div class="recurrence-sub"><span>Repetir nos dias</span><div class="weekday-picker">${DAYS.map((x,i)=>`<button type="button" class="weekday-btn ${selected.includes(i)?'active':''}" data-day="${i}">${x}</button>`).join('')}</div></div>`;
    if(['monthly','bimonthly','quarterly'].includes(type))h+=`<div class="recurrence-sub"><span>Repetir por</span><select id="ncMonthMode"><option value="day">Mesmo dia do mês</option><option value="weekday">Posição de um dia da semana</option></select></div><div id="ncMonthExtra"></div>`;
    if(type==='custom')h+=`<div class="custom-row"><label>A cada <input id="ncRecInterval" type="number" min="1" value="${+r.interval||1}"></label><select id="ncRecUnit"><option value="day">dia(s)</option><option value="week" selected>semana(s)</option><option value="month">mês(es)</option></select></div>`;
    if(type!=='none')h+=`<div class="custom-row"><label>Termina <select id="ncEndType"><option value="never">Nunca</option><option value="date">Em uma data</option><option value="count">Após ocorrências</option></select></label><span id="ncEndValue"></span></div>`;
    box.innerHTML=h;
    if(document.getElementById('ncMonthMode')){document.getElementById('ncMonthMode').value=r.monthMode||'day';document.getElementById('ncMonthMode').onchange=()=>{monthExtra();preview()};monthExtra();}
    if(document.getElementById('ncEndType')){document.getElementById('ncEndType').value=r.endType||'never';endValue();document.getElementById('ncEndType').onchange=endValue;}
    box.querySelectorAll('.weekday-btn').forEach(b=>b.onclick=()=>{b.classList.toggle('active');preview()});document.getElementById('ncRecInterval')?.addEventListener('input',preview);document.getElementById('ncRecUnit')?.addEventListener('change',preview);preview();
  }
  function monthExtra(){const el=document.getElementById('ncMonthExtra');if(!el)return;const d=new Date((document.getElementById('ncDate')?.value||new Date().toISOString().slice(0,10))+'T12:00:00');if(document.getElementById('ncMonthMode').value==='weekday')el.innerHTML=`<div class="custom-row"><select id="ncPosition"><option value="1">Primeira</option><option value="2">Segunda</option><option value="3">Terceira</option><option value="4">Quarta</option><option value="-1">Última</option></select><select id="ncWeekday">${DAYS.map((x,i)=>`<option value="${i}">${x}</option>`).join('')}</select></div>`;else el.innerHTML='<small>Repete no mesmo dia de cada mês.</small>';}
  function endValue(){const el=document.getElementById('ncEndValue'),t=document.getElementById('ncEndType')?.value;if(!el)return;el.innerHTML=t==='date'?'<input id="ncEndDate" type="date">':t==='count'?'<input id="ncCount" type="number" min="1" value="10">':'';el.querySelector('input')?.addEventListener('input',preview);preview();}
  function preview(){const el=document.getElementById('ncRecurrencePreview'),t=document.getElementById('ncRecurrenceType')?.value;if(!el)return;const names={none:'Evento único',daily:'Todos os dias',weekdays:'Segunda a sexta',weekly:'Toda semana',biweekly:'A cada 2 semanas',triweekly:'A cada 3 semanas',monthly:'Todo mês',bimonthly:'A cada 2 meses',quarterly:'A cada 3 meses',custom:'Personalizado'};el.textContent=t==='none'?names.none:`↻ ${names[t]}`;}
  let lastModal=false;
  setInterval(()=>{const open=!!document.getElementById('ncTitle');if(open&&!lastModal){setTimeout(inject,30)}lastModal=open;if(!open)document.getElementById('ncRecurrenceBox')?.remove()},100);
})();
