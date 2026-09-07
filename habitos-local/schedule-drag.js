(() => {
  const KEY='habitos_schedule_v1';
  let drag=null, suppress=0;
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY))||[]}catch{return[]}};
  const write=v=>localStorage.setItem(KEY,JSON.stringify(v));
  const pad=n=>String(n).padStart(2,'0');
  const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const parse=s=>{const [y,m,d]=String(s).split('-').map(Number);return new Date(y,m-1,d)};
  const min=t=>{const [h,m]=String(t||'00:00').split(':').map(Number);return h*60+m};
  const fmt=m=>{m=Math.max(0,Math.min(1439,Math.round(m/15)*15));return `${pad(Math.floor(m/60))}:${pad(m%60)}`};
  const dayAt=x=>[...document.querySelectorAll('.nc-day')].find(d=>{const r=d.getBoundingClientRect();return x>=r.left&&x<=r.right});
  function startHour(){const label=document.querySelector('.nc-time');return label?parseInt(label.textContent,10)||5:5}
  function dateOf(day){return day?.dataset.date||null}
  function refresh(){document.querySelector('[data-page="schedule"]')?.click()}
  function moveSeries(ev,newDate,newStart){
    const list=read(), sid=ev.seriesId;
    if(!sid){const i=list.findIndex(x=>x.id===ev.id);if(i>=0){const dur=Math.max(15,min(ev.end)-min(ev.start));list[i]={...list[i],date:newDate,start:newStart,end:fmt(min(newStart)+dur)};write(list);refresh()}return}
    const dayDelta=Math.round((parse(newDate)-parse(ev.date))/86400000), timeDelta=min(newStart)-min(ev.start);
    const out=list.map(x=>{
      if(x.seriesId!==sid)return x;
      const d=parse(x.date);d.setDate(d.getDate()+dayDelta);
      const duration=Math.max(15,min(x.end)-min(x.start));
      return {...x,date:iso(d),start:fmt(min(x.start)+timeDelta),end:fmt(min(x.start)+timeDelta+duration)};
    });
    const master=out.find(x=>x.seriesId===sid&&x.isSeriesMaster);
    if(master&&master.recurrence?.type==='weekly'&&master.recurrence.daysOfWeek?.length)master.recurrence={...master.recurrence,daysOfWeek:[parse(master.date).getDay()]};
    write(out);refresh();
  }
  function ghostFor(node){const g=node.cloneNode(true);g.classList.add('nc-drag-ghost');g.style.position='fixed';g.style.pointerEvents='none';g.style.zIndex='9999';g.style.width=`${node.getBoundingClientRect().width}px`;document.body.appendChild(g);return g}
  function update(e){
    if(!drag)return;
    const day=dayAt(e.clientX),body=day?.querySelector('.nc-day-body');
    if(!body)return;
    const r=body.getBoundingClientRect();
    const sh=startHour(), duration=Math.max(15,min(drag.event.end)-min(drag.event.start));
    let top=e.clientY-r.top-drag.grabOffset;
    let minutes=sh*60+(top/72)*60;
    minutes=Math.max(sh*60,Math.min(23*60+59-duration,minutes));
    drag.previewDate=dateOf(day);drag.previewStart=fmt(minutes);
    drag.ghost.style.left=`${e.clientX-drag.offsetX}px`;drag.ghost.style.top=`${e.clientY-drag.offsetY}px`;
  }
  document.addEventListener('pointerdown',e=>{
    const node=e.target.closest('.nc-event');if(!node||e.button!==0||node.dataset.eventId==null)return;
    const ev=read().find(x=>x.id===node.dataset.eventId);if(!ev)return;
    const nr=node.getBoundingClientRect();drag={node,event:ev,originX:e.clientX,originY:e.clientY,offsetX:e.clientX-nr.left,offsetY:e.clientY-nr.top,grabOffset:e.clientY-nr.top,moved:false,ghost:null};node.setPointerCapture?.(e.pointerId);
  },true);
  document.addEventListener('pointermove',e=>{
    if(!drag)return;
    if(!drag.moved&&Math.hypot(e.clientX-drag.originX,e.clientY-drag.originY)<5)return;
    if(!drag.moved){drag.moved=true;drag.ghost=ghostFor(drag.node);drag.node.classList.add('is-dragging');}
    update(e);e.preventDefault();
  },true);
  document.addEventListener('pointerup',e=>{
    if(!drag)return;
    if(drag.moved){update(e);const d=drag.previewDate,s=drag.previewStart;if(d&&s&&(d!==drag.event.date||s!==drag.event.start))moveSeries(drag.event,d,s);drag.ghost?.remove();drag.node.classList.remove('is-dragging');suppress=Date.now()+500;}
    drag=null;
  },true);
  document.addEventListener('pointercancel',()=>{drag?.ghost?.remove();drag?.node?.classList.remove('is-dragging');drag=null},true);
  document.addEventListener('click',e=>{if(Date.now()<suppress){e.preventDefault();e.stopImmediatePropagation()}},true);
})();
