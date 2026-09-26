import test from 'node:test';
import assert from 'node:assert/strict';
import {createEditorClip,createEditorProject,editorProjectDuration,normalizeEditorProject} from '../src/lib/media/editor-model';

test('Imagine editor project starts with a generated clip and sane defaults',()=>{
  const project=createEditorProject({width:1080,height:1920,sourceUrl:'https://example.com/video.mp4',sourceKind:'video',caption:'Legenda'});
  assert.equal(project.clips.length,1);
  assert.equal(project.clips[0].kind,'video');
  assert.equal(project.width,1080);
  assert.equal(project.height,1920);
  assert.equal(project.fps,24);
  assert.equal(project.caption,'Legenda');
});

test('timeline duration respects trim and playback speed',()=>{
  const project=createEditorProject({width:1280,height:720});
  const video={...createEditorClip({kind:'video',url:'https://example.com/a.mp4'}),trimStart:1,trimEnd:5,speed:2};
  const image={...createEditorClip({kind:'image',url:'https://example.com/a.jpg'}),duration:3,speed:1};
  project.clips=[video,image];
  assert.equal(editorProjectDuration(project),5);
});

test('editor normalization bounds unsafe or impractical values',()=>{
  const project=createEditorProject({width:9999,height:10});
  project.fps=120;
  project.caption='x'.repeat(500);
  project.clips=[{...createEditorClip({kind:'image',url:'x'}),duration:999,speed:99,trimStart:-8}];
  const normalized=normalizeEditorProject(project);
  assert.equal(normalized.width,1920);
  assert.equal(normalized.height,256);
  assert.equal(normalized.fps,30);
  assert.equal(normalized.caption.length,320);
  assert.equal(normalized.clips[0].duration,30);
  assert.equal(normalized.clips[0].speed,3);
  assert.equal(normalized.clips[0].trimStart,0);
});
