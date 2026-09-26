export interface WebInspection{
  url:string;
  title:string;
  description:string;
  canonical:string;
  headings:Array<{level:number;text:string}>;
  links:Array<{href:string;text:string}>;
  images:Array<{src:string;alt:string}>;
  text:string;
  wordCount:number;
  seo:{
    hasTitle:boolean;
    titleLength:number;
    hasDescription:boolean;
    descriptionLength:number;
    hasH1:boolean;
    h1Count:number;
    hasCanonical:boolean;
    imageAltCoverage:number;
  };
  fingerprint:string;
}

function decode(value:string){
  return value
    .replace(/&nbsp;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&quot;/gi,'"')
    .replace(/&#39;|&apos;/gi,"'")
    .replace(/&lt;/gi,'<')
    .replace(/&gt;/gi,'>');
}

function strip(value:string){
  return decode(String(value||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim());
}

function attr(tag:string,name:string){
  const pattern=new RegExp("\\\\b"+name+"\\\\s*=\\\\s*[\\"']([^\\"']*)[\\"']","i");
  const match=tag.match(pattern);
  return match?.[1]?decode(match[1].trim()):'';
}

function hash(value:string){
  let h=2166136261;
  for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619)}
  return (h>>>0).toString(36);
}

function absolute(base:string,value:string){
  try{return new URL(value,base).toString()}catch{return value}
}

export function inspectHtml(url:string,html:string):WebInspection{
  const cleanHtml=String(html||'').slice(0,2_500_000);
  const title=strip(cleanHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'');
  const metaTags=[...cleanHtml.matchAll(/<meta\b[^>]*>/gi)].map(x=>x[0]);
  const descriptionTag=metaTags.find(tag=>/\bname\s*=\s*["']description["']/i.test(tag));
  const description=descriptionTag?attr(descriptionTag,'content'):'';
  const linkTags=[...cleanHtml.matchAll(/<link\b[^>]*>/gi)].map(x=>x[0]);
  const canonicalTag=linkTags.find(tag=>/\brel\s*=\s*["'][^"']*canonical[^"']*["']/i.test(tag));
  const canonical=canonicalTag?absolute(url,attr(canonicalTag,'href')):'';

  const headings=[...cleanHtml.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)]
    .map(m=>({level:Number(m[1]),text:strip(m[2])}))
    .filter(x=>x.text)
    .slice(0,80);

  const links=[...cleanHtml.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)]
    .map(m=>({href:absolute(url,attr('<a '+m[1]+'>','href')),text:strip(m[2])}))
    .filter(x=>/^https?:/i.test(x.href))
    .slice(0,180);

  const images=[...cleanHtml.matchAll(/<img\b[^>]*>/gi)]
    .map(m=>({src:absolute(url,attr(m[0],'src')),alt:attr(m[0],'alt')}))
    .filter(x=>x.src)
    .slice(0,120);

  const text=strip(
    cleanHtml
      .replace(/<script[\s\S]*?<\/script>/gi,' ')
      .replace(/<style[\s\S]*?<\/style>/gi,' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi,' ')
  ).slice(0,120000);
  const words=text.split(/\s+/).filter(Boolean);
  const h1Count=headings.filter(x=>x.level===1).length;
  const imageAltCoverage=images.length?Math.round(images.filter(x=>x.alt.trim()).length/images.length*100):100;

  return {
    url,title,description,canonical,headings,links,images,text,
    wordCount:words.length,
    seo:{
      hasTitle:!!title,
      titleLength:title.length,
      hasDescription:!!description,
      descriptionLength:description.length,
      hasH1:h1Count>0,
      h1Count,
      hasCanonical:!!canonical,
      imageAltCoverage
    },
    fingerprint:hash([title,description,headings.map(x=>x.text).join('|'),text].join('\n'))
  };
}

export function diffWebInspection(
  previous:Pick<WebInspection,'fingerprint'|'text'|'title'|'description'>|null,
  current:WebInspection
){
  if(!previous)return {changed:true,meaningful:true,summary:'Primeiro snapshot registrado.',added:[],removed:[]};
  if(previous.fingerprint===current.fingerprint)return {changed:false,meaningful:false,summary:'Nenhuma mudança detectada.',added:[],removed:[]};

  const prev=new Set(String(previous.text||'').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(x=>x.length>25));
  const next=new Set(current.text.split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(x=>x.length>25));
  const added=[...next].filter(x=>!prev.has(x)).slice(0,12);
  const removed=[...prev].filter(x=>!next.has(x)).slice(0,12);
  const titleChanged=String(previous.title||'')!==current.title;
  const descriptionChanged=String(previous.description||'')!==current.description;
  const meaningful=titleChanged||descriptionChanged||added.length+removed.length>=2;

  return {
    changed:true,
    meaningful,
    summary:[
      titleChanged?'Título alterado.':'',
      descriptionChanged?'Descrição alterada.':'',
      added.length?added.length+' trecho(s) relevante(s) adicionados.':'',
      removed.length?removed.length+' trecho(s) relevante(s) removidos.':''
    ].filter(Boolean).join(' ')||'Conteúdo alterado.',
    added,
    removed
  };
}
