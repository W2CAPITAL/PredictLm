import type {VoxelMob} from '@/lib/simulation/minecraft-sandbox';

export type ModelRGBA=[number,number,number,number];

export interface VoxelModelPart{
  id:string;
  dx:number;
  dy:number;
  dz:number;
  sx:number;
  sy:number;
  sz:number;
  color:ModelRGBA;
}

const c=(r:number,g:number,b:number,a=1):ModelRGBA=>[r,g,b,a];
const part=(id:string,dx:number,dy:number,dz:number,sx:number,sy:number,sz:number,color:ModelRGBA):VoxelModelPart=>({id,dx,dy,dz,sx,sy,sz,color});

const WHITE=c(.9,.9,.86),BLACK=c(.055,.05,.06),PINK=c(.92,.55,.62),BROWN=c(.38,.24,.14),DARK_BROWN=c(.22,.13,.08);
const GREEN=c(.22,.62,.25),DARK_GREEN=c(.12,.38,.16),BONE=c(.8,.82,.78),ZOMBIE=c(.28,.58,.33),BLUE=c(.18,.3,.48);
const PURPLE=c(.12,.06,.16),VIOLET=c(.55,.18,.68),YELLOW=c(.98,.64,.08),ORANGE=c(.95,.35,.05),RED=c(.72,.12,.12);
const VILLAGER=c(.52,.32,.2),ROBE=c(.42,.22,.16),END=c(.16,.05,.22),CYAN=c(.3,.9,.85);

function quadruped(body:ModelRGBA,head:ModelRGBA,leg:ModelRGBA,snout?:ModelRGBA){
  return [
    part('body',0,.78,0,1.18,.72,.62,body),
    part('head',0,.92,.52,.62,.62,.58,head),
    ...(snout?[part('snout',0,.82,.86,.46,.28,.32,snout)]:[]),
    part('leg-fl',-.4,.34,.25,.22,.62,.22,leg),part('leg-fr',.4,.34,.25,.22,.62,.22,leg),
    part('leg-bl',-.4,.34,-.25,.22,.62,.22,leg),part('leg-br',.4,.34,-.25,.22,.62,.22,leg),
    part('eye-l',-.17,1.02,.82,.09,.09,.05,BLACK),part('eye-r',.17,1.02,.82,.09,.09,.05,BLACK)
  ];
}

function humanoid(body:ModelRGBA,head:ModelRGBA,limb:ModelRGBA){
  return [
    part('torso',0,.95,0,.68,.9,.38,body),part('head',0,1.64,.02,.62,.62,.58,head),
    part('leg-l',-.2,.36,0,.23,.7,.25,limb),part('leg-r',.2,.36,0,.23,.7,.25,limb),
    part('arm-l',-.47,1.0,.02,.2,.82,.22,limb),part('arm-r',.47,1.0,.02,.2,.82,.22,limb),
    part('eye-l',-.16,1.72,.32,.08,.08,.05,BLACK),part('eye-r',.16,1.72,.32,.08,.08,.05,BLACK)
  ];
}

export function mobVoxelModel(kind:VoxelMob['kind']):VoxelModelPart[]{
  switch(kind){
    case'sheep':
      return [
        ...quadruped(WHITE,c(.72,.68,.62),c(.52,.44,.36),c(.5,.42,.34)),
        part('wool-top',0,1.13,-.02,1.08,.34,.58,c(.96,.96,.91))
      ];
    case'pig':
      return [
        ...quadruped(PINK,PINK,c(.72,.36,.43),c(.74,.34,.44)),
        part('ear-l',-.22,1.26,.55,.18,.22,.14,c(.78,.38,.46)),part('ear-r',.22,1.26,.55,.18,.22,.14,c(.78,.38,.46))
      ];
    case'cow':
      return [
        ...quadruped(BROWN,BROWN,DARK_BROWN,c(.62,.48,.38)),
        part('horn-l',-.26,1.29,.52,.12,.2,.12,c(.84,.78,.6)),part('horn-r',.26,1.29,.52,.12,.2,.12,c(.84,.78,.6)),
        part('patch',.28,.84,.32,.34,.32,.05,c(.75,.72,.64))
      ];
    case'chicken':
      return [
        part('body',0,.62,0,.72,.66,.62,WHITE),part('head',0,1.08,.25,.45,.46,.42,WHITE),
        part('beak',0,1.02,.52,.26,.18,.24,c(1,.62,.08)),part('comb',0,1.39,.22,.16,.22,.16,RED),
        part('wing-l',-.44,.68,0,.18,.48,.45,c(.82,.82,.77)),part('wing-r',.44,.68,0,.18,.48,.45,c(.82,.82,.77)),
        part('leg-l',-.16,.22,0,.1,.38,.1,YELLOW),part('leg-r',.16,.22,0,.1,.38,.1,YELLOW),
        part('eye-l',-.12,1.17,.46,.07,.07,.04,BLACK),part('eye-r',.12,1.17,.46,.07,.07,.04,BLACK)
      ];
    case'zombie':
      return [...humanoid(c(.24,.36,.2),ZOMBIE,ZOMBIE),part('shirt',0,1.02,.22,.7,.62,.06,BLUE)];
    case'skeleton':
      return [
        part('ribcage',0,1.02,0,.5,.72,.24,BONE),part('head',0,1.63,.02,.55,.55,.52,BONE),
        part('leg-l',-.17,.37,0,.12,.75,.12,BONE),part('leg-r',.17,.37,0,.12,.75,.12,BONE),
        part('arm-l',-.4,1.0,0,.11,.78,.11,BONE),part('arm-r',.4,1.0,0,.11,.78,.11,BONE),
        part('eye-l',-.14,1.69,.29,.1,.1,.05,BLACK),part('eye-r',.14,1.69,.29,.1,.1,.05,BLACK),
        part('mouth',0,1.48,.29,.26,.07,.05,BLACK)
      ];
    case'creeper':
      return [
        part('body',0,.86,0,.62,1.12,.54,GREEN),part('head',0,1.65,0,.78,.72,.72,GREEN),
        part('foot-fl',-.22,.2,.2,.28,.4,.28,DARK_GREEN),part('foot-fr',.22,.2,.2,.28,.4,.28,DARK_GREEN),
        part('foot-bl',-.22,.2,-.2,.28,.4,.28,DARK_GREEN),part('foot-br',.22,.2,-.2,.28,.4,.28,DARK_GREEN),
        part('eye-l',-.19,1.76,.38,.13,.14,.05,BLACK),part('eye-r',.19,1.76,.38,.13,.14,.05,BLACK),
        part('mouth',0,1.49,.38,.22,.28,.05,BLACK)
      ];
    case'spider':{
      const parts=[
        part('abdomen',0,.43,-.18,.94,.48,.86,BLACK),part('head',0,.48,.44,.68,.5,.58,c(.15,.08,.08)),
        part('eye-l',-.18,.56,.74,.11,.1,.05,RED),part('eye-r',.18,.56,.74,.11,.1,.05,RED)
      ];
      for(let i=0;i<4;i++){
        const z=.38-i*.25;
        parts.push(part('leg-l'+i,-.72,.31,z,.72,.12,.12,c(.09,.07,.08)),part('leg-r'+i,.72,.31,z,.72,.12,.12,c(.09,.07,.08)));
      }
      return parts;
    }
    case'enderman':
      return [
        part('torso',0,1.45,0,.48,1.35,.3,PURPLE),part('head',0,2.35,0,.55,.58,.5,PURPLE),
        part('leg-l',-.15,.58,0,.14,1.18,.16,PURPLE),part('leg-r',.15,.58,0,.14,1.18,.16,PURPLE),
        part('arm-l',-.38,1.5,0,.13,1.4,.14,PURPLE),part('arm-r',.38,1.5,0,.13,1.4,.14,PURPLE),
        part('eye-l',-.14,2.42,.27,.14,.08,.04,VIOLET),part('eye-r',.14,2.42,.27,.14,.08,.04,VIOLET)
      ];
    case'villager':
      return [
        part('robe',0,.87,0,.72,1.08,.48,ROBE),part('head',0,1.62,0,.64,.68,.58,VILLAGER),
        part('nose',0,1.56,.39,.18,.34,.18,c(.61,.39,.27)),
        part('arms',0,1.04,.31,.76,.22,.22,c(.47,.28,.18)),
        part('leg-l',-.18,.3,0,.2,.58,.22,DARK_BROWN),part('leg-r',.18,.3,0,.2,.58,.22,DARK_BROWN),
        part('eye-l',-.15,1.72,.31,.07,.07,.04,c(.08,.18,.25)),part('eye-r',.15,1.72,.31,.07,.07,.04,c(.08,.18,.25))
      ];
    case'blaze':{
      const parts=[part('core',0,1.1,0,.48,.92,.48,YELLOW),part('head',0,1.78,0,.58,.58,.58,YELLOW)];
      const offsets=[[-.62,1.4,0],[.62,1.4,0],[0,1.4,-.62],[0,1.4,.62],[-.45,.75,-.45],[.45,.75,.45],[-.45,.75,.45],[.45,.75,-.45]] as const;
      offsets.forEach((o,i)=>parts.push(part('rod'+i,o[0],o[1],o[2],.14,.72,.14,i<4?YELLOW:ORANGE)));
      return parts;
    }
    case'ghast':{
      const parts=[part('body',0,1.75,0,1.8,1.8,1.8,WHITE),part('mouth',0,1.44,.93,.58,.42,.05,c(.32,.08,.08)),
        part('eye-l',-.42,1.96,.93,.22,.3,.05,BLACK),part('eye-r',.42,1.96,.93,.22,.3,.05,BLACK)];
      for(let i=0;i<6;i++)parts.push(part('tentacle'+i,(i%3-1)*.48,.55,Math.floor(i/3)*.42-.2,.16,1.5,.16,c(.78,.78,.76)));
      return parts;
    }
    case'boss':
      return [
        part('body',0,1.6,0,2.0,.85,.72,END),part('neck',0,1.72,.9,.55,.48,1.1,END),part('head',0,1.8,1.55,.9,.65,.9,END),
        part('wing-l',-1.65,1.72,-.05,2.6,.18,1.55,c(.24,.08,.32)),part('wing-r',1.65,1.72,-.05,2.6,.18,1.55,c(.24,.08,.32)),
        part('tail-1',0,1.48,-.85,.45,.42,1.1,END),part('tail-2',0,1.43,-1.65,.32,.3,.75,END),
        part('leg-l',-.58,.82,.15,.28,1.1,.3,END),part('leg-r',.58,.82,.15,.28,1.1,.3,END),
        part('eye-l',-.25,1.93,2.02,.14,.1,.05,CYAN),part('eye-r',.25,1.93,2.02,.14,.1,.05,CYAN)
      ];
    case'dungeon_guard':
      return [...humanoid(c(.3,.13,.42),c(.42,.18,.58),c(.25,.1,.34)),part('chest-rune',0,1.05,.22,.26,.3,.05,VIOLET)];
    case'end_guard':
      return [...humanoid(c(.18,.08,.28),c(.25,.12,.38),c(.13,.05,.2)),part('eye',0,1.72,.32,.25,.08,.05,VIOLET)];
    default:
      return humanoid(c(.55,.3,.42),c(.68,.38,.52),c(.45,.2,.34));
  }
}

export function mobModelComplexity(kind:VoxelMob['kind']){
  const parts=mobVoxelModel(kind);
  return{parts:parts.length,hasHead:parts.some(x=>x.id.includes('head')),hasLegs:parts.some(x=>x.id.includes('leg')||x.id.includes('foot')||x.id.includes('tentacle')||x.id.includes('rod'))};
}
