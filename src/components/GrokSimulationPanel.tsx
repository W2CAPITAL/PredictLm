'use client';

import React from 'react';
import {Activity} from 'lucide-react';
import {MinecraftSimulationPanel} from '@/components/MinecraftSimulationPanel';

export function GrokSimulationPanel(){
  return <section className="sim-shell">
    <header className="sim-head">
      <div>
        <span className="sim-kicker"><Activity size={12}/> MINECRAFT AGENT LAB</span>
        <h1>Mundo persistente para agentes</h1>
        <p>Quatro controllers compartilham a mesma seed e o mesmo estado do mundo. Compare exploração, memória, planejamento, cooperação e sobrevivência com POV individual e execução reproduzível. Referências neurocientíficas são apenas priors de controller, não uma simulação de cérebros biológicos completos.</p>
      </div>
    </header>
    <MinecraftSimulationPanel/>
  </section>;
}
