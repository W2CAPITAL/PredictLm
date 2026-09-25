import {WORLD_OBJECTS,type LifeWorldObject} from './life-world-open';

export type PovActor='human'|'fly'|'macaque';

export interface PovCamera{
  actor:PovActor;
  x:number;
  y:number;
  eyeZ:number;
  heading:number;
  fovDeg:number;
  range:number;
}

export interface PovVoxel{
  id:string;
  label:string;
  kind:string;
  distance:number;
  forward:number;
  right:number;
  x:number;
  y:number;
  w:number;
  d:number;
  h:number;
}

const normAngle=(a:number)=>{
  let x=a;
  while(x>Math.PI)x-=Math.PI*2;
  while(x<-Math.PI)x+=Math.PI*2;
  return x;
};

export function worldToCamera(camera:PovCamera,x:number,y:number,z=0){
  const dx=x-camera.x,dy=y-camera.y;
  const c=Math.cos(camera.heading),s=Math.sin(camera.heading);
  const forward=c*dx+s*dy;
  const right=-s*dx+c*dy;
  return {forward,right,vertical:z-camera.eyeZ,distance:Math.hypot(dx,dy)};
}

export function projectPerspective(
  camera:PovCamera,x:number,y:number,z:number,width:number,height:number
){
  const local=worldToCamera(camera,x,y,z);
  if(local.forward<=2)return null;
  const focal=(width*.5)/Math.tan((camera.fovDeg*Math.PI/180)/2);
  return {
    x:width*.5+(local.right/local.forward)*focal,
    y:height*.52-(local.vertical/local.forward)*focal,
    depth:local.forward
  };
}

function objectVisible(camera:PovCamera,obj:LifeWorldObject){
  const local=worldToCamera(camera,obj.x,obj.y,obj.z*.5);
  if(local.distance>camera.range||local.forward<=2)return false;
  const angle=Math.abs(normAngle(Math.atan2(local.right,local.forward)));
  return angle<=(camera.fovDeg*Math.PI/180)/2+.12;
}

export function buildFirstPersonScene(camera:PovCamera,objects:LifeWorldObject[]=WORLD_OBJECTS):PovVoxel[]{
  return objects.filter(obj=>objectVisible(camera,obj)).map(obj=>{
    const local=worldToCamera(camera,obj.x,obj.y,obj.z*.5);
    return {
      id:obj.id,label:obj.label,kind:obj.kind,distance:local.distance,forward:local.forward,right:local.right,
      x:obj.x,y:obj.y,w:Math.max(5,obj.w),d:Math.max(5,obj.h),h:Math.max(5,obj.z)
    };
  }).sort((a,b)=>b.forward-a.forward);
}

export function nearestPovTarget(camera:PovCamera,objects:LifeWorldObject[]=WORLD_OBJECTS){
  return [...buildFirstPersonScene(camera,objects)].sort((a,b)=>a.distance-b.distance)[0]||null;
}
