(() => {
  const KEY='habitos_schedule_v1';
  const DAY_MS=86400000;
  let drag=null;
  let suppressClickUntil=0;
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY))||[]}catch{return[]}};
  const write=v=>localStorage.setItem(KEY,JSON.stringify(v));
  const pad=n=>String(n).padStart(2,'0');
  const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const parse=s=>{const [y,m,d]=String(s).split('-').map(Number);return new Date(y,m-1,d)};
  const min=t=>{const [h,m]=String(t||'00:00').split(':').map(Number);return h*60+m};
  const time=m=>{m=Math.max(0,Math.min(23*60+59,Math.round(m/15)*15));return `${pad(Math.floor(m/60))}:${pad(m%60)}`};
  const diffDays=(a,b)=>Math.round((parse(b)-parse(a))/DAY_MS);
  function dayAt(x){const days=[...document.querySelectorAll('.nc-day')];let best=null;for(const el of days){const r=el.getBoundingClientRect();if(x>=r.left&&x<=r.right){best=el;break}}return best}
  function dateForDay(el){if(!el)return null;return el.dataset.date||el.closest('[data-date]')?.dataset.date||null}
  function moveEvent(id,newDate,newStart){
    const list=read(), idx=list.findIndex(e=>e.id===id);if(idx<0)return;
    const e=list[idx], duration=Math.max(15,min(e.end)-min(e.start));
    const updated={...e,date:newDate,start:newStart,end:time(min(newStart)+duration)};
    list[idx]=updated;
    if(e.recurrence?.type&&e.recurrence.type!=='none'){
      // Arrastar uma ocorrência recorrente reposiciona a série inteira pelo deslocamento aplicado.
      const delta=diffDays(e.date,newDate), oldStart=min(e.start), newM=min(newStart), timeDelta=newM-oldStart;
      const sid=e.seriesId;
      if(sid){
        for(let i=0;i<list.length;i++)if(list[i].seriesId===sid){
          const x=list[i],d=parse(x.date);d.setDate(d.getDate()+delta);list[i]={...x,date:iso(d),start:time(min(x.start)+timeDelta),end:time(min(x.start)+timeDelta+Math.max(15,min(x.end)-min(x.start)))};
        }
        // Mantém a regra semanal alinhada ao novo dia quando houver dias específicos.
        const master=list.find(x=>x.seriesId===sid&&x.isSeriesMaster);
        if(master?.recurrence?.daysOfWeek?.length){const day=parse(master.date).getDay();master.recurrence={...master.recurrence,daysOfWeek:[day]};}
      }
    }
    write(list);
    const b=document.querySelector('[data-page="schedule"]');if(b)b.click();
  }
  function finish(clientX,clientY){
    if(!drag)return;
    const target=dayAt(clientX);const date=dateForDay(target);if(!date){drag.node?.classList.remove('is-dragging');drag=null;return}
    const body=target.querySelector('.nc-day-body');const r=body?.getBoundingClientRect();if(!r){drag.node?.classList.remove('is-dragging');drag=null;return}
    const startHour=6, hourHeight=72;let minutes=startHour*60+((clientY-r.top)/hourHeight)*60;minutes=Math.round(minutes/15)*15;
    const ev=drag.event;const duration=Math.max(15,min(ev.end)-min(ev.start));minutes=Math.max(startHour*60,Math.min(23*60+59-duration,minutes));
    const newStart=time(minutes);const changed=date!==ev.date||newStart!==ev.start;
    drag.node?.classList.remove('is-dragging');
    if(changed)moveEvent(ev.id,date,newStart);
    suppressClickUntil=Date.now()+350;drag=null;
  }
  document.addEventListener('pointerdown',e=>{
    const node=e.target.closest('.nc-event');if(!node||e.button!==0)return;
    const id=node.dataset.eventId;if(!id)return;const ev=read().find(x=>x.id===id);if(!ev)return;
    drag={node,event:ev,x:e.clientX,y:e.clientY,moved:false};node.setPointerCapture?.(e.pointerId);
  },true);
  document.addEventListener('pointermove',e=>{
    if(!drag)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<7)return;
    drag.moved=true;drag.node.classList.add('is-dragging');e.preventDefault();
  },true);
  document.addEventListener('pointerup',e=>{if(!drag)return;if(drag.moved)finish(e.clientX,e.clientY);else drag=null},true);
  document.addEventListener('click',e=>{if(Date.now()<suppressClickUntil){e.preventDefault();e.stopImmediatePropagation()}},true);
})();
