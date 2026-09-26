export type DocumentBlockType='heading'|'paragraph'|'table'|'list'|'formula'|'image-caption'|'unknown';

export interface DocumentBlock{
  id:string;
  type:DocumentBlockType;
  text:string;
  page?:number;
  bbox?:[number,number,number,number];
  confidence?:number;
}

export interface ParsedDocument{
  title?:string;
  markdown:string;
  blocks:DocumentBlock[];
  pages?:number;
  engine:string;
  warnings:string[];
}

function compact(value:any,max=20000){
  return String(value||'').replace(/\r/g,'').trim().slice(0,max);
}

function id(index:number){return 'block-'+String(index+1).padStart(4,'0')}

export function blocksFromText(text:string):DocumentBlock[]{
  const lines=compact(text,80000).split(/\n+/).map(x=>x.trim()).filter(Boolean);
  return lines.map((line,index)=>{
    const type:DocumentBlockType=
      /^#{1,6}\s/.test(line)?'heading':
      /^[-*•]\s+/.test(line)?'list':
      /\|.+\|/.test(line)?'table':
      'paragraph';
    return {id:id(index),type,text:line.replace(/^#{1,6}\s+/,'')};
  }).slice(0,2500);
}

function normalizeBbox(raw:any):[number,number,number,number]|undefined{
  const values=Array.isArray(raw)?raw.map(Number):[];
  return values.length>=4&&values.slice(0,4).every(Number.isFinite)
    ? [values[0],values[1],values[2],values[3]]
    : undefined;
}

export function normalizeOcrPayload(payload:any):ParsedDocument{
  const markdown=compact(
    payload?.markdown||
    payload?.result?.markdown||
    payload?.data?.markdown||
    payload?.text||
    payload?.result?.text||
    '',120000
  );
  const rawBlocks=
    Array.isArray(payload?.blocks)?payload.blocks:
    Array.isArray(payload?.result?.blocks)?payload.result.blocks:
    Array.isArray(payload?.data?.blocks)?payload.data.blocks:
    [];

  const blocks:DocumentBlock[]=rawBlocks.map((row:any,index:number)=>({
    id:String(row?.id||id(index)),
    type:(['heading','paragraph','table','list','formula','image-caption'].includes(String(row?.type))
      ? String(row.type)
      : 'unknown') as DocumentBlockType,
    text:compact(row?.text||row?.content||row?.markdown||'',12000),
    page:Number.isFinite(Number(row?.page))?Number(row.page):undefined,
    bbox:normalizeBbox(row?.bbox||row?.box),
    confidence:Number.isFinite(Number(row?.confidence))?Number(row.confidence):undefined
  })).filter((x:DocumentBlock)=>Boolean(x.text));

  return {
    title:compact(payload?.title||payload?.metadata?.title||'',300)||undefined,
    markdown:markdown||blocks.map(x=>x.type==='heading'?'## '+x.text:x.text).join('\n\n'),
    blocks:blocks.length?blocks:blocksFromText(markdown),
    pages:Number.isFinite(Number(payload?.pages||payload?.pageCount))?Number(payload.pages||payload.pageCount):undefined,
    engine:String(payload?.engine||payload?.model||'structured-ocr'),
    warnings:[]
  };
}

export function documentGroundingContext(parsed:ParsedDocument,limit=18000){
  const body=parsed.blocks.slice(0,500).map(block=>{
    const loc=block.page?('p.'+block.page+' '):'';
    return '['+block.id+' '+loc+block.type+'] '+block.text;
  }).join('\n');
  return compact([
    'STRUCTURED DOCUMENT CONTEXT',
    'Engine: '+parsed.engine,
    parsed.pages?('Pages: '+parsed.pages):'',
    body,
    'Preserve block/page provenance when making factual claims.'
  ].filter(Boolean).join('\n'),limit);
}
