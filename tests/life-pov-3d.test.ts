import test from 'node:test';
import assert from 'node:assert/strict';
import {buildFirstPersonScene,projectPerspective,type PovCamera} from '../src/lib/life-pov-3d';

test('first-person projection keeps objects in front and rejects objects behind the camera',()=>{
  const camera:PovCamera={actor:'human',x:0,y:0,eyeZ:16,heading:0,fovDeg:100,range:300};
  const scene=buildFirstPersonScene(camera,[
    {id:'front',label:'Front',kind:'computer',location:'Casa',x:80,y:0,z:16,w:20,h:20,affordances:['work'],salience:.5,flyAttraction:.1},
    {id:'back',label:'Back',kind:'computer',location:'Casa',x:-80,y:0,z:16,w:20,h:20,affordances:['work'],salience:.5,flyAttraction:.1}
  ] as any);
  assert.deepEqual(scene.map(x=>x.id),['front']);
  const p=projectPerspective(camera,80,0,16,640,360);
  assert.ok(p);
  assert.ok(Math.abs((p?.x||0)-320)<.001);
});
