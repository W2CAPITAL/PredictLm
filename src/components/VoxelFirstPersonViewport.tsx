'use client';

import React,{useEffect,useMemo,useRef,useState} from 'react';
import {
  VOXEL_BLOCKS,
  blockAt,
  surfaceAt,
  type VoxelBlockId,
  type VoxelWorldState
} from '@/lib/simulation/minecraft-sandbox';

type Props={
  world:VoxelWorldState;
  radius:number;
  selected:VoxelBlockId;
  onMove:(dx:number,dz:number)=>void;
  onMine:(x:number,y:number,z:number)=>void;
  onPlace:(x:number,y:number,z:number)=>void;
};

type Vec3=[number,number,number];

const COLORS:Record<VoxelBlockId,[number,number,number]>={
  air:[0,0,0],bedrock:[.18,.2,.22],stone:[.43,.45,.48],cobblestone:[.36,.38,.4],
  dirt:[.38,.25,.16],grass:[.25,.54,.23],sand:[.76,.7,.48],water:[.15,.38,.68],lava:[.9,.25,.06],
  wood:[.42,.28,.15],leaves:[.16,.42,.19],planks:[.58,.39,.22],glass:[.48,.72,.76],
  coal_ore:[.25,.26,.27],iron_ore:[.56,.48,.4],gold_ore:[.76,.59,.14],diamond_ore:[.12,.68,.74],
  crafting_table:[.5,.31,.16],furnace:[.33,.35,.37],torch:[.92,.68,.2],chest:[.58,.35,.12],
  farmland:[.3,.18,.1],wheat:[.68,.57,.16],bricks:[.54,.24,.2],obsidian:[.12,.08,.2]
};

function perspective(fov:number,aspect:number,near:number,far:number){
  const f=1/Math.tan(fov/2),nf=1/(near-far);
  return new Float32Array([
    f/aspect,0,0,0,
    0,f,0,0,
    0,0,(far+near)*nf,-1,
    0,0,(2*far*near)*nf,0
  ]);
}
function normalize(v:Vec3):Vec3{
  const l=Math.hypot(v[0],v[1],v[2])||1;
  return[v[0]/l,v[1]/l,v[2]/l];
}
function cross(a:Vec3,b:Vec3):Vec3{
  return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
}
function dot(a:Vec3,b:Vec3){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}
function lookAt(eye:Vec3,target:Vec3,up:Vec3){
  const z=normalize([eye[0]-target[0],eye[1]-target[1],eye[2]-target[2]]);
  const x=normalize(cross(up,z));
  const y=cross(z,x);
  return new Float32Array([
    x[0],y[0],z[0],0,
    x[1],y[1],z[1],0,
    x[2],y[2],z[2],0,
    -dot(x,eye),-dot(y,eye),-dot(z,eye),1
  ]);
}
function mul(a:Float32Array,b:Float32Array){
  const o=new Float32Array(16);
  for(let c=0;c<4;c++)for(let r=0;r<4;r++){
    o[c*4+r]=a[0*4+r]*b[c*4+0]+a[1*4+r]*b[c*4+1]+a[2*4+r]*b[c*4+2]+a[3*4+r]*b[c*4+3];
  }
  return o;
}
function shade(c:[number,number,number],f:number):[number,number,number]{
  return[c[0]*f,c[1]*f,c[2]*f];
}
function pushFace(out:number[],pts:Vec3[],color:[number,number,number]){
  const order=[0,1,2,0,2,3];
  for(const i of order){
    const p=pts[i];out.push(p[0],p[1],p[2],color[0],color[1],color[2]);
  }
}
function cube(out:number[],x:number,y:number,z:number,color:[number,number,number],size=1){
  const x0=x-.5,x1=x+.5,y0=y-.5,y1=y+.5,z0=z-.5,z1=z+.5;
  pushFace(out,[[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]],shade(color,1.08));
  pushFace(out,[[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]],shade(color,.83));
  pushFace(out,[[x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0]],shade(color,.66));
  pushFace(out,[[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0]],shade(color,.76));
  pushFace(out,[[x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1]],shade(color,.92));
  if(size<1)return;
}
function direction(yaw:number,pitch:number):Vec3{
  const cp=Math.cos(pitch);
  return normalize([Math.sin(yaw)*cp,-Math.sin(pitch),-Math.cos(yaw)*cp]);
}
function raycast(world:VoxelWorldState,yaw:number,pitch:number,max=7){
  const origin={x:world.player.x+.5,y:world.player.y+1.55,z:world.player.z+.5};
  const d=direction(yaw,pitch);
  let prev={x:Math.floor(origin.x),y:Math.floor(origin.y),z:Math.floor(origin.z)};
  for(let t=.12;t<=max;t+=.12){
    const cell={
      x:Math.floor(origin.x+d[0]*t),
      y:Math.floor(origin.y+d[1]*t),
      z:Math.floor(origin.z+d[2]*t)
    };
    if(cell.x===prev.x&&cell.y===prev.y&&cell.z===prev.z)continue;
    const block=blockAt(world,cell.x,cell.y,cell.z);
    if(block!=='air'&&block!=='water')return{hit:cell,adjacent:prev,block};
    prev=cell;
  }
  return null;
}

function compile(gl:WebGLRenderingContext,type:number,source:string){
  const shader=gl.createShader(type);
  if(!shader)throw new Error('WebGL shader unavailable');
  gl.shaderSource(shader,source);gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(String(gl.getShaderInfoLog(shader)||'shader compile failed'));
  return shader;
}

export function VoxelFirstPersonViewport({world,radius,selected,onMove,onMine,onPlace}:Props){
  const canvas=useRef<HTMLCanvasElement>(null);
  const keys=useRef(new Set<string>());
  const [yaw,setYaw]=useState(world.player.yaw||0);
  const [pitch,setPitch]=useState(world.player.pitch||0);
  const [locked,setLocked]=useState(false);
  const [target,setTarget]=useState<{x:number;y:number;z:number;block:VoxelBlockId}|null>(null);
  const yawRef=useRef(yaw),pitchRef=useRef(pitch);
  useEffect(()=>{yawRef.current=yaw},[yaw]);
  useEffect(()=>{pitchRef.current=pitch},[pitch]);

  const radiusSafe=Math.max(6,Math.min(16,Math.floor(radius)));

  useEffect(()=>{
    const down=(e:KeyboardEvent)=>{
      if(['INPUT','TEXTAREA','SELECT'].includes((e.target as HTMLElement)?.tagName))return;
      keys.current.add(e.key.toLowerCase());
    };
    const up=(e:KeyboardEvent)=>keys.current.delete(e.key.toLowerCase());
    const mouse=(e:MouseEvent)=>{
      if(document.pointerLockElement!==canvas.current)return;
      setYaw(v=>v+e.movementX*.0024);
      setPitch(v=>Math.max(-1.35,Math.min(1.35,v+e.movementY*.0021)));
    };
    const lock=()=>setLocked(document.pointerLockElement===canvas.current);
    window.addEventListener('keydown',down);
    window.addEventListener('keyup',up);
    window.addEventListener('mousemove',mouse);
    document.addEventListener('pointerlockchange',lock);
    const timer=window.setInterval(()=>{
      const set=keys.current;if(!set.size)return;
      const y=yawRef.current;
      let forward=0,strafe=0;
      if(set.has('w')||set.has('arrowup'))forward+=1;
      if(set.has('s')||set.has('arrowdown'))forward-=1;
      if(set.has('d')||set.has('arrowright'))strafe+=1;
      if(set.has('a')||set.has('arrowleft'))strafe-=1;
      if(!forward&&!strafe)return;
      const dx=Math.sin(y)*forward+Math.cos(y)*strafe;
      const dz=-Math.cos(y)*forward+Math.sin(y)*strafe;
      onMove(dx,dz);
    },82);
    return()=>{
      window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);
      window.removeEventListener('mousemove',mouse);document.removeEventListener('pointerlockchange',lock);
      window.clearInterval(timer);
    };
  },[onMove]);

  useEffect(()=>{
    const el=canvas.current;if(!el)return;
    const gl=el.getContext('webgl',{antialias:false,alpha:false});
    if(!gl)return;

    const rect=el.getBoundingClientRect();
    const dpr=Math.min(1.5,window.devicePixelRatio||1);
    const width=Math.max(640,Math.floor(rect.width*dpr));
    const height=Math.max(360,Math.floor((rect.height||540)*dpr));
    if(el.width!==width||el.height!==height){el.width=width;el.height=height}
    gl.viewport(0,0,width,height);

    const vs=compile(gl,gl.VERTEX_SHADER,`
      attribute vec3 aPosition;
      attribute vec3 aColor;
      uniform mat4 uMVP;
      varying vec3 vColor;
      varying float vDepth;
      void main(){
        vec4 p=uMVP*vec4(aPosition,1.0);
        gl_Position=p;
        vColor=aColor;
        vDepth=clamp(p.z/max(.001,p.w),0.0,1.0);
      }
    `);
    const fs=compile(gl,gl.FRAGMENT_SHADER,`
      precision mediump float;
      varying vec3 vColor;
      varying float vDepth;
      void main(){
        vec3 fog=vec3(.06,.12,.15);
        float f=smoothstep(.25,1.0,vDepth);
        gl_FragColor=vec4(mix(vColor,fog,f*.76),1.0);
      }
    `);
    const program=gl.createProgram();
    if(!program)return;
    gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))return;
    gl.useProgram(program);

    const verts:number[]=[];
    const px=world.player.x,pz=world.player.z;
    const baseY=world.player.y;
    for(let dx=-radiusSafe;dx<=radiusSafe;dx++)for(let dz=-radiusSafe;dz<=radiusSafe;dz++){
      if(dx*dx+dz*dz>(radiusSafe+.8)*(radiusSafe+.8))continue;
      const cell=surfaceAt(world,px+dx,pz+dz);
      if(cell.block==='air')continue;
      const color=COLORS[cell.block]||[.4,.4,.4];
      cube(verts,cell.x-px,cell.y-baseY,cell.z-pz,color);
      const below=blockAt(world,cell.x,cell.y-1,cell.z);
      if(cell.y-baseY>2&&below!=='air')cube(verts,cell.x-px,cell.y-baseY-1,cell.z-pz,shade(COLORS[below]||color,.76));
    }

    const a=world.bioAI;
    if(a&&a.dimension===world.player.dimension&&Math.hypot(a.x-px,a.z-pz)<=radiusSafe+2){
      cube(verts,a.x-px,a.y-baseY+.35,a.z-pz,[.25,.95,.78],.8);
      cube(verts,a.x-px,a.y-baseY+1.15,a.z-pz,[.55,1,.9],.65);
    }

    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(verts),gl.STATIC_DRAW);
    const stride=6*4;
    const pos=gl.getAttribLocation(program,'aPosition');
    const col=gl.getAttribLocation(program,'aColor');
    gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,3,gl.FLOAT,false,stride,0);
    gl.enableVertexAttribArray(col);gl.vertexAttribPointer(col,3,gl.FLOAT,false,stride,3*4);

    const dir=direction(yaw,pitch);
    const eye:Vec3=[0,1.55,0];
    const targetPoint:Vec3=[dir[0],1.55+dir[1],dir[2]];
    const proj=perspective(Math.PI/2.7,width/height,.05,Math.max(80,radiusSafe*10));
    const view=lookAt(eye,targetPoint,[0,1,0]);
    const mvp=mul(proj,view);
    const loc=gl.getUniformLocation(program,'uMVP');
    gl.uniformMatrix4fv(loc,false,mvp);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.clearColor(.04,.1,.13,1);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES,0,verts.length/6);

    const hit=raycast(world,yaw,pitch);
    setTarget(hit?{...hit.hit,block:hit.block}:null);

    gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
  },[world,radiusSafe,yaw,pitch]);

  function primary(e:React.MouseEvent<HTMLCanvasElement>){
    if(document.pointerLockElement!==canvas.current){
      canvas.current?.requestPointerLock();
      return;
    }
    e.preventDefault();
    const hit=raycast(world,yaw,pitch);
    if(!hit)return;
    if(e.button===2)onPlace(hit.adjacent.x,hit.adjacent.y,hit.adjacent.z);
    else onMine(hit.hit.x,hit.hit.y,hit.hit.z);
  }

  return <div style={{position:'relative',width:'100%',height:'540px',background:'#061015',overflow:'hidden'}}>
    <canvas
      ref={canvas}
      onMouseDown={primary}
      onContextMenu={e=>e.preventDefault()}
      style={{display:'block',width:'100%',height:'100%',cursor:locked?'none':'crosshair',imageRendering:'pixelated'}}
      aria-label="Mundo voxel 3D em primeira pessoa"
    />
    <div style={{position:'absolute',left:'50%',top:'50%',width:16,height:16,marginLeft:-8,marginTop:-8,pointerEvents:'none'}}>
      <i style={{position:'absolute',left:7,top:1,width:2,height:14,background:'rgba(255,255,255,.85)'}}/>
      <i style={{position:'absolute',left:1,top:7,width:14,height:2,background:'rgba(255,255,255,.85)'}}/>
    </div>
    <div style={{position:'absolute',left:12,top:12,padding:'7px 9px',border:'1px solid rgba(255,255,255,.12)',borderRadius:8,background:'rgba(2,10,13,.68)',font:'11px system-ui',color:'#d8efec',pointerEvents:'none'}}>
      <b>FIRST PERSON · WEBGL</b><br/>
      <span style={{color:'#82a5a3'}}>{locked?'WASD + mouse · esquerdo minera · direito coloca':'Clique para capturar o mouse'} · bloco {selected}</span>
      {target?<><br/><span style={{color:'#64e8cf'}}>alvo {target.block} · {target.x},{target.y},{target.z}</span></>:null}
    </div>
    <div style={{position:'absolute',right:12,top:12,padding:'7px 9px',border:'1px solid rgba(75,225,198,.2)',borderRadius:8,background:'rgba(2,10,13,.7)',font:'10px system-ui',color:'#7fe6d3',pointerEvents:'none'}}>
      BIOAI · {world.bioAI.lastAction}<br/><span style={{color:'#759795'}}>{world.bioAI.x},{world.bioAI.y},{world.bioAI.z}</span>
    </div>
  </div>;
}
