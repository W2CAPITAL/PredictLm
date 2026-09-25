
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
  interactionVerb?:string;
  interactionStartedAt?:number;
  interactionDurationMs?:number;
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
      const activeObject=props.interactionObjectId?WORLD_OBJECTS.find(x=>x.id===props.interactionObjectId):null;
      const elapsed=props.interactionStartedAt?Math.max(0,performance.now()-props.interactionStartedAt):performance.now();
      const duration=Math.max(1200,props.interactionDurationMs||7000);
      const interactionPhase=(elapsed%duration)/duration;
      const interactionPulse=(Math.sin(interactionPhase*Math.PI*2*3)+1)/2;

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
        const pulse=props.interactionObjectId===voxel.id?interactionPulse:0;
        if(pulse){
          ctx.shadowColor='#ffe78c';
          ctx.shadowBlur=10+12*pulse;
        }
        const box=()=>{
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
        };

        const cx=base.x;
        if(voxel.kind==='tree'||voxel.kind==='fruit_tree'){
          ctx.fillStyle='#684b34';
          ctx.fillRect(cx-Math.max(2,screenW*.08),base.y-screenH*.58,Math.max(4,screenW*.16),screenH*.58);
          ctx.fillStyle=voxel.kind==='fruit_tree'?'#4f8b57':'#477a50';
          for(const [ox,oy,r] of [[0,-.76,.34],[-.24,-.64,.25],[.24,-.64,.25]] as const){
            ctx.beginPath();ctx.arc(cx+screenW*ox,base.y+screenH*oy,Math.max(5,screenW*r),0,Math.PI*2);ctx.fill();
          }
          if(voxel.kind==='fruit_tree'){
            ctx.fillStyle='#f1a35d';
            for(const [ox,oy] of [[-.22,-.72],[.18,-.78],[.08,-.55]] as const){
              ctx.beginPath();ctx.arc(cx+screenW*ox,base.y+screenH*oy,Math.max(1.5,screenW*.05),0,Math.PI*2);ctx.fill();
            }
          }
        }else if(voxel.kind==='bench'){
          ctx.fillStyle='#875f3e';
          ctx.fillRect(x,base.y-screenH*.48,screenW,Math.max(4,screenH*.18));
          ctx.fillRect(x,base.y-screenH*.8,screenW,Math.max(3,screenH*.14));
          ctx.fillStyle='#513827';
          ctx.fillRect(x+screenW*.12,base.y-screenH*.3,Math.max(2,screenW*.08),screenH*.3);
          ctx.fillRect(x+screenW*.78,base.y-screenH*.3,Math.max(2,screenW*.08),screenH*.3);
        }else if(voxel.kind==='bed'||voxel.kind==='clinic_bed'){
          ctx.fillStyle=voxel.kind==='bed'?'#d9b7b2':'#c5dddd';
          ctx.fillRect(x,base.y-screenH*.48,screenW,screenH*.34);
          ctx.fillStyle='#f3eeee';
          ctx.fillRect(x+screenW*.08,base.y-screenH*.44,screenW*.28,screenH*.16);
          ctx.strokeStyle=colors[1];ctx.lineWidth=2;ctx.strokeRect(x,base.y-screenH*.48,screenW,screenH*.34);
        }else if(voxel.kind==='bookshelf'||voxel.kind==='shelf'){
          box();
          ctx.strokeStyle='#d3b08b';ctx.lineWidth=1;
          for(let row=1;row<4;row++){const yy=y+screenH*row/4;ctx.beginPath();ctx.moveTo(x+2,yy);ctx.lineTo(x+screenW-2,yy);ctx.stroke()}
          if(voxel.kind==='bookshelf'){
            const bookColors=['#b65f5f','#607eaa','#c8a35c','#6f9b73'];
            for(let i=0;i<8;i++){ctx.fillStyle=bookColors[i%bookColors.length];ctx.fillRect(x+2+(i%4)*(screenW-5)/4,y+3+Math.floor(i/4)*screenH*.49,Math.max(2,(screenW-7)/5),Math.max(4,screenH*.38))}
          }
        }else if(voxel.kind==='computer'){
          ctx.fillStyle='#3c4653';ctx.fillRect(cx-screenW*.42,base.y-screenH*.34,screenW*.84,screenH*.16);
          ctx.fillStyle='#202a35';ctx.fillRect(cx-screenW*.31,base.y-screenH*.95,screenW*.62,screenH*.48);
          ctx.fillStyle=pulse?'#7ee8ff':'#75b7ef';ctx.fillRect(cx-screenW*.26,base.y-screenH*.89,screenW*.52,screenH*.36);
          ctx.fillStyle='#434b55';ctx.fillRect(cx-screenW*.05,base.y-screenH*.47,screenW*.1,screenH*.14);
          ctx.fillStyle='#8d959d';ctx.fillRect(cx-screenW*.3,base.y-screenH*.25,screenW*.6,Math.max(2,screenH*.05));
        }else if(voxel.kind==='whiteboard'){
          ctx.fillStyle='#e7efef';ctx.fillRect(x,base.y-screenH*.92,screenW,screenH*.72);
          ctx.strokeStyle='#7f9395';ctx.lineWidth=2;ctx.strokeRect(x,base.y-screenH*.92,screenW,screenH*.72);
          ctx.fillStyle='#5f6d72';ctx.fillRect(x+screenW*.12,base.y-screenH*.17,screenW*.76,Math.max(2,screenH*.05));
        }else if(voxel.kind==='fridge'){
          box();
          ctx.strokeStyle='#7d8990';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cx,y);ctx.lineTo(cx,base.y);ctx.stroke();
          ctx.fillStyle='#66727b';ctx.fillRect(cx+screenW*.14,y+screenH*.28,Math.max(2,screenW*.04),screenH*.18);
          ctx.fillRect(cx+screenW*.14,y+screenH*.58,Math.max(2,screenW*.04),screenH*.18);
        }else if(voxel.kind==='stove'){
          box();
          ctx.strokeStyle='#262c31';ctx.lineWidth=1.5;
          for(const ox of [.28,.7]){ctx.beginPath();ctx.arc(x+screenW*ox,y+screenH*.16,Math.max(2,screenW*.11),0,Math.PI*2);ctx.stroke()}
        }else if(voxel.kind==='climbing_frame'||voxel.kind==='playground'){
          ctx.strokeStyle='#93a8b8';ctx.lineWidth=Math.max(2,screenW*.06);
          for(const ox of [.12,.88]){ctx.beginPath();ctx.moveTo(x+screenW*ox,base.y);ctx.lineTo(cx,base.y-screenH*.9);ctx.stroke()}
          for(let row=1;row<4;row++){const yy=base.y-screenH*row*.2;ctx.beginPath();ctx.moveTo(x+screenW*.28,yy);ctx.lineTo(x+screenW*.72,yy);ctx.stroke()}
        }else if(voxel.kind==='trail'){
          ctx.fillStyle='#9a8b75';
          ctx.beginPath();ctx.moveTo(cx-screenW*.55,base.y);ctx.lineTo(cx+screenW*.55,base.y);ctx.lineTo(cx+screenW*.18,base.y-screenH*.8);ctx.lineTo(cx-screenW*.18,base.y-screenH*.8);ctx.closePath();ctx.fill();
        }else if(voxel.kind==='water'||voxel.kind==='fountain'){
          ctx.fillStyle='#4f98b5';
          ctx.beginPath();ctx.ellipse(cx,base.y-screenH*.12,screenW*.55,Math.max(3,screenH*.18),0,0,Math.PI*2);ctx.fill();
          ctx.strokeStyle='#a7edff';ctx.lineWidth=1;
          for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(cx,base.y-screenH*.12,screenW*(.18+i*.13),Math.max(1,screenH*(.06+i*.03)),0,0,Math.PI*2);ctx.stroke()}
          if(voxel.kind==='fountain'){ctx.beginPath();ctx.moveTo(cx,base.y-screenH*.2);ctx.lineTo(cx,base.y-screenH*.86);ctx.stroke()}
        }else if(voxel.kind==='lamp'){
          ctx.strokeStyle='#6c7780';ctx.lineWidth=Math.max(2,screenW*.1);ctx.beginPath();ctx.moveTo(cx,base.y);ctx.lineTo(cx,base.y-screenH*.9);ctx.stroke();
          ctx.fillStyle='#ffe7a2';ctx.beginPath();ctx.arc(cx,base.y-screenH*.94,Math.max(3,screenW*.18),0,Math.PI*2);ctx.fill();
        }else if(voxel.kind==='flower'){
          ctx.strokeStyle='#4f7c54';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx,base.y);ctx.lineTo(cx,base.y-screenH*.65);ctx.stroke();
          ctx.fillStyle='#d9a5ef';for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ctx.beginPath();ctx.arc(cx+Math.cos(a)*screenW*.16,base.y-screenH*.72+Math.sin(a)*screenW*.16,Math.max(2,screenW*.12),0,Math.PI*2);ctx.fill()}
        }else if(voxel.kind==='phone'){
          ctx.fillStyle='#232a32';ctx.fillRect(cx-screenW*.24,base.y-screenH*.78,screenW*.48,screenH*.7);
          ctx.fillStyle='#87dfff';ctx.fillRect(cx-screenW*.18,base.y-screenH*.7,screenW*.36,screenH*.5);
        }else{
          box();
        }
        ctx.shadowBlur=0;

        if(props.interactionObjectId===voxel.id){
          const cx=base.x,cy=Math.max(8,y+screenH*.45);
          if(voxel.kind==='computer'||voxel.kind==='tv'){
            ctx.fillStyle='rgba(96,205,255,'+(0.28+interactionPulse*.5)+')';
            ctx.fillRect(x+screenW*.16,y+screenH*.16,screenW*.68,screenH*.38);
            ctx.strokeStyle='rgba(220,248,255,.85)';
            ctx.lineWidth=1;
            for(let row=0;row<3;row++){
              const ww=screenW*(.22+.12*((row+Math.floor(interactionPhase*10))%3));
              ctx.beginPath();ctx.moveTo(x+screenW*.24,y+screenH*(.25+row*.09));ctx.lineTo(x+screenW*.24+ww,y+screenH*(.25+row*.09));ctx.stroke();
            }
          }else if(voxel.kind==='printer'){
            const sheetH=8+interactionPulse*14;
            ctx.fillStyle='#f5f4e9';ctx.fillRect(cx-screenW*.22,y-screenH*.05,screenW*.44,sheetH);
            ctx.fillStyle='#8ba0b6';ctx.fillRect(cx-screenW*.16,y+2,screenW*.28,1);
          }else if(voxel.kind==='whiteboard'){
            ctx.strokeStyle='rgba(94,140,235,.95)';ctx.lineWidth=1.4;
            for(let row=0;row<4;row++){
              const yy=y+screenH*(.18+row*.16);
              const w=screenW*(.18+.5*Math.abs(Math.sin(interactionPhase*4+row)));
              ctx.beginPath();ctx.moveTo(x+screenW*.12,yy);ctx.lineTo(x+screenW*.12+w,yy);ctx.stroke();
            }
          }else if(voxel.kind==='fridge'){
            ctx.fillStyle='rgba(195,235,255,'+(.12+interactionPulse*.26)+')';
            ctx.fillRect(x+screenW*.08,y+screenH*.08,screenW*.84,screenH*.84);
            ctx.strokeStyle='#e5f6ff';ctx.beginPath();ctx.moveTo(x+screenW*.84,y+screenH*.18);ctx.lineTo(x+screenW*(.84+.12*interactionPulse),y+screenH*.55);ctx.stroke();
          }else if(voxel.kind==='coffee'||voxel.kind==='stove'){
            ctx.strokeStyle='rgba(240,240,255,'+(.25+interactionPulse*.5)+')';ctx.lineWidth=1.2;
            for(let s=0;s<3;s++){ctx.beginPath();ctx.moveTo(cx+(s-1)*4,cy-4);ctx.quadraticCurveTo(cx+(s-1)*4+3*Math.sin(interactionPhase*6+s),cy-14,cx+(s-1)*4,cy-22);ctx.stroke();}
          }else if(voxel.kind==='fruit_tree'||voxel.kind==='flower'||voxel.kind==='plant'){
            ctx.fillStyle='rgba(255,211,86,'+(.25+interactionPulse*.55)+')';
            ctx.beginPath();ctx.arc(cx+Math.sin(interactionPhase*8)*screenW*.14,cy-screenH*.3,2.5+interactionPulse*2,0,Math.PI*2);ctx.fill();
          }else if(voxel.kind==='water'||voxel.kind==='fountain'||voxel.kind==='shower'){
            ctx.strokeStyle='rgba(123,222,255,'+(.35+interactionPulse*.5)+')';ctx.lineWidth=1;
            for(let s=-2;s<=2;s++){ctx.beginPath();ctx.moveTo(cx+s*4,y+screenH*.1);ctx.lineTo(cx+s*4+Math.sin(interactionPhase*10+s)*2,y+screenH*.72);ctx.stroke();}
          }
        }

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

      if(activeObject){
        const handY=height-22;
        const reach=18+interactionPulse*18;
        if(props.actor==='human'){
          ctx.strokeStyle='#d8ad91';ctx.lineWidth=7;ctx.lineCap='round';
          ctx.beginPath();ctx.moveTo(width*.34,handY+14);ctx.lineTo(width*.46,handY-reach);ctx.stroke();
          ctx.beginPath();ctx.moveTo(width*.66,handY+14);ctx.lineTo(width*.54,handY-reach*.9);ctx.stroke();
        }else if(props.actor==='macaque'){
          ctx.strokeStyle='#9c7353';ctx.lineWidth=8;ctx.lineCap='round';
          ctx.beginPath();ctx.moveTo(width*.27,handY+12);ctx.lineTo(width*.48,handY-reach);ctx.stroke();
          ctx.beginPath();ctx.moveTo(width*.73,handY+12);ctx.lineTo(width*.55,handY-reach*.82);ctx.stroke();
        }else{
          ctx.strokeStyle='rgba(219,207,255,.75)';ctx.lineWidth=1.4;
          for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(width*.5+(i-1)*9,handY);ctx.lineTo(width*.5+(i-1)*5,handY-reach*.55);ctx.stroke();}
        }
        ctx.font='700 8px ui-sans-serif,system-ui';ctx.textAlign='center';ctx.fillStyle='#ffe99a';
        ctx.fillText((props.interactionVerb||('interagindo com '+activeObject.label)).slice(0,72),width*.5,height-9);
      }

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
    props.thought,props.action,props.target,props.interactionObjectId,props.interactionVerb,props.interactionStartedAt,props.interactionDurationMs,props.peripheralFovDeg,props.otherAgents
  ]);

  return <div style={{minWidth:0,border:'1px solid #263244',background:'#080c12',borderRadius:13,overflow:'hidden'}}>
    <canvas ref={canvas} aria-label={props.title+' visão 3D em primeira pessoa'} style={{display:'block',width:'100%',height:210}}/>
  </div>;
}
