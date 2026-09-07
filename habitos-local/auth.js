(() => {
  const isLoginPage = location.pathname.endsWith('/login.html') || location.pathname.endsWith('login.html');
  const config = window.FIREBASE_CONFIG;

  function configured() {
    return config && config.apiKey && !String(config.apiKey).startsWith('COLE_') &&
      config.projectId && !String(config.projectId).startsWith('SEU-');
  }

  if (!window.firebase || !configured()) {
    if (!isLoginPage) return;
    window.addEventListener('DOMContentLoaded', () => {
      const error = document.getElementById('authError');
      if (error) error.textContent = 'Configure o Firebase em firebase-config.js para ativar o login.';
    });
    return;
  }

  if (!firebase.apps.length) firebase.initializeApp(config);
  const auth = firebase.auth();

  function goApp() {
    if (isLoginPage) location.replace('index.html');
  }

  auth.onAuthStateChanged(user => {
    if (user) goApp();
    else if (!isLoginPage) location.replace('login.html');
  });

  if (!isLoginPage) {
    window.appAuth = { auth, signOut: () => auth.signOut() };
    return;
  }

  window.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const signup = document.getElementById('signupBtn');
    const forgot = document.getElementById('forgotBtn');
    const error = document.getElementById('authError');
    const submit = document.getElementById('submitBtn');

    const message = text => { error.textContent = text || ''; };
    const friendly = e => {
      const map = {
        'auth/invalid-credential': 'E-mail ou senha incorretos.',
        'auth/user-not-found': 'Não encontrei uma conta com este e-mail.',
        'auth/wrong-password': 'Senha incorreta.',
        'auth/email-already-in-use': 'Este e-mail já possui uma conta.',
        'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
        'auth/invalid-email': 'Digite um e-mail válido.',
        'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
      };
      return map[e.code] || 'Não foi possível concluir. Verifique os dados e tente novamente.';
    };

    form.addEventListener('submit', async e => {
      e.preventDefault(); message('');
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      submit.disabled = true; submit.textContent = 'Entrando...';
      try { await auth.signInWithEmailAndPassword(email, password); }
      catch (e) { message(friendly(e)); submit.disabled = false; submit.textContent = 'Entrar'; }
    });

    signup.addEventListener('click', async () => {
      message('');
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      if (!email || password.length < 6) { message('Informe um e-mail e uma senha de pelo menos 6 caracteres.'); return; }
      signup.disabled = true; signup.textContent = 'Criando...';
      try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await firebase.firestore().collection('users').doc(cred.user.uid).set({
          email: cred.user.email,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      } catch (e) { message(friendly(e)); signup.disabled = false; signup.textContent = 'Criar minha conta'; }
    });

    forgot.addEventListener('click', async () => {
      message('');
      const email = document.getElementById('email').value.trim();
      if (!email) { message('Digite seu e-mail primeiro.'); return; }
      try { await auth.sendPasswordResetEmail(email); message('Enviamos um link para redefinir sua senha.'); }
      catch (e) { message(friendly(e)); }
    });
  });
})();
