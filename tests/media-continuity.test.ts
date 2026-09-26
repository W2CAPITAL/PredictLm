import test from 'node:test';
import assert from 'node:assert/strict';
import {buildMediaContinuityLedger,mediaContinuityContext} from '../src/lib/media/continuity-tracker';
import {buildGenerativeVideoPrompt,buildStoryboardFrames,MEDIA_PIPELINE_PATTERNS} from '../src/lib/media/video-pipelines';

test('video continuity ledger keeps identity and state transitions explicit',()=>{
  const ledger=buildMediaContinuityLedger({
    prompt:'Naruto Kurama lutando com Sasuke Susanoo',
    style:'Anime',
    aspect:'16:9',
    referenceCount:2
  });
  assert.match(ledger.subjectLock,/Naruto Kurama/i);
  assert.match(ledger.subjectLock,/2 visual reference/i);
  assert.ok(ledger.temporalRules.some(x=>/same entity/i.test(x)));
  assert.ok(ledger.temporalRules.some(x=>/start state/i.test(x)));
});

test('storyboard and generative prompt include temporal continuity contract',()=>{
  const frames=buildStoryboardFrames('duas personagens atravessam a mesma rua','Cinematic','16:9');
  assert.equal(frames.length,3);
  assert.ok(frames.every(frame=>/continuity|same subject identity/i.test(frame.prompt)));

  const prompt=buildGenerativeVideoPrompt({
    prompt:'duas personagens atravessam a mesma rua',
    style:'Cinematic',
    aspect:'16:9',
    durationMs:6000
  });
  assert.match(prompt,/TEMPORAL CONTINUITY LEDGER/i);
  assert.match(prompt,/start state/i);
  assert.match(prompt,/end state/i);
});

test('media pipeline registers requested tracking and postprocess references',()=>{
  const repos=new Set(MEDIA_PIPELINE_PATTERNS.map(x=>x.repo));
  for(const repo of [
    'playbox-dev/trackstudio',
    'darkzOGx/youtube-automation-agent',
    'Comfy-Org/ComfyUI',
    'TachibanaYoshino/AnimeGANv3',
    'upscayl/upscayl'
  ])assert.ok(repos.has(repo),'missing media pattern '+repo);
});

test('continuity context identifies its pattern as tracking-inspired without claiming TrackStudio executed',()=>{
  const context=mediaContinuityContext({prompt:'uma pessoa entra no café e senta',style:'Cinematic',aspect:'16:9'});
  assert.match(context,/TrackStudio-inspired/i);
  assert.doesNotMatch(context,/TrackStudio executed|TrackStudio rodou/i);
});
