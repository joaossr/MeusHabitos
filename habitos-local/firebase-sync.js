(function(){
  let enabled=false, db=null, auth=null, uid=null;
  function configured(){
    const c=window.FIREBASE_CONFIG;
    return c && c.apiKey && !String(c.apiKey).startsWith("COLE_") && c.projectId && !String(c.projectId).startsWith("SEU-");
  }
  function waitForUser(){
    return new Promise(resolve=>{
      if(auth.currentUser){ resolve(auth.currentUser); return; }
      const unsub=auth.onAuthStateChanged(user=>{ unsub(); resolve(user); });
    });
  }
  async function init(){
    if(!configured() || !window.firebase) return null;
    if(!firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);
    auth=firebase.auth(); db=firebase.firestore();
    await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    const user=await waitForUser();
    if(!user) return null;
    uid=user.uid; enabled=true;
    const ref=db.collection("users").doc(uid).collection("app").doc("state");
    const snap=await ref.get();
    if(snap.exists){
      const data=snap.data();
      if(data && data.state) return data.state;
    }else{
      const local=JSON.parse(localStorage.getItem("habitos_app_v1")||"null");
      if(local) await ref.set({state:local,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
    }
    return null;
  }
  async function save(state){
    if(!enabled || !db || !uid) return;
    await db.collection("users").doc(uid).collection("app").doc("state").set({state,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
  }
  window.cloudSync={init,save,isEnabled:()=>enabled};
})();
