(() => {
  const isLoginPage = location.pathname.endsWith('/login.html') || location.pathname.endsWith('login.html');
  const config = window.FIREBASE_CONFIG;

  function configured() {
    return config && config.apiKey && !String(config.apiKey).startsWith('COLE_') && config.projectId && !String(config.projectId).startsWith('SEU-');
  }
  if (!window.firebase || !configured()) {
    if (!isLoginPage) return;
    window.addEventListener('DOMContentLoaded', () => { const e=document.getElementById('authError'); if(e)e.textContent='Configure o Firebase em firebase-config.js para ativar o login.'; });
    return;
  }
  if (!firebase.apps.length) firebase.initializeApp(config);
  const auth=firebase.auth();
  function goApp(){ if(isLoginPage) location.replace('index.html'); }
  auth.onAuthStateChanged(user=>{ if(user) goApp(); else if(!isLoginPage) location.replace('login.html'); });
  if(!isLoginPage){ window.appAuth={auth,signOut:()=>auth.signOut()}; return; }

  window.addEventListener('DOMContentLoaded',()=>{
    const form=document.getElementById('loginForm'), signup=document.getElementById('signupBtn'), back=document.getElementById('backLogin'), forgot=document.getElementById('forgotBtn'), error=document.getElementById('authError'), submit=document.getElementById('submitBtn'), card=document.getElementById('authCard');
    const message=t=>{error.textContent=t||''};
    const friendly=e=>({
      'auth/invalid-credential':'E-mail ou senha incorretos.','auth/user-not-found':'Não encontrei uma conta com este e-mail.','auth/wrong-password':'Senha incorreta.','auth/email-already-in-use':'Este e-mail já possui uma conta.','auth/weak-password':'A senha precisa ter pelo menos 6 caracteres.','auth/invalid-email':'Digite um e-mail válido.','auth/too-many-requests':'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
    }[e.code]||'Não foi possível concluir. Verifique os dados e tente novamente.');
    let mode='login';
    function setMode(next){mode=next;card.classList.toggle('mode-signup',next==='signup');signup.textContent=next==='signup'?'Cadastrar conta':'Criar minha conta';submit.textContent=next==='signup'?'Cadastrar':'Entrar';message('');}
    signup.addEventListener('click',()=>{if(mode==='login'){setMode('signup');document.getElementById('displayName').focus();}else form.requestSubmit();});
    back.addEventListener('click',()=>setMode('login'));
    form.addEventListener('submit',async e=>{
      e.preventDefault();message('');submit.disabled=true;signup.disabled=true;
      const email=document.getElementById('email').value.trim(),password=document.getElementById('password').value;
      try{
        if(mode==='login') await auth.signInWithEmailAndPassword(email,password);
        else{
          const name=document.getElementById('displayName').value.trim();
          if(!name){message('Digite seu nome de usuário.');return;}
          const cred=await auth.createUserWithEmailAndPassword(email,password);
          await cred.user.updateProfile({displayName:name});
          await firebase.firestore().collection('users').doc(cred.user.uid).set({email:cred.user.email,displayName:name,createdAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
        }
      }catch(e){message(friendly(e));submit.disabled=false;signup.disabled=false;}
    });
    forgot.addEventListener('click',async()=>{message('');const email=document.getElementById('email').value.trim();if(!email){message('Digite seu e-mail primeiro.');return;}try{await auth.sendPasswordResetEmail(email);message('Enviamos um link para redefinir sua senha.');}catch(e){message(friendly(e));}});
  });
})();
