import test from 'node:test';
import assert from 'node:assert/strict';
import { planAgenticRun, projectInstructionContext, selectSkillContracts } from '../src/lib/agent-runtime/agentic-fabric';

test('build tasks use staged expert roles',()=>{
  const plan=planAgenticRun('Implemente autenticação, banco, testes E2E e responsividade mobile em um SaaS existente.','build',false);
  assert.equal(plan.staged,true);
  assert.ok(plan.roles.includes('explorer'));
  assert.ok(plan.roles.includes('architect'));
  assert.ok(plan.roles.includes('reviewer'));
  assert.ok(plan.roles.includes('test-analyst'));
});

test('media tasks retrieve visual skills without loading entire catalog',()=>{
  const selected=selectSkillContracts('gere uma imagem fiel de personagem conhecido usando referências visuais','media',6);
  const ids=selected.map(x=>x.id);
  assert.ok(ids.includes('grok-imagine-parity'));
  assert.ok(ids.includes('visual-reference-grounding'));
  assert.ok(selected.length<=6);
});

test('project instructions are scoped and compacted',()=>{
  const context=projectInstructionContext([
    {path:'AGENTS.md',language:'markdown',content:'Preserve existing behavior.'},
    {path:'src/AGENTS.md',language:'markdown',content:'Use strict TypeScript in src.'},
    {path:'docs/AGENTS.md',language:'markdown',content:'Docs only.'},
    {path:'src/App.tsx',language:'typescript',content:'export default function App(){return null}'}
  ],['src/App.tsx']);
  assert.match(context,/Preserve existing behavior/);
  assert.match(context,/Use strict TypeScript/);
  assert.doesNotMatch(context,/Docs only/);
});
