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
  treeDescriptorAt,
  type VoxelBlockId,
  type VoxelWorldState
} from '@/lib/simulation/minecraft-sandbox';
import {
  FIRST_PERSON_VISION,
  minecraftFirstPersonPose,
  type MinecraftViewTarget
} from '@/lib/simulation/minecraft-first-person';
import type {MinecraftBrainId,MinecraftBrainState} from '@/lib/simulation/minecraft-brain-agents';
import {mobVoxelModel} from '@/lib/simulation/minecraft-voxel-models';
import {
  MINECRAFT_RENDER_PROFILES,
  browserMemoryPressure01,
  captureMimeType,
  createAdaptiveRenderState,
  effectiveDetailRadius,
  renderCssFilter,
  updateAdaptiveRenderState,
  type MinecraftRenderPreset
} from '@/lib/simulation/minecraft-render-optimizer';
import {downloadBlob,exportEnhancedCanvasPng,mediaRecorderForCanvas,minecraftMediaFileName} from '@/lib/simulation/minecraft-media-capture';
import styles from './MinecraftFirstPerson3D.module.css';

type Vec3=[number,number,number];
type RGB=[number,number,number];
type RGBA=[number,number,number,number];

interface Props{
  world:VoxelWorldState;
  brains:MinecraftBrainState;
  viewTarget:MinecraftViewTarget;
  viewRadius:number;
  renderPreset:MinecraftRenderPreset;
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

interface GLRuntime{
  gl:WebGLRenderingContext;
  program:WebGLProgram;
  buffer:WebGLBuffer;
  aPosition:number;
  aColor:number;
  uMvp:WebGLUniformLocation|null;
}

function createGLRuntime(gl:WebGLRenderingContext):GLRuntime|null{
  const vs=compile(gl,gl.VERTEX_SHADER,
    'attribute vec3 aPosition;attribute vec4 aColor;uniform mat4 uMvp;varying vec4 vColor;void main(){vColor=aColor;gl_Position=uMvp*vec4(aPosition,1.0);}');
  const fs=compile(gl,gl.FRAGMENT_SHADER,
    'precision mediump float;varying vec4 vColor;void main(){gl_FragColor=vColor;}');
  if(!vs||!fs)return null;
  const program=gl.createProgram();
  const buffer=gl.createBuffer();
  if(!program||!buffer){if(program)gl.deleteProgram(program);if(buffer)gl.deleteBuffer(buffer);gl.deleteShader(vs);gl.deleteShader(fs);return null}
  gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
  gl.deleteShader(vs);gl.deleteShader(fs);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){gl.deleteProgram(program);gl.deleteBuffer(buffer);return null}
  return{
    gl,program,buffer,
    aPosition:gl.getAttribLocation(program,'aPosition'),
    aColor:gl.getAttribLocation(program,'aColor'),
    uMvp:gl.getUniformLocation(program,'uMvp')
  };
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

export function MinecraftFirstPerson3D({world,brains,viewTarget,viewRadius,renderPreset,onLook}:Props){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const dragRef=useRef<{id:number;x:number;y:number}|null>(null);
  const runtimeRef=useRef<GLRuntime|null>(null);
  const geometryCacheRef=useRef<{key:string;data:Float32Array;geometryMs:number}|null>(null);
  const recorderRef=useRef<MediaRecorder|null>(null);
  const recordingStreamRef=useRef<MediaStream|null>(null);
  const recordingChunksRef=useRef<Blob[]>([]);
  const adaptiveRef=useRef(createAdaptiveRenderState(MINECRAFT_RENDER_PROFILES[renderPreset]));
  const [adaptiveScale,setAdaptiveScale]=useState(MINECRAFT_RENDER_PROFILES[renderPreset].renderScale);
  const [recording,setRecording]=useState(false);
  const [captureMessage,setCaptureMessage]=useState('');
  const [renderStats,setRenderStats]=useState({renderMs:0,geometryMs:0,vertices:0,memoryPressure01:0});
  const [webglError,setWebglError]=useState(false);
  const pose=useMemo(()=>minecraftFirstPersonPose(world,brains,viewTarget),[world,brains,viewTarget]);
  const profile=FIRST_PERSON_VISION[viewTarget];
  const renderProfile=MINECRAFT_RENDER_PROFILES[renderPreset];

  useEffect(()=>{
    const next=createAdaptiveRenderState(MINECRAFT_RENDER_PROFILES[renderPreset]);
    adaptiveRef.current=next;
    setAdaptiveScale(next.scale);
  },[renderPreset]);

  useEffect(()=>()=> {
    const runtime=runtimeRef.current;
    if(runtime){
      runtime.gl.deleteBuffer(runtime.buffer);
      runtime.gl.deleteProgram(runtime.program);
      runtimeRef.current=null;
    }
    geometryCacheRef.current=null;
    if(recorderRef.current&&recorderRef.current.state!=='inactive')recorderRef.current.stop();
    recordingStreamRef.current?.getTracks().forEach(track=>track.stop());
    recordingStreamRef.current=null;
  },[]);

  async function capturePng(){
    const canvas=canvasRef.current;
    if(!canvas)return;
    try{
      const result=await exportEnhancedCanvasPng(canvas,{
        seed:world.seed,preset:renderPreset,contrast:renderProfile.contrast,saturation:renderProfile.saturation,maxEdge:3200
      });
      downloadBlob(result.blob,result.filename);
      setCaptureMessage('PNG HD '+result.meta.outputWidth+'×'+result.meta.outputHeight+' exportado.');
    }catch(error){
      setCaptureMessage(error instanceof Error?error.message:'Falha ao exportar PNG.');
    }
  }

  function toggleRecording(){
    if(recording){
      const recorder=recorderRef.current;
      if(recorder&&recorder.state!=='inactive')recorder.stop();
      return;
    }
    const canvas=canvasRef.current;
    if(!canvas)return;
    try{
      const mimeType=captureMimeType();
      const {recorder,stream}=mediaRecorderForCanvas(canvas,{fps:renderProfile.mediaFps,mimeType,bitsPerSecond:10_000_000});
      recordingChunksRef.current=[];
      recorderRef.current=recorder;
      recordingStreamRef.current=stream;
      recorder.ondataavailable=event=>{if(event.data.size>0)recordingChunksRef.current.push(event.data)};
      recorder.onstop=()=>{
        const blob=new Blob(recordingChunksRef.current,{type:mimeType||'video/webm'});
        if(blob.size>0)downloadBlob(blob,minecraftMediaFileName('video',world.seed,renderPreset));
        recordingStreamRef.current?.getTracks().forEach(track=>track.stop());
        recordingStreamRef.current=null;
        recorderRef.current=null;
        recordingChunksRef.current=[];
        setRecording(false);
        setCaptureMessage(blob.size>0?'Vídeo WebM exportado.':'Nenhum frame foi gravado.');
      };
      recorder.start(1000);
      setRecording(true);
      setCaptureMessage('Gravando canvas em '+renderProfile.mediaFps+' FPS alvo…');
    }catch(error){
      setCaptureMessage(error instanceof Error?error.message:'Gravação indisponível.');
    }
  }

  useEffect(()=>{
    const canvas=canvasRef.current;
    if(!canvas)return;
    const gl=canvas.getContext('webgl',{antialias:true,alpha:false,depth:true});
    if(!gl){setWebglError(true);return}
    setWebglError(false);
    let runtime=runtimeRef.current;
    if(!runtime||runtime.gl!==gl){
      runtime=createGLRuntime(gl);
      if(!runtime){setWebglError(true);return}
      runtimeRef.current=runtime;
      geometryCacheRef.current=null;
    }
    const stableRuntime=runtime;

    const render=()=>{
      if(document.hidden)return;
      const renderStart=performance.now();
      const rect=canvas.getBoundingClientRect();
      adaptiveRef.current={...adaptiveRef.current,scale:adaptiveScale};
      const internalScale=renderPreset==='auto'?adaptiveScale:renderProfile.renderScale;
      const ratio=Math.min(renderProfile.dprCap,window.devicePixelRatio||1)*internalScale;
      const width=Math.max(1,Math.floor(rect.width*ratio));
      const height=Math.max(1,Math.floor(rect.height*ratio));
      canvas.style.filter=renderCssFilter(renderProfile,adaptiveRef.current);
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

      gl.useProgram(stableRuntime.program);

      const radius=clamp(Math.floor(viewRadius),8,renderProfile.maxViewRadius);
      const detailRadius=Math.min(effectiveDetailRadius(renderProfile,adaptiveRef.current),radius);
      const farStep=renderProfile.farStep;
      const baseX=Math.floor(pose.x),baseZ=Math.floor(pose.z);
      const dim=world.player.dimension;
      const geometryKey=[
        world.seed,dim,baseX,baseZ,radius,detailRadius,farStep,
        world.timeOfDay<12000?'day':'night',
        world.stats.mined,world.stats.placed,world.stats.mobsDefeated,
        Object.keys(world.modifications).length,Object.keys(world.discoveries).length,
        brains.tick,viewTarget
      ].join('|');
      let data:Float32Array;
      let geometryMs=0;
      let uploadGeometry=true;
      const cached=geometryCacheRef.current;
      if(cached?.key===geometryKey){
        data=cached.data;
        uploadGeometry=false;
      }else{
        const geometryStart=performance.now();
        const vertices:number[]=[];

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
          if(farStep>1&&(((dx+radius)%farStep)!==0||((dz+radius)%farStep)!==0))continue;
          const top=surfaceAt(world,x,z);
          const footprint=farStep;
          if(top.block==='water'){
            pushBox(vertices,x,top.y-.12,z,footprint,.76,footprint,blockColor('water'));
          }else{
            const groundId=blockAt(world,x,terrainY,z);
            pushBox(vertices,x,terrainY,z,footprint,1,footprint,blockColor(groundId));
            const tree=dim==='overworld'?treeDescriptorAt(world.seed,x,z):null;
            if(tree){
              pushBox(vertices,x,tree.baseY+tree.trunkHeight/2+.5,z,.72,tree.trunkHeight,.72,blockColor('wood'));
              if(tree.kind==='spruce'){
                pushBox(vertices,x,tree.baseY+tree.trunkHeight-.8,z,3.6,1.1,3.6,blockColor('leaves'));
                pushBox(vertices,x,tree.baseY+tree.trunkHeight+.15,z,2.6,1.1,2.6,blockColor('leaves'));
                pushBox(vertices,x,tree.baseY+tree.trunkHeight+1.05,z,1.5,1.0,1.5,blockColor('leaves'));
              }else{
                const crown=tree.crownRadius*2+.5;
                pushBox(vertices,x,tree.baseY+tree.trunkHeight-.35,z,crown,1.5,crown,blockColor('leaves'));
                pushBox(vertices,x,tree.baseY+tree.trunkHeight+.8,z,Math.max(2,crown-1.4),1.15,Math.max(2,crown-1.4),blockColor('leaves'));
              }
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
          for(const part of mobVoxelModel(mob.kind)){
            pushBox(vertices,mob.x+part.dx,mob.y+part.dy,mob.z+part.dz,part.sx,part.sy,part.sz,part.color);
          }
        }
      }

      for(const id of Object.keys(brains.agents) as MinecraftBrainId[]){
        const agent=brains.agents[id];
        if(viewTarget===id||agent.dimension!==world.player.dimension)continue;
        if(Math.hypot(agent.x-pose.x,agent.z-pose.z)>radius+4)continue;
        pushBox(vertices,agent.x,agent.y+.34,agent.z,.54,1.12,.48,BRAIN_RGBA[id]);
        pushBox(vertices,agent.x,agent.y+1.05,agent.z,.5,.48,.5,BRAIN_RGBA[id]);
      }


        data=new Float32Array(vertices);
        geometryMs=performance.now()-geometryStart;
        geometryCacheRef.current={key:geometryKey,data,geometryMs};
      }
      gl.bindBuffer(gl.ARRAY_BUFFER,stableRuntime.buffer);
      if(uploadGeometry)gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);
      const stride=7*4;
      gl.enableVertexAttribArray(stableRuntime.aPosition);gl.vertexAttribPointer(stableRuntime.aPosition,3,gl.FLOAT,false,stride,0);
      gl.enableVertexAttribArray(stableRuntime.aColor);gl.vertexAttribPointer(stableRuntime.aColor,4,gl.FLOAT,false,stride,3*4);

      const cp=Math.cos(pose.pitch),sp=Math.sin(pose.pitch),sy=Math.sin(pose.yaw),cy=Math.cos(pose.yaw);
      const eye:[number,number,number]=[pose.x,pose.y,pose.z];
      const center:[number,number,number]=[pose.x+sy*cp,pose.y+sp,pose.z+cy*cp];
      const view=lookAt(eye,center,[0,1,0]);
      const proj=perspective(pose.fov,width/height,.05,Math.max(90,radius*9));
      const mvp=multiply(proj,view);
      gl.uniformMatrix4fv(stableRuntime.uMvp,false,mvp);
      gl.drawArrays(gl.TRIANGLES,0,data.length/7);

      const renderMs=performance.now()-renderStart;
      const memoryPressure01=browserMemoryPressure01();
      if(memoryPressure01>.82)geometryCacheRef.current=null;
      setRenderStats({renderMs,geometryMs,vertices:data.length/7,memoryPressure01});
      const nextAdaptive=updateAdaptiveRenderState(adaptiveRef.current,{renderMs,geometryMs,vertices:data.length/7,memoryPressure01},renderProfile);
      adaptiveRef.current=nextAdaptive;
      if(renderPreset==='auto'&&Math.abs(nextAdaptive.scale-adaptiveScale)>.015)setAdaptiveScale(nextAdaptive.scale);
    };

    let frame=requestAnimationFrame(render);
    const resize=new ResizeObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(render)});
    resize.observe(canvas);
    const visibility=()=>{if(!document.hidden){cancelAnimationFrame(frame);frame=requestAnimationFrame(render)}};
    document.addEventListener('visibilitychange',visibility);
    return()=>{cancelAnimationFrame(frame);resize.disconnect();document.removeEventListener('visibilitychange',visibility)};
  },[world,brains,viewTarget,viewRadius,renderPreset,adaptiveScale,renderProfile,pose.x,pose.y,pose.z,pose.yaw,pose.pitch,pose.fov]);

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
      <small className={styles.perf}>Preset {renderProfile.label} · alvo {renderProfile.targetFps} FPS · escala {Math.round((renderPreset==='auto'?adaptiveScale:renderProfile.renderScale)*100)}% · render {renderStats.renderMs.toFixed(1)} ms · geo {renderStats.geometryMs.toFixed(1)} ms · {Math.round(renderStats.vertices/1000)}k verts</small>
    </div>
    {viewTarget==='player'?<div className={styles.hint}>Clique para mouse-look · WASD para mover · arraste no celular</div>:<div className={styles.hint}>POV autônomo · câmera presa à orientação real do controller</div>}
    <div className={styles.mediaControls}>
      <button onClick={()=>void capturePng()}>PNG HD</button>
      <button data-recording={recording?'1':'0'} onClick={toggleRecording}>{recording?'Parar REC':'Gravar vídeo'}</button>
      {captureMessage?<span>{captureMessage}</span>:null}
    </div>
    {webglError?<div className={styles.error}>WebGL indisponível neste navegador. Use Mapa 2D ou Unity.</div>:null}
  </div>;
}
