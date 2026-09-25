import test from 'node:test';
import assert from 'node:assert/strict';
import {cameraForFocus,pointInPolygon,projectedPlacePolygon,projectIsoPoint,unprojectIsoPoint} from '../src/lib/life-sim-25d';
import {createLifeSimulation} from '../src/lib/life-simulation-engine';
import {createFlySimulationState,stepFlySimulation} from '../src/lib/cognitive/fly-simulation';

test('isometric projection round-trips logical world coordinates',()=>{
  const camera={zoom:1.1,offsetX:18,offsetY:-9};
  for(const [x,y] of [[0,0],[320,180],[640,360],[110,255],[530,95]]){
    const screen=projectIsoPoint(x,y,0,720,430,camera);
    const world=unprojectIsoPoint(screen.x,screen.y,720,430,camera);
    assert.ok(Math.abs(world.x-x)<.001,`x ${x}`);
    assert.ok(Math.abs(world.y-y)<.001,`y ${y}`);
  }
});

test('projected life-sim lots remain clickable in 2.5D',()=>{
  const state=createLifeSimulation();
  const camera={zoom:1,offsetX:0,offsetY:10};
  for(const place of state.places){
    const polygon=projectedPlacePolygon(place,720,430,camera);
    const center=projectIsoPoint(place.x+place.w/2,place.y+place.h/2,0,720,430,camera);
    assert.equal(pointInPolygon(center,polygon),true,place.id);
  }
});

test('camera focus centers human or fly targets without changing logical coordinates',()=>{
  const camera=cameraForFocus({x:120,y:270,z:0},720,430,1.2);
  const projected=projectIsoPoint(120,270,0,720,430,camera);
  assert.ok(Math.abs(projected.x-360)<.001);
  assert.ok(Math.abs(projected.y-227.9)<.001);
});

test('FlyWire simulation agent has persistent vertical flight motion for 2.5D',()=>{
  let fly=createFlySimulationState();
  assert.ok(fly.z>=20);
  const initialZ=fly.z;
  for(let i=0;i<10;i++){
    fly=stepFlySimulation(fly,{
      personX:320,
      personY:215,
      personAction:'caminhando',
      personLocation:'Parque'
    });
  }
  assert.ok(fly.z>=20&&fly.z<=76);
  assert.ok(Number.isFinite(fly.vz));
  assert.ok(fly.z!==initialZ||fly.vz!==0);
});
