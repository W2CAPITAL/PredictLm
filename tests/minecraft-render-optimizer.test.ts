import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  MINECRAFT_PERFORMANCE_REFERENCES,
  minecraftPerformanceReferenceAudit
} from '../src/lib/simulation/minecraft-performance-fabric';
import {
  MINECRAFT_RENDER_PROFILES,
  createAdaptiveRenderState,
  updateAdaptiveRenderState,
  effectiveRenderScale
} from '../src/lib/simulation/minecraft-render-optimizer';
import {minecraftMediaFileName} from '../src/lib/simulation/minecraft-media-capture';

test('all requested performance repositories are registered with explicit browser/native boundaries',()=>{
  const expected=[
    'rakanki911/DLSS5-Swapper',
    'Kizzuwatnaa/DLSS5-Autopilot',
    'Blinue/Magpie',
    'Merserk/dlss5-visual-enhancer',
    'perseval-BLR/NeuralScreen',
    'hellzerg/optimizer',
    'IgorMundstein/WinMemoryCleaner',
    'thedogecraft/sparkle',
    'GPUOpen-LibrariesAndSDKs/FidelityFX-SDK',
    'Minecraft-Radiance/Radiance',
    'fholger/openvr_fsr'
  ];
  const refs=new Map(MINECRAFT_PERFORMANCE_REFERENCES.map(x=>[x.repo,x]));
  for(const repo of expected){
    assert.ok(refs.has(repo),'missing performance reference '+repo);
    assert.ok((refs.get(repo)?.browserUse||'').length>20);
    assert.ok((refs.get(repo)?.nativeBoundary||'').length>20);
  }
  const audit=minecraftPerformanceReferenceAudit();
  assert.equal(audit.expected,11);
  assert.equal(audit.registered,11);
  assert.equal(audit.complete,true);
  const magpie=refs.get('Blinue/Magpie');
  assert.ok(magpie);
  assert.match(magpie?.role||'',/frame-rate limiting|duplicate-frame detection/i);
  assert.match(magpie?.nativeBoundary||'',/GPL-3\.0/);
});

test('auto render governor lowers scale under frame or memory pressure',()=>{
  const profile=MINECRAFT_RENDER_PROFILES.auto;
  let state=createAdaptiveRenderState(profile);
  const before=effectiveRenderScale(profile,state);
  state=updateAdaptiveRenderState(state,{renderMs:34,geometryMs:18,vertices:180000,memoryPressure01:.9},profile);
  assert.ok(state.scale<before);
  assert.equal(state.lastAdjustment,'down');
});

test('auto render governor can recover quality after sustained cheap frames',()=>{
  const profile=MINECRAFT_RENDER_PROFILES.auto;
  let state={...createAdaptiveRenderState(profile),scale:.58,ewmaRenderMs:7,ewmaGeometryMs:2,samples:12};
  const before=state.scale;
  for(let i=0;i<4;i++)state=updateAdaptiveRenderState(state,{renderMs:6,geometryMs:1.5,vertices:50000,memoryPressure01:.2},profile);
  assert.ok(state.scale>before);
});

test('render presets preserve view distance while reducing internal cost',()=>{
  assert.equal(MINECRAFT_RENDER_PROFILES.performance.maxViewRadius,24);
  assert.equal(MINECRAFT_RENDER_PROFILES.auto.maxViewRadius,24);
  assert.equal(MINECRAFT_RENDER_PROFILES.performance.farStep,2);
  assert.equal(MINECRAFT_RENDER_PROFILES.quality.farStep,1);
  assert.ok(MINECRAFT_RENDER_PROFILES.performance.renderScale<MINECRAFT_RENDER_PROFILES.quality.renderScale);
  assert.ok(MINECRAFT_RENDER_PROFILES.cinematic.renderScale>=1);
});

test('first person renderer caches GPU resources/geometry and exposes image/video capture',()=>{
  const ui=fs.readFileSync(path.resolve('src/components/MinecraftFirstPerson3D.tsx'),'utf8');
  assert.match(ui,/runtimeRef/);
  assert.match(ui,/geometryCacheRef/);
  assert.match(ui,/if\(uploadGeometry\)gl\.bufferData/);
  assert.match(ui,/requestAnimationFrame/);
  assert.match(ui,/exportEnhancedCanvasPng/);
  assert.match(ui,/mediaRecorderForCanvas/);
  assert.match(ui,/PNG HD/);
  assert.match(ui,/Gravar vídeo/);
});

test('knowledge fabric also registers every requested performance source',()=>{
  const cfg=JSON.parse(fs.readFileSync(path.resolve('config/github-knowledge-sources.json'),'utf8'));
  const repos=new Set((cfg.sources||[]).map((x:any)=>x.repo));
  for(const ref of MINECRAFT_PERFORMANCE_REFERENCES)assert.ok(repos.has(ref.repo),'missing knowledge source '+ref.repo);
});

test('media exports use PredictLM Minecraft names and appropriate extensions',()=>{
  assert.match(minecraftMediaFileName('image',123,'quality'),/^predictlm-minecraft-123-quality-.+\.png$/);
  assert.match(minecraftMediaFileName('video',123,'balanced'),/^predictlm-minecraft-123-balanced-.+\.webm$/);
});
