/**
 * PredictLM Unity Fabric
 *
 * MIT-pattern adaptation from jbruening/UnEngine.
 * This is a TypeScript scene/runtime contract for browser surfaces plus a bridge
 * to a real Unity WebGL build when NEXT_PUBLIC_UNITY_SIMULATION_URL is configured.
 * It does not pretend Unity itself runs on Vercel.
 */

export interface UnityVector2{ x:number; y:number }
export interface UnityVector3{ x:number; y:number; z:number }
export interface UnityQuaternion{ x:number; y:number; z:number; w:number }

export interface UnityTransform{
  position:UnityVector3;
  rotation:UnityVector3;
  scale:UnityVector3;
}

export interface UnityComponentSnapshot{
  type:string;
  enabled:boolean;
  data:Record<string,unknown>;
}

export interface UnityGameObjectSnapshot{
  id:string;
  name:string;
  tag:string;
  active:boolean;
  layer:number;
  transform:UnityTransform;
  components:UnityComponentSnapshot[];
  children:string[];
}

export interface UnitySceneSnapshot{
  version:1;
  sceneId:string;
  tick:number;
  time:number;
  objects:UnityGameObjectSnapshot[];
  metadata:Record<string,unknown>;
}

export const UNITY_WEBGL_URL=String(process.env.NEXT_PUBLIC_UNITY_SIMULATION_URL||'').trim();

export function v3(x=0,y=0,z=0):UnityVector3{return{x,y,z}}
export function qIdentity():UnityQuaternion{return{x:0,y:0,z:0,w:1}}
export function add3(a:UnityVector3,b:UnityVector3):UnityVector3{return{x:a.x+b.x,y:a.y+b.y,z:a.z+b.z}}
export function sub3(a:UnityVector3,b:UnityVector3):UnityVector3{return{x:a.x-b.x,y:a.y-b.y,z:a.z-b.z}}
export function mul3(a:UnityVector3,k:number):UnityVector3{return{x:a.x*k,y:a.y*k,z:a.z*k}}
export function magnitude3(a:UnityVector3){return Math.hypot(a.x,a.y,a.z)}
export function distance3(a:UnityVector3,b:UnityVector3){return magnitude3(sub3(a,b))}
export function normalize3(a:UnityVector3){
  const m=magnitude3(a);
  return m<1e-9?v3():mul3(a,1/m);
}
export function lerp(a:number,b:number,t:number){return a+(b-a)*Math.max(0,Math.min(1,t))}
export function lerp3(a:UnityVector3,b:UnityVector3,t:number):UnityVector3{
  return{x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t),z:lerp(a.z,b.z,t)};
}
export function clamp(value:number,min:number,max:number){return Math.max(min,Math.min(max,value))}
export function moveTowards(current:UnityVector3,target:UnityVector3,maxDistanceDelta:number){
  const delta=sub3(target,current);
  const dist=magnitude3(delta);
  if(dist<=maxDistanceDelta||dist===0)return{...target};
  return add3(current,mul3(delta,maxDistanceDelta/dist));
}

export function createUnityTransform(position:UnityVector3=v3()):UnityTransform{
  return{position:{...position},rotation:v3(),scale:v3(1,1,1)};
}

export function createUnityGameObject(
  id:string,
  name:string,
  position:UnityVector3=v3(),
  components:UnityComponentSnapshot[]=[]
):UnityGameObjectSnapshot{
  return{
    id,
    name,
    tag:'Untagged',
    active:true,
    layer:0,
    transform:createUnityTransform(position),
    components,
    children:[]
  };
}

export function unityComponent(type:string,data:Record<string,unknown>={},enabled=true):UnityComponentSnapshot{
  return{type,enabled,data};
}

export function createUnityScene(
  sceneId:string,
  objects:UnityGameObjectSnapshot[],
  tick=0,
  time=0,
  metadata:Record<string,unknown>={}
):UnitySceneSnapshot{
  return{version:1,sceneId,tick,time,objects,metadata};
}

export function unityWebGLConfigured(){
  return /^https?:\/\//i.test(UNITY_WEBGL_URL)||UNITY_WEBGL_URL.startsWith('/');
}

export type UnityBridgeMessage=
  |{type:'predictlm:scene';scene:UnitySceneSnapshot}
  |{type:'predictlm:command';command:string;payload?:unknown}
  |{type:'predictlm:focus';objectId:string}
  |{type:'predictlm:reset'};

export function postUnityMessage(target:Window|null,message:UnityBridgeMessage){
  if(!target)return false;
  try{
    target.postMessage(message,'*');
    return true;
  }catch{return false}
}

export function unityFabricContext(){
  return [
    'UNITY FABRIC · Component/GameObject/Transform/Vector/Camera/Collider/Rigidbody/Input/Time semantics are adapted from the MIT UnEngine reference.',
    'BROWSER · PredictLM uses a native scene snapshot and canvas renderer by default.',
    'UNITY WEBGL · when NEXT_PUBLIC_UNITY_SIMULATION_URL is configured, the same scene snapshot can be sent to a real Unity WebGL host by postMessage.',
    'BOUNDARY · no claim is made that Unity executes on Vercel when the WebGL host is absent.'
  ].join('\n');
}
