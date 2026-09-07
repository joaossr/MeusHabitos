(() => {
  const START=5, END=23, H=72;
  const SIGNATURE=`${START}-${END}`;

  function fix(){
    document.querySelectorAll('.nc-calendar').forEach(cal=>{
      const cols=[...cal.querySelectorAll(':scope > .nc-time-col')];
      if(!cols.length)return;
      const timeCol=cols[0];
      cols.slice(1).forEach(col=>col.remove());

      const labels=Array.from({length:END-START+1},(_,i)=>`${String(START+i).padStart(2,'0')}:00`);
      const current=[...timeCol.querySelectorAll(':scope > .nc-time')].map(el=>el.textContent.trim());
      if(timeCol.dataset.timeGridSignature!==SIGNATURE||current.length!==labels.length||current.some((v,i)=>v!==labels[i])){
        timeCol.replaceChildren(...labels.map(label=>{const row=document.createElement('div');row.className='nc-time';row.textContent=label;return row;}));
        timeCol.dataset.timeGridSignature=SIGNATURE;
      }

      const height=(END-START+1)*H;
      timeCol.style.height=`${height}px`;
      timeCol.style.minHeight=`${height}px`;
      cal.querySelectorAll('.nc-day-body').forEach(body=>{body.style.height=`${height}px`;body.style.minHeight=`${height}px`;});
      cal.querySelectorAll('.nc-day').forEach(day=>{day.style.minHeight=`${height}px`;});

      cal.querySelectorAll('.nc-event').forEach(ev=>{
        const text=ev.querySelector('span')?.textContent||'';
        const m=text.match(/(\d{2}):(\d{2})/);
        if(!m)return;
        const minutes=Number(m[1])*60+Number(m[2]);
        ev.style.top=`${Math.max(0,(minutes-START*60)/60*H)}px`;
      });
    });
  }

  function schedule(){setTimeout(fix,0);}

  function start(){
    fix();
    window.addEventListener('click',e=>{
      if(e.target.closest('[data-page="schedule"],#ncPrev,#ncNext,#ncToday'))schedule();
    },true);
    window.addEventListener('resize',schedule);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
