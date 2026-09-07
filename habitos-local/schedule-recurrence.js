(() => {
  const KEY='habitos_schedule_v1';
  const DAYS=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const CODES=['SU','MO','TU','WE','TH','FR','SA'];
  const pad=n=>String(n).padStart(2,'0');
  const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const parse=s=>{const [y,m,d]=String(s).split('-').map(Number);return new Date(y,m-1,d);};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY))||[];}catch{return[];}};
  const write=v=>localStorage.setItem(KEY,JSON.stringify(v));
  const min=t=>{const [h,m]=String(t||'00:00').split(':').map(Number);return h*60+m;};
  const defaultRec={type:'none',interval:1,unit:'week',daysOfWeek:[],endType:'never',endDate:'',count:null,monthMode:'day',position:1,weekday:1};
  const rec=e=>({...defaultRec,...(e?.recurrence||{})});

  function label(r){
    if(r.type==='daily')return r.interval===1?'Todos os dias':`A cada ${r.interval} dias`;
    if(r.type==='weekdays')return 'Segunda a sexta';
    if(r.type==='weekly')return r.interval===1?'Toda semana':`A cada ${r.interval} semanas`;
    if(r.type==='monthly')return r.monthMode==='weekday'?`${({1:'Primeira',2:'Segunda',3:'Terceira',4:'Quarta',-1:'Última'})[r.position]||'Posição'} ${DAYS[r.weekday]} de cada mês`:(r.interval===1?'Todo mês':`A cada ${r.interval} meses`);
    if(r.type==='custom')return `A cada ${r.interval} ${r.unit==='day'?'dia(s)':r.unit==='week'?'semana(s)':'mês(es)'}`;
    return 'Evento único';
  }
  function rrule(e){
    const r=rec(e),p=[];if(r.type==='none')return '';
    if(r.type==='daily')p.push('FREQ=DAILY',`INTERVAL=${r.interval}`);
    if(r.type==='weekdays')p.push('FREQ=WEEKLY','BYDAY=MO,TU,WE,TH,FR');
    if(r.type==='weekly')p.push('FREQ=WEEKLY',`INTERVAL=${r.interval}`,`BYDAY=${(r.daysOfWeek.length?r.daysOfWeek:[parse(e.date).getDay()]).map(n=>CODES[n]).join(',')}`);
    if(r.type==='monthly')p.push('FREQ=MONTHLY',`INTERVAL=${r.interval}`,r.monthMode==='weekday'?`BYDAY=${r.position}${CODES[r.weekday]}`:`BYMONTHDAY=${parse(e.date).getDate()}`);
    if(r.type==='custom'){p.push(`FREQ=${r.unit==='day'?'DAILY':r.unit==='week'?'WEEKLY':'MONTHLY'}`,`INTERVAL=${r.interval}`);if(r.unit==='week')p.push(`BYDAY=${(r.daysOfWeek.length?r.daysOfWeek:[parse(e.date).getDay()]).map(n=>CODES[n]).join(',')}`);}
    if(r.endType==='count'&&r.count)p.push(`COUNT=${r.count}`);if(r.endType==='date'&&r.endDate)p.push(`UNTIL=${r.endDate.replaceAll('-','')}T235959`);return p.join(';');
  }
  function matches(e,date){
    const r=rec(e);if(r.type==='none')return date===e.date;if(date<e.date)return false;if(r.endType==='date'&&r.endDate&&date>r.endDate)return false;
    const s=parse(e.date),d=parse(date),diff=Math.round((d-s)/86400000);
    if(r.type==='daily')return diff%Math.max(1,+r.interval||1)===0;
    if(r.type==='weekdays')return d.getDay()>=1&&d.getDay()<=5;
    if(r.type==='weekly')return Math.floor(diff/7)%Math.max(1,+r.interval||1)===0&&(r.daysOfWeek.length?r.daysOfWeek:[s.getDay()]).map(Number).includes(d.getDay());
    if(r.type==='monthly'){const months=(d.getFullYear()-s.getFullYear())*12+d.getMonth()-s.getMonth();if(months<0||months%Math.max(1,+r.interval||1))return false;if(r.monthMode==='weekday'){if(d.getDay()!==+r.weekday)return false;return +r.position===-1?d.getDate()+7>new Date(d.getFullYear(),d.getMonth()+1,0).getDate():Math.ceil(d.getDate()/7)===+r.position;}return d.getDate()===Math.min(s.getDate(),new Date(d.getFullYear(),d.getMonth()+1,0).getDate());}
    if(r.type==='custom'){const i=Math.max(1,+r.interval||1);if(r.unit==='day')return diff%i===0;if(r.unit==='week')return Math.floor(diff/7)%i===0&&(r.daysOfWeek.length?r.daysOfWeek:[s.getDay()]).map(Number).includes(d.getDay());const months=(d.getFullYear()-s.getFullYear())*12+d.getMonth()-s.getMonth();return months>=0&&months%i===0&&d.getDate()===Math.min(s.getDate(),new Date(d.getFullYear(),d.getMonth()+1,0).getDate());}
    return false;
  }
  function occurrenceNumber(e,date){let n=0,d=parse(e.date),t=parse(date),copy={...e,recurrence:{...rec(e),endType:'never'}};while(d<=t){if(matches(copy,iso(d)))n++;d.setDate(d.getDate()+1);}return n;}

  function findExisting(){
    const title=document.getElementById('ncTitle')?.value?.trim(),date=document.getElementById('ncDate')?.value,start=document.getElementById('ncStart')?.value,end=document.getElementById('ncEnd')?.value;
    if(!title||!date)return null;return read().slice().reverse().find(e=>e.title===title&&e.date===date&&e.start===start&&e.end===end)||null;
  }
  function collect(){
    const type=document.getElementById('ncRecurrenceType')?.value||'none';
    if(type==='none')return {...defaultRec};
    const base={endType:document.getElementById('ncEndType')?.value||'never',endDate:document.getElementById('ncEndDate')?.value||'',count:+document.getElementById('ncCount')?.value||null,daysOfWeek:[...document.querySelectorAll('.weekday-btn.active')].map(b=>+b.dataset.day)};
    if(type==='weekdays')return {...defaultRec,...base,type:'weekdays',daysOfWeek:[1,2,3,4,5]};
    if(type==='weekly'||type==='biweekly'||type==='triweekly')return {...defaultRec,...base,type:'weekly',interval:type==='biweekly'?2:type==='triweekly'?3:1};
    if(type==='monthly'||type==='bimonthly'||type==='quarterly')return {...defaultRec,...base,type:'monthly',interval:type==='bimonthly'?2:type==='quarterly'?3:1,monthMode:document.getElementById('ncMonthMode')?.value||'day',position:+document.getElementById('ncPosition')?.value||1,weekday:+document.getElementById('ncWeekday')?.value||0};
    return {...defaultRec,...base,type:'custom',interval:+document.getElementById('ncRecInterval')?.value||1,unit:document.getElementById('ncRecUnit')?.value||'week'};
  }
  function renderEnd(){const el=document.getElementById('ncEndValue'),t=document.getElementById('ncEndType')?.value;if(!el)return;el.innerHTML=t==='date'?'<input id="ncEndDate" type="date">':t==='count'?'<input id="ncCount" type="number" min="1" value="10">':'';el.querySelector('input')?.addEventListener('input',preview);}
  function renderMonth(){const el=document.getElementById('ncMonthExtra');if(!el)return;el.innerHTML=document.getElementById('ncMonthMode')?.value==='weekday'?`<div class="custom-row"><select id="ncPosition"><option value="1">Primeira</option><option value="2">Segunda</option><option value="3">Terceira</option><option value="4">Quarta</option><option value="-1">Última</option></select><select id="ncWeekday">${DAYS.map((d,i)=>`<option value="${i}">${d}</option>`).join('')}</select></div>`:'<small>Repete no mesmo dia de cada mês.</small>';document.getElementById('ncPosition')?.addEventListener('change',preview);document.getElementById('ncWeekday')?.addEventListener('change',preview);}
  function options(existing){
    const type=document.getElementById('ncRecurrenceType')?.value||'none',box=document.getElementById('ncRecurrenceOptions');if(!box)return;let h='';
    if(['weekly','biweekly','triweekly'].includes(type)){const selected=rec(existing).daysOfWeek.length?rec(existing).daysOfWeek:[parse(document.getElementById('ncDate').value).getDay()];h+=`<div class="recurrence-sub"><span>Repetir nos dias</span><div class="weekday-picker">${DAYS.map((d,i)=>`<button type="button" class="weekday-btn ${selected.includes(i)?'active':''}" data-day="${i}">${d}</button>`).join('')}</div></div>`;}
    if(['monthly','bimonthly','quarterly'].includes(type))h+=`<div class="recurrence-sub"><span>Repetir por</span><select id="ncMonthMode"><option value="day">Mesmo dia do mês</option><option value="weekday">Posição de um dia da semana</option></select></div><div id="ncMonthExtra"></div>`;
    if(type==='custom')h+=`<div class="custom-row"><label>A cada <input id="ncRecInterval" type="number" min="1" value="1"></label><select id="ncRecUnit"><option value="day">dia(s)</option><option value="week" selected>semana(s)</option><option value="month">mês(es)</option></select></div>`;
    if(type!=='none')h+=`<div class="custom-row"><label>Termina <select id="ncEndType"><option value="never">Nunca</option><option value="date">Em uma data</option><option value="count">Após ocorrências</option></select></label><span id="ncEndValue"></span></div>`;
    box.innerHTML=h;if(document.getElementById('ncMonthMode')){document.getElementById('ncMonthMode').onchange=renderMonth;renderMonth();}if(document.getElementById('ncEndType')){document.getElementById('ncEndType').onchange=renderEnd;renderEnd();}box.querySelectorAll('.weekday-btn').forEach(b=>b.onclick=()=>{b.classList.toggle('active');preview();});document.getElementById('ncRecInterval')?.addEventListener('input',preview);document.getElementById('ncRecUnit')?.addEventListener('change',preview);preview();
  }
  function preview(){const el=document.getElementById('ncRecurrencePreview');if(!el)return;const r=collect(),fake={date:document.getElementById('ncDate')?.value||iso(new Date()),recurrence:r};el.textContent=r.type==='none'?'Evento único':`↻ ${label(r)}${rrule(fake)?` · ${rrule(fake)}`:''}`;}
  function inject(){
    if(document.getElementById('ncRecurrenceBox'))return;const title=document.getElementById('ncTitle'),form=title?.closest('.form-grid');if(!form)return;const existing=findExisting(),r=existing?rec(existing):defaultRec;
    const wrap=document.createElement('div');wrap.className='field full recurrence-box';wrap.id='ncRecurrenceBox';wrap.innerHTML=`<label>Repetição</label><select id="ncRecurrenceType"><option value="none">Não repetir</option><option value="daily">Todos os dias</option><option value="weekdays">Segunda a sexta</option><option value="weekly">Toda semana</option><option value="biweekly">A cada 2 semanas</option><option value="triweekly">A cada 3 semanas</option><option value="monthly">Todo mês</option><option value="bimonthly">A cada 2 meses</option><option value="quarterly">A cada 3 meses</option><option value="custom">Personalizado</option></select><div id="ncRecurrenceOptions"></div><div class="recurrence-preview" id="ncRecurrencePreview"></div>`;form.appendChild(wrap);
    const t=document.getElementById('ncRecurrenceType');t.value=r.type==='weekly'?(+r.interval===2?'biweekly':+r.interval===3?'triweekly':'weekly'):r.type==='monthly'?(+r.interval===2?'bimonthly':+r.interval===3?'quarterly':'monthly'):r.type||'none';options(existing);
  }
  function saveRecurring(e){
    if(!e)return;
    const r=collect(),list=read(),seriesId=e.seriesId||`series_${Date.now()}`,base={...e,recurrence:r,seriesId,isSeriesMaster:true};
    const cleaned=list.filter(x=>x.seriesId!==seriesId&&x.id!==e.id);const generated=[];
    if(r.type!=='none'){
      const end=new Date(parse(base.date));end.setDate(end.getDate()+365);
      for(let d=parse(base.date);d<=end;d.setDate(d.getDate()+1)){
        const date=iso(d);if(date===base.date)continue;if(r.endType==='count'&&r.count&&occurrenceNumber(base,date)>=r.count)break;if(matches(base,date))generated.push({...base,id:`${seriesId}_${date}`,date,isSeriesMaster:false});
      }
    }
    write([base,...generated,...cleaned]);
  }
  document.addEventListener('click',e=>{
    if(!e.target.closest('#ncSave')||!document.getElementById('ncRecurrenceBox'))return;
    e.preventDefault();e.stopImmediatePropagation();
    const title=document.getElementById('ncTitle')?.value.trim(),date=document.getElementById('ncDate')?.value,start=document.getElementById('ncStart')?.value,end=document.getElementById('ncEnd')?.value;
    if(!title||!date||!start||!end||min(end)<=min(start)){alert('Preencha os dados do evento e verifique o horário.');return;}
    const old=findExisting();const cat=document.getElementById('ncCat')?.value||'Estudos',habitId=document.getElementById('ncHabit')?.value||'',notes=document.getElementById('ncNotes')?.value.trim()||'';
    const ev={...(old||{}),id:old?.id||`ev_${Date.now()}`,title,date,start,end,category:cat,habitId,notes,color:old?.color||'#0087FF'};saveRecurring(ev);if(typeof closeModal==='function')closeModal();const content=document.getElementById('content');if(content){content.dispatchEvent(new Event('schedule-recurrence-refresh'));}
  },true);
  const observer=new MutationObserver(()=>{if(document.getElementById('modal')?.children.length)inject();});
  function start(){const m=document.getElementById('modal');if(m)observer.observe(m,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
