/* Renderização do Dashboard seguindo a referência visual enviada. Mantém a lógica existente de hábitos/XP. */
(function(){
  const icons={"Exercício":"🏋️","Estudar":"📚","Inglês":"🇺🇸","Leitura":"📖","Violão":"🎸"};
  function refToday(){
    const li=levelInfo(), habits=todayHabits(), done=completedToday(), pct=habits.length?Math.round(done/habits.length*100):0;
    const daily=state.xpTransactions.filter(x=>x.date===todayISO()).reduce((a,x)=>a+x.xp,0);
    const daysLeft=Math.max(0,daysBetween(todayISO(),END));
    const now=new Date();
    const dateText=now.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'});
    const rows=habits.map(h=>{const d=isDone(h.id,todayISO());return `<div class="ref-habit"><button class="ref-check ${d?'done':''}" data-action="toggle-habit" data-id="${h.id}">${d?'✓':''}</button><div class="ref-hicon">${escapeHTML(h.icon||icons[h.name]||'✓')}</div><div class="ref-hbody"><div class="ref-hname">${escapeHTML(h.name)}</div><div class="ref-hmeta">${escapeHTML(h.category)} · ${freqLabel(h)}</div></div><div class="ref-hstreak">🔥 ${habitStreak(h)}</div><div class="ref-hxp">+${h.xp} XP</div></div>`}).join('');
    const calendarDays=[14,15,16,17,18,19,20];
    return `<div class="ref-dashboard">
      <div class="ref-top-grid">
        <section class="ref-card ref-hero"><div class="ref-hero-content"><div class="ref-eyebrow">Disciplina todos os dias</div><h2>Seu dia, um passo<br>de cada vez.</h2><p>Conclua o que importa hoje. Cada hábito alimenta seu progresso e mantém sua sequência viva.</p><button class="btn" data-action="continue-today">Continuar hoje →</button></div><div class="ref-quote">“A consistência<br>transforma o ordinário<br>em extraordinário.”</div></section>
        <section class="ref-card ref-period"><div class="ref-period-head"><div class="ref-fire">🔥</div><div><strong>${daysLeft}</strong><small>dias restantes até 31/12/2026</small></div></div><div class="ref-week">${['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map((x,i)=>`<span>${x}</span>`).join('')}${calendarDays.map((d,i)=>`<div class="ref-day ${i===0?'active':''}">${d}</div>`).join('')}</div><div class="ref-period-quote">“Hoje é uma nova chance<br>de ser 1% melhor.”</div></section>
      </div>
      <div class="ref-stats">
        <section class="ref-card ref-stat"><div class="ref-stat-title"><span class="ref-stat-icon">🎯</span>Seu progresso</div><div class="ref-stat-main"><strong>Nível ${li.level}</strong><span>${Math.max(0,li.xp-li.prev)} / ${li.next-li.prev} XP</span></div><div class="ref-progress"><i style="width:${li.pct}%"></i></div><div class="ref-stat-foot"><span>⭐ <b>${li.xp}</b> XP totais</span><span>🔥 <b>${overallStreak()}</b> dias de streak geral</span></div></section>
        <section class="ref-card ref-stat"><div class="ref-stat-title"><span class="ref-stat-icon">▥</span>XP de hoje <span style="margin-left:auto;color:#A4B1C5;font-size:12px;font-weight:400">${daily} / ${state.user.dailyXP}</span></div><div class="ref-stat-main"><strong>${daily} XP</strong><span>meta diária</span></div><div class="ref-progress"><i style="width:${Math.min(100,daily/state.user.dailyXP*100)}%"></i></div><div class="ref-xp-msg"><span class="rocket">🚀</span><div><b>Você está indo bem!</b><span>Complete mais hábitos e ganhe XP.</span></div></div></section>
        <section class="ref-card ref-stat"><div class="ref-stat-title"><span class="ref-stat-icon">✓</span>Hábitos de hoje</div><div class="ref-stat-main"><strong>${pct}%</strong><span>${done} de ${habits.length}</span></div><div class="ref-progress"><i style="width:${pct}%;background:linear-gradient(90deg,#38D98A,#38BDF8)"></i></div><div class="ref-stat-foot"><span>🟢 <b>${done}</b> concluído(s)</span><span>⚪ <b>${Math.max(0,habits.length-done)}</b> pendente(s)</span></div></section>
      </div>
      <div class="ref-main-grid">
        <section class="ref-card ref-habits"><div class="ref-section-title"><h3>Hábitos de hoje</h3><select class="ref-select"><option>Todos os dias⌄</option></select></div>${rows||'<div class="ref-empty">Nenhum hábito programado hoje.</div>'}</section>
        <aside class="ref-side">
          <section class="ref-card ref-side-card"><div class="ref-side-title"><h3>🏆 Conquistas recentes</h3><a>Ver todas →</a></div><div class="ref-achievement"><div class="ref-badge">🔥</div><div><b>7 dias de sequência</b><span>Você manteve o foco por 7 dias seguidos!</span><time>10/09/2026</time></div></div></section>
          <section class="ref-card ref-side-card"><div class="ref-side-title"><h3>🚩 Sua próxima meta</h3><a>Ver metas →</a></div><div class="ref-goal-row"><div class="ref-flag">🚩</div><div><b>Atingir Nível 3</b><span>Próximo nível de progresso</span></div><div class="ref-goal-value">${li.xp} / 300 XP</div></div><div class="ref-progress" style="margin-top:15px"><i style="width:${Math.min(100,li.xp/300*100)}%"></i></div></section>
          <section class="ref-motivational"><h3>Grandes resultados<br>são construídos com<br>pequenas ações diárias.</h3></section>
        </aside>
      </div>
    </div>`;
  }
  window.renderToday=refToday;
  const originalAction=window.action;
  window.action=function(type,id,goalId){
    if(type==='continue-today'){document.querySelector('.ref-habits')?.scrollIntoView({behavior:'smooth',block:'center'});return;}
    return originalAction.apply(this,arguments);
  };
  window.addEventListener('load',function(){if(window.render)window.render();});
})();
