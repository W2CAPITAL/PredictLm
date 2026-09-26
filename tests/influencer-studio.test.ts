import test from 'node:test';
import assert from 'node:assert/strict';

import {classifyMasterRoute,predictLMMasterContext} from '../src/lib/predictlm-master';
import {
  LUXURY_GOTH_PROFILE,
  createInfluencerCampaignPlan,
  isInfluencerStudioRequest
} from '../src/lib/social/influencer-studio';
import {runtimeAdapterStates} from '../src/lib/fusion/runtime-adapters';
import {fusionHealth,fusionSourcesFor} from '../src/lib/fusion/capability-fabric';

test('routes Instagram creator campaigns to the social studio',()=>{
  const prompt='Crie uma influenciadora gótica de luxo no Instagram, faça fotos, Reels e configure as postagens';
  assert.equal(isInfluencerStudioRequest(prompt),true);
  assert.equal(classifyMasterRoute(prompt),'social');
  const context=predictLMMasterContext(prompt,true);
  assert.match(context,/AI INFLUENCER STUDIO/);
  assert.match(context,/persistent fictional adult persona/i);
});

test('keeps one adult fictional identity and AI disclosure across the campaign',()=>{
  const plan=createInfluencerCampaignPlan({days:7,locale:'pt-BR',referenceImageCount:1});
  assert.equal(plan.profile.id,LUXURY_GOTH_PROFILE.id);
  assert.equal(plan.profile.adultAge,23);
  assert.equal(plan.profile.identityRule.includes('Fictional adult virtual creator'),true);
  assert.equal(plan.content.length,7);
  for(const item of plan.content){
    assert.equal(item.aiDisclosure,true);
    assert.match(item.generationPrompt,/consistent fictional adult woman, age 23/i);
    assert.match(item.generationPrompt,/Do not change facial identity/i);
  }
});

test('growth policy rejects spam and fake engagement',()=>{
  const plan=createInfluencerCampaignPlan({days:3});
  assert.equal(plan.engagement.prohibited.includes('mass automated comments'),true);
  assert.equal(plan.engagement.prohibited.includes('fake likes/followers'),true);
  assert.match(plan.engagement.daily,/genuinely relevant comments/i);
});

test('registers creator voice and publisher adapters without pretending they are configured',()=>{
  const states=runtimeAdapterStates();
  const ids=new Set(states.map(x=>x.id));
  assert.equal(ids.has('gpt-sovits'),true);
  assert.equal(ids.has('vibevoice'),true);
  assert.equal(ids.has('social-publisher'),true);
});

test('capability fusion covers the requested creator source set',()=>{
  const health=fusionHealth();
  assert.equal(health.requestedCoverage.complete,true);
  const social=fusionSourcesFor('social','voice reels captions identity',20);
  const repos=new Set(social.map(x=>x.repo));
  assert.equal(repos.has('RVC-Boss/GPT-SoVITS'),true);
  assert.equal(repos.has('microsoft/VibeVoice'),true);
  assert.equal(repos.has('blader/humanizer'),true);
});
