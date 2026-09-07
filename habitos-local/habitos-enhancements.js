(() => {
  const STATE='habitos_app_v1', SCHEDULE='habitos_schedule_v1';
  const colors=['#0087FF','#00B7B0','#7628D8','#E50073','#F5B84B','#6D7A91'];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const read=()=>{try{return JSON.parse(localStorage.getItem(STATE))||{};}catch{return {}}};
  const write=s=>localStorage.setItem(STATE,JSON.stringify(s));
  const iso=d=>{const x=new Date(d);x.setMinutes(x.getMinutes()-x.getTimezoneOffset());return x.toISOString().slice(0,10)};
  const parse=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
  const scheduled=(h,date)=>h.frequency==='days'?(h.days||[]).includes(parse(date).getDay()):true;
  const active=s=>(s.habits||[]).filter(h=>!h.archived);
  const done=(s,h,date)=>!!(s.completions||{})[`${h.id}_${date}`];
  const weekDates=()=>{const d=new Date();d.setDate(d.getDate()-d.getDay());return Array.from({length:7},(_,i)=>{const x=new Date(d);x.setDate(d.getDate()+i);return iso(x)})};
  const stat=(s,date)=>{const hs=active(s).filter(h=>scheduled(h,date));const d=hs.filter(h=>done(s,h,date)).length;return {s:hs.length,d,p:hs.length?Math.round(d/hs.length*100):0};};
  const xp=(s,date)=>(s.xpTransactions||[]).filter(x=>x.date===date).reduce((a,x)=>a+Number(x.xp||0),0);

  // Missões importantes para manter constância até o fim do ano.
  const importantMissions=[
    {id:'m1',title:'3 hábitos hoje',description:'Complete 3 hábitos programados hoje.',type:'daily',target:3,reward:50,enabled:true},
    {id:'m2',title:'Semana consistente',description:'Alcance pelo menos 80% de consistência na semana.',type:'consistency',target:80,reward:150,enabled:true},
    {id:'m3',title:'25 conclusões',description:'Complete 25 hábitos nesta semana.',type:'done',target:25,reward:200,enabled:true},
    {id:'m4',title:'Caçador de XP',description:'Ganhe 500 XP nesta semana.',type:'xp',target:500,reward:250,enabled:true},
    {id:'m5',title:'5 dias ativos',description:'Conclua pelo menos um hábito em 5 dias da semana.',type:'active',target:5,reward:180,enabled:true},
    {id:'m6',title:'Dia perfeito',description:'Complete todos os hábitos programados em um dia.',type:'perfect',target:1,reward:120,enabled:true},
    {id:'m7',title:'10 conclusões',description:'Complete 10 hábitos nesta semana.',type:'done',target:10,reward:80,enabled:true},
    {id:'m8',title:'300 XP',description:'Ganhe 300 XP nesta semana.',type:'xp',target:300,reward:120,enabled:true},
    {id:'m9',title:'4 dias de exercício',description:'Conclua o hábito Exercício pelo menos 4 vezes na semana.',type:'habit',habitId:'h1',target:4,reward:180,enabled:true},
    {id:'m10',title:'5 dias de estudo',description:'Conclua o hábito Estudar pelo menos 5 vezes na semana.',type:'habit',habitId:'h2',target:5,reward:220,enabled:true},
    {id:'m11',title:'5 dias de inglês',description:'Pratique Inglês pelo menos 5 vezes na semana.',type:'habit',habitId:'h3',target:5,reward:180,enabled:true},
    {id:'m12',title:'3 sessões de leitura',description:'Conclua Leitura pelo menos 3 vezes na semana.',type:'habit',habitId:'h4',target:3,reward:120,enabled:true},
    {id:'m13',title:'2 sessões de violão',description:'Pratique Violão pelo menos 2 vezes na semana.',type:'habit',habitId:'h5',target:2,reward:100,enabled:true},
    {id:'m14',title:'Semana sem zerar',description:'Tenha pelo menos uma conclusão em todos os 7 dias da semana.',type:'active',target:7,reward:250,enabled:true}
  ];

  const ensureMissions=()=>{
    const s=read();
    if(!Array.isArray(s.missions))s.missions=[];
    importantMissions.forEach(m=>{
      const exists=s.missions.some(x=>x.id===m.id);
      if(!exists)s.missions.push({...m});
    });
    write(s);
  };
  ensureMissions();

  function missionValue(s,m){
    const ds=weekDates().map(d=>stat(s,d));
    if(m.type==='daily')return stat(s,iso(new Date())).d;
    if(m.type==='consistency'){const a=ds.reduce((x,y)=>x+y.s,0),b=ds.reduce((x,y)=>x+y.d,0);return a?Math.round(b/a*100):0}
    if(m.type==='done')return ds.reduce((a,x)=>a+x.d,0);
    if(m.type==='xp')return weekDates().reduce((a,d)=>a+xp(s,d),0);
    if(m.type==='active')return ds.filter(x=>x.d>0).length;
    if(m.type==='perfect')return ds.filter(x=>x.s>0&&x.d===x.s).length;
    if(m.type==='habit'){const h=(s.habits||[]).find(x=>x.id===m.habitId);return h?weekDates().filter(d=>scheduled(h,d)&&done(s,h,d)).length:0}
    return 0;
  }

  function deleteMission(id){
    if(!confirm('Remover esta missão? Ela deixará de aparecer na lista.'))return;
    const s=read();s.missions=(s.missions||[]).filter(m=>m.id!==id);write(s);renderMissionPage();
  }

  function missionCards(){
    const s=read();
    return (s.missions||[]).filter(m=>m.enabled!==false).map((m,i)=>{
      const v=missionValue(s,m),p=Math.min(100,Math.round(v/Math.max(1,m.target)*100));
      return `<div class="card mh-mission ${p>=100?'complete':''}"><div class="mh-mission-head"><div><div class="eyebrow">${p>=100?'✓ Concluída':'Missão '+(i+1)}</div><h3>${esc(m.title)}</h3><p>${esc(m.description||'')}</p></div><b>+${m.reward} XP</b></div><div class="goal-row"><span>${v} / ${m.target}</span><strong>${p}%</strong></div><div class="progress"><div style="width:${p}%"></div></div><div class="mh-actions"><button class="btn mh-edit" data-mid="${m.id}">✎ Editar</button><button class="btn danger mh-delete" data-mid="${m.id}">× Remover</button></div></div>`
    }).join('')
  }

  function renderMissionPage(){
    const c=document.getElementById('content');if(!c)return;
    c.innerHTML=`<div class="mh-page"><div class="section-head" style="margin-top:0"><div><h2>Missões</h2><span>Desafios para manter seus hábitos vivos até 31/12.</span></div><button class="btn primary" id="mhNew">+ Nova missão</button></div><div class="mh-grid">${missionCards()}</div><div class="card mh-info"><b>Como usar</b><span>As missões semanais renovam o desafio automaticamente. Edite ou remova as que não fizerem sentido para sua rotina.</span></div></div>`;
    document.querySelectorAll('.mh-edit').forEach(b=>b.onclick=()=>editMission(b.dataset.mid));
    document.querySelectorAll('.mh-delete').forEach(b=>b.onclick=()=>deleteMission(b.dataset.mid));
    document.getElementById('mhNew').onclick=()=>editMission(null)
  }

  function editMission(id){
    const s=read(),old=(s.missions||[]).find(m=>m.id===id)||{id:'',title:'',description:'',type:'daily',target:3,reward:50,enabled:true};
    const title=prompt('Nome da missão:',old.title);if(title===null)return;
    const desc=prompt('Descrição:',old.description||'');if(desc===null)return;
    const types='daily | consistency | done | xp | active | perfect | habit';
    const type=prompt('Tipo ('+types+'):',old.type)||old.type;
    let habitId=old.habitId||'';
    if(type==='habit')habitId=prompt('ID do hábito (ex.: h1 Exercício, h2 Estudar):',habitId)||habitId;
    const target=Math.max(1,Number(prompt('Meta:',old.target))||old.target);
    const reward=Math.max(0,Number(prompt('Recompensa em XP:',old.reward))||old.reward);
    const enabled=prompt('Ativa? digite sim ou não:',old.enabled?'sim':'não')?.toLowerCase()!=='não';
    const m={...old,id:old.id||'m_'+Date.now(),title:title.trim()||old.title,description:desc,type,target,reward,enabled};
    if(type==='habit')m.habitId=habitId;else delete m.habitId;
    if(!m.title)return;
    const i=(s.missions||[]).findIndex(x=>x.id===m.id);if(i>=0)s.missions[i]=m;else(s.missions||=[]).push(m);
    write(s);renderMissionPage()
  }

  function homeReport(){const s=read(),ds=weekDates(),rows=ds.map(d=>stat(s,d)),sch=rows.reduce((a,x)=>a+x.s,0),dn=rows.reduce((a,x)=>a+x.d,0),pct=sch?Math.round(dn/sch*100):0,max=Math.max(1,...rows.map(x=>x.d));const bars=rows.map((x,i)=>`<div class="mh-week-col"><div class="mh-week-bar" style="height:${Math.max(6,x.d/max*100)}%;background:${colors[i]}"></div><span>${['D','S','T','Q','Q','S','S'][i]}</span><small>${x.d}</small></div>`).join('');return `<div class="section-head mh-home-head"><div><h2>Relatório semanal</h2><span>Seu desempenho desta semana, direto na página inicial.</span></div><button class="btn" id="mhReports">Ver relatório completo</button></div><div class="card mh-home-report"><div class="mh-home-kpis"><div><span>Consistência</span><strong>${pct}%</strong></div><div><span>Concluídos</span><strong>${dn}/${sch}</strong></div><div><span>XP</span><strong>${ds.reduce((a,d)=>a+xp(s,d),0)}</strong></div></div><div class="mh-week-chart">${bars}</div></div>`}
  function injectHome(){const content=document.getElementById('content');if(!content||document.getElementById('mhHomeReport'))return;const anchor=content.querySelector('.dashboard-analytics');const el=document.createElement('div');el.id='mhHomeReport';el.innerHTML=homeReport();(anchor?anchor.parentElement:content).appendChild(el);document.getElementById('mhReports')?.addEventListener('click',()=>document.querySelector('[data-page="reports"]')?.click())}
  function adjustSchedule(){const page=document.querySelector('.nc-page'), grid=document.querySelector('.nc-grid');if(!page||!grid||document.querySelector('.mh-five'))return;const time=document.querySelector('.nc-time-col');if(time){const first=document.createElement('div');first.className='nc-time mh-five';first.textContent='05:00';time.prepend(first)};grid.querySelectorAll('.nc-day-body').forEach(body=>{body.style.height='1296px';body.style.background='repeating-linear-gradient(to bottom,transparent 0,transparent 71px,rgba(36,50,74,.5) 72px)';body.style.paddingTop='72px';body.style.boxSizing='border-box'});grid.querySelectorAll('.nc-event').forEach(e=>{const top=parseFloat(e.style.top||'0');e.style.top=(top+72)+'px'})}
  let last='';const observer=new MutationObserver(()=>{const title=document.getElementById('pageTitle')?.textContent||'';if(title!==last){last=title;if(title==='Hoje')setTimeout(injectHome,0);if(title==='Missões')setTimeout(renderMissionPage,0);if(title==='Cronograma')setTimeout(adjustSchedule,0)}else{if(title==='Hoje'&&!document.getElementById('mhHomeReport'))injectHome();if(title==='Cronograma'&&!document.querySelector('.mh-five'))adjustSchedule()}});observer.observe(document.getElementById('content')||document.body,{childList:true,subtree:true});
  setTimeout(()=>{const title=document.getElementById('pageTitle')?.textContent;if(title==='Hoje')injectHome();if(title==='Missões')renderMissionPage();if(title==='Cronograma')adjustSchedule()},100);
})();
