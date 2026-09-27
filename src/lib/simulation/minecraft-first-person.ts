import type {VoxelWorldState} from '@/lib/simulation/minecraft-sandbox';
import type {MinecraftBrainId,MinecraftBrainState} from '@/lib/simulation/minecraft-brain-agents';

export type MinecraftViewTarget='player'|MinecraftBrainId;

export interface FirstPersonVisionProfile{
  label:string;
  fov:number;
  eyeOffset:number;
  maxPitch:number;
  description:string;
  visual:'human'|'macaque'|'mouse'|'fly';
}

export const FIRST_PERSON_VISION:Record<MinecraftViewTarget,FirstPersonVisionProfile>={
  player:{label:'Você',fov:82,eyeOffset:.62,maxPitch:1.35,description:'primeira pessoa manual',visual:'human'},
  human:{label:'Humano',fov:82,eyeOffset:.62,maxPitch:1.35,description:'visão binocular detalhada e planejamento espacial',visual:'human'},
  macaque:{label:'Macaco',fov:96,eyeOffset:.48,maxPitch:1.3,description:'campo frontal amplo, mobilidade e contraste de terreno',visual:'macaque'},
  mouse:{label:'Camundongo',fov:112,eyeOffset:.12,maxPitch:1.15,description:'câmera baixa, mundo em grande escala e foco em abrigo próximo',visual:'mouse'},
  fly:{label:'Mosca',fov:148,eyeOffset:.34,maxPitch:1.45,description:'campo muito amplo, movimento rápido e prioridade espacial',visual:'fly'}
};

export interface FirstPersonCameraPose{
  target:MinecraftViewTarget;
  label:string;
  x:number;
  y:number;
  z:number;
  yaw:number;
  pitch:number;
  fov:number;
  visual:FirstPersonVisionProfile['visual'];
  description:string;
}

function clamp(value:number,min:number,max:number){return Math.max(min,Math.min(max,value))}

export function minecraftFirstPersonPose(
  world:VoxelWorldState,
  brains:MinecraftBrainState,
  target:MinecraftViewTarget
):FirstPersonCameraPose{
  const profile=FIRST_PERSON_VISION[target];
  if(target==='player'){
    return{
      target,
      label:profile.label,
      x:world.player.x,
      y:world.player.y+profile.eyeOffset,
      z:world.player.z,
      yaw:Number.isFinite(world.player.yaw)?world.player.yaw:0,
      pitch:clamp(Number(world.player.pitch)||0,-profile.maxPitch,profile.maxPitch),
      fov:profile.fov,
      visual:profile.visual,
      description:profile.description
    };
  }
  const agent=brains.agents[target];
  return{
    target,
    label:agent.label,
    x:agent.x,
    y:agent.y+profile.eyeOffset+(target==='fly'?1.35:0),
    z:agent.z,
    yaw:Number.isFinite(agent.yaw)?agent.yaw:0,
    pitch:clamp(Number(agent.pitch)||0,-profile.maxPitch,profile.maxPitch),
    fov:profile.fov,
    visual:profile.visual,
    description:profile.description
  };
}
