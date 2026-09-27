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
        <p>Único modo de Simulação do PredictLM: um Minecraft persistente onde os cérebros de camundongo, mosca, macaco e humano enxergam por POV próprio, exploram, mineram, constroem, combatem, sobrevivem e aprendem no mesmo mundo.</p>
      </div>
    </header>
    <MinecraftSimulationPanel/>
  </section>;
}
