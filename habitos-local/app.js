const START = "2026-09-08";
const END = "2026-12-31";
const KEY = "habitos_app_v1";

// Cores da identidade visual: azul -> ciano -> roxo -> magenta.
const BLUE = "#0087FF";
const CYAN = "#00B7B0";
const PURPLE = "#7628D8";
const MAGENTA = "#E50073";
const MUTED = "#8F9BB0";

const defaultState = {
  user: {name:"Usuário", avatar:"US", dailyXP:100, theme:"dark"},
  habits: [
    {id:"h1",name:"Exercício",description:"Treino ou atividade física",icon:"🏋️",category:"Saúde",goalId:null,frequency:"daily",days:[],difficulty:"hard",xp:30,reminder:"",archived:false,createdAt:Date.now()},
    {id:"h2",name:"Estudar",description:"Bloco de estudo focado",icon:"📚",category:"Estudos",goalId:"g1",frequency:"daily",days:[],difficulty:"medium",xp:20,reminder:"",archived:false,createdAt:Date.now()},
    {id:"h3",name:"Inglês",description:"Praticar inglês",icon:"🇺🇸",category:"Estudos",goalId:"g2",frequency:"daily",days:[],difficulty:"medium",xp:20,reminder:"",archived:false,createdAt:Date.now()},
    {id:"h4",name:"Leitura",description:"Ler algumas páginas",icon:"📖",category:"Pessoal",goalId:null,frequency:"daily",days:[],difficulty:"easy",xp:10,reminder:"",archived:false,createdAt:Date.now()},
    {id:"h5",name:"Violão",description:"Praticar violão",icon:"🎸",category:"Pessoal",goalId:null,frequency:"days",days:[2,4,6],difficulty:"easy",xp:10,reminder:"",archived:false,createdAt:Date.now()}
  ],
  goals: [
    {id:"g1",title:"Evoluir nos estudos",description:"Manter uma rotina consistente de estudo.",category:"Estudos",start:START,end:END,strategy:"Estudar em blocos focados e revisar semanalmente.",milestones:[{id:"m1",title:"Criar rotina de estudos",done:false},{id:"m2",title:"Concluir um módulo importante",done:false}]},
    {id:"g2",title:"Melhorar meu inglês",description:"Criar consistência no inglês.",category:"Estudos",start:START,end:END,strategy:"Combinar prática diária, curso e exposição ao idioma.",milestones:[{id:"m3",title:"Completar 30 sessões",done:false}]}
  ],
  completions: {},
  xpTransactions: [],
  achievements: [],
  categories:["Saúde","Estudos","Pessoal","Trabalho","Lazer"],
  missions:[],
  settings:{}
};

let state = load();
let currentPage = "today";

// Firebase é opcional até você preencher firebase-config.js.
// Quando configurado, o Firestore vira a fonte de sincronização online.
if (window.cloudSync) {
  window.cloudSync.init().then(remote => {
    if (remote && remote.habits && remote.goals) {
      state = remote;
      save(false);
      render();
      toast("☁️ Dados sincronizados com o Firebase","success");
    }
  }).catch(err => console.warn("Firebase:", err));
}

function load(){
  try {
    const saved = localStorage.getItem(KEY);
    if(saved) return JSON.parse(saved);
  } catch(e){}
  return structuredClone(defaultState);
}
function save(sync=true){
  localStorage.setItem(KEY, JSON.stringify(state));
  if(sync && window.cloudSync) window.cloudSync.save(state).catch(err=>console.warn("Firebase save:",err));
}
function uid(prefix="id"){ return prefix+"_"+Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4); }
function dateISO(d){ return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10); }
function parseDate(s){ const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d); }
function todayISO(){ return dateISO(new Date()); }
function inRange(date){ return date>=START && date<=END; }
function formatDate(s){ return parseDate(s).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric"}); }
function daysBetween(a,b){ return Math.round((parseDate(b)-parseDate(a))/86400000); }
function periodDays(){ return daysBetween(START,END)+1; }
function periodElapsed(){ const t=todayISO(); if(t<START)return 0;if(t>END)return periodDays();return daysBetween(START,t)+1; }
function isScheduled(h,date){
  const d=parseDate(date);
  if(h.frequency==="daily") return true;
  if(h.frequency==="days") return h.days.includes(d.getDay());
  return true;
}
function isDone(hid,date){ return !!state.completions[`${hid}_${date}`]; }
function setDone(hid,date,done){
  const h=state.habits.find(x=>x.id===hid);
  if(!h)return;
  const key=`${hid}_${date}`;
  if(done && !state.completions[key]){
    state.completions[key]={at:new Date().toISOString(),xp:h.xp};
    state.xpTransactions.push({id:uid("xp"),date,xp:h.xp,reason:`Hábito: ${h.name}`});
    toast(`✓ ${h.name} concluído +${h.xp} XP`,"success");
  } else if(!done && state.completions[key]){
    state.completions[key]=null;
    state.xpTransactions.push({id:uid("xp"),date,xp:-h.xp,reason:`Desfazer: ${h.name}`});
    toast(`Conclusão desfeita (-${h.xp} XP)`);
  }
  save(); render();
}
function totalXP(){ return Math.max(0,state.xpTransactions.reduce((a,x)=>a+x.xp,0)); }
function levelInfo(){
  const xp=totalXP();
  let level=1,need=100,prev=0;
  while(xp>=need){ level++; prev=need; need += 100 + (level-1)*50; }
  return {level,xp,prev,next:need,pct:Math.max(0,Math.min(100,((xp-prev)/(need-prev))*100))};
}
function habitStreak(h){
  let cursor = todayISO(), streak=0;
  if(cursor>END) cursor=END;
  let d=parseDate(cursor);
  for(let i=0;i<periodDays()+5;i++){
    const iso=dateISO(d);
    if(iso<START) break;
    if(isScheduled(h,iso)){
      if(isDone(h.id,iso)) streak++;
      else break;
    }
    d.setDate(d.getDate()-1);
  }
  return streak;
}
function overallStreak(){
  let d=parseDate(todayISO()), count=0;
  for(let i=0;i<periodDays()+2;i++){
    const iso=dateISO(d);
    if(iso<START)break;
    const active=state.habits.filter(h=>!h.archived&&isScheduled(h,iso));
    if(active.length && active.some(h=>isDone(h.id,iso))) count++;
    else if(active.length) break;
    d.setDate(d.getDate()-1);
  }
  return count;
}
function goalProgress(g){
  const linked=state.habits.filter(h=>h.goalId===g.id&&!h.archived);
  const dates=Math.max(1,daysBetween(g.start,g.end)+1);
  let scheduled=0,done=0;
  linked.forEach(h=>{
    for(let i=0;i<dates;i++){
      const d=parseDate(g.start); d.setDate(d.getDate()+i);
      const iso=dateISO(d);
      if(isScheduled(h,iso)){scheduled++;if(isDone(h.id,iso))done++;}
    }
  });
  const habitPct=scheduled?done/scheduled:0;
  const ms=g.milestones||[];
  const msPct=ms.length?ms.filter(x=>x.done).length/ms.length:0;
  return linked.length&&ms.length ? Math.round((habitPct*.7+msPct*.3)*100) :
    linked.length ? Math.round(habitPct*100) :
    ms.length ? Math.round(msPct*100) : 0;
}
function todayHabits(){ const t=todayISO(); return state.habits.filter(h=>!h.archived&&isScheduled(h,t)); }
function completedToday(){ return todayHabits().filter(h=>isDone(h.id,todayISO())).length; }
function consistency(){
  let scheduled=0,done=0;
  state.habits.filter(h=>!h.archived).forEach(h=>{
    const end=todayISO()<END?todayISO():END;
    if(end<START)return;
    const n=daysBetween(START,end)+1;
    for(let i=0;i<n;i++){const d=parseDate(START);d.setDate(d.getDate()+i);const iso=dateISO(d);if(isScheduled(h,iso)){scheduled++;if(isDone(h.id,iso))done++;}}
  });
  return scheduled?Math.round(done/scheduled*100):0;
}
function initials(name){ return (name||"US").split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase(); }
function escapeHTML(s){ return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c])); }

function render(){
  const titles={today:"Hoje",habits:"Hábitos",goals:"Metas",calendar:"Calendário",stats:"Estatísticas",achievements:"Conquistas",missions:"Missões",settings:"Configurações"};
  document.getElementById("pageTitle").textContent=titles[currentPage];
  document.getElementById("sideName").textContent=state.user.name;
  document.getElementById("sideLevel").textContent=`Nível ${levelInfo().level}`;
  document.getElementById("sideAvatar").textContent=state.user.avatar||initials(state.user.name);
  document.getElementById("topAvatar").textContent=state.user.avatar||initials(state.user.name);
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===currentPage));
  const views={today:renderToday,habits:renderHabits,goals:renderGoals,calendar:renderCalendar,stats:renderStats,achievements:renderAchievements,missions:renderMissions,settings:renderSettings};
  document.getElementById("content").innerHTML=views[currentPage]();
  bind();
}
function renderToday(){
  const li=levelInfo(), habits=todayHabits(), done=completedToday(), pct=habits.length?Math.round(done/habits.length*100):0;
  const daily=state.xpTransactions.filter(x=>x.date===todayISO()).reduce((a,x)=>a+x.xp,0);
  const daysLeft=Math.max(0,daysBetween(todayISO(),END));
  return `<div class="hero">
    <div class="card hero-card">
      <div class="eyebrow">${new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long"})}</div>
      <p class="hero-title">Seu dia, um passo de cada vez.</p>
      <p class="hero-sub">Conclua o que importa hoje. Cada hábito alimenta seu progresso e mantém sua sequência viva.</p>
      <div class="level-line"><strong>Nível ${li.level}</strong><span>${li.xp-li.prev} / ${li.next-li.prev} XP para o próximo nível</span></div>
      <div class="progress"><div style="width:${li.pct}%"></div></div>
      <div class="small" style="margin-top:8px">${li.xp} XP totais · 🔥 ${overallStreak()} dias de streak geral</div>
    </div>
    <div class="card hero-card">
      <div class="eyebrow">Período</div>
      <div class="stat-value">${daysLeft}</div>
      <div class="stat-sub">dias restantes até 31/12/2026</div>
      <div class="section-head" style="margin-top:22px"><h2>XP de hoje</h2><span>${daily} / ${state.user.dailyXP}</span></div>
      <div class="progress"><div style="width:${Math.min(100,daily/state.user.dailyXP*100)}%"></div></div>
    </div>
  </div>
  <div class="section-head"><h2>Hábitos de hoje</h2><span>${done} de ${habits.length} concluídos · ${pct}%</span></div>
  <div class="card" style="margin-bottom:16px"><div class="progress"><div style="width:${pct}%"></div></div></div>
  <div class="habit-list">${habits.length?habits.map(habitRow).join(""):`<div class="empty"><strong>Nenhum hábito programado hoje.</strong>Crie um hábito ou ajuste suas frequências.</div>`}</div>
  <div class="section-head"><h2>Metas em andamento</h2><button class="btn" data-action="new-goal">+ Nova meta</button></div>
  <div class="grid grid-2">${state.goals.filter(g=>goalProgress(g)<100).slice(0,4).map(goalCard).join("")||`<div class="empty"><strong>Você ainda não tem metas.</strong>Transforme um objetivo em um sistema.</div>`}</div>
  ${renderDashboardCharts()}`;
}
function habitRow(h){
  const done=isDone(h.id,todayISO());
  return `<div class="habit-row ${done?"done":""}">
    <button class="check ${done?"done":""}" data-action="toggle-habit" data-id="${h.id}">${done?"✓":""}</button>
    <div class="habit-icon">${escapeHTML(h.icon||"✓")}</div>
    <div class="habit-main"><div class="habit-name">${escapeHTML(h.name)}</div><div class="habit-meta">${escapeHTML(h.category)} · ${freqLabel(h)}</div></div>
    <div class="streak">🔥 ${habitStreak(h)}</div><div class="xp-pill">+${h.xp} XP</div>
  </div>`;
}
function freqLabel(h){ if(h.frequency==="daily")return"Todos os dias"; if(h.frequency==="days")return"2ª, 4ª e 6ª"; return"Personalizada"; }
function goalCard(g){
  const p=goalProgress(g);
  return `<div class="card goal-card"><div class="goal-title">${escapeHTML(g.title)}</div><div class="goal-row"><span>${escapeHTML(g.category)}</span><strong>${p}%</strong></div><div class="progress"><div style="width:${p}%"></div></div><div class="small" style="margin-top:9px">${(state.habits.filter(h=>h.goalId===g.id&&!h.archived)).length} hábitos vinculados · prazo ${formatDate(g.end)}</div></div>`;
}
function renderHabits(){
  return `<div class="toolbar"><input id="habitSearch" placeholder="Buscar hábito..."><select id="habitFilter"><option value="all">Todos</option><option value="today">Hoje</option><option value="pending">Pendentes</option><option value="done">Concluídos hoje</option><option value="archived">Arquivados</option></select><button class="btn primary" data-action="new-habit">+ Novo hábito</button></div>
  <div class="section-head"><h2>${state.habits.filter(h=>!h.archived).length} hábitos ativos</h2><span>Sem limite artificial</span></div>
  <div class="habit-list" id="habitsList">${habitListFiltered()}</div>`;
}
function habitListFiltered(){
  const q=(document.getElementById("habitSearch")?.value||"").toLowerCase();
  const f=document.getElementById("habitFilter")?.value||"all";
  let arr=state.habits.filter(h=>q?h.name.toLowerCase().includes(q):true);
  arr=arr.filter(h=>f==="archived"?h.archived:!h.archived);
  if(f==="today")arr=arr.filter(h=>isScheduled(h,todayISO()));
  if(f==="pending")arr=arr.filter(h=>isScheduled(h,todayISO())&&!isDone(h.id,todayISO()));
  if(f==="done")arr=arr.filter(h=>isDone(h.id,todayISO()));
  return arr.length?arr.map(h=>`${habitRowForManage(h)}${!h.archived?`<div style="height:1px"></div>`:""}`).join(""):`<div class="empty"><strong>Nenhum hábito encontrado.</strong>Altere os filtros ou crie um novo hábito.</div>`;
}
function habitRowForManage(h){
  const done=isDone(h.id,todayISO());
  return `<div class="habit-row ${done?"done":""}">
    <button class="check ${done?"done":""}" data-action="toggle-habit" data-id="${h.id}">${done?"✓":""}</button>
    <div class="habit-icon">${escapeHTML(h.icon||"✓")}</div>
    <div class="habit-main"><div class="habit-name">${escapeHTML(h.name)} ${h.archived?"· arquivado":""}</div><div class="habit-meta">${escapeHTML(h.category)} · ${freqLabel(h)} · ${h.xp} XP · 🔥 ${habitStreak(h)}</div></div>
    <div class="item-actions"><button data-action="edit-habit" data-id="${h.id}" title="Editar">✎</button><button data-action="archive-habit" data-id="${h.id}" title="Arquivar">${h.archived?"↩":"▱"}</button><button data-action="delete-habit" data-id="${h.id}" title="Excluir">×</button></div>
  </div>`;
}
function renderGoals(){
  return `<div class="section-head" style="margin-top:0"><div><h2>Metas e sistemas</h2><span>Transforme objetivos em processos repetíveis.</span></div><button class="btn primary" data-action="new-goal">+ Nova meta</button></div>
  <div class="grid grid-2">${state.goals.map(g=>goalManage(g)).join("")||`<div class="empty"><strong>Nenhuma meta criada.</strong>Comece definindo o que você quer alcançar.</div>`}</div>`;
}
function goalManage(g){
  const p=goalProgress(g), linked=state.habits.filter(h=>h.goalId===g.id&&!h.archived);
  const ms=g.milestones||[];
  return `<div class="card">
    <div class="kpi"><div><div class="eyebrow">${escapeHTML(g.category)}</div><strong style="font-size:17px">${escapeHTML(g.title)}</strong></div><div class="item-actions"><button data-action="edit-goal" data-id="${g.id}">✎</button><button data-action="delete-goal" data-id="${g.id}">×</button></div></div>
    <p class="small" style="line-height:1.6">${escapeHTML(g.description||"")}</p>
    <div class="goal-row"><span>Progresso</span><strong>${p}%</strong></div><div class="progress"><div style="width:${p}%"></div></div>
    <div class="small" style="margin-top:10px">Prazo: ${formatDate(g.end)} · ${linked.length} hábitos vinculados</div>
    <div class="section-head" style="margin-top:18px"><h2>Sistema</h2><button class="btn" data-action="manage-goal" data-id="${g.id}">Gerenciar</button></div>
    <div>${linked.slice(0,4).map(h=>`<div class="small" style="padding:5px 0">• ${escapeHTML(h.name)} · +${h.xp} XP</div>`).join("")||`<div class="small">Nenhum hábito vinculado.</div>`}</div>
    ${ms.length?`<div class="section-head" style="margin-top:15px"><h2>Marcos</h2><span>${ms.filter(x=>x.done).length}/${ms.length}</span></div>${ms.map(m=>`<div class="milestone ${m.done?"done":""}"><button class="${m.done?"done":""}" data-action="toggle-milestone" data-goal="${g.id}" data-id="${m.id}">${m.done?"✓":""}</button><span>${escapeHTML(m.title)}</span></div>`).join("")}`:""}
  </div>`;
}
function renderCalendar(){
  const d=parseDate(todayISO()), year=d.getFullYear(), month=d.getMonth();
  const first=new Date(year,month,1), last=new Date(year,month+1,0);
  let cells="";
  for(let i=0;i<first.getDay();i++)cells+=`<div class="cal-day out"></div>`;
  for(let day=1;day<=last.getDate();day++){
    const dt=new Date(year,month,day), iso=dateISO(dt);
    const hs=state.habits.filter(h=>!h.archived&&isScheduled(h,iso)), dc=hs.filter(h=>isDone(h.id,iso)).length;
    let cls=iso===todayISO()?"today":"";
    let dot=dc===hs.length&&hs.length?"":"";
    if(hs.length&&dc===0)dot="missed"; else if(hs.length&&dc<hs.length)dot="partial";
    cells+=`<div class="cal-day ${cls}"><strong>${day}</strong>${hs.length?`<div class="small">${dc}/${hs.length}</div><span class="cal-dot ${dot}"></span>`:""}</div>`;
  }
  return `<div class="card"><div class="section-head" style="margin-top:0"><h2>${d.toLocaleDateString("pt-BR",{month:"long",year:"numeric"})}</h2><span>Período ${formatDate(START)} — ${formatDate(END)}</span></div><div class="calendar">${["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(x=>`<div class="cal-head">${x}</div>`).join("")}${cells}</div></div>`;
}
function renderStats(){
  const li=levelInfo(), daily=[];
  const end=todayISO()<END?todayISO():END;
  const n=Math.min(30,Math.max(1,daysBetween(START,end)+1));
  for(let i=n-1;i>=0;i--){const d=parseDate(end);d.setDate(d.getDate()-i);const iso=dateISO(d);daily.push({iso,xp:state.xpTransactions.filter(x=>x.date===iso).reduce((a,x)=>a+x.xp,0)});}
  const max=Math.max(1,...daily.map(x=>Math.max(0,x.xp)));
  const top=[...state.habits].filter(h=>!h.archived).map(h=>({h,p:habitConsistency(h)})).sort((a,b)=>b.p-a.p).slice(0,6);
  return `<div class="grid grid-4"><div class="card stat-card"><div class="stat-label">XP total</div><div class="stat-value">${li.xp}</div><div class="stat-sub">Nível ${li.level}</div></div><div class="card stat-card"><div class="stat-label">Streak geral</div><div class="stat-value">🔥 ${overallStreak()}</div><div class="stat-sub">dias consecutivos</div></div><div class="card stat-card"><div class="stat-label">Consistência</div><div class="stat-value">${consistency()}%</div><div class="stat-sub">no período até hoje</div></div><div class="card stat-card"><div class="stat-label">Metas concluídas</div><div class="stat-value">${state.goals.filter(g=>goalProgress(g)>=100).length}</div><div class="stat-sub">de ${state.goals.length}</div></div></div>
  <div class="section-head"><h2>XP por dia</h2><span>últimos ${n} dias</span></div>
  <div class="card"><div class="chart">${daily.map(x=>`<div class="bar-wrap"><div class="bar" style="height:${Math.max(2,x.xp/max*100)}%" title="${formatDate(x.iso)}: ${x.xp} XP"></div></div>`).join("")}</div><div style="display:flex;justify-content:space-between">${daily.filter((_,i)=>i%Math.max(1,Math.floor(n/6))===0).map(x=>`<span class="bar-label">${x.iso.slice(8)}</span>`).join("")}</div></div>
  <div class="section-head"><h2>Consistência por hábito</h2></div>
  <div class="card list-card">${top.map(x=>`<div><div class="goal-row"><span>${escapeHTML(x.h.name)}</span><strong>${x.p}%</strong></div><div class="progress"><div style="width:${x.p}%"></div></div></div>`).join("")||`<div class="empty">Crie hábitos para gerar estatísticas.</div>`}</div>`;
}
function habitConsistency(h){
  let s=0,d=0; const end=todayISO()<END?todayISO():END; if(end<START)return 0;
  const n=daysBetween(START,end)+1;
  for(let i=0;i<n;i++){const dt=parseDate(START);dt.setDate(dt.getDate()+i);const iso=dateISO(dt);if(isScheduled(h,iso)){s++;if(isDone(h.id,iso))d++;}}
  return s?Math.round(d/s*100):0;
}
function completedOnDate(iso){ return state.habits.filter(h=>!h.archived&&isScheduled(h,iso)&&isDone(h.id,iso)).length; }
function todayCompletionForDate(iso){
  const active=state.habits.filter(h=>!h.archived&&isScheduled(h,iso));
  return active.length>0 && active.every(h=>isDone(h.id,iso));
}
function recentConsistency(days=7){
  let scheduled=0,done=0;
  const end=parseDate(todayISO());
  for(let i=0;i<days;i++){
    const d=new Date(end); d.setDate(d.getDate()-i); const iso=dateISO(d);
    if(iso<START) continue;
    state.habits.filter(h=>!h.archived).forEach(h=>{
      if(isScheduled(h,iso)){scheduled++;if(isDone(h.id,iso))done++;}
    });
  }
  return scheduled?Math.round(done/scheduled*100):0;
}
function analyticsData(days=14){
  const end=todayISO();
  const out=[];
  for(let i=days-1;i>=0;i--){
    const d=parseDate(end); d.setDate(d.getDate()-i);
    const iso=dateISO(d);
    out.push({iso,done:completedOnDate(iso)});
  }
  return out;
}
function categoryAnalytics(){
  const map={};
  state.habits.filter(h=>!h.archived).forEach(h=>{
    const cat=h.category||"Geral";
    map[cat]=(map[cat]||0)+1;
  });
  return Object.entries(map).sort((a,b)=>b[1]-a[1]);
}
function goalAnalytics(){
  return state.goals.filter(g=>goalProgress(g)<100).slice(0,4);
}
function renderDashboardCharts(){
  const data=analyticsData(14), max=Math.max(1,...data.map(x=>x.done));
  const bars=data.map(x=>`<div class="mini-bar-wrap" title="${formatDate(x.iso)}: ${x.done} concluído(s)"><div class="mini-bar" style="height:${Math.max(5,x.done/max*100)}%"></div></div>`).join("");
  const labels=data.filter((_,i)=>[0,4,8,13].includes(i)).map(x=>`<span>${x.iso.slice(8)}</span>`).join("");
  const cats=categoryAnalytics(), total=Math.max(1,cats.reduce((a,x)=>a+x[1],0));
  const donutParts=cats.map((x,i)=>`${[BLUE,CYAN,PURPLE,MAGENTA,"#6D7A91"][i%5]} ${Math.round(x[1]/total*100)}%`).join(", ");
  const catRows=cats.slice(0,5).map(x=>`<div class="analytics-row"><span>${escapeHTML(x[0])}</span><strong>${x[1]}</strong></div>`).join("");
  const goals=goalAnalytics();
  const goalRows=goals.map(g=>{const p=goalProgress(g);return `<div class="dashboard-goal"><div class="goal-row"><span>${escapeHTML(g.title)}</span><strong>${p}%</strong></div><div class="progress"><div style="width:${p}%"></div></div></div>`}).join("");
  return `<div class="section-head dashboard-section-head"><div><h2>Visão rápida</h2><span>Os indicadores mais importantes da sua rotina.</span></div></div>
  <div class="dashboard-analytics">
    <div class="card analytics-card"><div class="analytics-title">Atividade · 14 dias</div><div class="mini-chart">${bars}</div><div class="mini-chart-labels">${labels}</div><div class="analytics-foot"><strong>${recentConsistency(7)}%</strong><span>consistência nos últimos 7 dias</span></div></div>
    <div class="card analytics-card"><div class="analytics-title">Hábitos por categoria</div><div class="donut-row"><div class="donut" style="background:conic-gradient(${donutParts||`${MUTED} 100%`})"><div class="donut-hole"><strong>${state.habits.filter(h=>!h.archived).length}</strong><span>hábitos</span></div></div><div class="category-list">${catRows||`<div class="empty">Sem dados.</div>`}</div></div></div>
    <div class="card analytics-card"><div class="analytics-title">Progresso das metas</div><div class="goal-analytics">${goalRows||`<div class="empty">Nenhuma meta em andamento.</div>`}</div><div class="analytics-foot"><strong>${state.goals.filter(g=>goalProgress(g)>=100).length}</strong><span>metas concluídas</span></div></div>
  </div>`;
}
const achievementDefs=[
  ["first","🌱","Primeiro passo","Conclua seu primeiro hábito",()=>Object.values(state.completions).some(Boolean)],
  ["xp100","⭐","100 XP","Acumule 100 XP",()=>totalXP()>=100],
  ["xp500","💎","500 XP","Acumule 500 XP",()=>totalXP()>=500],
  ["xp1000","👑","1.000 XP","Acumule 1.000 XP",()=>totalXP()>=1000],
  ["streak3","🔥","3 dias","Mantenha 3 dias consecutivos",()=>Math.max(0,...state.habits.map(h=>habitStreak(h)))>=3||overallStreak()>=3],
  ["streak7","🔥","7 dias","Mantenha 7 dias de streak",()=>Math.max(0,...state.habits.map(h=>habitStreak(h)))>=7||overallStreak()>=7],
  ["streak14","🚀","14 dias","Mantenha 14 dias consecutivos",()=>Math.max(0,...state.habits.map(h=>habitStreak(h)))>=14||overallStreak()>=14],
  ["streak30","🏆","30 dias","Mantenha 30 dias de streak",()=>Math.max(0,...state.habits.map(h=>habitStreak(h)))>=30||overallStreak()>=30],
  ["streak60","⚡","60 dias","Mantenha 60 dias consecutivos",()=>Math.max(0,...state.habits.map(h=>habitStreak(h)))>=60||overallStreak()>=60],
  ["goal1","🎯","Primeira meta","Conclua uma meta",()=>state.goals.some(g=>goalProgress(g)>=100)],
  ["goals3","🥇","Três metas","Conclua 3 metas",()=>state.goals.filter(g=>goalProgress(g)>=100).length>=3],
  ["five","✋","Cinco ativos","Tenha 5 hábitos ativos",()=>state.habits.filter(h=>!h.archived).length>=5],
  ["ten","🧩","Dez hábitos","Tenha 10 hábitos ativos",()=>state.habits.filter(h=>!h.archived).length>=10],
  ["hundred","💯","Centena","Complete 100 hábitos",()=>Object.values(state.completions).filter(Boolean).length>=100],
  ["threehundred","🌟","300 conclusões","Complete 300 hábitos",()=>Object.values(state.completions).filter(Boolean).length>=300],
  ["consistent","📈","Consistente","Alcance 90% de consistência",()=>consistency()>=90],
  ["perfectweek","🗓️","Semana perfeita","Tenha 100% de consistência nos últimos 7 dias",()=>recentConsistency(7)>=100],
  ["earlybird","🌅","Começo forte","Conclua 5 hábitos no primeiro dia",()=>completedOnDate(START)>=5],
  ["goalhabit","🔗","Sistema funcionando","Tenha pelo menos 3 hábitos ligados a uma meta",()=>state.goals.some(g=>state.habits.filter(h=>h.goalId===g.id&&!h.archived).length>=3)],
  ["alltoday","✅","Dia completo","Conclua todos os hábitos programados em um dia",()=>Object.keys(state.completions).some(k=>{const d=k.split("_").pop();return d&&todayCompletionForDate(d)})]
];
function achievementStatus(id){return state.achievements.includes(id)}
function refreshAchievements(){
  achievementDefs.forEach(a=>{if(!achievementStatus(a[0])&&a[4]()){state.achievements.push(a[0]);toast(`🏆 Conquista desbloqueada: ${a[2]}`,"success");save();}});
}
function renderAchievements(){
  refreshAchievements();
  return `<div class="section-head" style="margin-top:0"><div><h2>Conquistas</h2><span>${state.achievements.length}/${achievementDefs.length} desbloqueadas</span></div></div><div class="badge-grid">${achievementDefs.map(a=>`<div class="badge ${achievementStatus(a[0])?"":"locked"}"><div class="badge-icon">${a[1]}</div><strong>${a[2]}</strong><span>${a[3]}</span></div>`).join("")}</div>`;
}
function renderMissions(){
  const todayDone=completedToday(), total=todayHabits().length;
  return `<div class="grid grid-2"><div class="card"><div class="eyebrow">Missão diária</div><h2 style="font-size:18px">Complete 3 hábitos hoje</h2><p class="small">Recompensa: +50 XP</p><div class="goal-row"><span>${Math.min(todayDone,3)}/3</span><strong>${Math.min(100,Math.round(todayDone/3*100))}%</strong></div><div class="progress"><div style="width:${Math.min(100,todayDone/3*100)}%"></div></div>${todayDone>=3?`<button class="btn primary" style="margin-top:15px" disabled>✓ Concluída</button>`:`<div class="small" style="margin-top:15px">Continue sua rotina para liberar a recompensa.</div>`}</div>
  <div class="card"><div class="eyebrow">Missão semanal</div><h2 style="font-size:18px">Mantenha 80% de consistência</h2><p class="small">Recompensa: +150 XP</p><div class="goal-row"><span>Consistência atual</span><strong>${consistency()}%</strong></div><div class="progress"><div style="width:${Math.min(100,consistency())}%"></div></div></div></div>`;
}
function renderSettings(){
  return `<div class="grid grid-2"><div class="card"><div class="section-head" style="margin-top:0"><h2>Perfil</h2></div><div class="form-grid"><div class="field full"><label>Nome</label><input id="setName" value="${escapeHTML(state.user.name)}"></div><div class="field"><label>Avatar / iniciais</label><input id="setAvatar" value="${escapeHTML(state.user.avatar||"")}"></div><div class="field"><label>Meta diária de XP</label><input id="setXP" type="number" min="1" value="${state.user.dailyXP}"></div></div><div class="modal-actions"><button class="btn primary" data-action="save-settings">Salvar</button></div></div>
  <div class="card"><div class="section-head" style="margin-top:0"><h2>Dados locais</h2></div><p class="small" style="line-height:1.7">Esta versão de teste salva seus dados no <strong>localStorage</strong> deste navegador. Ela não depende do Patrimônio 360 e funciona offline.</p><button class="btn danger" data-action="reset-data">Restaurar dados de demonstração</button></div></div>`;
}

function bind(){
  document.querySelectorAll("[data-page]").forEach(b=>b.onclick=()=>{currentPage=b.dataset.page;document.getElementById("sidebar").classList.remove("open");render();});
  document.querySelectorAll("[data-action]").forEach(b=>b.onclick=()=>action(b.dataset.action,b.dataset.id,b.dataset.goal));
  const hs=document.getElementById("habitSearch"), hf=document.getElementById("habitFilter");
  if(hs)hs.oninput=()=>document.getElementById("habitsList").innerHTML=habitListFiltered();
  if(hf)hf.onchange=()=>document.getElementById("habitsList").innerHTML=habitListFiltered();
}
function action(type,id,goalId){
  if(type==="toggle-habit")return setDone(id,todayISO(),!isDone(id,todayISO()));
  if(type==="new-habit")return habitModal();
  if(type==="edit-habit")return habitModal(state.habits.find(h=>h.id===id));
  if(type==="archive-habit"){const h=state.habits.find(h=>h.id===id);h.archived=!h.archived;save();toast(h.archived?"Hábito arquivado":"Hábito restaurado");render();return;}
  if(type==="delete-habit"){if(confirm("Excluir este hábito? O histórico local será mantido, mas o hábito sairá da lista.")){const h=state.habits.find(h=>h.id===id);h.archived=true;h.deleted=true;save();toast("Hábito removido");render();}return;}
  if(type==="new-goal")return goalModal();
  if(type==="edit-goal")return goalModal(state.goals.find(g=>g.id===id));
  if(type==="delete-goal"){if(confirm("Excluir esta meta?")){state.goals=state.goals.filter(g=>g.id!==id);state.habits.forEach(h=>{if(h.goalId===id)h.goalId=null});save();toast("Meta excluída");render();}return;}
  if(type==="manage-goal")return goalModal(state.goals.find(g=>g.id===id));
  if(type==="toggle-milestone"){const g=state.goals.find(g=>g.id===goalId);const m=g.milestones.find(m=>m.id===id);m.done=!m.done;save();toast(m.done?"Marco concluído":"Marco reaberto");render();return;}
  if(type==="save-settings"){state.user.name=document.getElementById("setName").value.trim()||"Usuário";state.user.avatar=document.getElementById("setAvatar").value.trim()||initials(state.user.name);state.user.dailyXP=Math.max(1,Number(document.getElementById("setXP").value)||100);save();toast("Configurações salvas","success");render();return;}
  if(type==="reset-data"){if(confirm("Restaurar os dados de demonstração? Isso apagará os dados locais atuais.")){localStorage.removeItem(KEY);state=load();currentPage="today";toast("Dados restaurados");render();}return;}
}
function openModal(html){document.getElementById("modal").innerHTML=html;document.getElementById("modalBackdrop").classList.remove("hidden");}
function closeModal(){document.getElementById("modalBackdrop").classList.add("hidden")}
function habitModal(h){
  h=h||{id:"",name:"",description:"",icon:"✓",category:"Pessoal",goalId:"",frequency:"daily",days:[1,2,3,4,5],difficulty:"medium",xp:20,reminder:"",archived:false};
  openModal(`<div class="modal-head"><h3>${h.id?"Editar hábito":"Novo hábito"}</h3><button class="icon-btn" onclick="closeModal()">×</button></div>
  <div class="form-grid"><div class="field full"><label>Nome</label><input id="fName" value="${escapeHTML(h.name)}" autofocus></div><div class="field full"><label>Descrição</label><textarea id="fDesc">${escapeHTML(h.description||"")}</textarea></div><div class="field"><label>Ícone / emoji</label><input id="fIcon" value="${escapeHTML(h.icon||"✓")}"></div><div class="field"><label>Categoria</label><select id="fCat">${state.categories.map(c=>`<option ${c===h.category?"selected":""}>${escapeHTML(c)}</option>`).join("")}</select></div>
  <div class="field"><label>Meta vinculada</label><select id="fGoal"><option value="">Sem meta</option>${state.goals.map(g=>`<option value="${g.id}" ${g.id===h.goalId?"selected":""}>${escapeHTML(g.title)}</option>`).join("")}</select></div>
  <div class="field"><label>Frequência</label><select id="fFreq"><option value="daily" ${h.frequency==="daily"?"selected":""}>Todos os dias</option><option value="days" ${h.frequency==="days"?"selected":""}>Dias específicos</option></select></div>
  <div class="field full"><label>Dias (se usar dias específicos)</label><div style="display:flex;gap:6px;flex-wrap:wrap">${["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map((x,i)=>`<label style="display:flex;gap:5px;align-items:center;background:#252525;border:1px solid var(--border);padding:7px 9px;border-radius:8px;font-size:10px"><input type="checkbox" class="fDay" value="${i}" ${h.days.includes(i)?"checked":""}>${x}</label>`).join("")}</div></div>
  <div class="field"><label>Dificuldade</label><select id="fDiff"><option value="veryeasy">Muito fácil</option><option value="easy" ${h.difficulty==="easy"?"selected":""}>Fácil</option><option value="medium" ${h.difficulty==="medium"?"selected":""}>Médio</option><option value="hard" ${h.difficulty==="hard"?"selected":""}>Difícil</option><option value="veryhard">Muito difícil</option></select></div>
  <div class="field"><label>XP</label><input id="fXP" type="number" min="1" value="${h.xp}"></div><div class="field"><label>Lembrete</label><input id="fReminder" type="time" value="${h.reminder||""}"></div></div>
  <div class="modal-actions"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="saveHabit('${h.id}')">Salvar hábito</button></div>`);
}
function saveHabit(id){
  const data={name:document.getElementById("fName").value.trim(),description:document.getElementById("fDesc").value.trim(),icon:document.getElementById("fIcon").value.trim()||"✓",category:document.getElementById("fCat").value,goalId:document.getElementById("fGoal").value||null,frequency:document.getElementById("fFreq").value,days:[...document.querySelectorAll(".fDay:checked")].map(x=>Number(x.value)),difficulty:document.getElementById("fDiff").value,xp:Math.max(1,Number(document.getElementById("fXP").value)||10),reminder:document.getElementById("fReminder").value};
  if(!data.name)return toast("Informe o nome do hábito","error");
  if(id){Object.assign(state.habits.find(h=>h.id===id),data);toast("Hábito atualizado","success")}
  else{state.habits.push({...data,id:uid("h"),archived:false,createdAt:Date.now()});toast("Hábito criado","success")}
  save();closeModal();render();
}
function goalModal(g){
  g=g||{id:"",title:"",description:"",category:"Pessoal",start:START,end:END,strategy:"",milestones:[]};
  openModal(`<div class="modal-head"><h3>${g.id?"Editar meta":"Nova meta"}</h3><button class="icon-btn" onclick="closeModal()">×</button></div>
  <div class="form-grid"><div class="field full"><label>Meta</label><input id="gTitle" value="${escapeHTML(g.title)}"></div><div class="field full"><label>Descrição</label><textarea id="gDesc">${escapeHTML(g.description||"")}</textarea></div><div class="field"><label>Categoria</label><select id="gCat">${state.categories.map(c=>`<option ${c===g.category?"selected":""}>${escapeHTML(c)}</option>`).join("")}</select></div><div class="field"><label>Data limite</label><input id="gEnd" type="date" min="${START}" max="${END}" value="${g.end}"></div><div class="field full"><label>Minha estratégia / sistema</label><textarea id="gStrategy" placeholder="Como você pretende executar essa meta no dia a dia?">${escapeHTML(g.strategy||"")}</textarea></div></div>
  <div class="section-head"><h2>Hábitos vinculados</h2><span>Você poderá vincular depois</span></div>
  <div class="small">Após salvar, edite os hábitos e escolha esta meta no campo “Meta vinculada”.</div>
  <div class="section-head"><h2>Marcos</h2><button class="btn" onclick="addMilestoneTemp()">+ Marco</button></div>
  <div id="tempMilestones">${(g.milestones||[]).map(m=>`<div class="milestone"><span style="flex:1">${escapeHTML(m.title)}</span><button onclick="this.parentElement.remove()">×</button><input type="hidden" class="tempM" value="${escapeHTML(m.title)}"></div>`).join("")}</div>
  <div class="modal-actions"><button class="btn" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="saveGoal('${g.id}')">Salvar meta</button></div>`);
}
function addMilestoneTemp(){
  const wrap=document.getElementById("tempMilestones"), title=prompt("Nome do marco:");
  if(!title?.trim())return;
  const row=document.createElement("div");row.className="milestone";row.innerHTML=`<span style="flex:1">${escapeHTML(title.trim())}</span><button onclick="this.parentElement.remove()">×</button><input type="hidden" class="tempM" value="${escapeHTML(title.trim())}">`;wrap.appendChild(row);
}
function saveGoal(id){
  const end=document.getElementById("gEnd").value;
  if(!inRange(end))return toast("A data da meta deve estar entre 08/09/2026 e 31/12/2026","error");
  const data={title:document.getElementById("gTitle").value.trim(),description:document.getElementById("gDesc").value.trim(),category:document.getElementById("gCat").value,start:START,end,strategy:document.getElementById("gStrategy").value.trim()};
  if(!data.title)return toast("Informe o nome da meta","error");
  const titles=[...document.querySelectorAll(".tempM")].map(x=>x.value).filter(Boolean);
  data.milestones=titles.map((t,i)=>({id:(id&&state.goals.find(g=>g.id===id)?.milestones?.[i]?.id)||uid("m"),title:t,done:(id&&state.goals.find(g=>g.id===id)?.milestones?.[i]?.done)||false}));
  if(id){Object.assign(state.goals.find(g=>g.id===id),data);toast("Meta atualizada","success")}
  else{state.goals.push({...data,id:uid("g")});toast("Meta criada","success")}
  save();closeModal();render();
}
function toast(message,type=""){
  const el=document.createElement("div");el.className=`toast ${type}`;el.textContent=message;document.getElementById("toastStack").appendChild(el);setTimeout(()=>el.remove(),2800);
}
document.getElementById("modalBackdrop").addEventListener("click",e=>{if(e.target.id==="modalBackdrop")closeModal()});
document.getElementById("quickAdd").onclick=()=>habitModal();
document.getElementById("mobileMenu").onclick=()=>document.getElementById("sidebar").classList.toggle("open");

if(!state.xpTransactions.length && Object.values(state.completions).filter(Boolean).length===0){
  // Começa zerado para o usuário experimentar a gamificação.
}
render();
