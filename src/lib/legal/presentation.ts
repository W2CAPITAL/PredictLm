import type { LegalProcessBundle } from './types';

function dateBR(value?:string){
  if(!value)return '';
  const d=new Date(value);
  return Number.isNaN(d.getTime())?value:d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:value.includes('T')?'short':undefined});
}

function compact(text:string,max=700){
  const clean=String(text||'').replace(/\s+/g,' ').trim();
  return clean.length<=max?clean:clean.slice(0,max).trim()+'…';
}

export function legalChatAnswer(bundle:LegalProcessBundle){
  const d=bundle.datajud;
  const latest=bundle.timeline.slice(0,5);
  const parts:string[]=[];
  parts.push('**'+bundle.processNumber+' · '+bundle.tribunalLabel+'**');
  parts.push(bundle.summary.headline);
  parts.push('**Situação pública:** '+bundle.summary.status+'.');
  if(d.filedAt)parts.push('Ajuizamento: '+dateBR(d.filedAt)+'.');
  if(d.lastUpdate)parts.push('Última atualização do DataJud: '+dateBR(d.lastUpdate)+'.');
  parts.push('DataJud retornou '+bundle.summary.movementCount+' movimentação(ões) normalizada(s); o DJEN informou '+bundle.summary.publicationCount+' publicação(ões).');

  if(latest.length){
    parts.push('**Eventos mais recentes**\n'+latest.map((x,i)=>(i+1)+'. '+dateBR(x.date)+' — '+x.title+(x.body?' · '+compact(x.body,260):'')+' ['+x.source+']').join('\n'));
  }

  const high=bundle.lenses.filter(x=>x.level==='high');
  if(high.length){
    parts.push('**Pontos de atenção**\n'+high.flatMap(x=>x.findings.slice(0,2).map(f=>'• '+x.title+': '+f)).join('\n'));
  }

  const errors=[d.error,bundle.djen.error].filter(Boolean);
  if(errors.length)parts.push('**Limitações da consulta:** '+errors.join(' | '));

  parts.push('Esses são metadados/fontes públicas. Para decisão sobre prazo, mérito ou estratégia, confira o inteiro teor nos autos e a publicação oficial.');
  return parts.join('\n\n');
}

export function legalSources(bundle:LegalProcessBundle){
  const out:{title:string;source:string}[]=[];
  if(bundle.datajud.endpoint)out.push({title:'DataJud · '+bundle.tribunalLabel,source:bundle.datajud.endpoint});
  if(bundle.djen.endpoint)out.push({title:'DJEN · Comunicações do processo',source:bundle.djen.endpoint});
  for(const p of bundle.djen.publications.slice(0,2)){
    if(p.certificateUrl)out.push({title:'Certidão DJEN · '+(p.type||'Publicação'),source:p.certificateUrl});
  }
  return out;
}
