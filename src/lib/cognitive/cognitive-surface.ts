import {
  advanceCognitiveWorkspace,
  createCognitiveState,
  type CognitiveState
} from './cognitive-workspace';

export type CognitiveSurface=
  |'chat'
  |'legal'
  |'build'
  |'work'
  |'tutor'
  |'research'
  |'imagine'
  |'report';

export interface CognitiveSurfaceControl{
  surface:CognitiveSurface;
  attention:number;
  verification:number;
  integration:number;
  exploration:number;
  action:number;
  cores:{
    fly:number;
    mouse:number;
    macaque:number;
    human:number;
  };
  directive:string;
}

const clamp=(v:number)=>Math.max(0,Math.min(1,v));

function surfaceDirective(surface:CognitiveSurface,control:Omit<CognitiveSurfaceControl,'directive'>){
  const common=[
    'Use all four lightweight cognitive controllers silently: fly, mouse, macaque and human.',
    'They are software control signals informed by neuroscience references, not simulated biological minds.',
    'Never expose internal controller scores unless the user explicitly asks for technical diagnostics.'
  ];
  const specific:Record<CognitiveSurface,string[]>={
    chat:[
      'Keep the answer tightly aligned to the current request.',
      'Use uncertainty to calibrate claims and use exploration for at most one useful alternative.'
    ],
    legal:[
      'Prioritize decisive procedural events, chronology, source conflicts and explicit uncertainty.',
      'Never turn missing DataJud/DJEN data into a legal conclusion.'
    ],
    build:[
      'Prioritize blockers, dependency relationships, changed-file risk, testable state transitions and verification before completion.',
      'Preserve the existing architecture unless the request explicitly requires replacement.'
    ],
    work:[
      'Maintain task continuity, completion criteria and ordered execution across multiple steps.',
      'Prefer verified progress over broad branching.'
    ],
    tutor:[
      'Adapt explanation depth to uncertainty and working-memory load.',
      'Use discriminative examples, active recall and a small next step rather than dumping material.'
    ],
    research:[
      'Prioritize relevant evidence, contradictory signals, source quality and uncertainty.',
      'Explore alternatives only when they can change the answer.'
    ],
    imagine:[
      'Preserve subject identity and requested action while improving visual hierarchy, composition and controlled novelty.',
      'Do not let novelty override fidelity constraints.'
    ],
    report:[
      'Prioritize evidence hierarchy, contradictions, causal separation, structure and calibrated conclusions.',
      'Keep unsupported inference visibly separate from sourced facts.'
    ]
  };
  return [
    ...common,
    ...specific[surface],
    'Control summary: attention '+Math.round(control.attention*100)+'%, verification '+Math.round(control.verification*100)+'%, integration '+Math.round(control.integration*100)+'%, exploration '+Math.round(control.exploration*100)+'%, action '+Math.round(control.action*100)+'%.'
  ].join('\n');
}

export function cognitiveSurfaceControl(
  state:CognitiveState,
  surface:CognitiveSurface
):CognitiveSurfaceControl{
  const fly=clamp(
    state.fly.salience*.34+
    state.fly.actionSelection*.22+
    state.fly.exploration*.18+
    (1-state.fly.predictionError)*.26
  );
  const mouse=clamp(
    state.mouse.visualIntegration*.24+
    state.mouse.functionalCoupling*.24+
    state.mouse.mesoscaleProjection*.18+
    state.mouse.exploration*.14+
    (1-state.mouse.uncertainty)*.20
  );
  const macaque=clamp(
    state.macaque.regionalIntegration*.30+
    state.macaque.pfcProjectionIntegration*.26+
    state.macaque.visualHierarchy*.18+
    state.macaque.claustrumIntegration*.12+
    (1-state.macaque.uncertainty)*.14
  );
  const human=clamp(
    state.human.executiveControl*.28+
    state.human.workingMemory*.22+
    state.human.metacognition*.22+
    state.human.recurrentIntegration*.18+
    (1-state.human.predictiveError)*.10
  );

  const attention=clamp(fly*.31+mouse*.19+macaque*.20+human*.30);
  const verification=clamp(
    (1-state.fly.predictionError)*.19+
    state.mouse.inhibition*.18+
    (1-state.macaque.uncertainty)*.18+
    state.human.metacognition*.29+
    state.human.inhibition*.16
  );
  const integration=clamp(
    state.fly.centralComplex*.12+
    state.mouse.functionalCoupling*.21+
    state.macaque.regionalIntegration*.27+
    state.human.recurrentIntegration*.40
  );
  const exploration=clamp(
    state.fly.exploration*.27+
    state.mouse.exploration*.24+
    state.macaque.visualHierarchy*.14+
    state.human.neuro.curiosity*.35
  );
  const action=clamp(
    state.fly.actionSelection*.25+
    state.mouse.mesoscaleProjection*.15+
    state.macaque.pfcProjectionIntegration*.22+
    state.human.executiveControl*.38
  );

  const base={
    surface,
    attention,
    verification,
    integration,
    exploration,
    action,
    cores:{fly,mouse,macaque,human}
  };
  return {...base,directive:surfaceDirective(surface,base)};
}

export function cognitiveSurfaceContext(state:CognitiveState,surface:CognitiveSurface){
  const control=cognitiveSurfaceControl(state,surface);
  return [
    'PREDICTLM FOUR-CORE CONTROL · '+surface.toUpperCase(),
    'Fly '+Math.round(control.cores.fly*100)+'% · Mouse '+Math.round(control.cores.mouse*100)+'% · Macaque '+Math.round(control.cores.macaque*100)+'% · Human '+Math.round(control.cores.human*100)+'%.',
    control.directive
  ].join('\n');
}

export function cognitiveSurfaceFromPrompt(prompt:string,surface:CognitiveSurface){
  // Stateless server routes use a stable seed so the controller does not
  // invalidate caches merely because Date.now() changed. Browser Chat still
  // uses its persisted CognitiveState and keeps normal temporal continuity.
  const base=createCognitiveState();
  base.mouse={...base.mouse,lastUpdated:0};
  const state=advanceCognitiveWorkspace(base,prompt);
  return {
    state,
    control:cognitiveSurfaceControl(state,surface),
    context:cognitiveSurfaceContext(state,surface)
  };
}
