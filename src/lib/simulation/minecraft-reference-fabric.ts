import {unityFabricContext} from '@/lib/unity-fabric';

export type MinecraftReferenceMode='adapt'|'reference-only'|'secondary-reference';

export interface MinecraftReference{
  repo:string;
  license:string;
  mode:MinecraftReferenceMode;
  role:string;
  features:string[];
}

export const MINECRAFT_PRIMARY_REFERENCES:MinecraftReference[]=[
  {
    repo:'fogleman/Craft',license:'MIT',mode:'adapt',
    role:'core infinite voxel architecture',
    features:['deterministic chunk terrain','delta persistence','block break/place','day/night','plants/transparency','visible-face/chunk culling','multiplayer/state sync patterns']
  },
  {
    repo:'dgreenheck/minecraft-threejs-clone',license:'unverified',mode:'reference-only',
    role:'browser voxel UX reference',
    features:['procedural world generation','biomes','resources','terrain chunking','terraforming','save/load']
  },
  {
    repo:'0xfabian/mc',license:'unverified',mode:'reference-only',
    role:'C++/OpenGL voxel engine reference',
    features:['low-level voxel rendering','camera/input','chunk/render architecture']
  },
  {
    repo:'pquiring/jfcraft',license:'LGPL-2.1',mode:'reference-only',
    role:'broad Minecraft-like systems reference',
    features:['large block/item ecosystem','world systems','crafting/content breadth','Java voxel architecture']
  },
  {
    repo:'obiwac/python-minecraft-clone',license:'MIT',mode:'adapt',
    role:'progressive voxel engine reference',
    features:['chunk mesh generation','block models','break/place','save/load','collision','gravity/jumping','UI/hotbar patterns','mob/pathfinding roadmap']
  },
  {
    repo:'Aidanhouk/Minecraft-Clone',license:'unverified',mode:'reference-only',
    role:'feature breadth reference',
    features:['survival-sandbox breadth','Minecraft-like interaction coverage','content architecture']
  },
  {
    repo:'zardoy/minecraft-web-client',license:'MIT',mode:'adapt',
    role:'browser-first client and protocol reference',
    features:['browser controls','mobile-friendly client','offline/online client boundary','network world state','inventory/window UX patterns']
  },
  {
    repo:'zardoy/mcraft-arwes',license:'unverified',mode:'reference-only',
    role:'secondary futuristic Minecraft UI reference',
    features:['HUD hierarchy','inventory/menu presentation','browser game shell']
  },
  {
    repo:'JEFFY1234599/block-craft-browser-edition',license:'unverified',mode:'reference-only',
    role:'secondary browser/mobile Minecraft-like reference',
    features:['browser play shell','mobile interaction','skin/customization UX']
  }
];

export const MINECRAFT_DUNGEONS_SECONDARY:MinecraftReference[]=[
  {
    repo:'TheDoctor200/MinecraftDungeonsLauncher',license:'MIT',mode:'secondary-reference',
    role:'offline/profile/launcher inspiration only',
    features:['offline-first profile concept','save/profile selection','mod/profile boundary','Windows launcher UX reference']
  },
  {
    repo:'GuyRoosevelt/Minecraft-Dungeons-The-Awakening',license:'Apache-2.0',mode:'secondary-reference',
    role:'dungeon progression inspiration only',
    features:['chests','economy','bosses','advanced fighting','weapons','monsters','abilities','save/load','infinite game loop','loot rooms','drops','classes']
  }
];

export const UNITY_ENGINE_REFERENCE:MinecraftReference={
  repo:'jbruening/UnEngine',license:'MIT',mode:'adapt',
  role:'Unity-compatible component/scene semantics',
  features:['GameObject','Component','MonoBehaviour','Transform','Vector2/3/4','Quaternion','Camera','Collider','Rigidbody','Physics','Input','Time','PlayerPrefs','Resources','Profiler']
};

export const ALL_MINECRAFT_SIM_REFERENCES=[
  ...MINECRAFT_PRIMARY_REFERENCES,
  ...MINECRAFT_DUNGEONS_SECONDARY,
  UNITY_ENGINE_REFERENCE
];

export function minecraftReferenceAudit(){
  const unlicensed=ALL_MINECRAFT_SIM_REFERENCES.filter(x=>x.license==='unverified').map(x=>x.repo);
  return{
    expected:12,
    registered:ALL_MINECRAFT_SIM_REFERENCES.length,
    complete:ALL_MINECRAFT_SIM_REFERENCES.length===12,
    primary:MINECRAFT_PRIMARY_REFERENCES.map(x=>x.repo),
    secondary:MINECRAFT_DUNGEONS_SECONDARY.map(x=>x.repo),
    unity:UNITY_ENGINE_REFERENCE.repo,
    unlicensedReferenceOnly:unlicensed
  };
}

export function minecraftSimulationContext(){
  return [
    'MINECRAFT-CLASS VOXEL SANDBOX · primary design target is an effectively unbounded survival/creative block world inside Life Simulation Studio.',
    'CORE · procedural chunks, biomes, resources, mining, placing, inventory, crafting, smelting, farming hooks, hunger/health, combat, mobs, structures, exploration, day/night, persistence and creative mode.',
    'INFINITE WORLD · X/Z have no gameplay boundary; chunks are deterministic from seed and only deltas are persisted.',
    'PRIMARY REFERENCES:',
    ...MINECRAFT_PRIMARY_REFERENCES.map(x=>' - '+x.repo+' · '+x.mode+' · '+x.features.join('; ')),
    'SECONDARY DUNGEONS REFERENCES (never the main world model):',
    ...MINECRAFT_DUNGEONS_SECONDARY.map(x=>' - '+x.repo+' · '+x.features.join('; ')),
    unityFabricContext(),
    'LICENSE · unverified/GPL/LGPL material is reference-only unless separately isolated under compatible terms; do not copy proprietary Minecraft assets, sounds or code.'
  ].join('\n');
}
