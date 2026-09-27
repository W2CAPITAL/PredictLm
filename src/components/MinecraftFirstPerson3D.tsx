'use client';

import React,{useEffect,useMemo,useRef,useState} from 'react';
import {
  VOXEL_CHUNK_SIZE,
  chunkSnapshot,
  surfaceAt,
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

interface Props{
  world:VoxelWorldState;
  brains:MinecraftBrainState;
  viewTarget:MinecraftViewTarget;
  viewRadius:number;
  onLook?:(yaw:number,pitch:number)=>void;
}

const BLOCK_RGB:Partial<Record<VoxelBlockId,RGB>>={
  bedrock:[.16,.17,.19],stone:[.45,.47,.49],cobblestone:[.38,.4,.42],dirt:[.39,.25,.16],grass:[.25,.56,.22],
  sand:[.78,.72,.48],water:[.12,.34,.72],lava:[.95,.24,.04],wood:[.42,.26,.12],leaves:[.16,.45,.2],
  planks:[.58,.37,.18],glass:[.55,.82,.88],coal_ore:[.22,.23,.24],iron_ore:[.62,.52,.43],gold_ore:[.9,.66,.14],
  diamond_ore:[.12,.75,.83],crafting_table:[.48,.29,.12],furnace:[.28,.3,.31],torch:[1,.72,.13],chest:[.62,.36,.1],
  farmland:[.29,.18,.1],wheat:[.75,.58,.12],bricks:[.57,.22,.17],obsidian:[.12,.07,.2],bed:[.64,.18,.23],
  table:[.46,.27,.13],chair:[.4,.23,.12],bookshelf:[.35,.2,.08],door:[.42,.24,.1],ladder:[.56,.38,.16],
  lantern:[.95,.66,.12],nether_bricks:[.25,.08,.12],end_stone:[.78,.78,.51]
};

const BRAIN_RGB:Record<MinecraftBrainId,RGB>={
  human:[.25,.95,.81],macaque:[.96,.55,.22],mouse:[.76,.69,.95],fly:[.96,.9,.25]
};

function blockColor(id:VoxelBlockId):RGB{return BLOCK_RGB[id]||[.42,.45,.47]}
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

function pushBox(buffer:number[],cx:number,cy:number,cz:number,sx:number,sy:number,sz:number,color:RGB){
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
    buffer.push(v[0],v[1],v[2],clamp(color[0]*face.shade,0,1),clamp(color[1]*face.shade,0,1),clamp(color[2]*face.shade,0,1));
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
      gl.disable(gl.CULL_FACE);

      const vs=compile(gl,gl.VERTEX_SHADER,
        'attribute vec3 aPosition;attribute vec3 aColor;uniform mat4 uMvp;varying vec3 vColor;void main(){vColor=aColor;gl_Position=uMvp*vec4(aPosition,1.0);}');
      const fs=compile(gl,gl.FRAGMENT_SHADER,
        'precision mediump float;varying vec3 vColor;void main(){gl_FragColor=vec4(vColor,1.0);}');
      if(!vs||!fs){setWebglError(true);return}
      const program=gl.createProgram();
      if(!program)return;
      gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS)){setWebglError(true);return}
      gl.useProgram(program);

      const vertices:number[]=[];
      const radius=clamp(Math.floor(viewRadius),6,14);
      const baseX=Math.floor(pose.x),baseZ=Math.floor(pose.z);
      for(let dx=-radius;dx<=radius;dx++)for(let dz=-radius;dz<=radius;dz++){
        const x=baseX+dx,z=baseZ+dz;
        const cell=surfaceAt(world,x,z);
        const color=blockColor(cell.block);
        pushBox(vertices,x,cell.y,z,1,1,1,color);
        pushBox(vertices,x,cell.y-1,z,1,1,1,cell.block==='sand'?[.62,.55,.34]:[.31,.3,.28]);
        if(Math.abs(dx)<radius-2&&Math.abs(dz)<radius-2)pushBox(vertices,x,cell.y-2,z,1,1,1,[.27,.28,.29]);
      }

      const cx=Math.floor(pose.x/VOXEL_CHUNK_SIZE),cz=Math.floor(pose.z/VOXEL_CHUNK_SIZE);
      const seen=new Set<string>();
      for(let dcx=-1;dcx<=1;dcx++)for(let dcz=-1;dcz<=1;dcz++){
        const snap=chunkSnapshot(world,cx+dcx,cz+dcz);
        for(const structure of snap.structures){
          if(seen.has(structure.id)||Math.hypot(structure.x-pose.x,structure.z-pose.z)>radius+5)continue;
          seen.add(structure.id);
          const y=surfaceAt(world,structure.x,structure.z).y+1.4;
          const color:RGB=structure.kind==='dungeon'?[.42,.18,.58]:structure.kind==='village'?[.68,.5,.22]:[.5,.43,.31];
          pushBox(vertices,structure.x,y,structure.z,1.8,2.8,1.8,color);
        }
        for(const mob of snap.mobs){
          if(seen.has(mob.id)||Math.hypot(mob.x-pose.x,mob.z-pose.z)>radius+4)continue;
          seen.add(mob.id);
          const color:RGB=mob.hostile?[.68,.13,.12]:mob.kind==='villager'?[.56,.36,.22]:[.75,.72,.64];
          pushBox(vertices,mob.x,mob.y+.45,mob.z,.58,1.55,.58,color);
        }
      }

      for(const id of Object.keys(brains.agents) as MinecraftBrainId[]){
        const agent=brains.agents[id];
        if(viewTarget===id||agent.dimension!==world.player.dimension)continue;
        if(Math.hypot(agent.x-pose.x,agent.z-pose.z)>radius+4)continue;
        pushBox(vertices,agent.x,agent.y+.35,agent.z,.55,1.45,.55,BRAIN_RGB[id]);
      }


      const data=new Float32Array(vertices);
      const buffer=gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
      const stride=6*4;
      const aPosition=gl.getAttribLocation(program,'aPosition');
      const aColor=gl.getAttribLocation(program,'aColor');
      gl.enableVertexAttribArray(aPosition);gl.vertexAttribPointer(aPosition,3,gl.FLOAT,false,stride,0);
      gl.enableVertexAttribArray(aColor);gl.vertexAttribPointer(aColor,3,gl.FLOAT,false,stride,3*4);

      const cp=Math.cos(pose.pitch),sp=Math.sin(pose.pitch),sy=Math.sin(pose.yaw),cy=Math.cos(pose.yaw);
      const eye:[number,number,number]=[pose.x,pose.y,pose.z];
      const center:[number,number,number]=[pose.x+sy*cp,pose.y+sp,pose.z+cy*cp];
      const view=lookAt(eye,center,[0,1,0]);
      const proj=perspective(pose.fov,width/height,.05,Math.max(90,radius*9));
      const mvp=multiply(proj,view);
      const uMvp=gl.getUniformLocation(program,'uMvp');
      gl.uniformMatrix4fv(uMvp,false,mvp);
      gl.drawArrays(gl.TRIANGLES,0,data.length/6);

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
