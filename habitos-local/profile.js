(() => {
  if (!window.firebase || !firebase.apps.length) return;
  const auth = firebase.auth();
  const KEY = 'habitos_app_v1';
  const COLLAPSED_KEY = 'habitos_sidebar_collapsed';
  const $ = id => document.getElementById(id);

  function modernizeSidebar() {
    const sidebar = $('sidebar'); if (!sidebar) return;
    const schedule = sidebar.querySelector('[data-page="schedule"]'); schedule?.remove();
    const icons = {today:'nav-home',habits:'nav-check',goals:'nav-target',calendar:'nav-calendar',stats:'nav-chart',reports:'nav-report',achievements:'nav-trophy',missions:'nav-diamond',settings:'nav-settings'};
    sidebar.querySelectorAll('.nav-item[data-page]').forEach(btn => {
      const page = btn.dataset.page, label = btn.querySelector('.nav-label')?.textContent || btn.textContent.trim();
      if (!icons[page]) return;
      btn.innerHTML = `<span class="nav-icon ${icons[page]}" aria-hidden="true"></span><span class="nav-label">${label}</span>`;
    });
    const styleId='modern-sidebar-style';
    if (!$(styleId)) {
      const style=document.createElement('style'); style.id=styleId;
      style.textContent=`
        .nav-item[data-page="schedule"]{display:none!important}
        .nav-icon{width:18px;height:18px;display:inline-block;position:relative;flex:none;opacity:.82}
        .nav-item{gap:12px;min-height:44px}
        .nav-icon:before,.nav-icon:after{content:"";position:absolute;box-sizing:border-box}
        .nav-home:before{left:3px;top:4px;width:12px;height:11px;border:1.5px solid currentColor;border-radius:2px}.nav-home:after{left:7px;top:9px;width:4px;height:6px;border:1.5px solid currentColor;border-bottom:0;border-radius:2px}
        .nav-check:before{left:3px;top:5px;width:12px;height:7px;border-left:1.8px solid currentColor;border-bottom:1.8px solid currentColor;transform:rotate(-45deg)}
        .nav-target:before{inset:2px;border:1.5px solid currentColor;border-radius:50%}.nav-target:after{left:6px;top:6px;width:6px;height:6px;border:1.5px solid currentColor;border-radius:50%}
        .nav-calendar:before{left:2px;top:3px;width:14px;height:13px;border:1.5px solid currentColor;border-radius:2px}.nav-calendar:after{left:5px;top:7px;width:8px;height:1.5px;background:currentColor;box-shadow:0 3px currentColor}
        .nav-chart:before{left:3px;bottom:2px;width:2px;height:7px;background:currentColor;box-shadow:5px -4px currentColor,10px -9px currentColor;border-radius:2px}
        .nav-report:before{left:3px;top:2px;width:12px;height:14px;border:1.5px solid currentColor;border-radius:2px}.nav-report:after{left:6px;top:6px;width:6px;height:1.5px;background:currentColor;box-shadow:0 3px currentColor}
        .nav-trophy:before{left:4px;top:3px;width:10px;height:8px;border:1.5px solid currentColor;border-radius:2px 2px 5px 5px}.nav-trophy:after{left:7px;top:11px;width:4px;height:4px;border-left:1.5px solid currentColor;border-right:1.5px solid currentColor;box-shadow:0 3px 0 -1px currentColor}
        .nav-diamond:before{left:4px;top:4px;width:10px;height:10px;border:1.5px solid currentColor;transform:rotate(45deg);border-radius:2px}
        .nav-settings:before{inset:3px;border:1.5px solid currentColor;border-radius:50%}.nav-settings:after{left:7px;top:7px;width:4px;height:4px;border:1.5px solid currentColor;border-radius:50%;box-shadow:0 -6px 0 -1px currentColor,0 6px 0 -1px currentColor,6px 0 0 -1px currentColor,-6px 0 0 -1px currentColor}
        .nav-item:hover .nav-icon,.nav-item.active .nav-icon{opacity:1}
        .logout-item{width:auto!important;display:flex!important;align-items:center;gap:8px;margin:2px 6px 0;padding:7px 9px!important;min-height:32px!important;border:0;background:transparent;color:#8F9BB0;border-radius:8px;font-size:11px;transition:.18s}
        .logout-item:hover{background:rgba(240,106,122,.08);color:#F06A7A}
        .logout-icon{width:14px;height:14px;position:relative;display:inline-block;flex:none}.logout-icon:before{content:"";position:absolute;left:2px;top:2px;width:7px;height:10px;border:1.5px solid currentColor;border-right:0;border-radius:2px}.logout-icon:after{content:"";position:absolute;right:0;top:6px;width:7px;height:1.5px;background:currentColor;box-shadow:-3px -3px 0 -0.2px currentColor,-3px 3px 0 -0.2px currentColor;transform:translateX(-1px)}
        .sidebar-bottom{padding-top:10px}.mini-profile{padding:7px 6px 8px}.mini-profile .avatar{width:32px;height:32px}
        @media(max-width:1023px){.logout-item{margin-left:2px}}
      `; document.head.appendChild(style);
    }
  }

  function updateGreeting() {
    const el=$('greeting'); if(!el)return; let name='Usuário'; try{name=JSON.parse(localStorage.getItem(KEY)||'null')?.user?.name?.trim()||name;}catch(e){}
    const hour=new Date().getHours(),prefix=hour<12?'Bom dia':hour<18?'Boa tarde':'Boa noite'; el.textContent=`${prefix}, ${name}`;
  }
  function setOpen(open){const sidebar=$('sidebar'),overlay=$('sidebarOverlay'),menu=$('mobileMenu');if(!sidebar)return;sidebar.classList.toggle('open',open);overlay?.classList.toggle('open',open);overlay?.setAttribute('aria-hidden',open?'false':'true');menu?.setAttribute('aria-expanded',open?'true':'false');}
  function setCollapsed(collapsed){const shell=$('appShell'),button=$('desktopSidebarToggle');if(!shell||window.innerWidth<1024)return;shell.classList.toggle('sidebar-collapsed',collapsed);if(button){button.textContent=collapsed?'›':'‹';button.title=collapsed?'Expandir menu':'Recolher menu';button.setAttribute('aria-label',button.title);}localStorage.setItem(COLLAPSED_KEY,collapsed?'1':'0');}
  function setupLayout(){const shell=$('appShell'),sidebar=$('sidebar'),overlay=$('sidebarOverlay'),menu=$('mobileMenu'),toggle=$('desktopSidebarToggle');if(!shell||!sidebar)return;modernizeSidebar();if(toggle&&!toggle.dataset.ready){toggle.dataset.ready='1';toggle.addEventListener('click',e=>{e.preventDefault();if(window.innerWidth>=1024)setCollapsed(!shell.classList.contains('sidebar-collapsed'));});}if(menu&&!menu.dataset.ready){menu.dataset.ready='1';menu.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();setOpen(!sidebar.classList.contains('open'));});}if(overlay&&!overlay.dataset.ready){overlay.dataset.ready='1';overlay.addEventListener('click',()=>setOpen(false));}sidebar.querySelectorAll('.nav-item').forEach(item=>{if(item.dataset.drawerReady)return;item.dataset.drawerReady='1';item.addEventListener('click',()=>{if(window.innerWidth<768)setOpen(false);});});applyLayout();}
  function applyLayout(){const shell=$('appShell');if(!shell)return;if(window.innerWidth<768){shell.classList.remove('sidebar-collapsed');setOpen(false);}else if(window.innerWidth<1024){setOpen(false);shell.classList.add('sidebar-collapsed');}else{setOpen(false);setCollapsed(localStorage.getItem(COLLAPSED_KEY)==='1');}}
  function addLogoutButton(){if($('logoutBtn'))return;const bottom=document.querySelector('.sidebar-bottom');if(!bottom)return;const btn=document.createElement('button');btn.id='logoutBtn';btn.className='logout-item';btn.type='button';btn.innerHTML='<span class="logout-icon" aria-hidden="true"></span><span>Sair</span>';btn.title='Sair da conta';btn.addEventListener('click',async()=>{if(!confirm('Deseja sair da sua conta?'))return;try{await auth.signOut();}catch(e){console.error(e);}});bottom.appendChild(btn);}
  function syncLocalName(user){if(!user?.displayName)return;try{const state=JSON.parse(localStorage.getItem(KEY)||'null');if(!state)return;state.user=state.user||{};state.user.name=user.displayName;state.user.avatar=state.user.avatar||user.displayName.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();localStorage.setItem(KEY,JSON.stringify(state));}catch(e){}}
  auth.onAuthStateChanged(user=>{if(!user)return;syncLocalName(user);setTimeout(()=>{setupLayout();addLogoutButton();updateGreeting();},100);});
  document.addEventListener('click',event=>{const btn=event.target.closest('[data-action="save-settings"]');if(!btn)return;setTimeout(async()=>{const user=auth.currentUser;if(!user)return;try{const state=JSON.parse(localStorage.getItem(KEY)||'null');const name=state?.user?.name?.trim();if(!name)return;await user.updateProfile({displayName:name});await firebase.firestore().collection('users').doc(user.uid).set({email:user.email,displayName:name,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});updateGreeting();}catch(e){console.warn('Profile:',e);}},150);});
  window.addEventListener('resize',applyLayout);window.addEventListener('load',()=>setTimeout(()=>{setupLayout();addLogoutButton();updateGreeting();},250));setInterval(updateGreeting,60000);
})();
