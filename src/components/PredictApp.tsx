'use client';

import React, { useEffect, useState } from 'react';
import { ChatShell } from '@/components/ChatShell';
import { LegalModule } from '@/components/LegalModule';
import { pulseBrowserDigitalBrain } from '@/lib/digital-brain';

export function PredictApp(){
  const [surface,setSurface]=useState<'chat'|'legal'>('chat');

  useEffect(()=>{
    pulseBrowserDigitalBrain();
    const id=window.setInterval(()=>pulseBrowserDigitalBrain(),20000);
    const onVisibility=()=>{if(document.visibilityState==='visible')pulseBrowserDigitalBrain()};
    document.addEventListener('visibilitychange',onVisibility);
    return()=>{window.clearInterval(id);document.removeEventListener('visibilitychange',onVisibility)};
  },[]);

  if(surface==='legal'){
    return <LegalModule onBack={()=>setSurface('chat')} onOpenBuild={()=>setSurface('chat')}/>;
  }

  return <ChatShell onOpenLegal={()=>setSurface('legal')}/>;
}
