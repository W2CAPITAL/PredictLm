import type { WorkspaceFile } from './types';
import { hasLegacyEscapedNewlines } from './workspace-repair';

export interface SmokeCheck { name:string; ok:boolean; detail:string; }
export interface SmokeReport { ok:boolean; score:number; checks:SmokeCheck[]; }

export function runLocalSmokeTest(files:WorkspaceFile[]):SmokeReport{
  const app=files.find(f=>/(^|\/)App\.(tsx|jsx|js|ts)$/.test(f.path));
  const css=files.find(f=>/styles?\.css$|globals\.css$/.test(f.path));
  const code=app?.content||'';
  const buttonCount=(code.match(/<button\b/g)||[]).length;
  const handlerCount=(code.match(/onClick\s*=|onSubmit\s*=|onChange\s*=/g)||[]).length;
  const checks:SmokeCheck[]=[
    {name:'App entry',ok:!!app,detail:app?'App entry found.':'No App.tsx/App.jsx entry found.'},
    {name:'Styles',ok:!!css,detail:css?'Stylesheet found.':'No stylesheet found.'},
    {name:'Interactive actions',ok:buttonCount===0||handlerCount>0,detail:buttonCount+' button(s), '+handlerCount+' event handler(s).'},
    {name:'No placeholder CTA',ok:!/<button[^>]*>\s*Começar\s*<\/button>/i.test(code),detail:'Detects the old inert Começar button pattern.'},
    {name:'Valid structural newlines',ok:!hasLegacyEscapedNewlines(code),detail:hasLegacyEscapedNewlines(code)?'App contains literal \\n separators outside strings and will fail Babel preview.':'No legacy escaped structural newlines detected.'},
    {name:'Responsive hints',ok:/@media|max-width|grid-template|flex-wrap/.test((css?.content||'')+code),detail:'Responsive CSS/layout heuristic.'},
    {name:'No external-model requirement',ok:!/(ollama|localhost:11434)/i.test(code),detail:'Generated app itself does not require a local model.'}
  ];
  const passed=checks.filter(x=>x.ok).length;
  return {ok:passed===checks.length,score:Math.round((passed/checks.length)*100),checks};
}

export function createStoryboard(projectName:string){
  return [
    '# '+projectName+' — Storyboard',
    '',
    'Generated locally by PredictLM. No media API was called.',
    '',
    '## 01 · Hook (0–3s)',
    'Show the result first: the product working on screen. One sentence promise, no generic hype.',
    '',
    '## 02 · Problem (3–7s)',
    'Show the friction the product removes with one concrete before/after moment.',
    '',
    '## 03 · Build reveal (7–12s)',
    'Fast cuts: prompt → DeepThink plan → files → live preview.',
    '',
    '## 04 · Functional proof (12–18s)',
    'Click the main controls. Show a real state change, not a static mockup.',
    '',
    '## 05 · Quality proof (18–22s)',
    'Show Council, Security Gate and responsive preview.',
    '',
    '## 06 · Close (22–25s)',
    'Product name + concise CTA: Build, inspect, review, ship.'
  ].join('\n');
}

export function createLaunchScript(projectName:string){
  return [
    '# '+projectName+' — 25s Launch Script',
    '',
    '**0–3s** — “You describe it. PredictLM turns it into a working app.”',
    '',
    '**3–8s** — Show DeepThink interpreting the request and generating files.',
    '',
    '**8–14s** — Interact with the generated app: type, click, calculate, move or save.',
    '',
    '**14–19s** — Open Inspect + Knowledge Graph + Council.',
    '',
    '**19–23s** — Show zero-API badge and export/import workflow.',
    '',
    '**23–25s** — “PredictLM Studio — build first, review before ship.”'
  ].join('\n');
}

export function createImagePrompts(projectName:string){
  return [
    '# '+projectName+' — Image Prompts',
    '',
    '## Product hero',
    'Premium software product hero, dark editorial interface, subtle violet glass highlights, crisp UI screenshot floating in depth, realistic monitor lighting, no fake text, restrained composition, high contrast.',
    '',
    '## Social launch',
    'Cinematic close-up of a modern developer workspace displaying '+projectName+', dark graphite environment, violet accent light, shallow depth of field, premium SaaS campaign, realistic screen reflections.',
    '',
    '## Feature card',
    'Minimal product feature visual, code editor and live preview side by side, polished dark UI, precise spacing, professional enterprise aesthetic, clean typography.'
  ].join('\n');
}

export function createIntegrationManifest(){
  return JSON.stringify({
    version:4,
    localFirst:true,
    required:[],
    optional:{
      firecrawl:'FIRECRAWL_API_KEY',
      serverAI:['AI_BASE_URL','AI_API_KEY','AI_MODEL'],
      puter:'user-session'
    },
    nativeBridges:['agent-browser','davinci-resolve-mcp','apk-inspector'],
    note:'Predict DeepThink, Council, Graph, Inspect, project import/export and local media planning work without external credentials.'
  },null,2);
}

export function createEnvExample(){
  return [
    '# PredictLM Studio — all variables below are optional',
    '',
    '# Deep web research upgrade (Research works in free fallback mode without it)',
    'FIRECRAWL_API_KEY=',
    '',
    '# Optional OpenAI-compatible server provider',
    'AI_BASE_URL=',
    'AI_API_KEY=',
    'AI_MODEL=',
    ''
  ].join('\n');
}

export function languageFromPath(path:string){
  if(/\.tsx?$/.test(path))return 'typescript';
  if(/\.jsx?$/.test(path))return 'javascript';
  if(/\.css$/.test(path))return 'css';
  if(/\.json$/.test(path))return 'json';
  if(/\.md$/.test(path))return 'markdown';
  if(/\.html$/.test(path))return 'html';
  return 'text';
}
