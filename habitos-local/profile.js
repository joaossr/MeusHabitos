(() => {
  if (!window.firebase || !firebase.apps.length) return;
  const auth = firebase.auth();
  const KEY = 'habitos_app_v1';
  const COLLAPSED_KEY = 'habitos_sidebar_collapsed';
  const $ = id => document.getElementById(id);

  function greeting(name) {
    const hour = new Date().getHours();
    const text = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    return `${text}, ${name || 'Usuário'}`;
  }

  function updateGreeting() {
    const title = $('pageTitle');
    if (!title) return;
    let name = 'Usuário';
    try {
      const state = JSON.parse(localStorage.getItem(KEY) || 'null');
      name = state?.user?.name?.trim() || name;
    } catch (e) {}
    const text = greeting(name);
    if (title.textContent !== text) title.textContent = text;
  }

  function watchGreeting() {
    const title = $('pageTitle');
    if (!title || title.dataset.greetingWatch) return;
    title.dataset.greetingWatch = '1';
    new MutationObserver(updateGreeting).observe(title, { childList: true, characterData: true, subtree: true });
    updateGreeting();
  }

  function setOpen(open) {
    const sidebar = $('sidebar'), overlay = $('sidebarOverlay'), menu = $('mobileMenu');
    if (!sidebar) return;
    sidebar.classList.toggle('open', open);
    overlay?.classList.toggle('open', open);
    overlay?.setAttribute('aria-hidden', open ? 'false' : 'true');
    menu?.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function setCollapsed(collapsed) {
    const shell = $('appShell'), button = $('desktopSidebarToggle');
    if (!shell || window.innerWidth < 1024) return;
    shell.classList.toggle('sidebar-collapsed', collapsed);
    if (button) {
      button.textContent = collapsed ? '›' : '‹';
      button.title = collapsed ? 'Expandir menu' : 'Recolher menu';
      button.setAttribute('aria-label', button.title);
    }
    localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
  }

  function setupLayout() {
    const shell = $('appShell'), sidebar = $('sidebar'), overlay = $('sidebarOverlay'), menu = $('mobileMenu'), toggle = $('desktopSidebarToggle');
    if (!shell || !sidebar) return;

    if (toggle && !toggle.dataset.ready) {
      toggle.dataset.ready = '1';
      toggle.addEventListener('click', event => {
        event.preventDefault();
        if (window.innerWidth >= 1024) setCollapsed(!shell.classList.contains('sidebar-collapsed'));
      });
    }
    if (menu && !menu.dataset.ready) {
      menu.dataset.ready = '1';
      menu.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        setOpen(!sidebar.classList.contains('open'));
      });
    }
    if (overlay && !overlay.dataset.ready) {
      overlay.dataset.ready = '1';
      overlay.dataset.ready = '1';
      overlay.addEventListener('click', () => setOpen(false));
    }
    sidebar.querySelectorAll('.nav-item').forEach(item => {
      if (item.dataset.drawerReady) return;
      item.dataset.drawerReady = '1';
      item.addEventListener('click', () => { if (window.innerWidth < 768) setOpen(false); });
    });

    applyLayout();
    watchGreeting();
  }

  function applyLayout() {
    const shell = $('appShell');
    if (!shell) return;
    if (window.innerWidth < 768) {
      shell.classList.remove('sidebar-collapsed');
      setOpen(false);
    } else if (window.innerWidth < 1024) {
      setOpen(false);
      shell.classList.add('sidebar-collapsed');
    } else {
      setOpen(false);
      setCollapsed(localStorage.getItem(COLLAPSED_KEY) === '1');
    }
    updateGreeting();
  }

  function addLogoutButton() {
    if ($('logoutBtn')) return;
    const bottom = document.querySelector('.sidebar-bottom');
    if (!bottom) return;
    const btn = document.createElement('button');
    btn.id = 'logoutBtn'; btn.className = 'nav-item logout-item'; btn.type = 'button';
    btn.innerHTML = '<span>↪</span> Sair'; btn.title = 'Sair da conta';
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
      state.user.avatar = state.user.avatar || user.displayName.split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {}
  }

  auth.onAuthStateChanged(user => {
    if (!user) return;
    syncLocalName(user);
    setTimeout(() => { setupLayout(); addLogoutButton(); }, 100);
  });

  document.addEventListener('click', event => {
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
        await firebase.firestore().collection('users').doc(user.uid).set({ email: user.email, displayName: name, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
        updateGreeting();
      } catch (e) { console.warn('Profile:', e); }
    }, 150);
  });

  window.addEventListener('resize', applyLayout);
  window.addEventListener('load', () => setTimeout(() => { setupLayout(); addLogoutButton(); }, 250));
  setInterval(updateGreeting, 60000);
})();
