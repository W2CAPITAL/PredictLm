import test from 'node:test';
import assert from 'node:assert/strict';
import { WEBLLM_MODELS, WEBLLM_VRAM_MB, detectWebLLMHardware } from '../src/lib/webllm-runtime';

test('WebLLM quality tiers no longer use 0.5B/1.5B as primary browser models',()=>{
  assert.match(WEBLLM_MODELS.lite,/Qwen3-1\.7B/);
  assert.match(WEBLLM_MODELS.smart,/Qwen3\.5-4B/);
  assert.match(WEBLLM_MODELS.power,/Qwen3\.5-9B/);
  assert.ok(WEBLLM_VRAM_MB.lite<WEBLLM_VRAM_MB.smart);
  assert.ok(WEBLLM_VRAM_MB.smart<WEBLLM_VRAM_MB.power);
});

test('WebLLM hardware detection degrades cleanly when WebGPU is absent',async()=>{
  const profile=await detectWebLLMHardware();
  if(profile.webgpu){
    assert.ok(profile.recommended);
    assert.ok(profile.candidates.length>=1);
  }else{
    assert.equal(profile.recommended,null);
    assert.deepEqual(profile.candidates,[]);
  }
});
