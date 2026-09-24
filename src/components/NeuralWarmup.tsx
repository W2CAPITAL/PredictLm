'use client';

import { useEffect } from 'react';
import {
  loadNeuralModel,
  neuralAutoWarmPolicy,
  neuralStatus,
  preferredNeuralTier,
  recordNeuralAutoWarmResult,
  restorePreferredNeuralModel
} from '@/lib/browser-brain';

type WarmDetail={
  phase:'scheduled'|'loading'|'ready'|'skipped'|'error';
  tier?:'lite'|'smart';
  progress?:number|null;
  status?:string;
};

function emit(detail:WarmDetail){
  try{window.dispatchEvent(new CustomEvent('predictlm:neural-warmup',{detail}))}catch{}
}

export function NeuralWarmup(){
  useEffect(()=>{
    let cancelled=false;
    let idleId:any=null;
    let timer:number|undefined;

    const run=async()=>{
      if(cancelled||neuralStatus().loaded)return;
      const policy=neuralAutoWarmPolicy();
      if(!policy.allowed){
        emit({phase:'skipped',tier:'lite',status:policy.reason});
        return;
      }

      try{
        const preferred=preferredNeuralTier();
        if(preferred){
          emit({phase:'loading',tier:preferred,status:'restoring'});
          const restored=await restorePreferredNeuralModel(p=>{
            if(!cancelled)emit({phase:'loading',tier:preferred,progress:p.progress,status:p.status});
          });
          if(restored){
            recordNeuralAutoWarmResult(true);
            emit({phase:'ready',tier:neuralStatus().tier||preferred,status:'restored'});
            return;
          }
        }

        // First-run warmup is intentionally Lite. Smart/large models are never
        // pulled automatically: the browser remains responsive on weak devices.
        emit({phase:'loading',tier:'lite',status:'idle-warmup'});
        await loadNeuralModel('lite',p=>{
          if(!cancelled)emit({phase:'loading',tier:'lite',progress:p.progress,status:p.status});
        },{persistPreference:true,timeoutMs:3*60*1000});
        if(cancelled)return;
        recordNeuralAutoWarmResult(true);
        emit({phase:'ready',tier:'lite',status:'background-ready'});
      }catch(error:any){
        if(cancelled)return;
        recordNeuralAutoWarmResult(false);
        emit({phase:'error',tier:'lite',status:String(error?.message||'warmup failed')});
      }
    };

    const schedule=()=>{
      if(cancelled)return;
      emit({phase:'scheduled',tier:'lite',status:'waiting-for-idle'});
      const ric=(window as any).requestIdleCallback;
      idleId=typeof ric==='function'
        ? ric(()=>void run(),{timeout:6500})
        : window.setTimeout(()=>void run(),3200);
    };

    // Let critical UI/auth/navigation resources win the first paint.
    timer=window.setTimeout(schedule,900);

    return()=>{
      cancelled=true;
      if(timer)window.clearTimeout(timer);
      const cic=(window as any).cancelIdleCallback;
      if(idleId!=null){
        if(typeof cic==='function')cic(idleId);
        else window.clearTimeout(idleId);
      }
    };
  },[]);

  return null;
}
