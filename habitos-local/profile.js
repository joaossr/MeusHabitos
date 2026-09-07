(() => {
  if (!window.firebase || !firebase.apps.length) return;
  const auth = firebase.auth();
  const KEY = 'habitos_app_v1';

  function injectSidebarStyles() {
    if (document.getElementById('sidebarEnhancementStyles')) return;
    const style = document.createElement('style');
    style.id = 'sidebarEnhancementStyles';
    style.textContent = `
      /* Layout desktop */
      .sidebar{transition:width .22s ease,transform .22s ease;overflow:hidden}
      .sidebar.collapsed{width:76px;padding-left:10px;padding-right:10px}
      .sidebar.collapsed .brand{justify-content:center;padding-left:0;padding-right:0;padding-bottom:56px}
      .sidebar.collapsed .brand > div:last-child{display:none}
      .sidebar.collapsed .nav-item{justify-content:center;padding-left:10px;padding-right:10px;gap:0;font-size:0}
      .sidebar.collapsed .nav-item span{width:24px;margin:0;font-size:15px}
      .sidebar.collapsed .mini-profile{justify-content:center;padding-left:0;padding-right:0}
      .sidebar.collapsed .mini-profile > div:last-child{display:none}
      .main{transition:margin-left .22s ease,width .22s ease}
      .sidebar.collapsed + .main{margin-left:76px;width:calc(100% - 76px)}

      /* Botão de recolher fica no topo, ao lado do título */
      .desktop-sidebar-toggle{width:32px;height:32px;flex:none;border:1px solid var(--border);background:var(--surface-2);color:var(--text);border-radius:9px;display:grid;place-items:center;padding:0;font-size:17px;line-height:1;cursor:pointer;margin-left:14px}
      .desktop-sidebar-toggle:hover{background:var(--surface-3);border-color:#40516e}
      .topbar > div:nth-child(2){display:flex;align-items:center;min-width:0}
      .mobile-menu{position:relative;z-index:60}

      .logout-item{margin-top:4px!important;color:var(--muted)!important;padding:8px 12px!important;font-size:12px!important}
      .logout-item:hover{color:var(--danger)!important;background:rgba(240,106,122,.08)!important}
      .sidebar.collapsed .logout-item{font-size:0!important}
      .sidebar-overlay{display:none}

      @media(max-width:720px){
        .sidebar{width:244px;box-shadow:12px 0 40px rgba(0,0,0,.35);transform:translateX(-100%);z-index:40}
        .sidebar.open{transform:translateX(0)}
        .sidebar.collapsed{width:244px;padding-left:14px;padding-right:14px}
        .sidebar.collapsed .brand{justify-content:flex-start;padding:4px 10px 26px}
        .sidebar.collapsed .brand > div:last-child{display:block}
        .sidebar.collapsed .nav-item{justify-content:flex-start;padding:11px 12px;gap:12px;font-size:inherit}
        .sidebar.collapsed .nav-item span{width:18px;font-size:inherit}
        .sidebar.collapsed .mini-profile{justify-content:flex-start;padding:8px 10px 13px}
        .sidebar.collapsed .mini-profile > div:last-child{display:block}
        .desktop-sidebar-toggle{display:none!important}
        .sidebar-overlay{position:fixed;inset:0;background:rgba(0,0,0,.52);z-index:35;display:block;opacity:0;pointer-events:none;transition:opacity .2s ease}
        .sidebar.open + .sidebar-overlay{opacity:1;pointer-events:auto}
        .main{margin-left:0!important;width:100%!important}
        .topbar > div:nth-child(2){flex:1;min-width:0}
      }
    `;
    document.head.appendChild(style);
  }

  function addSidebarControls() {
    const sidebar = document.getElementById('sidebar');
    const topbar = document.querySelector('.topbar');
    if (!sidebar || !topbar) return;
    injectSidebarStyles();

    const titleBlock = topbar.querySelector(':scope > div:nth-child(2)');
    if (titleBlock && !document.getElementById('desktopSidebarToggle')) {
      const btn = document.createElement('button');
      btn.id = 'desktopSidebarToggle';
      btn.className = 'desktop-sidebar-toggle';
      btn.type = 'button';
      btn.title = 'Recolher menu';
      btn.setAttribute('aria-label', 'Recolher menu');
      btn.textContent = '‹';
      btn.addEventListener('click', () => {
        if (window.innerWidth <= 720) return;
        const collapsed = sidebar.classList.toggle('collapsed');
        btn.textContent = collapsed ? '›' : '‹';
        btn.title = collapsed ? 'Expandir menu' : 'Recolher menu';
        btn.setAttribute('aria-label', btn.title);
        localStorage.setItem('habitos_sidebar_collapsed', collapsed ? '1' : '0');
      });
      titleBlock.appendChild(btn);
    }

    if (!document.getElementById('sidebarOverlay')) {
      const overlay = document.createElement('div');
      overlay.id = 'sidebarOverlay';
      overlay.className = 'sidebar-overlay';
      overlay.addEventListener('click', () => sidebar.classList.remove('open'));
      sidebar.insertAdjacentElement('afterend', overlay);
    }

    applySidebarState();
  }

  function applySidebarState() {
    const sidebar = document.getElementById('sidebar');
    const btn = document.getElementById('desktopSidebarToggle');
    if (!sidebar) return;
    if (window.innerWidth <= 720) {
      sidebar.classList.remove('collapsed');
      if (btn) btn.textContent = '‹';
      return;
    }
    const collapsed = localStorage.getItem('habitos_sidebar_collapsed') === '1';
    sidebar.classList.toggle('collapsed', collapsed);
    if (btn) {
      btn.textContent = collapsed ? '›' : '‹';
      btn.title = collapsed ? 'Expandir menu' : 'Recolher menu';
    }
  }

  function setupMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    const sidebar = document.getElementById('sidebar');
    if (!menu || !sidebar || menu.dataset.sidebarReady) return;
    menu.dataset.sidebarReady = '1';
    menu.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      sidebar.classList.toggle('open');
    });
  }

  function addLogoutButton() {
    if (document.getElementById('logoutBtn')) return;
    const bottom = document.querySelector('.sidebar-bottom');
    if (!bottom) return;
    const btn = document.createElement('button');
    btn.id = 'logoutBtn';
    btn.className = 'nav-item logout-item';
    btn.type = 'button';
    btn.innerHTML = '<span>↪</span> Sair';
    btn.title = 'Sair da conta';
    btn.addEventListener('click', async () => {
      if (!confirm('Deseja sair da sua conta?')) return;
      try { await auth.signOut(); } catch (e) { console.error(e); }
    });
    bottom.appendChild(btn);
  }

  function syncLocalName(user) {
    if (!user?.displayName) return;
    try {
      const state = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!state) return;
      state.user = state.user || {};
      state.user.name = user.displayName;
      state.user.avatar = state.user.avatar || user.displayName.split(/\s+/).slice(0,2).map(x => x[0]).join('').toUpperCase();
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {}
  }

  auth.onAuthStateChanged(user => {
    if (user) {
      syncLocalName(user);
      setTimeout(() => {
        addSidebarControls();
        setupMobileMenu();
        addLogoutButton();
      }, 100);
    }
  });

  document.addEventListener('click', async event => {
    const btn = event.target.closest('[data-action="save-settings"]');
    if (!btn) return;
    setTimeout(async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const state = JSON.parse(localStorage.getItem(KEY) || 'null');
        const name = state?.user?.name?.trim();
        if (!name) return;
        await user.updateProfile({ displayName: name });
        await firebase.firestore().collection('users').doc(user.uid).set({
          email: user.email,
          displayName: name,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      } catch (e) { console.warn('Profile:', e); }
    }, 150);
  });

  window.addEventListener('resize', applySidebarState);
  window.addEventListener('load', () => setTimeout(() => {
    addSidebarControls();
    setupMobileMenu();
    addLogoutButton();
  }, 250));
})();