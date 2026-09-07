(()=>{
  const KEY='habitos_app_v1', SHOP_KEY='habitos_shop_v1';
  const items=[
    {id:'r1',cost:100,icon:'🛋️',title:'Tempo livre sem culpa',desc:'Reserve um período para descansar e fazer algo que você gosta.'},
    {id:'r2',cost:200,icon:'🫐',title:'Açaí pequeno',desc:'Uma recompensa rápida para comemorar uma sequência.'},
    {id:'r3',cost:350,icon:'🍔',title:'Lanche no final de semana',desc:'Hambúrguer, pastel ou outro lanche que você curta.'},
    {id:'r4',cost:500,icon:'🎉',title:'Sair para fazer algo',desc:'Um passeio ou programa especial no final de semana.'},
    {id:'r5',cost:750,icon:'🛍️',title:'Comprar algo de até R$30',desc:'Use seus créditos para liberar uma compra pequena.'},
    {id:'r6',cost:1000,icon:'💰',title:'Saída especial',desc:'Uma recompensa maior para uma semana muito boa.'},
    {id:'r7',cost:1500,icon:'🎬',title:'Cinema / filme',desc:'Uma sessão de cinema ou uma noite especial de filme.'},
    {id:'r8',cost:2500,icon:'🎮',title:'Recompensa premium',desc:'Escolha algo especial que você realmente queira fazer.'}
  ];
  const getState=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{xpTransactions:[]}}catch(e){return {xpTransactions:[]}}};
  const getShop=()=>{try{return JSON.parse(localStorage.getItem(SHOP_KEY))||{purchases:[]}}catch(e){return {purchases:[]}}};
  const xp=()=>Math.max(0,getState().xpTransactions.reduce((a,x)=>a+(Number(x.xp)||0),0));
  function addNav(){
    const nav=document.querySelector('.nav'); if(!nav||nav.querySelector('[data-page="shop"]'))return;
    const b=document.createElement('button'); b.className='nav-item'; b.dataset.page='shop'; b.innerHTML='<span>🛍</span> Loja'; nav.appendChild(b);
  }
  function open(){
    addNav();
    const content=document.getElementById('content'), title=document.getElementById('pageTitle'); if(!content)return;
    title.textContent='Loja';
    document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.page==='shop'));
    const shop=getShop(); const owned=new Set(shop.purchases.map(p=>p.itemId)); const balance=xp();
    content.innerHTML=`<div class="shop-page">
      <div class="shop-hero"><div><div class="eyebrow">Recompense sua consistência</div><h2 style="margin:4px 0 6px">Loja de Recompensas</h2><div class="shop-note">Troque XP por recompensas reais. O XP gasto é descontado do seu saldo.</div></div><div class="shop-balance"><span>Saldo disponível</span><strong>🔥 ${balance} XP</strong></div></div>
      <div class="shop-grid">${items.map(i=>{const bought=owned.has(i.id);const can=balance>=i.cost;return `<article class="shop-card ${bought?'owned':''}"><div class="shop-art">${i.icon}</div><div class="shop-cost">🔥 ${i.cost} XP</div><h3>${i.title}</h3><p>${i.desc}</p><button class="btn primary shop-buy" data-buy="${i.id}" ${(!can||bought)?'disabled':''}>${bought?'✓ Resgatado':can?'Resgatar recompensa':'XP insuficiente'}</button></article>`}).join('')}</div>
      <div class="card shop-history"><div class="section-head"><h2>Recompensas resgatadas</h2><span>${shop.purchases.length}</span></div>${shop.purchases.length?shop.purchases.slice().reverse().map(p=>`<div class="shop-history-row"><span>${p.icon} ${p.title}</span><strong>-${p.cost} XP</strong></div>`).join(''):'<div class="shop-empty">Você ainda não resgatou nenhuma recompensa.</div>'}</div>
    </div>`;
    content.querySelectorAll('[data-buy]').forEach(b=>b.addEventListener('click',()=>buy(b.dataset.buy)));
  }
  function buy(id){
    const item=items.find(x=>x.id===id); if(!item)return;
    const balance=xp(), shop=getShop(); if(balance<item.cost||shop.purchases.some(p=>p.itemId===id))return;
    const state=getState(); state.xpTransactions=state.xpTransactions||[];
    state.xpTransactions.push({id:'shop_'+Date.now(),date:new Date().toISOString().slice(0,10),xp:-item.cost,reason:'Recompensa: '+item.title});
    shop.purchases.push({itemId:item.id,title:item.title,icon:item.icon,cost:item.cost,date:new Date().toISOString()});
    localStorage.setItem(KEY,JSON.stringify(state)); localStorage.setItem(SHOP_KEY,JSON.stringify(shop));
    if(typeof window.render==='function')window.render();
    open();
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-page="shop"]'); if(b){e.preventDefault();e.stopPropagation();open();}
  },true);
  addNav();
  window.openShop=open;
})();