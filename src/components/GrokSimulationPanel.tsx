'use client';

import React from 'react';
import {Activity} from 'lucide-react';
import {MinecraftSimulationPanel} from '@/components/MinecraftSimulationPanel';

export function GrokSimulationPanel(){
  return <section className="sim-shell">
    <header className="sim-head">
      <div>
        <span className="sim-kicker"><Activity size={12}/> SIMULAÇÃO · MINECRAFT</span>
        <h1>Minecraft Cognitive World</h1>
        <p>Arena operacional do PredictLM: quatro controllers neuro-informados compartilham a mesma seed e são medidos por exploração, memória, planejamento, cooperação e sobrevivência. Não representa quatro cérebros biológicos completos.</p>
      </div>
    </header>
    <MinecraftSimulationPanel/>
  </section>;
}
