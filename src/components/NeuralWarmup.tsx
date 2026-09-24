'use client';

import { useEffect } from 'react';

/**
 * Predict Auto never downloads/restores a browser LLM on page load.
 * Older releases persisted Lite during background warmup, so restoring that
 * preference would reintroduce CPU/RAM spikes on weak PCs.
 *
 * Local inference is activated only by the explicit "Ativar modo offline"
 * action in ChatShell.
 */
export function NeuralWarmup(){
  useEffect(()=>{
    window.dispatchEvent(new CustomEvent('predictlm:neural-warmup',{detail:{
      phase:'skipped',
      tier:'lite',
      status:'on-demand-only'
    }}));
  },[]);
  return null;
}
