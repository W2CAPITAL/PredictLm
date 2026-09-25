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

function normalizeState(raw:any):CognitiveState{
  const base=createCognitiveState();
  if(!raw||raw.version!==1)return base;
  return {
    ...base,
    ...raw,
    fly:raw.fly?.version===1?raw.fly:base.fly,
    human:raw.human?.version===1?raw.human:base.human,
    frank:raw.frank?.version===1?{
      ...base.frank,
      ...raw.frank,
      emotion:{
        ...base.frank.emotion,
        ...(raw.frank.emotion||{}),
        neuromodulators:{...base.frank.emotion.neuromodulators,...(raw.frank.emotion?.neuromodulators||{})},
        appraisal:{...base.frank.emotion.appraisal,...(raw.frank.emotion?.appraisal||{})}
      },
      neurons:raw.frank.neurons?.version===1?raw.frank.neurons:base.frank.neurons,
      hippocampus:raw.frank.hippocampus?.version===1?raw.frank.hippocampus:base.frank.hippocampus,
      body:{...base.frank.body,...(raw.frank.body||{})},
      memoryAffect:{...base.frank.memoryAffect,...(raw.frank.memoryAffect||{})}
    }:base.frank,
    workspace:{...base.workspace,...(raw.workspace||{})},
    consciousAccess:{...base.consciousAccess,...(raw.consciousAccess||{})},
    memory:{
      working:Array.isArray(raw.memory?.working)?raw.memory.working.slice(0,8):[],
      episodic:Array.isArray(raw.memory?.episodic)?raw.memory.episodic.slice(-80):[],
      autobiographical:Array.isArray(raw.memory?.autobiographical)?raw.memory.autobiographical.slice(-120):base.memory.autobiographical,
      semantic:Array.isArray(raw.memory?.semantic)?raw.memory.semantic.slice(-120):base.memory.semantic,
      perceptual:Array.isArray(raw.memory?.perceptual)?raw.memory.perceptual.slice(-120):[]
    },
    mappedEvidence:raw.mappedEvidence||{},
    lastUpdated:Number(raw.lastUpdated||Date.now())
  };
}

export async function loadCognitiveState():Promise<CognitiveState>{
  if(typeof indexedDB==='undefined')return createCognitiveState();
  try{
    const db=await openDb();
    return await new Promise(resolve=>{
      const tx=db.transaction(STORE,'readonly');
      const req=tx.objectStore(STORE).get(KEY);
      req.onsuccess=()=>resolve(normalizeState(req.result));
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
