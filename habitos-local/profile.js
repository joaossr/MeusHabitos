(() => {
  if (!window.firebase || !firebase.apps.length) return;
  const auth = firebase.auth();
  const KEY = 'habitos_app_v1';
  const COLLAPSED_KEY = 'habitos_sidebar_collapsed';

  const qs = (s, root = document) => root.querySelector(s);
  const qsa = (s, root = document) => [...root.querySelectorAll(s)];

  function setupLayout() {
    const shell = qs('.app-shell');
    const sidebar = qs('#sidebar');
    const topbar = qs('.topbar');
    const menu = qs('#mobileMenu');
    if (!shell || !sidebar || !topbar) return;

    const titleBlock = topbar.children[1];
    if (titleBlock) titleBlock.classList.add('topbar-title');

    let toggle = qs('#desktopSidebarToggle');
    if (!toggle && titleBlock) {
      toggle = document.createElement('button');
      toggle.id = 'desktopSidebarToggle';
      toggle.className = 'sidebar-collapse';
      toggle.type = 'button';
      toggle.setAttribute('aria-label', 'Recolher menu');
      titleBlock.appendChild(toggle);
    }

    let overlay = qs('#sidebarOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'sidebarOverlay';
      overlay.className = 'sidebar-overlay';
      shell.appendChild(overlay);
    }

    const setCollapsed = collapsed => {
      shell.classList.toggle('sidebar-collapsed', collapsed);
      if (toggle) {
        toggle.textContent = collapsed ? '›' : '‹';
        toggle.title = collapsed ? 'Expandir menu' : 'Recolher menu';
        toggle.setAttribute('aria-label', toggle.title);
      }
      localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
    };

    const closeMobile = () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
      menu?.setAttribute('aria-expanded', 'false');
    };

    const openMobile = () => {
      sidebar.classList.add('open');
      overlay.classList.add('open');
      menu?.setAttribute('aria-expanded', 'true');
    };

    toggle?.addEventListener('click', e => {
      e.preventDefault();
      if (window.innerWidth < 768) return;
      setCollapsed(!shell.classList.contains('sidebar-collapsed'));
    });

    menu?.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      sidebar.classList.contains('open') ? closeMobile() : openMobile();
    });

    overlay.addEventListener('click', closeMobile);
    qsa('.nav-item', sidebar).forEach(item => item.addEventListener('click', () => {
      if (window.innerWidth < 768) closeMobile();
    }));

    window.addEventListener('resize', () => {
      if (window.innerWidth >= 768) {
        closeMobile();
        setCollapsed(localStorage.getItem(COLLAPSED_KEY) === '1');
      } else {
        shell.classList.remove('sidebar-collapsed');
      }
    });

    if (window.innerWidth >= 768) setCollapsed(localStorage.getItem(COLLAPSED_KEY) === '1');
    else shell.classList.remove('sidebar-collapsed');
  }

  function addLogoutButton() {
    if (qs('#logoutBtn')) return;
    const bottom = qs('.sidebar-bottom');
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
      state.user.avatar = state.user.avatar || user.displayName.split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {}
  }

  auth.onAuthStateChanged(user => {
    if (!user) return;
    syncLocalName(user);
    setTimeout(() => {
      setupLayout();
      addLogoutButton();
    }, 100);
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

  window.addEventListener('load', () => setTimeout(() => {
    setupLayout();
    addLogoutButton();
  }, 250));
})();