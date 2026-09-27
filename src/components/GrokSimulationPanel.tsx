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
        <p>Único modo de Simulação do PredictLM: Minecraft persistente em 3D e primeira pessoa, com POV real separado para camundongo, mosca, macaco e humano; os quatro exploram, mineram, constroem, combatem, sobrevivem e aprendem no mesmo mundo.</p>
      </div>
    </header>
    <MinecraftSimulationPanel/>
  </section>;
}
