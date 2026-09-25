import type {LifeLocation,LifeWorldPlace} from './life-simulation-engine';
import {LIFE_WORLD_HEIGHT,LIFE_WORLD_WIDTH} from './life-world-open';

export interface IsoCamera{
  zoom:number;
  offsetX:number;
  offsetY:number;
}

export interface IsoPoint{x:number;y:number}

export interface PlaceVisual{
  id:LifeLocation;
  floor:string;
  wallLight:string;
  wallDark:string;
  accent:string;
  height:number;
  furniture:'home'|'office'|'cafe'|'park'|'market'|'clinic'|'library';
}

export const DEFAULT_ISO_CAMERA:IsoCamera={zoom:1,offsetX:0,offsetY:0};

const visuals:Record<LifeLocation,PlaceVisual>={
  Casa:{id:'Casa',floor:'#b99b79',wallLight:'#ead8bd',wallDark:'#b79d80',accent:'#ffb87a',height:26,furniture:'home'},
  Trabalho:{id:'Trabalho',floor:'#8a96a8',wallLight:'#c8d0db',wallDark:'#8792a3',accent:'#73a7ff',height:32,furniture:'office'},
  Café:{id:'Café',floor:'#aa8067',wallLight:'#ddc0a9',wallDark:'#9f765e',accent:'#ff9a6f',height:24,furniture:'cafe'},
  Parque:{id:'Parque',floor:'#6e9471',wallLight:'#95b89a',wallDark:'#5d7d62',accent:'#86d993',height:9,furniture:'park'},
  Mercado:{id:'Mercado',floor:'#9ca4a9',wallLight:'#d2d8dc',wallDark:'#878f94',accent:'#f6cf69',height:27,furniture:'market'},
  Clínica:{id:'Clínica',floor:'#9bb8b9',wallLight:'#dce9e9',wallDark:'#7f9d9f',accent:'#7ce0d8',height:30,furniture:'clinic'},
  Biblioteca:{id:'Biblioteca',floor:'#8e765f',wallLight:'#cdbba7',wallDark:'#7b6552',accent:'#c99cff',height:29,furniture:'library'}
};

export function placeVisual(id:LifeLocation){return visuals[id]}

export function projectIsoPoint(
  x:number,
  y:number,
  z=0,
  width=640,
  height=430,
  camera:IsoCamera=DEFAULT_ISO_CAMERA
):IsoPoint{
  const zoom=Math.max(.65,Math.min(1.65,camera.zoom||1));
  const u=(x-LIFE_WORLD_WIDTH/2)/(LIFE_WORLD_WIDTH/2);
  const v=(y-LIFE_WORLD_HEIGHT/2)/(LIFE_WORLD_HEIGHT/2);
  const baseX=width*.5+(u-v)*width*.235*zoom;
  const baseY=height*.46+(u+v)*height*.165*zoom-z*zoom;
  return {x:baseX+camera.offsetX,y:baseY+camera.offsetY};
}

export function unprojectIsoPoint(
  screenX:number,
  screenY:number,
  width=640,
  height=430,
  camera:IsoCamera=DEFAULT_ISO_CAMERA
){
  const zoom=Math.max(.65,Math.min(1.65,camera.zoom||1));
  const a=(screenX-camera.offsetX-width*.5)/(width*.235*zoom);
  const b=(screenY-camera.offsetY-height*.46)/(height*.165*zoom);
  const u=(a+b)/2;
  const v=(b-a)/2;
  return {
    x:Math.max(0,Math.min(LIFE_WORLD_WIDTH,LIFE_WORLD_WIDTH/2+u*(LIFE_WORLD_WIDTH/2))),
    y:Math.max(0,Math.min(LIFE_WORLD_HEIGHT,LIFE_WORLD_HEIGHT/2+v*(LIFE_WORLD_HEIGHT/2)))
  };
}

export function projectedPlacePolygon(
  place:LifeWorldPlace,
  width:number,
  height:number,
  camera:IsoCamera
){
  const p1=projectIsoPoint(place.x,place.y,0,width,height,camera);
  const p2=projectIsoPoint(place.x+place.w,place.y,0,width,height,camera);
  const p3=projectIsoPoint(place.x+place.w,place.y+place.h,0,width,height,camera);
  const p4=projectIsoPoint(place.x,place.y+place.h,0,width,height,camera);
  return [p1,p2,p3,p4];
}

export function pointInPolygon(point:IsoPoint,polygon:IsoPoint[]){
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const xi=polygon[i].x,yi=polygon[i].y;
    const xj=polygon[j].x,yj=polygon[j].y;
    const intersects=((yi>point.y)!==(yj>point.y))
      &&(point.x<(xj-xi)*(point.y-yi)/((yj-yi)||1e-9)+xi);
    if(intersects)inside=!inside;
  }
  return inside;
}

export function cameraForFocus(
  target:{x:number;y:number;z?:number},
  width:number,
  height:number,
  zoom:number
):IsoCamera{
  const base=projectIsoPoint(target.x,target.y,target.z||0,width,height,{zoom,offsetX:0,offsetY:0});
  return {
    zoom,
    offsetX:width*.5-base.x,
    offsetY:height*.53-base.y
  };
}
