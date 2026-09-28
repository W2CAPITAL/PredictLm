import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NVIDIA_SKILL_CAPABILITIES,
  nvidiaCapabilityContext,
  nvidiaSkillsForPrompt,
  nvidiaVercelBoundary
} from '../src/lib/nvidia-capability-router';

test('requested NVIDIA skill set is registered',()=>{
  const ids=new Set(NVIDIA_SKILL_CAPABILITIES.map(x=>x.id));
  for(const id of [
    'rag-blueprint','aiq-research','accelerated-computing-cudf','cuopt-developer','cuopt-install',
    'aiq-deploy','cudaq-guide','cuopt-routing-api-python','deepstream-dev','data-designer','rag-eval',
    'skill-card-generator','cuopt-server-api-python','omniverse-usd-performance-tuning',
    'omniverse-cad-to-simready','nemotron-customize',
    'physical-ai-infrastructure-setup-and-resilient-scaling','physical-ai-neural-reconstruction',
    'omniverse-realtime-viewer','cuopt-numerical-optimization-formulation','dali-dynamic-mode','nemo-retriever'
  ])assert.ok(ids.has(id),id+' missing');
});

test('Vercel boundary never claims local CUDA for GPU skills',()=>{
  const deepstream=NVIDIA_SKILL_CAPABILITIES.find(x=>x.id==='deepstream-dev')!;
  assert.equal(deepstream.target,'gpu-host');
  assert.match(nvidiaVercelBoundary(deepstream),/host GPU|não instalar/i);

  const formulation=NVIDIA_SKILL_CAPABILITIES.find(x=>x.id==='cuopt-numerical-optimization-formulation')!;
  assert.equal(formulation.target,'vercel-safe');
});

test('NVIDIA router selects relevant capabilities instead of loading every skill',()=>{
  const rag=nvidiaSkillsForPrompt('melhore o RAG e avalie a qualidade da recuperação',4).map(x=>x.id);
  assert.ok(rag.includes('rag-blueprint')||rag.includes('rag-eval')||rag.includes('nemo-retriever'));

  const usd=nvidiaSkillsForPrompt('otimize FPS e memória de uma cena USD Omniverse',4).map(x=>x.id);
  assert.ok(usd.includes('omniverse-usd-performance-tuning'));

  const context=nvidiaCapabilityContext('usar DeepStream para analytics de vídeo');
  assert.match(context,/deepstream-dev/);
  assert.match(context,/gpu-host/);
});
