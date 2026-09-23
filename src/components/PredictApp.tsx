'use client';

import React, { useState } from 'react';
import { ChatShell } from '@/components/ChatShell';
import { StudioShell } from '@/components/StudioShell';
import { useStudio } from '@/lib/store';
import type { PanelId, StudioMode } from '@/lib/types';

export function PredictApp(){
  const studio=useStudio();
  const [surface,setSurface]=useState<'chat'|'build'>('chat');

  const switchTo=(next:'chat'|'build')=>{
    setSurface(next);
  };

  const openBuild=(panel:PanelId='agent',mode:StudioMode='build')=>{
    studio.setMode(mode);
    studio.setPanel(panel);
    switchTo('build');
  };

  return surface==='chat'
    ? <ChatShell
        onOpenBuild={()=>openBuild('agent','build')}
        onOpenMedia={()=>openBuild('media','media')}
        onOpenResearch={()=>openBuild('research','research')}
        onOpenPlugins={()=>openBuild('connectors','build')}
      />
    : <StudioShell onExitToChat={()=>switchTo('chat')}/>;
}
