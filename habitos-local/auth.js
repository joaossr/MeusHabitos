(() => {
  const isLoginPage = location.pathname.endsWith('/login.html') || location.pathname.endsWith('login.html');
  const config = window.FIREBASE_CONFIG;
  if (!config || !window.firebase) return;
  if (!firebase.apps.length) firebase.initializeApp(config);
  const auth = firebase.auth();
  const db = firebase.firestore();

  const friendly = e => ({
    'auth/invalid-credential':'E-mail ou senha incorretos.',
    'auth/user-not-found':'Não encontrei uma conta com este e-mail.',
    'auth/wrong-password':'Senha incorreta.',
    'auth/email-already-in-use':'Este e-mail já possui uma conta.',
    'auth/weak-password':'A senha precisa ter pelo menos 6 caracteres.',
    'auth/invalid-email':'Digite um e-mail válido.',
    'auth/too-many-requests':'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
    'auth/operation-not-allowed':'Este método de login está desativado no Firebase.',
    'auth/network-request-failed':'Falha de conexão. Verifique sua internet e tente novamente.',
    'auth/popup-blocked':'O navegador bloqueou a janela do Google. Permita pop-ups para este site e tente novamente.',
    'auth/popup-closed-by-user':'A janela do Google foi fechada antes de concluir o login.',
    'auth/cancelled-popup-request':'O login do Google foi cancelado.',
    'auth/account-exists-with-different-credential':'Este e-mail já está cadastrado com outro método de login.'
  }[e.code] || e.message || 'Não foi possível concluir a operação. Tente novamente.');

  function goApp(){ if(isLoginPage) location.replace('index.html'); }
  auth.onAuthStateChanged(user=>{ if(user) goApp(); else if(!isLoginPage) location.replace('login.html'); });
  if(!isLoginPage){ window.appAuth={auth,signOut:()=>auth.signOut()}; return; }

  window.addEventListener('DOMContentLoaded',()=>{
    const form=document.getElementById('loginForm');
    const signup=document.getElementById('signupBtn');
    const back=document.getElementById('backLogin');
    const forgot=document.getElementById('forgotBtn');
    const google=document.getElementById('googleBtn');
    const error=document.getElementById('authError');
    const submit=document.getElementById('submitBtn');
    const card=document.getElementById('authCard');
    const emailEl=document.getElementById('email');
    const passwordEl=document.getElementById('password');
    const nameEl=document.getElementById('displayName');
    if(!form||!signup||!submit||!card) return;

    const message=(text,success=false)=>{error.textContent=text||'';error.classList.toggle('auth-success',success);};
    let mode='login';
    let busy=false;

    function setMode(next){
      mode=next;
      card.classList.toggle('mode-signup',next==='signup');
      signup.textContent=next==='signup'?'Voltar para entrar':'Criar minha conta';
      submit.textContent=next==='signup'?'Cadastrar':'Entrar';
      message('');
      if(next==='signup') nameEl?.focus(); else emailEl?.focus();
    }

    signup.addEventListener('click',()=>setMode(mode==='login'?'signup':'login'));
    back?.addEventListener('click',()=>setMode('login'));

    form.addEventListener('submit',async e=>{
      e.preventDefault();
      if(busy) return;
      message('');
      const email=emailEl.value.trim();
      const password=passwordEl.value;
      const name=nameEl?.value.trim()||'';
      if(!email){message('Digite seu e-mail.');emailEl.focus();return;}
      if(mode==='signup'&&!name){message('Digite seu nome de usuário.');nameEl.focus();return;}
      if(password.length<6){message('A senha precisa ter pelo menos 6 caracteres.');passwordEl.focus();return;}
      busy=true;submit.disabled=true;signup.disabled=true;google.disabled=true;submit.textContent=mode==='signup'?'Criando conta…':'Entrando…';
      try{
        if(mode==='login'){
          await auth.signInWithEmailAndPassword(email,password);
        }else{
          const cred=await auth.createUserWithEmailAndPassword(email,password);
          await cred.user.updateProfile({displayName:name});
          await db.collection('users').doc(cred.user.uid).set({email:cred.user.email,displayName:name,createdAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
          message('Conta criada com sucesso! Entrando…',true);
          setTimeout(goApp,250);
        }
      }catch(e){
        message(friendly(e));
        busy=false;submit.disabled=false;signup.disabled=false;google.disabled=false;submit.textContent=mode==='signup'?'Cadastrar':'Entrar';
      }
    });

    google?.addEventListener('click',async()=>{
      if(busy) return;
      busy=true;message('');google.disabled=true;submit.disabled=true;signup.disabled=true;google.textContent='Abrindo Google…';
      try{
        const provider=new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({prompt:'select_account'});
        const result=await auth.signInWithPopup(provider);
        const user=result.user;
        await db.collection('users').doc(user.uid).set({email:user.email||'',displayName:user.displayName||'Usuário',photoURL:user.photoURL||'',updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
        message('Login realizado! Entrando…',true);
        setTimeout(goApp,250);
      }catch(e){
        message(friendly(e));
        busy=false;google.disabled=false;submit.disabled=false;signup.disabled=false;google.innerHTML='<span class="google-icon">G</span> Continuar com Google';
      }
    });

    forgot?.addEventListener('click',async()=>{
      const email=emailEl.value.trim();
      if(!email){message('Digite seu e-mail primeiro.');emailEl.focus();return;}
      try{await auth.sendPasswordResetEmail(email);message('Enviamos um link para redefinir sua senha.',true);}catch(e){message(friendly(e));}
    });
  });
})();