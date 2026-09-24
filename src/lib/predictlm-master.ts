import { isDecisionRequest } from './decision-centum';

function normalize(input:string){
  return String(input||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/\s+/g,' ').trim();
}

export type MasterRoute=
  |'chat'|'build'|'research'|'legal'|'process'|'media'|'tutor'
  |'simulation-scenarios'|'simulation-world'|'diagnostics';

export function isScenarioSimulationRequest(prompt:string){
  const q=normalize(prompt);
  if(!q)return false;
  const explicit=/\b(simule|simular|simulacao|simulação|cenario|cenário|cenarios|cenários|o que acontece se|o que aconteceria se|e se eu|e se a gente|possiveis resultados|possíveis resultados|projecao|projeção|preveja os efeitos|como pode terminar|o que pode acontecer)\b/.test(q);
  const visualWorld=/\b(simulacao de vida|simulação de vida|life simulation|mundo vivo|personagem ativa)\b/.test(q)&&/\b(abra|abrir|inicie|iniciar|rode|rodar|execute|executar|comece|comecar|quero ver)\b/.test(q);
  return explicit&&!visualWorld;
}

export function scenarioSimulationContext(prompt:string,deep=false){
  if(!isScenarioSimulationRequest(prompt))return '';
  const branches=deep?7:5;
  return [
    'SCENARIO LAB — counterfactual multi-world simulation.',
    'This is analytical simulation, not prophecy. Never present hypothetical futures as certain facts.',
    'Simulate '+branches+' materially different plausible worlds before answering:',
    '1. BASELINE — most ordinary continuation under current assumptions.',
    '2. UPSIDE — conditions under which the action works better than expected.',
    '3. DOWNSIDE — plausible failure path and its early warning signs.',
    '4. ADVERSARIAL — how another person/system/incentive could react against the plan.',
    '5. THIRD PATH — option C, staged experiment, reframing or hybrid that changes the dilemma.',
    deep?'6. SECOND ORDER — delayed consequences after the first visible result.':'',
    deep?'7. REVERSAL WORLD — what new fact would flip the conclusion.':'',
    'For each world internally track: assumptions, trigger, short-term result, second-order effect, who benefits, who bears risk, reversibility, and observable signals.',
    'Compare both sides of the coin and the third side. Look for conclusions that remain useful across several worlds.',
    'If probabilities are not backed by data, do not invent percentages. Use qualitative likelihood language and say what evidence would change it.',
    'Do not dump private chain-of-thought or all branch scratchpads. Public output should summarize the important scenarios, common risks, reversal conditions and the most robust next move.',
    'Do not activate the visual Life Simulation Studio unless the user explicitly asks to open/run the visual simulation.'
  ].filter(Boolean).join('\n');
}

export function classifyMasterRoute(prompt:string):MasterRoute{
  const q=normalize(prompt);
  if(isScenarioSimulationRequest(prompt))return 'simulation-scenarios';
  if(/\b(simulacao de vida|simulação de vida|life simulation|mundo vivo|personagem ativa)\b/.test(q)&&/\b(abra|abrir|inicie|iniciar|rode|rodar|execute|executar|comece|comecar|quero ver)\b/.test(q))return 'simulation-world';
  if(/\b(runtime|provider|modelo ativo|skill|router|debug|diagnostico|diagnóstico|log|trace)\b/.test(q))return 'diagnostics';
  if(/\b(build|app|aplicativo|site|sistema|codigo|código|implemente|corrija|exporte|zip)\b/.test(q))return 'build';
  if(/\b(cnj|datajud|djen|processo judicial|tribunal|dossie|dossiê)\b/.test(q))return 'process';
  if(/\b(juridic|jurídic|peticao|petição|recurso|contrato|tese legal)\b/.test(q))return 'legal';
  if(/\b(pesquise|pesquisar|fontes|research|noticia|notícia|atual|hoje|verifique na web)\b/.test(q))return 'research';
  if(/\b(imagem|video|vídeo|poster|logo|render|storyboard|imagine)\b/.test(q))return 'media';
  if(/\b(me ensine|aprenda|quiz|exercicio|exercício|tutor|plano de estudos)\b/.test(q))return 'tutor';
  return 'chat';
}

export function predictLMMasterContext(prompt:string,deep=false){
  const route=classifyMasterRoute(prompt);
  const decision=isDecisionRequest(prompt);
  return [
    'PREDICTLM MASTER — single sovereign behavior contract.',
    'All agents, prompts, tools, skills and product modules are internal capabilities of one assistant. They may collaborate internally, but only one coherent answer is public.',
    'Priority order: user intent > truth/evidence > safety/permissions > continuity > usefulness > style.',
    'Never let a specialist skill override the actual user request or speak as a separate personality.',
    'Human Presence is the public default: natural conversation, context-aware follow-ups, no operational diary, no unsolicited runtime/provider/skill narration.',
    'Default language is Brazilian Portuguese unless the user explicitly asks to switch language.',
    'Research is part of normal Chat when current/external evidence matters; Research is not a separate personality.',
    'Local neural, cloud providers and deterministic engines are cooperating brains. Provider/runtime choice is implementation detail unless asked.',
    'No generic fallback is allowed as the public answer. Technical failure may change execution path, never the user’s requested subject. If evidence is missing, state the specific limitation and still provide the best supported useful answer when possible.',
    'Continuity: preserve current project, conversation, case and user constraints. Do not silently restart.',
    'Internal reasoning may be deep and multi-pass; public output never exposes private chain-of-thought.',
    'Current master route: '+route+'.',
    decision?'This turn is decision-sensitive: apply Centum/Forge/Aegis/Council/Parallax internally as needed.':'Use the minimum internal machinery that improves the answer.',
    scenarioSimulationContext(prompt,deep)
  ].filter(Boolean).join('\n\n');
}
