export const BROWSER_ANIMAL_MODEL='onnx-community/mobilenet_v1_1.0_224';
export const BROWSER_ANIMAL_REVISION='3abbb704553a28d93dc9fa9dbefe7c867b76e27b';
export const MAX_ANIMAL_IMAGE_BYTES=8*1024*1024;
export const ANIMAL_IMAGE_TYPES=['image/jpeg','image/png','image/webp'];
export const ANIMAL_BACKENDS=['auto','browser','hog-svm','pytorch-resnet','keras-resnet'] as const;
export type AnimalBackend=typeof ANIMAL_BACKENDS[number];
export type AnimalPrediction={label:string;score:number;animal:boolean;classId?:number};
export type AnimalResult={backend:AnimalBackend;model:string;predictions:AnimalPrediction[];verdict:'likely-animal'|'uncertain'|'not-animal';elapsedMs:number;semantic?:boolean;description?:string;scientificName?:string;broadGroup?:string;confidence?:number};

export function validateAnimalFile(file:{size:number;type:string}){
  if(!ANIMAL_IMAGE_TYPES.includes(file.type))throw new Error('Use uma imagem JPEG, PNG ou WebP.');
  if(!Number.isFinite(file.size)||file.size<=0||file.size>MAX_ANIMAL_IMAGE_BYTES)throw new Error('A imagem deve ter até 8 MB e não pode estar vazia.');
}
export function animalResult(backend:AnimalBackend,model:string,raw:unknown,elapsedMs=0,meta:Partial<Pick<AnimalResult,'semantic'|'description'|'scientificName'|'broadGroup'|'confidence'>>={}):AnimalResult{
  if(!Array.isArray(raw)||!raw.length||raw.length>1001)throw new Error('O classificador não retornou previsões válidas.');
  const predictions=raw.map((row:unknown)=>{
    if(!row||typeof row!=='object')throw new Error('Previsão inválida.');
    const p=row as AnimalPrediction;
    if(typeof p.label!=='string'||!p.label.trim()||typeof p.score!=='number'||!Number.isFinite(p.score)||p.score<0||p.score>1||typeof p.animal!=='boolean')throw new Error('Previsão inválida.');
    return {label:p.label.trim().slice(0,160),score:p.score,animal:p.animal,...(Number.isInteger(p.classId)?{classId:p.classId}:{})};
  }).sort((a,b)=>b.score-a.score).slice(0,5);
  const first=predictions[0];
  const margin=first.score-(predictions[1]?.score||0);
  const confidentAnimal=first.animal&&first.score>=.45&&margin>=.12;
  const confidentNonAnimal=!first.animal&&(
    backend==='browser'
      ? first.score>=.82&&margin>=.20
      : first.score>=.62&&margin>=.15
  );
  const verdict=confidentAnimal?'likely-animal':confidentNonAnimal?'not-animal':'uncertain';
  return {backend,model,predictions,verdict,elapsedMs:Math.max(0,Math.round(elapsedMs)),...meta};
}
export function animalSummary(result:AnimalResult){
  const first=result.predictions[0];
  const semantic=result.semantic===true;
  const heading=result.verdict==='likely-animal'
    ? 'A imagem '+(semantic?'mostra':'parece mostrar')+' **'+first.label+'**.'
    : result.verdict==='not-animal'
      ? semantic?'A análise visual não identificou um animal com confiança.':'O classificador indicou uma categoria não animal.'
      : 'A identificação ficou inconclusiva; compare as hipóteses abaixo.';
  const identity=result.scientificName?'**Nome científico provável:** '+result.scientificName:'';
  const description=result.description||'';
  const candidates=result.predictions.length>1
    ? ['',...result.predictions.map((p,i)=>(i+1)+'. '+p.label+': '+(p.score*100).toFixed(1)+'%')]
    : [];
  const note=semantic
    ? 'A identificação usa compreensão visual multimodal; a espécie exata ainda pode exigir confirmação quando traços diagnósticos não estiverem visíveis.'
    : 'Os valores são escores do classificador local, não garantia de identificação. Ele é apenas fallback e pode confundir a cena inteira com objetos.';
  return [heading,identity,description,...candidates,'',note].filter(Boolean).join('\n');
}
