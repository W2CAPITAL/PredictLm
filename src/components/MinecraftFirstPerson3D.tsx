'use client';

import React,{useEffect,useMemo,useRef,useState} from 'react';
import {
  VOXEL_BLOCKS,
  VOXEL_CHUNK_SIZE,
  VOXEL_SEA_LEVEL,
  VOXEL_WORLD_HEIGHT,
  blockAt,
  chunkSnapshot,
  surfaceAt,
  terrainHeight,
  type VoxelBlockId,
  type VoxelWorldState
} from '@/lib/simulation/minecraft-sandbox';
import {
  FIRST_PERSON_VISION,
  minecraftFirstPersonPose,
  type MinecraftViewTarget
} from '@/lib/simulation/minecraft-first-person';
import type {MinecraftBrainId,MinecraftBrainState} from '@/lib/simulation/minecraft-brain-agents';
import styles from './MinecraftFirstPerson3D.module.css';

type Vec3=[number,number,number];
type RGB=[number,number,number];
type RGBA=[number,number,number,number];

interface Props{
  world:VoxelWorldState;
  brains:MinecraftBrainState;
  viewTarget:MinecraftViewTarget;
  viewRadius:number;
  onLook?:(yaw:number,pitch:number)=>void;
}

const BLOCK_RGBA:Partial<Record<VoxelBlockId,RGBA>>={
  bedrock:[.16,.17,.19,1],stone:[.45,.47,.49,1],cobblestone:[.38,.4,.42,1],dirt:[.39,.25,.16,1],grass:[.25,.56,.22,1],
  sand:[.78,.72,.48,1],water:[.08,.35,.76,.58],lava:[1,.28,.035,.94],wood:[.42,.26,.12,1],leaves:[.12,.5,.18,.92],
  planks:[.58,.37,.18,1],glass:[.55,.82,.88,.32],coal_ore:[.22,.23,.24,1],iron_ore:[.62,.52,.43,1],gold_ore:[.9,.66,.14,1],
  diamond_ore:[.12,.75,.83,1],crafting_table:[.48,.29,.12,1],furnace:[.28,.3,.31,1],torch:[1,.72,.13,1],chest:[.62,.36,.1,1],
  farmland:[.29,.18,.1,1],wheat:[.75,.58,.12,.95],bricks:[.57,.22,.17,1],obsidian:[.12,.07,.2,1],bed:[.64,.18,.23,1],
  table:[.46,.27,.13,1],chair:[.4,.23,.12,1],bookshelf:[.35,.2,.08,1],door:[.42,.24,.1,1],ladder:[.56,.38,.16,.86],
  lantern:[1,.72,.12,.96],nether_bricks:[.25,.08,.12,1],end_stone:[.78,.78,.51,1]
};

const BRAIN_RGBA:Record<MinecraftBrainId,RGBA>={
  human:[.25,.95,.81,1],macaque:[.96,.55,.22,1],mouse:[.76,.69,.95,1],fly:[.96,.9,.25,1]
};

const MOB_RGBA:Record<string,RGBA>={
  sheep:[.88,.88,.84,1],pig:[.92,.55,.62,1],cow:[.38,.24,.14,1],chicken:[.92,.92,.86,1],
  zombie:[.22,.56,.3,1],skeleton:[.78,.8,.78,1],spider:[.11,.09,.1,1],creeper:[.25,.72,.25,1],
  enderman:[.09,.055,.12,1],villager:[.55,.36,.22,1],dungeon_guard:[.42,.18,.58,1],boss:[.68,.16,.5,1],
  blaze:[.96,.58,.08,1],ghast:[.88,.9,.9,.92],end_guard:[.25,.12,.38,1]
};

function blockColor(id:VoxelBlockId):RGBA{return BLOCK_RGBA[id]||[.42,.45,.47,1]}
function clamp(v:number,min:number,max:number){return Math.max(min,Math.min(max,v))}
function norm(v:Vec3):Vec3{const n=Math.hypot(v[0],v[1],v[2])||1;return[v[0]/n,v[1]/n,v[2]/n]}
function cross(a:Vec3,b:Vec3):Vec3{return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
function dot(a:Vec3,b:Vec3){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}

function perspective(fovDeg:number,aspect:number,near=.05,far=180){
  const f=1/Math.tan(fovDeg*Math.PI/360);
  const nf=1/(near-far);
  return new Float32Array([
    f/aspect,0,0,0,
    0,f,0,0,
    0,0,(far+near)*nf,-1,
    0,0,2*far*near*nf,0
  ]);
}

function lookAt(eye:Vec3,center:Vec3,up:Vec3){
  const f=norm([center[0]-eye[0],center[1]-eye[1],center[2]-eye[2]]);
  const s=norm(cross(f,up));
  const u=cross(s,f);
  return new Float32Array([
    s[0],u[0],-f[0],0,
    s[1],u[1],-f[1],0,
    s[2],u[2],-f[2],0,
    -dot(s,eye),-dot(u,eye),dot(f,eye),1
  ]);
}

function multiply(a:Float32Array,b:Float32Array){
  const out=new Float32Array(16);
  for(let c=0;c<4;c++)for(let r=0;r<4;r++){
    out[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];
  }
  return out;
}

function compile(gl:WebGLRenderingContext,type:number,source:string){
  const shader=gl.createShader(type);
  if(!shader)return null;
  gl.shaderSource(shader,source);
  gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){gl.deleteShader(shader);return null}
  return shader;
}

function pushBox(buffer:number[],cx:number,cy:number,cz:number,sx:number,sy:number,sz:number,color:RGBA){
  const x0=cx-sx/2,x1=cx+sx/2,y0=cy-sy/2,y1=cy+sy/2,z0=cz-sz/2,z1=cz+sz/2;
  const faces:Array<{v:number[][];shade:number}>=[
    {v:[[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z0],[x1,y1,z1],[x0,y1,z1]],shade:1.05},
    {v:[[x0,y0,z1],[x1,y0,z1],[x1,y0,z0],[x0,y0,z1],[x1,y0,z0],[x0,y0,z0]],shade:.55},
    {v:[[x0,y0,z1],[x0,y1,z1],[x1,y1,z1],[x0,y0,z1],[x1,y1,z1],[x1,y0,z1]],shade:.9},
    {v:[[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[x1,y0,z0],[x0,y1,z0],[x0,y0,z0]],shade:.72},
    {v:[[x1,y0,z1],[x1,y1,z1],[x1,y1,z0],[x1,y0,z1],[x1,y1,z0],[x1,y0,z0]],shade:.82},
    {v:[[x0,y0,z0],[x0,y1,z0],[x0,y1,z1],[x0,y0,z0],[x0,y1,z1],[x0,y0,z1]],shade:.67}
  ];
  for(const face of faces)for(const v of face.v){
    buffer.push(v[0],v[1],v[2],clamp(color[0]*face.shade,0,1),clamp(color[1]*face.shade,0,1),clamp(color[2]*face.shade,0,1),color[3]);
  }
}

function skyFor(world:VoxelWorldState):RGB{
  if(world.player.dimension==='infernal')return[.12,.025,.018];
  if(world.player.dimension==='void')return[.012,.008,.03];
  if(world.timeOfDay>=12000)return[.012,.025,.06];
  if(world.weather==='storm')return[.13,.16,.18];
  if(world.weather==='rain')return[.2,.27,.3];
  return[.22,.48,.66];
}

export function MinecraftFirstPerson3D({world,brains,viewTarget,viewRadius,onLook}:Props){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const dragRef=useRef<{id:number;x:number;y:number}|null>(null);
  const [webglError,setWebglError]=useState(false);
  const pose=useMemo(()=>minecraftFirstPersonPose(world,brains,viewTarget),[world,brains,viewTarget]);
  const profile=FIRST_PERSON_VISION[viewTarget];

  useEffect(()=>{
    const canvas=canvasRef.current;
    if(!canvas)return;
    const gl=canvas.getContext('webgl',{antialias:true,alpha:false,depth:true});
    if(!gl){setWebglError(true);return}
    setWebglError(false);

    const render=()=>{
      const rect=canvas.getBoundingClientRect();
      const ratio=Math.min(1.65,window.devicePixelRatio||1);
      const width=Math.max(1,Math.floor(rect.width*ratio));
      const height=Math.max(1,Math.floor(rect.height*ratio));
      if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height}
      gl.viewport(0,0,width,height);
      const sky=skyFor(world);
      gl.clearColor(sky[0],sky[1],sky[2],1);
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
      gl.disable(gl.CULL_FACE);

      const vs=compile(gl,gl.VERTEX_SHADER,
        'attribute vec3 aPosition;attribute vec4 aColor;uniform mat4 uMvp;varying vec4 vColor;void main(){vColor=aColor;gl_Position=uMvp*vec4(aPosition,1.0);}');
      const fs=compile(gl,gl.FRAGMENT_SHADER,
        'precision mediump float;varying vec4 vColor;void main(){gl_FragColor=vColor;}');
      if(!vs||!fs){setWebglError(true);return}
      const program=gl.createProgram();
      if(!program)return;
      gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS)){setWebglError(true);return}
      gl.useProgram(program);

      const vertices:number[]=[];
      const radius=clamp(Math.floor(viewRadius),8,24);
      const detailRadius=Math.min(9,radius);
      const baseX=Math.floor(pose.x),baseZ=Math.floor(pose.z);
      const dim=world.player.dimension;

      const exposed=(x:number,y:number,z:number,id:VoxelBlockId)=>{
        if(id==='water'||id==='lava'||id==='glass'||id==='leaves'||id==='wheat'||id==='torch'||id==='lantern'||id==='ladder')return true;
        const neighbors:[[number,number,number],[number,number,number],[number,number,number],[number,number,number],[number,number,number],[number,number,number]]=[
          [1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]
        ];
        return neighbors.some(([ox,oy,oz])=>{
          const other=blockAt(world,x+ox,y+oy,z+oz);
          return other==='air'||VOXEL_BLOCKS[other].transparent;
        });
      };

      for(let dx=-radius;dx<=radius;dx++)for(let dz=-radius;dz<=radius;dz++){
        const x=baseX+dx,z=baseZ+dz;
        const distance=Math.max(Math.abs(dx),Math.abs(dz));
        const terrainY=terrainHeight(world.seed,x,z,dim);

        if(distance>detailRadius){
          const top=surfaceAt(world,x,z);
          if(top.block==='water'){
            pushBox(vertices,x,top.y-.12,z,1,.76,1,blockColor('water'));
          }else{
            const groundId=blockAt(world,x,terrainY,z);
            pushBox(vertices,x,terrainY,z,1,1,1,blockColor(groundId));
            if(blockAt(world,x,terrainY+1,z)==='wood'){
              pushBox(vertices,x,terrainY+2,z,.72,3,.72,blockColor('wood'));
              pushBox(vertices,x,terrainY+4,z,2.5,2.1,2.5,blockColor('leaves'));
            }
          }
          continue;
        }

        const topY=Math.min(VOXEL_WORLD_HEIGHT-1,Math.max(surfaceAt(world,x,z).y,terrainY)+1);
        const lowY=Math.max(0,terrainY-3);
        for(let y=lowY;y<=topY;y++){
          const id=blockAt(world,x,y,z);
          if(id==='air'||!exposed(x,y,z,id))continue;
          if(id==='water'){
            if(blockAt(world,x,y+1,z)==='water')continue;
            pushBox(vertices,x,y-.12,z,1,.76,1,blockColor(id));
          }else if(id==='torch'||id==='lantern'){
            pushBox(vertices,x,y-.2,z,.18,.65,.18,blockColor(id));
          }else if(id==='wheat'){
            pushBox(vertices,x,y-.28,z,.6,.9,.6,blockColor(id));
          }else{
            pushBox(vertices,x,y,z,1,1,1,blockColor(id));
          }
        }
      }

      const cx=Math.floor(pose.x/VOXEL_CHUNK_SIZE),cz=Math.floor(pose.z/VOXEL_CHUNK_SIZE);
      const seen=new Set<string>();
      for(let dcx=-1;dcx<=1;dcx++)for(let dcz=-1;dcz<=1;dcz++){
        const snap=chunkSnapshot(world,cx+dcx,cz+dcz);
        for(const structure of snap.structures){
          if(seen.has(structure.id)||Math.hypot(structure.x-pose.x,structure.z-pose.z)>radius+5)continue;
          seen.add(structure.id);
          const y=surfaceAt(world,structure.x,structure.z).y+1.4;
          const color:RGBA=structure.kind==='dungeon'?[.42,.18,.58,1]:structure.kind==='village'?[.68,.5,.22,1]:structure.kind==='nether_fortress'?[.3,.08,.11,1]:structure.kind==='end_city'?[.45,.32,.58,1]:[.5,.43,.31,1];
          const roof:RGBA=structure.kind==='village'?[.44,.22,.08,1]:color;
          pushBox(vertices,structure.x,y,structure.z,2.6,2.8,2.6,color);
          pushBox(vertices,structure.x,y+1.8,structure.z,3.0,.55,3.0,roof);
        }
        for(const mob of snap.mobs){
          if(seen.has(mob.id)||Math.hypot(mob.x-pose.x,mob.z-pose.z)>radius+4)continue;
          seen.add(mob.id);
          const color=MOB_RGBA[mob.kind]||[.68,.68,.66,1];
          const h=mob.kind==='spider'?.6:mob.kind==='ghast'?1.5:mob.kind==='enderman'?2.4:1.45;
          const w=mob.kind==='spider'?1.25:mob.kind==='ghast'?1.5:mob.kind==='creeper'?.72:.62;
          pushBox(vertices,mob.x,mob.y+h*.42,mob.z,w,h*.78,w,color);
          if(!['spider','ghast'].includes(mob.kind))pushBox(vertices,mob.x,mob.y+h*.98,mob.z,w*.82,h*.34,w*.82,color);
        }
      }

      for(const id of Object.keys(brains.agents) as MinecraftBrainId[]){
        const agent=brains.agents[id];
        if(viewTarget===id||agent.dimension!==world.player.dimension)continue;
        if(Math.hypot(agent.x-pose.x,agent.z-pose.z)>radius+4)continue;
        pushBox(vertices,agent.x,agent.y+.34,agent.z,.54,1.12,.48,BRAIN_RGBA[id]);
        pushBox(vertices,agent.x,agent.y+1.05,agent.z,.5,.48,.5,BRAIN_RGBA[id]);
      }


      const data=new Float32Array(vertices);
      const buffer=gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
      const stride=7*4;
      const aPosition=gl.getAttribLocation(program,'aPosition');
      const aColor=gl.getAttribLocation(program,'aColor');
      gl.enableVertexAttribArray(aPosition);gl.vertexAttribPointer(aPosition,3,gl.FLOAT,false,stride,0);
      gl.enableVertexAttribArray(aColor);gl.vertexAttribPointer(aColor,4,gl.FLOAT,false,stride,3*4);

      const cp=Math.cos(pose.pitch),sp=Math.sin(pose.pitch),sy=Math.sin(pose.yaw),cy=Math.cos(pose.yaw);
      const eye:[number,number,number]=[pose.x,pose.y,pose.z];
      const center:[number,number,number]=[pose.x+sy*cp,pose.y+sp,pose.z+cy*cp];
      const view=lookAt(eye,center,[0,1,0]);
      const proj=perspective(pose.fov,width/height,.05,Math.max(90,radius*9));
      const mvp=multiply(proj,view);
      const uMvp=gl.getUniformLocation(program,'uMvp');
      gl.uniformMatrix4fv(uMvp,false,mvp);
      gl.drawArrays(gl.TRIANGLES,0,data.length/7);

      gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
    };

    render();
    const resize=new ResizeObserver(()=>render());
    resize.observe(canvas);
    return()=>resize.disconnect();
  },[world,brains,viewTarget,viewRadius,pose.x,pose.y,pose.z,pose.yaw,pose.pitch,pose.fov]);

  useEffect(()=>{
    if(viewTarget!=='player'||!onLook)return;
    const onMouse=(event:MouseEvent)=>{
      if(document.pointerLockElement!==canvasRef.current)return;
      const p=FIRST_PERSON_VISION.player;
      onLook(pose.yaw+event.movementX*.0024,clamp(pose.pitch-event.movementY*.0021,-p.maxPitch,p.maxPitch));
    };
    document.addEventListener('mousemove',onMouse);
    return()=>document.removeEventListener('mousemove',onMouse);
  },[viewTarget,onLook,pose.yaw,pose.pitch]);

  function pointerDown(event:React.PointerEvent<HTMLCanvasElement>){
    if(viewTarget!=='player')return;
    dragRef.current={id:event.pointerId,x:event.clientX,y:event.clientY};
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }
  function pointerMove(event:React.PointerEvent<HTMLCanvasElement>){
    if(viewTarget!=='player'||!onLook||!dragRef.current||dragRef.current.id!==event.pointerId)return;
    const dx=event.clientX-dragRef.current.x,dy=event.clientY-dragRef.current.y;
    dragRef.current={id:event.pointerId,x:event.clientX,y:event.clientY};
    const p=FIRST_PERSON_VISION.player;
    onLook(pose.yaw+dx*.006,clamp(pose.pitch-dy*.005,-p.maxPitch,p.maxPitch));
  }
  function pointerUp(event:React.PointerEvent<HTMLCanvasElement>){
    if(dragRef.current?.id===event.pointerId)dragRef.current=null;
  }

  return <div className={styles.viewport} data-vision={pose.visual}>
    <canvas
      ref={canvasRef}
      className={styles.canvas}
      aria-label={'Visão 3D em primeira pessoa de '+pose.label}
      onClick={event=>{if(viewTarget==='player'&&document.pointerLockElement!==event.currentTarget)event.currentTarget.requestPointerLock?.()}}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerUp}
    />
    <div className={styles.filter}/>
    <div className={styles.crosshair}><i/><i/></div>
    <div className={styles.hud}>
      <b>1ª PESSOA 3D · {pose.label}</b>
      <span>FOV {pose.fov}° · {world.player.dimension==='infernal'?'Nether':world.player.dimension==='void'?'End':'Overworld'}</span>
      <small>{profile.description}</small>
    </div>
    {viewTarget==='player'?<div className={styles.hint}>Clique para mouse-look · WASD para mover · arraste no celular</div>:<div className={styles.hint}>POV autônomo · câmera presa à orientação real do cérebro</div>}
    {webglError?<div className={styles.error}>WebGL indisponível neste navegador. Use Mapa 2D ou Unity.</div>:null}
  </div>;
}
