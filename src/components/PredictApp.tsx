'use client';

import { useEffect } from 'react';
import { ChatShell } from '@/components/ChatShell';
import { pulseBrowserDigitalBrain } from '@/lib/digital-brain';

export function PredictApp(){
  useEffect(()=>{
    pulseBrowserDigitalBrain();
    const id=window.setInterval(()=>pulseBrowserDigitalBrain(),20000);
    const onVisibility=()=>{if(document.visibilityState==='visible')pulseBrowserDigitalBrain()};
    document.addEventListener('visibilitychange',onVisibility);
    return()=>{window.clearInterval(id);document.removeEventListener('visibilitychange',onVisibility)};
  },[]);

  return <ChatShell onOpenLegal={()=>window.location.assign('/processos')}/>;
}
