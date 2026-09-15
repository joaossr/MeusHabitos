/* Dashboard: apresentação da home, interações visuais e atalhos. A lógica de dados continua em app.js. */
(function(){
  const phrases=[
    ['“A consistência','transforma o ordinário','em extraordinário.”'],
    ['“Pequenas ações diárias','levam a grandes resultados.”'],
    ['“Disciplina hoje,','resultados amanhã.”'],
    ['“Não precisa ser perfeito.','Precisa continuar.”']
  ];
  let phraseIndex=0, timer;
  const iconMap={"Exercício":"🏋️","Estudar":"📚","Inglês":"🇺🇸","Leitura":"📖","Violão":"🎸"};
  function dashboardToday(){
    const li=levelInfo(), habits=todayHabits(), done=completedToday(), pct=habits.length?Math.round(done/habits.length*100):0;
    const daily=state.xpTransactions.filter(x=>x.date===todayISO()).reduce((a,x)=>a+x.xp,0);
    const daysLeft=Math.max(0,daysBetween(todayISO(),END));
    const now=new Date();
    const greeting=now.getHours()<12?'Bom dia':now.getHours()<18?'Boa tarde':'Boa noite';
    const dateLabel=now.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'long',year:'numeric'}).replace(/^./,c=>c.toUpperCase());
    const rows=habits.map(h=>{const d=isDone(h.id,todayISO());return `<div class="ref-habit"><button class="ref-check ${d?'done':''}" data-dashboard-toggle="${h.id}" aria-label="${d?'Desmarcar':'Concluir'} ${escapeHTML(h.name)}">${d?'✓':''}</button><div class="ref-hicon">${escapeHTML(h.icon||iconMap[h.name]||'✓')}</div><div class="ref-hbody"><div class="ref-hname">${escapeHTML(h.name)}</div><div class="ref-hmeta">${escapeHTML(h.category)} · ${freqLabel(h)}</div></div><div class="ref-hstreak">🔥 ${habitStreak(h)}</div><div class="ref-hxp">+${h.xp} XP</div></div>`}).join('');
    const week=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
    const base=parseDate(todayISO()); base.setDate(base.getDate()-((base.getDay()+6)%7));
    const weekDays=week.map((_,i)=>{const d=new Date(base);d.setDate(base.getDate()+i);const iso=dateISO(d);return {label:week[i],day:d.getDate(),today:iso===todayISO()};});
    return `<div class="ref-dashboard">
      <div class="ref-top-grid">
        <section class="ref-card ref-hero"><div class="ref-hero-content"><div class="ref-eyebrow">Disciplina todos os dias</div><h2>Seu dia, um passo<br>de cada vez.</h2><p>Conclua o que importa hoje. Cada hábito alimenta seu progresso e mantém sua sequência viva.</p><button class="ref-primary" data-dashboard-continue>Continuar hoje <span>→</span></button></div><div class="ref-quote" aria-live="polite">${phrases[phraseIndex].map(x=>`<span>${x}</span>`).join('')}</div></section>
        <section class="ref-card ref-period"><div class="ref-period-head"><div class="ref-fire">🔥</div><div><strong>${daysLeft}</strong><small>dias restantes até 31/12/2026</small></div></div><div class="ref-week">${weekDays.map(x=>`<span>${x.label}</span>`).join('')}${weekDays.map(x=>`<div class="ref-day ${x.today?'active':''}">${x.day}</div>`).join('')}</div><div class="ref-period-quote">“Hoje é uma nova chance<br>de ser 1% melhor.”</div></section>
      </div>
      <div class="ref-stats">
        <section class="ref-card ref-stat"><div class="ref-stat-title"><span class="ref-stat-icon">🎯</span>Seu progresso</div><div class="ref-stat-main"><strong>Nível ${li.level}</strong><span>${Math.max(0,li.xp-li.prev)} / ${li.next-li.prev} XP</span></div><div class="ref-progress"><i style="width:${li.pct}%"></i></div><div class="ref-stat-foot"><span>⭐ <b>${li.xp}</b> XP totais</span><span>🔥 <b>${overallStreak()}</b> dias de streak geral</span></div></section>
        <section class="ref-card ref-stat"><div class="ref-stat-title"><span class="ref-stat-icon">▥</span>XP de hoje <span class="ref-inline-value">${daily} / ${state.user.dailyXP}</span></div><div class="ref-progress"><i style="width:${Math.min(100,daily/state.user.dailyXP*100)}%"></i></div><div class="ref-xp-msg"><span class="rocket">🚀</span><div><b>Você está indo bem!</b><span>Complete mais hábitos e ganhe XP.</span></div></div></section>
        <section class="ref-card ref-stat ref-habits-stat"><div class="ref-stat-title"><span class="ref-stat-icon ref-green-icon">✓</span>Hábitos de hoje</div><div class="ref-donut-wrap"><div class="ref-donut" style="--p:${pct}"><strong>${pct}%</strong></div><div class="ref-donut-legend"><span><i class="dot done-dot"></i><b>${done}</b> concluído</span><span><i class="dot progress-dot"></i><b>0</b> em andamento</span><span><i class="dot pending-dot"></i><b>${Math.max(0,habits.length-done)}</b> pendentes</span><small>${done} de ${habits.length} concluídos</small></div></div></section>
      </div>
      <div class="ref-main-grid">
        <section class="ref-card ref-habits"><div class="ref-section-title"><h3>Hábitos de hoje</h3><select class="ref-select"><option>Todos os dias⌄</option></select></div>${rows||'<div class="ref-empty">Nenhum hábito programado hoje.</div>'}</section>
        <aside class="ref-side">
          <section class="ref-card ref-side-card"><div class="ref-side-title"><h3>🏆 Conquistas recentes</h3><button type="button" class="ref-link" data-dashboard-page="achievements">Ver todas →</button></div><div class="ref-achievement"><div class="ref-badge">🔥</div><div><b>7 dias de sequência</b><span>Você manteve o foco por 7 dias seguidos!</span><time>10/09/2026</time></div></div></section>
          <section class="ref-card ref-side-card"><div class="ref-side-title"><h3>🚩 Sua próxima meta</h3><button type="button" class="ref-link" data-dashboard-page="goals">Ver metas →</button></div><div class="ref-goal-row"><div class="ref-flag">🚩</div><div><b>Atingir Nível 3</b><span>Próximo nível de progresso</span></div><div class="ref-goal-value">${li.xp} / 300 XP</div></div><div class="ref-progress" style="margin-top:15px"><i style="width:${Math.min(100,li.xp/300*100)}%"></i></div></section>
          <section class="ref-motivational"><h3>Grandes resultados<br>são construídos com<br>pequenas ações diárias.</h3></section>
        </aside>
      </div>
    </div>`;
  }
  function goPage(page){document.querySelector(`.nav-item[data-page="${page}"]`)?.click();}
  function bind(){
    document.querySelectorAll('[data-dashboard-toggle]').forEach(b=>b.addEventListener('click',()=>setDone(b.dataset.dashboardToggle,todayISO(),!isDone(b.dataset.dashboardToggle,todayISO()))));
    document.querySelector('[data-dashboard-continue]')?.addEventListener('click',()=>document.querySelector('.ref-habits')?.scrollIntoView({behavior:'smooth',block:'center'}));
    document.querySelectorAll('[data-dashboard-page]').forEach(b=>b.addEventListener('click',()=>goPage(b.dataset.dashboardPage)));
    clearInterval(timer);timer=setInterval(()=>{phraseIndex=(phraseIndex+1)%phrases.length;const q=document.querySelector('.ref-quote');if(q){q.classList.add('changing');setTimeout(()=>{q.innerHTML=phrases[phraseIndex].map(x=>`<span>${x}</span>`).join('');q.classList.remove('changing')},250)}},5000);
  }
  function install(){
    if(window.__dashboardRefInstalled)return;
    window.__dashboardRefInstalled=true;
    window.renderToday=dashboardToday;
    const originalAction=window.action;
    window.action=function(type,id,goalId){if(type==='continue-today'){document.querySelector('.ref-habits')?.scrollIntoView({behavior:'smooth',block:'center'});return}return originalAction?.apply(this,arguments)};
    window.addEventListener('click',e=>{
      if(e.target.closest('#refSearch')){goPage('habits');setTimeout(()=>document.getElementById('habitSearch')?.focus(),150)}
      if(e.target.closest('#refNotifications')){toast('🔔 Você não tem novas notificações.','success')}
      if(e.target.closest('#refDate'))goPage('calendar');
      if(e.target.closest('#desktopSidebarToggle')){document.getElementById('appShell')?.classList.toggle('ref-sidebar-collapsed');document.body.classList.toggle('ref-sidebar-collapsed');}
    });
    if(window.render)window.render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0));else setTimeout(install,0);
})();
