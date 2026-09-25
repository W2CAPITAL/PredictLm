
'use client';

import React,{useEffect,useRef} from 'react';
import {buildFirstPersonScene,projectPerspective,worldToCamera,type PovActor,type PovCamera} from '@/lib/life-pov-3d';
import {WORLD_OBJECTS} from '@/lib/life-world-open';

export interface PovOtherAgent{
  id:string;
  label:string;
  actor:PovActor;
  x:number;
  y:number;
  z:number;
}

export interface LifeFirstPersonViewportProps{
  title:string;
  actor:PovActor;
  x:number;
  y:number;
  z:number;
  heading:number;
  fovDeg:number;
  range:number;
  thought:string;
  action:string;
  target?:string;
  interactionObjectId?:string|null;
  peripheralFovDeg?:number;
  otherAgents?:PovOtherAgent[];
}

const palette:Record<string,[string,string,string]>={
  computer:['#5f86b5','#38506e','#84c6ff'],
  phone:['#4d5867','#2d333d','#96e8ff'],
  whiteboard:['#dce8e7','#8ea6a5','#ffffff'],
  printer:['#8997a6','#58636f','#cbd6df'],
  meeting_table:['#8d684d','#604532','#b58a67'],
  bed:['#d4aaa8','#967675','#efd2cf'],
  sofa:['#8b6b80','#5c4856','#b48aa5'],
  fridge:['#cbd6dc','#8d989e','#eef6fa'],
  stove:['#7f8a93','#535b62','#afb9c0'],
  bookshelf:['#775944','#4e392c','#a98567'],
  table:['#87654c','#5a4333','#ad8465'],
  coffee:['#916049','#604033','#c18361'],
  tree:['#4e8359','#315239','#6fae78'],
  fruit_tree:['#4e8359','#315239','#8fd06e'],
  flower:['#7b5c91','#4f3b5f','#d8a5ff'],
  trail:['#887966','#5e5346','#b8a68d'],
  playground:['#607a88','#41545e','#7fc0cf'],
  climbing_frame:['#7b8795','#4d5762','#aebdca'],
  water:['#4d8fa9','#326278','#82d9f2'],
  bench:['#826044','#59412f','#ab7f5b'],
  fountain:['#578ba0','#3a6070','#80c9e4'],
  lamp:['#6d7681','#474e56','#ffe4a0'],
  shelf:['#879198','#596168','#b0bac0'],
  plant:['#4c8155','#305237','#73b77b'],
  clinic_bed:['#b9d2d2','#789596','#e2f3f3']
};

function actorColor(actor:PovActor){
  if(actor==='human')return '#7c6cff';
  if(actor==='macaque')return '#d3a16e';
  return '#d8c7ff';
}

export function LifeFirstPersonViewport(props:LifeFirstPersonViewportProps){
  const canvas=useRef<HTMLCanvasElement>(null);

  useEffect(()=>{
    const el=canvas.current;
    if(!el)return;
    let raf=0;

    const draw=()=>{
      const rect=el.getBoundingClientRect();
      const width=Math.max(280,Math.floor(rect.width||360));
      const height=210;
      const dpr=Math.min(2,window.devicePixelRatio||1);
      if(el.width!==width*dpr||el.height!==height*dpr){
        el.width=width*dpr;
        el.height=height*dpr;
      }
      const ctx=el.getContext('2d');
      if(!ctx)return;
      ctx.setTransform(dpr,0,0,dpr,0,0);

      const camera:PovCamera={
        actor:props.actor,
        x:props.x,
        y:props.y,
        eyeZ:props.z,
        heading:props.heading,
        fovDeg:props.fovDeg,
        range:props.range
      };
      const scene=buildFirstPersonScene(camera);

      const sky=ctx.createLinearGradient(0,0,0,height*.56);
      sky.addColorStop(0,'#273a57');
      sky.addColorStop(1,'#7a91a7');
      ctx.fillStyle=sky;
      ctx.fillRect(0,0,width,height*.56);
      const ground=ctx.createLinearGradient(0,height*.5,0,height);
      ground.addColorStop(0,'#465e46');
      ground.addColorStop(1,'#17231a');
      ctx.fillStyle=ground;
      ctx.fillRect(0,height*.56,width,height*.44);

      ctx.strokeStyle='rgba(255,255,255,.08)';
      ctx.lineWidth=1;
      for(const distance of [35,55,80,115,160,220]){
        const y=height*.56+(height*.42)*(1-Math.min(1,35/distance));
        ctx.beginPath();
        ctx.moveTo(0,y);
        ctx.lineTo(width,y);
        ctx.stroke();
      }
      for(const side of [-180,-120,-80,-45,45,80,120,180]){
        const bottomX=width*.5+side;
        ctx.beginPath();
        ctx.moveTo(width*.5,height*.56);
        ctx.lineTo(bottomX,height);
        ctx.stroke();
      }

      const focal=(width*.5)/Math.tan((props.fovDeg*Math.PI/180)/2);
      for(const voxel of scene){
        const base=projectPerspective(camera,voxel.x,voxel.y,0,width,height);
        const top=projectPerspective(camera,voxel.x,voxel.y,voxel.h,width,height);
        if(!base||!top)continue;
        const screenW=Math.max(3,Math.min(width*.55,focal*voxel.w/Math.max(4,voxel.forward)));
        const screenH=Math.max(4,Math.min(height*.7,Math.abs(base.y-top.y)));
        const x=base.x-screenW*.5;
        const y=base.y-screenH;
        const colors=palette[voxel.kind]||['#78828d','#4d555e','#aab4bf'];
        const pulse=props.interactionObjectId===voxel.id?(Math.sin(performance.now()/120)+1)/2:0;
        if(pulse){
          ctx.shadowColor='#ffe78c';
          ctx.shadowBlur=10+12*pulse;
        }
        ctx.fillStyle=colors[0];
        ctx.fillRect(x,y,screenW,screenH);
        ctx.fillStyle=colors[1];
        ctx.beginPath();
        ctx.moveTo(x+screenW,y);
        ctx.lineTo(x+screenW+screenW*.16,y-screenW*.08);
        ctx.lineTo(x+screenW+screenW*.16,y+screenH-screenW*.08);
        ctx.lineTo(x+screenW,y+screenH);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle=colors[2];
        ctx.beginPath();
        ctx.moveTo(x,y);
        ctx.lineTo(x+screenW*.16,y-screenW*.08);
        ctx.lineTo(x+screenW*1.16,y-screenW*.08);
        ctx.lineTo(x+screenW,y);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur=0;

        if(voxel.distance<95){
          ctx.font='9px ui-sans-serif,system-ui';
          ctx.textAlign='center';
          const labelW=Math.min(150,Math.max(42,ctx.measureText(voxel.label).width+12));
          ctx.fillStyle='rgba(7,10,14,.78)';
          ctx.fillRect(base.x-labelW/2,Math.max(4,y-17),labelW,14);
          ctx.fillStyle='#f4f7fb';
          ctx.fillText(voxel.label,base.x,Math.max(14,y-7));
        }
      }

      for(const other of props.otherAgents||[]){
        const p=projectPerspective(camera,other.x,other.y,other.z,width,height);
        if(!p||p.depth>props.range)continue;
        const size=Math.max(3,Math.min(18,focal*5/p.depth));
        ctx.fillStyle=actorColor(other.actor);
        ctx.fillRect(p.x-size*.35,p.y-size,size*.7,size);
        ctx.beginPath();
        ctx.arc(p.x,p.y-size*1.25,size*.35,0,Math.PI*2);
        ctx.fill();
        if(p.depth<110){
          ctx.font='8px ui-sans-serif,system-ui';
          ctx.textAlign='center';
          ctx.fillStyle='#fff';
          ctx.fillText(other.label,p.x,p.y-size*1.8);
        }
      }

      if(props.peripheralFovDeg&&props.peripheralFovDeg>props.fovDeg){
        const rcx=width-42,rcy=height-54,rr=27;
        ctx.fillStyle='rgba(3,7,11,.72)';
        ctx.beginPath();ctx.arc(rcx,rcy,rr+5,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='rgba(208,197,255,.42)';ctx.lineWidth=1;
        ctx.beginPath();ctx.arc(rcx,rcy,rr,0,Math.PI*2);ctx.stroke();
        const half=(props.peripheralFovDeg*Math.PI/180)/2;
        for(const obj of WORLD_OBJECTS){
          const local=worldToCamera(camera,obj.x,obj.y,0);
          if(local.distance>props.range)continue;
          const angle=Math.atan2(local.right,local.forward);
          if(Math.abs(angle)>half)continue;
          const radial=Math.min(1,local.distance/props.range)*rr;
          const dx=Math.sin(angle)*radial;
          const dy=-Math.cos(angle)*radial;
          ctx.fillStyle=obj.flyAttraction>.65?'#ffe4a0':'#aa9df0';
          ctx.beginPath();ctx.arc(rcx+dx,rcy+dy,1.6,0,Math.PI*2);ctx.fill();
        }
        ctx.fillStyle='#c9c0f7';ctx.font='7px ui-sans-serif,system-ui';ctx.textAlign='center';
        ctx.fillText(String(props.peripheralFovDeg)+'°',rcx,rcy+rr+9);
      }

      ctx.strokeStyle='rgba(255,255,255,.85)';
      ctx.lineWidth=1.2;
      ctx.beginPath();
      ctx.moveTo(width/2-7,height/2);
      ctx.lineTo(width/2+7,height/2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(width/2,height/2-7);
      ctx.lineTo(width/2,height/2+7);
      ctx.stroke();

      ctx.fillStyle='rgba(5,8,12,.82)';
      ctx.fillRect(8,8,width-16,28);
      ctx.font='600 10px ui-sans-serif,system-ui';
      ctx.textAlign='left';
      ctx.fillStyle='#f2f5fa';
      ctx.fillText(props.title,16,20);
      ctx.font='8px ui-sans-serif,system-ui';
      ctx.fillStyle='#8fa0b6';
      const peripheral=props.peripheralFovDeg&&props.peripheralFovDeg!==props.fovDeg?' · periférico '+props.peripheralFovDeg+'°':'';
      ctx.fillText('POV voxel '+props.fovDeg+'°'+peripheral+' · '+Math.round(props.range)+'u',16,31);

      const thought=String(props.thought||'').replace(/\s+/g,' ').trim();
      const action=String(props.action||'').replace(/\s+/g,' ').trim();
      const panelH=thought?48:29;
      ctx.fillStyle='rgba(5,8,12,.82)';
      ctx.fillRect(8,height-panelH-8,width-16,panelH);
      ctx.font='8px ui-sans-serif,system-ui';
      ctx.fillStyle='#a9b5c5';
      ctx.fillText((action||'observando').slice(0,70),16,height-panelH+6);
      if(thought){
        ctx.fillStyle='#d8d0ff';
        ctx.fillText(('pensamento público: '+thought).slice(0,86),16,height-panelH+23);
      }

      raf=requestAnimationFrame(draw);
    };

    draw();
    return()=>cancelAnimationFrame(raf);
  },[
    props.actor,props.x,props.y,props.z,props.heading,props.fovDeg,props.range,
    props.thought,props.action,props.target,props.interactionObjectId,props.peripheralFovDeg,props.otherAgents
  ]);

  return <div style={{minWidth:0,border:'1px solid #263244',background:'#080c12',borderRadius:13,overflow:'hidden'}}>
    <canvas ref={canvas} aria-label={props.title+' visão 3D em primeira pessoa'} style={{display:'block',width:'100%',height:210}}/>
  </div>;
}
