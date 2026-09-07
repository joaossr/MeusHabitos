(() => {
  const START=5, END=23, H=72;
  function fix(){
    const cal=document.querySelector('.nc-calendar');if(!cal)return;
    const timeCol=cal.querySelector('.nc-time-col');
    if(timeCol){
      const sig=timeCol.dataset.timeGridSignature;
      if(sig!==`${START}-${END}`){timeCol.innerHTML=Array.from({length:END-START+1},(_,i)=>`<div class="nc-time">${String(START+i).padStart(2,'0')}:00</div>`).join('');timeCol.dataset.timeGridSignature=`${START}-${END}`;}
    }
    document.querySelectorAll('.nc-day-body').forEach(body=>{body.style.height=`${(END-START+1)*H}px`;body.style.minHeight=`${(END-START+1)*H}px`;});
    document.querySelectorAll('.nc-event').forEach(ev=>{const text=ev.querySelector('span')?.textContent||'';const m=text.match(/(\d{2}):(\d{2})/);if(!m)return;const minutes=Number(m[1])*60+Number(m[2]);ev.style.top=`${Math.max(0,(minutes-START*60)/60*H)}px`;});
  }
  const mo=new MutationObserver(()=>requestAnimationFrame(fix));
  function start(){fix();mo.observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
