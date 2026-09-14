/* Permite corrigir conclusoes de dias anteriores diretamente no calendario. */
(function(){
  function isoForCalendarDay(cell){
    const calendar=cell.closest('.calendar');
    if(!calendar) return null;
    const cells=[...calendar.querySelectorAll('.cal-day')];
    const index=cells.indexOf(cell);
    if(index<0) return null;
    const base=parseDate(todayISO());
    const first=new Date(base.getFullYear(),base.getMonth(),1);
    const day=index-first.getDay()+1;
    if(day<1 || day>new Date(base.getFullYear(),base.getMonth()+1,0).getDate()) return null;
    return dateISO(new Date(base.getFullYear(),base.getMonth(),day));
  }

  function openHistory(iso){
    const habits=state.habits.filter(h=>!h.archived && isScheduled(h,iso));
    const done=habits.filter(h=>isDone(h.id,iso)).length;
    openModal(`<div class="modal-head"><div><div class="eyebrow">Ajuste do historico</div><h3>${formatDate(iso)}</h3></div><button class="icon-btn" data-history-close>×</button></div><p class="calendar-modal-note">Marque os habitos que voce realmente fez nesse dia. Isso funciona mesmo depois que o dia passou.</p><div class="date-editor-summary"><strong>${done}/${habits.length}</strong><span>habitos concluidos</span></div><div class="date-habit-list">${habits.length?habits.map(h=>`<label class="date-habit ${isDone(h.id,iso)?'checked':''}"><input type="checkbox" class="date-habit-check" data-habit-id="${h.id}" ${isDone(h.id,iso)?'checked':''}><span class="date-habit-icon">${escapeHTML(h.icon||'✓')}</span><span class="date-habit-main"><strong>${escapeHTML(h.name)}</strong><small>${escapeHTML(h.category)} · +${h.xp} XP</small></span><span class="date-habit-xp">+${h.xp}</span></label>`).join(''):`<div class="empty"><strong>Nenhum habito programado.</strong>Esse dia nao possui habitos ativos pela programacao.</div>`}</div><div class="modal-actions"><button class="btn" data-history-close>Cancelar</button>${habits.length?'<button class="btn primary" data-history-save>Salvar alteracoes</button>':''}</div>`);
    document.querySelectorAll('[data-history-close]').forEach(b=>b.onclick=closeModal);
    document.querySelectorAll('.date-habit-check').forEach(input=>input.onchange=()=>input.closest('.date-habit').classList.toggle('checked',input.checked));
    document.querySelector('[data-history-save]')?.addEventListener('click',()=>{
      const changes=[];
      document.querySelectorAll('.date-habit-check').forEach(input=>{
        const hid=input.dataset.habitId;
        if(isDone(hid,iso)!==input.checked) changes.push({hid,done:input.checked});
      });
      changes.forEach(({hid,done})=>{
        const h=state.habits.find(x=>x.id===hid);
        if(!h) return;
        const key=`${hid}_${iso}`;
        if(done && !state.completions[key]){
          state.completions[key]={at:new Date().toISOString(),xp:h.xp};
          state.xpTransactions.push({id:uid('xp'),date:iso,xp:h.xp,reason:`Hábito: ${h.name}`});
        }else if(!done && state.completions[key]){
          state.completions[key]=null;
          state.xpTransactions.push({id:uid('xp'),date:iso,xp:-h.xp,reason:`Desfazer: ${h.name}`});
        }
      });
      save();
      closeModal();
      render();
      toast(changes.length?`Historico de ${formatDate(iso)} atualizado`:'Nenhuma alteracao feita','success');
    });
  }

  document.addEventListener('click',e=>{
    const cell=e.target.closest('.cal-day');
    if(!cell || cell.classList.contains('out')) return;
    const iso=isoForCalendarDay(cell);
    if(!iso) return;
    e.preventDefault();
    openHistory(iso);
  },true);
})();
