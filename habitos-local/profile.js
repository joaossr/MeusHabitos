(() => {
  if (!window.firebase || !firebase.apps.length) return;
  const auth = firebase.auth();
  const KEY = 'habitos_app_v1';

  function addLogoutButton() {
    if (document.getElementById('logoutBtn')) return;
    const bottom = document.querySelector('.sidebar-bottom');
    if (!bottom) return;
    const btn = document.createElement('button');
    btn.id = 'logoutBtn';
    btn.className = 'nav-item';
    btn.innerHTML = '<span>↪</span> Sair da conta';
    btn.style.color = '#ff8b9e';
    btn.style.marginTop = '8px';
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
      setTimeout(addLogoutButton, 100);
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

  window.addEventListener('load', () => setTimeout(addLogoutButton, 300));
})();
