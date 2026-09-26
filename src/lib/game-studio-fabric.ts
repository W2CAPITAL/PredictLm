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

export function isGameDevelopmentTask(prompt:string){
  const q=norm(prompt);
  return /\b(game|jogo|gameplay|godot|unity|unreal|ue5|level design|npc|combat|hud|shader|multiplayer|playtest|vertical.?slice|mecanica de jogo|mecânica de jogo)\b/.test(q);
}

export function inferGameEngine(prompt:string):GameEngine{
  const q=norm(prompt);
  if(/\bgodot\b|gdscript|gdextension/.test(q))return 'godot';
  if(/\bunity\b|mono ?behaviour|addressables|dots|ecs/.test(q))return 'unity';
  if(/\bunreal\b|\bue5\b|blueprint|gas|commonui|replication/.test(q))return 'unreal';
  if(/\b(phaser|pixi|three\.?js|babylon|canvas|webgl|webgpu|browser game|jogo web)\b/.test(q))return 'web';
  return 'unknown';
}

export function inferStudioRigor(prompt:string):StudioRigor{
  const q=norm(prompt);
  if(/\b(full|completo|commercial|comercial|production|producao|produção|release|multiplayer|live ops|live-ops|console|steam)\b/.test(q))return 'full';
  if(/\b(standard|vertical.?slice|sprint|milestone|arquitetura|architecture|equipe|team|systems?|sistemas?)\b/.test(q))return 'standard';
  return 'minimal';
}

export function gameStudioPlan(prompt:string):GameStudioPlan{
  if(!isGameDevelopmentTask(prompt)){
    return {active:false,engine:'unknown',rigor:'minimal',roles:[],gates:[],evidence:[],verticalSlice:false};
  }
  const engine=inferGameEngine(prompt);
  const rigor=inferStudioRigor(prompt);
  const q=norm(prompt);
  const visual=/\b(ui|hud|menu|level|mapa|scene|cena|shader|vfx|art|arte|anim|camera|câmera|visual|render)\b/.test(q);
  const gameplay=/\b(gameplay|combat|npc|ai|ia|movement|movimento|physics|fisica|física|economy|economia|quest|missao|missão)\b/.test(q);
  const multiplayer=/\b(multiplayer|network|rede|replication|servidor|server|coop|co-op|pvp)\b/.test(q);
  const verticalSlice=/\b(vertical.?slice|fatia vertical|prototype|prot[oó]tipo|mvp)\b/.test(q)||rigor!=='minimal';

  const roles=[
    'producer',
    'creative-director',
    'technical-director',
    ...(gameplay?['game-designer','gameplay-programmer']:[]),
    ...(visual?['art-director','ui/ux-specialist']:[]),
    ...(multiplayer?['network-specialist']:[]),
    'qa/playtest'
  ];

  const gates=[
    'scope/vision alignment',
    'architecture feasibility',
    ...(visual?['run-and-observe visual verification']:[]),
    'regression/smoke verification',
    ...(verticalSlice?['vertical-slice end-to-end validation']:[])
  ];

  const evidence=[
    'changed files + acceptance criteria',
    'tests or smoke results for changed behavior',
    ...(visual?['rendered screenshot/video or an explicit NOT VERIFIED gap']:[]),
    ...(gameplay?['playtest observation for the changed loop when feasible']:[])
  ];

  return {active:true,engine,rigor,roles,gates,evidence,verticalSlice};
}

export function gameStudioContext(prompt:string){
  const plan=gameStudioPlan(prompt);
  if(!plan.active)return '';
  return [
    'GAME STUDIO FABRIC — adapt the MIT-licensed coordination patterns from Claude-Code-Game-Studios without cloning its whole process.',
    'Engine: '+plan.engine+'. Rigor: '+plan.rigor+'.',
    'Roles: '+plan.roles.join(' → ')+'.',
    'Gates: '+plan.gates.join(' · ')+'.',
    'Evidence: '+plan.evidence.join(' · ')+'.',
    plan.rigor==='minimal'
      ? 'Keep process light: one brief, direct implementation, smoke/run evidence, then iterate.'
      : plan.rigor==='standard'
        ? 'Use a scoped design/architecture note, one end-to-end slice, then expand only after the slice works.'
        : 'Use explicit architecture/design ownership, broader QA/release gates and playtest evidence, but do not create paperwork with no decision value.',
    plan.verticalSlice
      ? 'Vertical-slice rule: validate one complete start → challenge → resolution loop at representative quality before scaling production.'
      : '',
    'Visible change rule: a parse/build is not proof the result looks correct. When the host can render, run it and inspect retained evidence; otherwise say visual verification is still pending.',
    'Cross-domain rule: specialists may advise outside their domain, but design/technical conflicts are resolved by the appropriate director and coordinated by the producer.',
    'User decisions remain authoritative; agents structure the work rather than replacing product decisions.'
  ].filter(Boolean).join('\n');
}
