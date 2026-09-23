'use client';

import React, { useState } from 'react';
import { ChatShell } from '@/components/ChatShell';
import { StudioShell } from '@/components/StudioShell';
import { LegalModule } from '@/components/LegalModule';
import { useStudio } from '@/lib/store';
import type { PanelId, StudioMode } from '@/lib/types';

export function PredictApp(){
  const studio=useStudio();
  const [surface,setSurface]=useState<'chat'|'build'|'legal'>('chat');

  const switchTo=(next:'chat'|'build'|'legal')=>{
    setSurface(next);
  };

  const openBuild=(panel:PanelId='agent',mode:StudioMode='build')=>{
    studio.setMode(mode);
    studio.setPanel(panel);
    switchTo('build');
  };

  if(surface==='legal'){
    return <LegalModule onBack={()=>switchTo('chat')} onOpenBuild={()=>openBuild('agent','build')}/>;
  }

  return surface==='chat'
    ? <ChatShell
        onOpenBuild={()=>openBuild('agent','build')}
        onOpenMedia={()=>openBuild('media','media')}
        onOpenResearch={()=>openBuild('research','research')}
        onOpenPlugins={()=>openBuild('connectors','build')}
        onOpenLegal={()=>switchTo('legal')}
      />
    : <StudioShell onExitToChat={()=>switchTo('chat')}/>;
}
