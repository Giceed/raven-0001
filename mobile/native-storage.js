(function(){
  const SLOT_A="__ravenBackupA";
  const SLOT_B="__ravenBackupB";
  const NATIVE_KEY="raven.snapshot.v1";
  const originalSet=Storage.prototype.setItem;
  const originalRemove=Storage.prototype.removeItem;
  const originalClear=Storage.prototype.clear;
  let queued=false;
  let nativePreferences=null;
  let restoring=false;

  function checksum(text){let hash=2166136261;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}return (hash>>>0).toString(16);}
  function ravenData(){
    const data={};
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(key&&key.startsWith("raven"))data[key]=localStorage.getItem(key);
    }
    return data;
  }
  function parseSnapshot(text){
    try{
      const snapshot=JSON.parse(text||"null");
      if(snapshot?.version!==1||!snapshot.data||typeof snapshot.data!=="object")return null;
      if(checksum(JSON.stringify(snapshot.data))!==snapshot.checksum)return null;
      return snapshot;
    }catch{return null;}
  }
  function readSlot(key){return parseSnapshot(localStorage.getItem(key));}
  function newestLocalSnapshot(){
    return [readSlot(SLOT_A),readSlot(SLOT_B)].filter(Boolean).sort((a,b)=>b.updatedAt-a.updatedAt)[0]||null;
  }
  function applySnapshot(snapshot){
    if(!snapshot)return false;
    restoring=true;
    try{
      const existing=[];
      for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key?.startsWith("raven"))existing.push(key);}
      existing.forEach(key=>originalRemove.call(localStorage,key));
      Object.entries(snapshot.data).forEach(([key,value])=>originalSet.call(localStorage,key,String(value)));
      return true;
    }finally{restoring=false;}
  }
  function hasRavenState(){return localStorage.getItem("ravenProfile")!==null||localStorage.getItem("ravenLife")!==null;}

  const startupSnapshot=newestLocalSnapshot();
  const startupTime=startupSnapshot?.updatedAt||0;
  if(!hasRavenState()&&startupSnapshot)applySnapshot(startupSnapshot);

  async function flush(){
    queued=false;
    if(restoring)return;
    const data=ravenData();
    const snapshot={version:1,updatedAt:Date.now(),data,checksum:checksum(JSON.stringify(data))};
    const text=JSON.stringify(snapshot);
    const slotA=readSlot(SLOT_A),slotB=readSlot(SLOT_B);
    const target=!slotA?SLOT_A:!slotB?SLOT_B:slotA.updatedAt<=slotB.updatedAt?SLOT_A:SLOT_B;
    originalSet.call(localStorage,target,text);
    if(nativePreferences)try{await nativePreferences.set({key:NATIVE_KEY,value:text});}catch(error){window.dispatchEvent(new CustomEvent("raven-storage-error",{detail:error}));}
    return snapshot;
  }
  function schedule(){if(queued||restoring)return;queued=true;queueMicrotask(()=>void flush());}

  Storage.prototype.setItem=function(key,value){const result=originalSet.call(this,key,value);if(this===localStorage&&String(key).startsWith("raven"))schedule();return result;};
  Storage.prototype.removeItem=function(key){const result=originalRemove.call(this,key);if(this===localStorage&&String(key).startsWith("raven"))schedule();return result;};
  Storage.prototype.clear=function(){const result=originalClear.call(this);if(this===localStorage)schedule();return result;};

  window.RavenNativeStorage={
    flush,
    exportSnapshot(){return JSON.stringify({version:1,updatedAt:Date.now(),data:ravenData(),checksum:checksum(JSON.stringify(ravenData()))});},
    importSnapshot(text){const snapshot=parseSnapshot(text);if(!snapshot)throw new Error("Ungültige Raven-Sicherung");applySnapshot(snapshot);return flush();},
    async attach(preferences){
      nativePreferences=preferences;
      try{
        const {value}=await preferences.get({key:NATIVE_KEY});
        const nativeSnapshot=parseSnapshot(value);
        if(nativeSnapshot&&nativeSnapshot.updatedAt>startupTime&&!sessionStorage.getItem("ravenNativeRestoreDone")){
          applySnapshot(nativeSnapshot);
          sessionStorage.setItem("ravenNativeRestoreDone","1");
          await flush();
          location.reload();
          return;
        }
        await flush();
      }catch(error){window.dispatchEvent(new CustomEvent("raven-storage-error",{detail:error}));}
    }
  };
})();
