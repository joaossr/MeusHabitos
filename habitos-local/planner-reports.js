(() => {
  const STATE_KEY = 'habitos_app_v1';
  const SCHEDULE_KEY = 'habitos_schedule_v1';
  const DAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const COLORS = ['#0087FF','#00B7B0','#7628D8','#E50073','#F5B84B'];
  let reportMode = 'week';
  let scheduleDate = new Date();

  const readState = () => {
    try { return JSON.parse(localStorage.getItem(STATE_KEY)) || {}; } catch { return {}; }
  };
  const readEvents = () => {
    try { return JSON.parse(localStorage.getItem(SCHEDULE_KEY)) || []; } catch { return []; }
  };
  const saveEvents = events => localStorage.setItem(SCHEDULE_KEY, JSON.stringify(events));
  const iso = d => { const x = new Date(d); x.setMinutes(x.getMinutes()-x.getTimezoneOffset()); return x.toISOString().slice(0,10); };
  const parse = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y,m-1,d); };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const fmt = s => parse(s).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
  const today = () => iso(new Date());
  const state = () => readState();
  const habits = () => state().habits || [];
  const activeHabits = () => habits().filter(h => !h.archived);
  const completions = () => state().completions || {};
  const scheduled = (h, date) => {
    const d = parse(date);
    if (h.frequency === 'days') return (h.days || []).includes(d.getDay());
    return true;
  };
  const done = (h,date) => !!completions()[`${h.id}_${date}`];
  const dayStats = date => {
    const hs = activeHabits().filter(h => scheduled(h,date));
    const completed = hs.filter(h => done(h,date));
    return { scheduled: hs.length, done: completed.length, pct: hs.length ? Math.round(completed.length/hs.length*100) : 0 };
  };
  const datesBetween = (start,end) => { const out=[]; let d=parse(start), last=parse(end); while(d<=last){out.push(iso(d)); d.setDate(d.getDate()+1);} return out; };
  const weekStart = d => { const x=new Date(d); x.setHours(0,0,0,0); x.setDate(x.getDate()-x.getDay()); return x; };
  const monthStart = d => new Date(d.getFullYear(),d.getMonth(),1);
  const monthEnd = d => new Date(d.getFullYear(),d.getMonth()+1,0);
  const weekDates = base => { const s=weekStart(base); return Array.from({length:7},(_,i)=>{const d=new Date(s);d.setDate(s.getDate()+i);return iso(d);}); };
  const xpOn = date => (state().xpTransactions||[]).filter(x=>x.date===date).reduce((a,x)=>a+Number(x.xp||0),0);
  const allDays = (start,end) => datesBetween(iso(start),iso(end));
  const setPageTitle = title => { const el=document.getElementById('pageTitle'); if(el) el.textContent=title; };
  const activateNav = key => document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.page===key));

  function openPage(page){
    if(page==='reports'){ setPageTitle('Relatórios'); activateNav('reports'); document.getElementById('content').innerHTML=renderReports(); bindReports(); return true; }
    if(page==='schedule'){ setPageTitle('Cronograma'); activateNav('schedule'); document.getElementById('content').innerHTML=renderSchedule(); bindSchedule(); return true; }
    return false;
  }

  document.addEventListener('click', e => {
    const btn=e.target.closest('[data-page]');
    if(!btn || !['reports','schedule'].includes(btn.dataset.page)) return;
    e.preventDefault(); e.stopImmediatePropagation(); openPage(btn.dataset.page);
  }, true);

  function renderReports(){
    const s=state(), mode=reportMode, now=new Date();
    const start=mode==='week'?weekStart(now):monthStart(now), end=mode==='week'?new Date(start.getFullYear(),start.getMonth(),start.getDate()+6):monthEnd(now);
    const ds=allDays(start,end), stats=ds.map(d=>({...dayStats(d),date:d,xp:xpOn(d)}));
    const scheduledTotal=stats.reduce((a,x)=>a+x.scheduled,0), doneTotal=stats.reduce((a,x)=>a+x.done,0), pct=scheduledTotal?Math.round(doneTotal/scheduledTotal*100):0;
    const xp=stats.reduce((a,x)=>a+x.xp,0), best=stats.reduce((a,b)=>b.p>a.p?b:a,stats[0]||{pct:0,date:today()});
    const max=Math.max(1,...stats.map(x=>x.done));
    const bars=stats.map(x=>`<div class="hr-bar-col" title="${fmt(x.date)}: ${x.done}/${x.scheduled}"><div class="hr-bar" style="height:${Math.max(4,x.done/max*100)}%;background:${COLORS[new Date(x.date).getDay()%COLORS.length]}"></div><span>${mode==='week'?DAYS[new Date(x.date).getDay()]:new Date(x.date).getDate()}</span></div>`).join('');
    const byHabit=activeHabits().map(h=>{let sch=0, dn=0; ds.forEach(d=>{if(scheduled(h,d)){sch++;if(done(h,d))dn++;}});return {h,p:sch?Math.round(dn/sch*100):0,dn,sch};}).filter(x=>x.sch).sort((a,b)=>b.p-a.p);
    const categories={}; activeHabits().forEach(h=>categories[h.category||'Geral']=(categories[h.category||'Geral']||0)+1);
    const catTotal=Math.max(1,Object.values(categories).reduce((a,b)=>a+b,0));
    let angle=0; const gradient=Object.entries(categories).map(([k,v],i)=>{const a=angle;angle+=v/catTotal*360;return `${COLORS[i%COLORS.length]} ${a}deg ${angle}deg`;}).join(',');
    const prevStart=mode==='week'?new Date(start.getTime()-7*86400000):new Date(start.getFullYear(),start.getMonth()-1,1), prevEnd=mode==='week'?new Date(start.getTime()-86400000):new Date(start.getFullYear(),start.getMonth(),0);
    const prevDays=allDays(prevStart,prevEnd), prevSch=prevDays.reduce((a,d)=>a+dayStats(d).scheduled,0), prevDone=prevDays.reduce((a,d)=>a+dayStats(d).done,0), prevPct=prevSch?Math.round(prevDone/prevSch*100):0;
    const delta=pct-prevPct;
    return `<div class="hr-page">
      <div class="hr-report-head"><div><div class="eyebrow">Análise de desempenho</div><h2>${mode==='week'?'Relatório semanal':'Relatório mensal'}</h2><span>${fmt(iso(start))} — ${fmt(iso(end))}</span></div><div class="hr-toggle"><button class="${mode==='week'?'active':''}" data-report-mode="week">Semana</button><button class="${mode==='month'?'active':''}" data-report-mode="month">Mês</button></div></div>
      <div class="hr-kpis"><div class="card hr-kpi"><span>Consistência</span><strong>${pct}%</strong><small>${delta>=0?'▲':'▼'} ${Math.abs(delta)} p.p. vs. período anterior</small></div><div class="card hr-kpi"><span>Hábitos concluídos</span><strong>${doneTotal}</strong><small>de ${scheduledTotal} programados</small></div><div class="card hr-kpi"><span>XP conquistado</span><strong>${xp}</strong><small>no período</small></div><div class="card hr-kpi"><span>Melhor dia</span><strong>${best.date?fmt(best.date):'—'}</strong><small>${best.pct||0}% de conclusão</small></div></div>
      <div class="hr-grid"><div class="card hr-chart"><div class="hr-card-head"><div><strong>Desempenho</strong><span>Hábitos concluídos por dia</span></div></div><div class="hr-bars">${bars||'<div class="empty">Sem dados ainda.</div>'}</div></div>
      <div class="card hr-chart"><div class="hr-card-head"><div><strong>Hábitos por consistência</strong><span>Do mais consistente ao menos consistente</span></div></div><div class="hr-habit-list">${byHabit.slice(0,8).map(x=>`<div class="hr-habit"><div><span>${esc(x.h.icon||'✓')}</span><b>${esc(x.h.name)}</b></div><strong>${x.p}%</strong><div class="hr-mini-progress"><i style="width:${x.p}%"></i></div></div>`).join('')||'<div class="empty">Conclua hábitos para gerar o relatório.</div>'}</div></div></div>
      <div class="hr-grid"><div class="card hr-chart"><div class="hr-card-head"><div><strong>Distribuição</strong><span>Categorias dos seus hábitos</span></div></div><div class="hr-donut-row"><div class="hr-donut" style="background:${gradient||'var(--surface-3)'}"><div><b>${activeHabits().length}</b><span>hábitos</span></div></div><div class="hr-legend">${Object.entries(categories).map(([k,v],i)=>`<div><i style="background:${COLORS[i%COLORS.length]}"></i><span>${esc(k)}</span><b>${v}</b></div>`).join('')||'<span>Sem dados</span>'}</div></div></div>
      <div class="card hr-chart"><div class="hr-card-head"><div><strong>Resumo</strong><span>Leitura rápida do seu período</span></div></div><div class="hr-summary"><div><span>Melhor resultado</span><b>${Math.max(0,...stats.map(x=>x.pct))}%</b></div><div><span>Média diária</span><b>${stats.length?Math.round(stats.reduce((a,x)=>a+x.pct,0)/stats.length):0}%</b></div><div><span>XP médio/dia</span><b>${stats.length?Math.round(xp/stats.length):0}</b></div><div><span>Períodos completos</span><b>${stats.filter(x=>x.scheduled&&x.done===x.scheduled).length}</b></div></div></div></div>
    </div>`;
  }

  function bindReports(){
    document.querySelectorAll('[data-report-mode]').forEach(b=>b.onclick=()=>{reportMode=b.dataset.reportMode;document.getElementById('content').innerHTML=renderReports();bindReports();});
  }

  function timeToMin(t){const [h,m]=(t||'00:00').split(':').map(Number);return h*60+m;}
  function minToTime(m){const h=Math.floor(m/60)%24, mm=String(m%60).padStart(2,'0');return `${String(h).padStart(2,'0')}:${mm}`;}
  function mondayOf(d){const x=weekStart(d);return x;}
  function shiftWeek(n){scheduleDate=new Date(scheduleDate);scheduleDate.setDate(scheduleDate.getDate()+n*7);document.getElementById('content').innerHTML=renderSchedule();bindSchedule();}
  function renderSchedule(){
    const days=weekDates(scheduleDate), events=readEvents();
    const weekLabel=`${parse(days[0]).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})} — ${parse(days[6]).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})}`;
    const startHour=6,endHour=23, hourHeight=72, hours=Array.from({length:endHour-startHour+1},(_,i)=>startHour+i);
    const rows=hours.map(h=>`<div class="nc-time">${String(h).padStart(2,'0')}:00</div>`).join('');
    const cols=days.map((d,i)=>{const dayEvents=events.filter(e=>e.date===d).sort((a,b)=>timeToMin(a.start)-timeToMin(b.start)); const blocks=dayEvents.map(e=>{const top=Math.max(0,(timeToMin(e.start)-startHour*60)/60*hourHeight);const height=Math.max(38,(timeToMin(e.end)-timeToMin(e.start))/60*hourHeight);const color=e.color||COLORS[i%COLORS.length];const linked=e.habitId?activeHabits().find(h=>h.id===e.habitId):null;return `<button class="nc-event" style="top:${top}px;height:${height}px;border-left-color:${color}" data-event-id="${e.id}"><b>${esc(e.title)}</b><span>${e.start} — ${e.end}</span>${linked?`<small>✓ ${esc(linked.name)}</small>`:''}</button>`;}).join('');return `<div class="nc-day"><div class="nc-day-head ${d===today()?'today':''}"><b>${DAYS[i]}</b><strong>${parse(d).getDate()}</strong></div><div class="nc-day-body">${blocks}</div></div>`;}).join('');
    return `<div class="nc-page"><div class="nc-head"><div><div class="eyebrow">Planejamento</div><h2>Cronograma semanal</h2><span>${weekLabel}</span></div><div class="nc-actions"><button class="btn" id="ncPrev">‹</button><button class="btn" id="ncToday">Hoje</button><button class="btn" id="ncNext">›</button><button class="btn primary" id="ncAdd">+ Novo evento</button></div></div><div class="nc-calendar"><div class="nc-corner"></div><div class="nc-week-head">${days.map((d,i)=>`<div class="nc-week-day ${d===today()?'today':''}"><span>${DAYS[i]}</span><b>${parse(d).getDate()}</b></div>`).join('')}</div><div class="nc-time-col">${rows}</div><div class="nc-grid">${cols}</div></div><div class="nc-help card"><b>Seu espaço de planejamento</b><span>Cadastre estudos, treino, trabalho, descanso e outros compromissos. Você também pode vincular um evento a um hábito.</span></div></div>`;
  }

  function eventModal(existing){
    const e=existing||{id:'',title:'',date:today(),start:'08:00',end:'09:00',category:'Estudos',notes:'',habitId:'',color:COLORS[0]};
    const hs=activeHabits();
    const cats=['Estudos','Trabalho','Saúde','Pessoal','Lazer','Outro'];
    const html=`<div class="modal-head"><h3>${e.id?'Editar evento':'Novo evento'}</h3><button class="icon-btn" onclick="closeModal()">×</button></div><div class="form-grid"><div class="field full"><label>Título</label><input id="ncTitle" value="${esc(e.title)}" autofocus></div><div class="field"><label>Data</label><input id="ncDate" type="date" value="${e.date}"></div><div class="field"><label>Categoria</label><select id="ncCat">${cats.map(c=>`<option ${c===e.category?'selected':''}>${c}</option>`).join('')}</select></div><div class="field"><label>Início</label><input id="ncStart" type="time" value="${e.start}"></div><div class="field"><label>Fim</label><input id="ncEnd" type="time" value="${e.end}"></div><div class="field full"><label>Hábito vinculado</label><select id="ncHabit"><option value="">Nenhum</option>${hs.map(h=>`<option value="${h.id}" ${h.id===e.habitId?'selected':''}>${esc(h.name)}</option>`).join('')}</select></div><div class="field full"><label>Observações</label><textarea id="ncNotes">${esc(e.notes||'')}</textarea></div></div><div class="modal-actions">${e.id?`<button class="btn danger" id="ncDelete">Excluir</button>`:''}<button class="btn" onclick="closeModal()">Cancelar</button><button class="btn primary" id="ncSave">Salvar evento</button></div>`;
    if(typeof openModal==='function') openModal(html); else { const m=document.getElementById('modal');m.innerHTML=html;document.getElementById('modalBackdrop').classList.remove('hidden'); }
    document.getElementById('ncSave').onclick=()=>{
      const title=document.getElementById('ncTitle').value.trim(), date=document.getElementById('ncDate').value, start=document.getElementById('ncStart').value, end=document.getElementById('ncEnd').value;
      if(!title)return alert('Informe o título do evento.'); if(!date)return alert('Informe a data.'); if(timeToMin(end)<=timeToMin(start))return alert('O horário final precisa ser maior que o inicial.');
      const list=readEvents(), data={...e,title,date,start,end,category:document.getElementById('ncCat').value,habitId:document.getElementById('ncHabit').value,notes:document.getElementById('ncNotes').value.trim(),color:e.color||COLORS[Math.floor(Math.random()*COLORS.length)]};
      const idx=list.findIndex(x=>x.id===e.id); if(idx>=0)list[idx]=data; else list.push({...data,id:'ev_'+Date.now()}); saveEvents(list); if(typeof closeModal==='function')closeModal(); document.getElementById('content').innerHTML=renderSchedule();bindSchedule();
    };
    if(e.id)document.getElementById('ncDelete').onclick=()=>{if(confirm('Excluir este evento?')){saveEvents(readEvents().filter(x=>x.id!==e.id));closeModal();document.getElementById('content').innerHTML=renderSchedule();bindSchedule();}};
  }
  function bindSchedule(){
    document.getElementById('ncPrev').onclick=()=>shiftWeek(-1); document.getElementById('ncNext').onclick=()=>shiftWeek(1); document.getElementById('ncToday').onclick=()=>{scheduleDate=new Date();document.getElementById('content').innerHTML=renderSchedule();bindSchedule();}; document.getElementById('ncAdd').onclick=()=>eventModal();
    document.querySelectorAll('[data-event-id]').forEach(b=>b.onclick=()=>eventModal(readEvents().find(e=>e.id===b.dataset.eventId)));
  }

  // Adiciona as duas novas áreas à navegação sem alterar o núcleo existente.
  const nav=document.querySelector('.nav');
  if(nav){
    const add=(page,icon,label)=>{if(!nav.querySelector(`[data-page="${page}"]`)){const b=document.createElement('button');b.className='nav-item';b.dataset.page=page;b.innerHTML=`<span>${icon}</span> ${label}`;nav.appendChild(b);}};
    add('schedule','◫','Cronograma'); add('reports','▤','Relatórios');
  }
})();