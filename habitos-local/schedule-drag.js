(() => {
  const KEY='habitos_schedule_v1', START_HOUR=5, HOUR_HEIGHT=72, DAY_MS=86400000;
  let drag=null, suppressClickUntil=0;
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY))||[]}catch{return[]}};
  const write=v=>localStorage.setItem(KEY,JSON.stringify(v));
  const pad=n=>String(n).padStart(2,'0');
  const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const parse=s=>{const[y,m,d]=String(s).split('-').map(Number);return new Date(y,m-1,d)};
  const min=t=>{const[h,m]=String(t||'00:00').split(':').map(Number);return h*60+m};
  const time=m=>{m=Math.max(START_HOUR*60,Math.min(23*60+59,Math.round(m/15)*15));return `${pad(Math.floor(m/60))}:${pad(m%60)}`};
  const diffDays=(a,b)=>Math.round((parse(b)-parse(a))/DAY_MS);
  function dayAt(x){return [...document.querySelectorAll('.nc-day')].find(el=>{const r=el.getBoundingClientRect();return x>=r.left&&x<=r.right})||null}
  function dateForDay(el){return el?.dataset.date||el?.closest('[data-date]')?.dataset.date||null}
  function moveEvent(id,newDate,newStart){
    const list=read(),e=list.find(x=>x.id===id);if(!e)return;
    const duration=Math.max(15,min(e.end)-min(e.start)), oldDate=e.date, oldStart=min(e.start), deltaDays=diffDays(oldDate,newDate), deltaMin=min(newStart)-oldStart;
    if(e.seriesId){
      list.forEach(x=>{if(x.seriesId!==e.seriesId)return;const d=parse(x.date);d.setDate(d.getDate()+deltaDays);x.date=iso(d);x.start=time(min(x.start)+deltaMin);x.end=time(min(x.end)+deltaMin);});
      const master=list.find(x=>x.seriesId===e.seriesId&&x.isSeriesMaster);if(master?.recurrence?.type==='weekly'&&master.recurrence.daysOfWeek?.length)master.recurrence={...master.recurrence,daysOfWeek:[parse(master.date).getDay()]};
    }else{e.date=newDate;e.start=newStart;e.end=time(min(newStart)+duration);}
    write(list);setTimeout(()=>document.querySelector('[data-page="schedule"]')?.click(),20);
  }
  function finish(x,y){
    if(!drag)return;const target=dayAt(x),date=dateForDay(target),body=target?.querySelector('.nc-day-body'),r=body?.getBoundingClientRect();
    if(!date||!r){drag.node?.classList.remove('is-dragging');drag=null;return;}
    let minutes=START_HOUR*60+((y-r.top)/HOUR_HEIGHT)*60;minutes=Math.round(minutes/15)*15;
    const duration=Math.max(15,min(drag.event.end)-min(drag.event.start));minutes=Math.max(START_HOUR*60,Math.min(23*60+59-duration,minutes));
    const start=time(minutes);drag.node?.classList.remove('is-dragging');if(date!==drag.event.date||start!==drag.event.start)moveEvent(drag.event.id,date,start);suppressClickUntil=Date.now()+400;drag=null;
  }
  document.addEventListener('pointerdown',e=>{const node=e.target.closest('.nc-event');if(!node||e.button!==0)return;const ev=read().find(x=>x.id===node.dataset.eventId);if(!ev)return;drag={node,event:ev,x:e.clientX,y:e.clientY,moved:false};node.setPointerCapture?.(e.pointerId)},true);
  document.addEventListener('pointermove',e=>{if(!drag)return;if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<5)return;drag.moved=true;drag.node.classList.add('is-dragging');e.preventDefault()},true);
  document.addEventListener('pointerup',e=>{if(!drag)return;if(drag.moved)finish(e.clientX,e.clientY);else drag=null},true);
  document.addEventListener('click',e=>{if(Date.now()<suppressClickUntil){e.preventDefault();e.stopImmediatePropagation()}},true);
})();
