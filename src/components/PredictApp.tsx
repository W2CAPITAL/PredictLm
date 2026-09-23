'use client';

import React, { useEffect, useState } from 'react';
import { ChatShell } from '@/components/ChatShell';
import { StudioShell } from '@/components/StudioShell';

export function PredictApp(){
  const [surface,setSurface]=useState<'chat'|'build'>('chat');
  useEffect(()=>{
    const saved=localStorage.getItem('predictlm-surface');
    if(saved==='build'||saved==='chat')setSurface(saved);
  },[]);
  const switchTo=(next:'chat'|'build')=>{setSurface(next);localStorage.setItem('predictlm-surface',next)};
  return surface==='chat'
    ? <ChatShell onOpenBuild={()=>switchTo('build')}/>
    : <StudioShell onExitToChat={()=>switchTo('chat')}/>;
}
