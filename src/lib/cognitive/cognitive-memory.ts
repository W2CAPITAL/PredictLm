'use client';

import {createCognitiveState,type CognitiveState} from './cognitive-workspace';

const DB='predictlm-cognitive-lab-v1';
const STORE='state';
const KEY='dual-connectome';

function openDb():Promise<IDBDatabase>{
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB,1);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE);
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}

export async function loadCognitiveState():Promise<CognitiveState>{
  if(typeof indexedDB==='undefined')return createCognitiveState();
  try{
    const db=await openDb();
    return await new Promise(resolve=>{
      const tx=db.transaction(STORE,'readonly');
      const req=tx.objectStore(STORE).get(KEY);
      req.onsuccess=()=>resolve(req.result?.version===1?req.result:createCognitiveState());
      req.onerror=()=>resolve(createCognitiveState());
    });
  }catch{return createCognitiveState()}
}

export async function saveCognitiveState(state:CognitiveState){
  if(typeof indexedDB==='undefined')return;
  try{
    const db=await openDb();
    await new Promise<void>((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).put(state,KEY);
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error);
    });
  }catch{}
}

export async function resetCognitiveState(){
  const fresh=createCognitiveState();
  await saveCognitiveState(fresh);
  return fresh;
}
