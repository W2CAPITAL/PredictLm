import {isMinecraftSandboxTask,minecraftSimulationContext} from '@/lib/simulation/minecraft-reference-fabric';
import {miroFishSimulationContext} from '@/lib/simulation/mirofish-fabric';

export type GameEngine='godot'|'unity'|'unreal'|'web'|'unknown';
export type StudioRigor='minimal'|'standard'|'full';

export interface GameStudioPlan{
  active:boolean;
  engine:GameEngine;
  rigor:StudioRigor;
  roles:string[];
  gates:string[];
  evidence:string[];
  verticalSlice:boolean;
}

function norm(value:string){
  return String(value||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'');
}

export function isSimulationStudioTask(prompt:string){
  const q=norm(prompt);
  return /\b(simulacao|simulação|simulador|simulation|cenario|cenário|vida|life|mundo|world|npc|agente|agent|autonomia|personagem|character|voxel|sandbox|sociedade|social simulation|contrafactual|counterfactual)\b/.test(q);
}

// Compatibilidade com chamadas antigas. Game Studio agora pertence à Simulação,
// não ao Build genérico.
export function isGameDevelopmentTask(prompt:string){
  return isSimulationStudioTask(prompt);
}

export function inferGameEngine(prompt:string):GameEngine{
  const q=norm(prompt);
  if(/\bgodot\b|gdscript|gdextension/.test(q))return 'godot';
  if(/\bunity\b|mono ?behaviour|addressables|dots|ecs/.test(q))return 'unity';
  if(/\bunreal\b|\bue5\b|blueprint|gas|commonui|replication/.test(q))return 'unreal';
  // Life Simulation Studio do PredictLM roda no navegador.
  return 'web';
}

export function inferStudioRigor(prompt:string):StudioRigor{
  const q=norm(prompt);
  if(/\b(full|completo|complexo|complexa|massivo|sociedade|cidade|economia|multi.?agent|muitos agentes|longa duracao|longa duração|persistente)\b/.test(q))return 'full';
  if(/\b(standard|cenario|cenário|sistema|systems?|rotina|relacoes|relações|memoria|memória|autonomia|contrafactual|counterfactual)\b/.test(q))return 'standard';
  return 'minimal';
}

export function gameStudioPlan(prompt:string,forceSimulation=false):GameStudioPlan{
  if(!forceSimulation&&!isSimulationStudioTask(prompt)){
    return {active:false,engine:'web',rigor:'minimal',roles:[],gates:[],evidence:[],verticalSlice:false};
  }
  const engine=inferGameEngine(prompt);
  const rigor=inferStudioRigor(prompt);
  const q=norm(prompt);
  const visual=/\b(camera|câmera|visual|voxel|mapa|scene|cena|render|pov|interface|ui|mundo)\b/.test(q);
  const social=/\b(relacao|relação|social|sociedade|amizade|trabalho|economia|família|familia|grupo)\b/.test(q);
  const autonomy=/\b(autonomia|decida|aja|npc|agente|agent|multi.?agent|emergente|emergent)\b/.test(q);
  const verticalSlice=rigor!=='minimal'||/\b(loop|ciclo|rotina completa|cenario completo|cenário completo|vertical.?slice)\b/.test(q);

  const roles=[
    'simulation-producer',
    'world/systems-director',
    'behavior-director',
    ...(visual?['visual-world-director']:[]),
    ...(social?['social-systems-designer']:[]),
    ...(autonomy?['agent-behavior-specialist']:[]),
    'simulation-qa/playtest'
  ];

  const gates=[
    'world-state consistency',
    'action feasibility against real simulation rules',
    'local-perception boundary',
    'memory/relationship continuity',
    ...(visual?['run-and-observe visual world verification']:[]),
    ...(autonomy?['autonomy safety + deterministic repair gate']:[]),
    ...(verticalSlice?['end-to-end simulated loop validation']:[])
  ];

  const evidence=[
    'state transition before/after',
    'agent action/history record',
    'memory/relationship continuity',
    ...(visual?['rendered world/POV observation or explicit NOT VERIFIED gap']:[]),
    ...(autonomy?['planner output repaired against allowed actions']:[])
  ];

  return {active:true,engine,rigor,roles,gates,evidence,verticalSlice};
}

export function gameStudioContext(prompt:string,forceSimulation=false){
  const plan=gameStudioPlan(prompt,forceSimulation);
  if(!plan.active)return '';
  const minecraft=isMinecraftSandboxTask(prompt);
  return [
    'SIMULATION GAME STUDIO — use the MIT-licensed coordination patterns from Claude-Code-Game-Studios inside the Life Simulation Studio only.',
    'This is not a generic Build workflow and must not turn ordinary coding tasks into a game studio process.',
    'Runtime: '+plan.engine+'. Rigor: '+plan.rigor+'.',
    'Internal roles: '+plan.roles.join(' → ')+'.',
    'Simulation gates: '+plan.gates.join(' · ')+'.',
    'Evidence: '+plan.evidence.join(' · ')+'.',
    plan.rigor==='minimal'
      ? 'Keep the simulation loop light: understand the instruction → validate actions → mutate real state → observe the result.'
      : plan.rigor==='standard'
        ? 'Coordinate world systems, agent behavior, memory and visible state before accepting a plan.'
        : 'Use explicit multi-agent/world-system ownership, contradiction checks, scenario branches and stronger QA while preserving bounded execution.',
    plan.verticalSlice
      ? 'Loop rule: validate a complete simulated perception → decision → action → consequence → memory cycle before expanding the scenario.'
      : '',
    'Simulation truth rule: narration never outranks state. If an action cannot be represented by the engine, do not pretend it happened.',
    'Perception rule: simulated agents act from their own visible/local state and memory, not omniscient world knowledge.',
    miroFishSimulationContext(),
    'Visual rule: when the browser renders the world, visible state should be checked from the rendered world/POV instead of inferred only from data.',
    minecraft?minecraftSimulationContext():'',
    'Playtest rule: observations describe simulator behavior and UX, never predictions about real human behavior.'
  ].filter(Boolean).join('\n');
}
