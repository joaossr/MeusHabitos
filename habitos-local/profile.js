(() => {
  if (!window.firebase || !firebase.apps.length) return;
  const auth = firebase.auth();
  const KEY = 'habitos_app_v1';

  function injectSidebarStyles() {
    if (document.getElementById('sidebarEnhancementStyles')) return;
    const style = document.createElement('style');
    style.id = 'sidebarEnhancementStyles';
    style.textContent = `
      /* Sidebar recolhível */
      .sidebar{transition:width .22s ease,transform .22s ease;overflow:hidden}
      .sidebar-collapse{position:absolute;top:20px;right:10px;width:30px;height:30px;border:1px solid var(--border);background:var(--surface-2);color:var(--muted);border-radius:8px;display:grid;place-items:center;padding:0;font-size:14px;z-index:2}
      .sidebar-collapse:hover{background:var(--surface-3);color:var(--text)}
      .sidebar.collapsed{width:76px;padding-left:10px;padding-right:10px}
      .sidebar.collapsed .brand{justify-content:center;padding-left:0;padding-right:0}
      .sidebar.collapsed .brand>div:last-child,
      .sidebar.collapsed .nav-item:not(.sidebar-collapse) { }
      .sidebar.collapsed .nav-item{justify-content:center;padding-left:10px;padding-right:10px;gap:0}
      .sidebar.collapsed .nav-item span{margin:0;width:24px}
      .sidebar.collapsed .nav-item{font-size:0}
      .sidebar.collapsed .nav-item span{font-size:15px}
      .sidebar.collapsed .mini-profile{justify-content:center;padding-left:0;padding-right:0}
      .sidebar.collapsed .mini-profile>div:last-child{display:none}
      .sidebar.collapsed .sidebar-collapse{right:23px;top:58px}
      .sidebar.collapsed .brand{padding-bottom:56px}
      .sidebar.collapsed + .main{margin-left:76px;width:calc(100% - 76px)}
      .logout-item{margin-top:6px!important;color:var(--muted)!important;padding-top:9px!important;padding-bottom:9px!important}
      .logout-item:hover{color:var(--danger)!important;background:rgba(240,106,122,.08)!important}
      .sidebar-overlay{display:none}
      @media(max-width:720px){
        .sidebar{width:244px;box-shadow:12px 0 40px rgba(0,0,0,.35)}
        .sidebar.collapsed{width:244px;padding-left:14px;padding-right:14px}
        .sidebar.collapsed .brand{justify-content:flex-start;padding-left:10px;padding-right:10px;padding-bottom:26px}
        .sidebar.collapsed .brand>div:last-child,
        .sidebar.collapsed .mini-profile>div:last-child{display:block}
        .sidebar.collapsed .nav-item{justify-content:flex-start;padding:11px 12px;gap:12px;font-size:inherit}
        .sidebar.collapsed .nav-item span{font-size:inherit;width:18px}
        .sidebar.collapsed .sidebar-collapse{right:10px;top:20px}
        .sidebar.collapsed .brand{padding-bottom:26px}
        .sidebar-overlay{position:fixed;inset:0;background:rgba(0,0,0,.52);z-index:25;display:block;opacity:0;pointer-events:none;transition:opacity .2s ease}
        .sidebar.open + .sidebar-overlay{opacity:1;pointer-events:auto}
      }
    `;
    document.head.appendChild(style);
  }

  function addSidebarControls() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    injectSidebarStyles();

    if (!document.getElementById('sidebarCollapse')) {
      const btn = document.createElement('button');
      btn.id = 'sidebarCollapse';
      btn.className = 'sidebar-collapse';
      btn.type = 'button';
      btn.title = 'Recolher menu';
      btn.setAttribute('aria-label', 'Recolher menu');
      btn.textContent = '‹';
      btn.addEventListener('click', () => {
        const collapsed = sidebar.classList.toggle('collapsed');
        btn.textContent = collapsed ? '›' : '‹';
        btn.title = collapsed ? 'Expandir menu' : 'Recolher menu';
        btn.setAttribute('aria-label', btn.title);
        localStorage.setItem('habitos_sidebar_collapsed', collapsed ? '1' : '0');
      });
      sidebar.appendChild(btn);
    }

    if (!document.getElementById('sidebarOverlay')) {
      const overlay = document.createElement('div');
      overlay.id = 'sidebarOverlay';
      overlay.className = 'sidebar-overlay';
      overlay.addEventListener('click', () => sidebar.classList.remove('open'));
      sidebar.insertAdjacentElement('afterend', overlay);
    }

    if (window.innerWidth > 720 && localStorage.getItem('habitos_sidebar_collapsed') === '1') {
      sidebar.classList.add('collapsed');
      const btn = document.getElementById('sidebarCollapse');
      btn.textContent = '›';
      btn.title = 'Expandir menu';
    }
  }

  function setupMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    const sidebar = document.getElementById('sidebar');
    if (!menu || !sidebar || menu.dataset.sidebarReady) return;
    menu.dataset.sidebarReady = '1';
    menu.addEventListener('click', () => sidebar.classList.toggle('open'));
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
      await auth.signOut();
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
      } catch (e) {
        console.warn('Profile:', e);
      }
    }, 150);
  });

  window.addEventListener('load', () => setTimeout(() => {
    addSidebarControls();
    setupMobileMenu();
    addLogoutButton();
  }, 300));
})();
