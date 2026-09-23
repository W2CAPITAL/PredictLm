'use client';

import React, { useState } from 'react';
import { ChatShell } from '@/components/ChatShell';
import { LegalModule } from '@/components/LegalModule';

export function PredictApp(){
  const [surface,setSurface]=useState<'chat'|'legal'>('chat');

  if(surface==='legal'){
    return <LegalModule onBack={()=>setSurface('chat')} onOpenBuild={()=>setSurface('chat')}/>;
  }

  return <ChatShell onOpenLegal={()=>setSurface('legal')}/>;
}
