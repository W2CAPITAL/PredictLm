import type { LegalProcessBundle } from './types';
import { legalAttackFramework, tjspFilingChecklist } from './filing';

function dateBR(value?:string){
  if(!value)return '';
  const d=new Date(value);
  return Number.isNaN(d.getTime())?value:d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:value.includes('T')?'short':undefined});
}
function compact(text:string,max=720){
  const clean=String(text||'').replace(/\s+/g,' ').trim();
  return clean.length<=max?clean:clean.slice(0,max).trim()+'…';
}
function strategyRequested(prompt:string){
  return /\b(atacar|processar|ajuizar|entrar com a[cç][aã]o|abrir processo|peticionar|medida judicial|medida cab[ií]vel|qual a[cç][aã]o|como mover a[cç][aã]o|estrat[eé]gia)\b/i.test(prompt);
}
function councilRequested(prompt:string){
  return /council|x10|red.?team|tese e contra|pior caso|auditar|an[aá]lise profunda/i.test(prompt);
}

function filingGuidance(bundle:LegalProcessBundle,prompt:string){
  if(bundle.tribunalAlias==='tjsp')return [legalAttackFramework(prompt),tjspFilingChecklist(prompt)].filter(Boolean).join('\n\n');
  return [
    legalAttackFramework(prompt),
    '### Como transformar a estratégia em protocolo',
    '- Identifique competência, rito e sistema eletrônico do tribunal.',
    '- Feche fatos, prova, pedidos, valor da causa, procuração e custas/gratuidade.',
    '- Confirme cadastro/autenticação exigidos pelo sistema oficial.',
    '- Prepare a minuta e anexos; assinatura, pagamento e protocolo exigem confirmação do titular autorizado.'
  ].filter(Boolean).join('\n');
}

function councilX10(bundle:LegalProcessBundle){
  const found=bundle.timeline.length>0;
  const portal=bundle.officialPortals[0];
  return [
    ['Produto','A pergunta real é decidir com base em evidência processual, não exibir logs de API.'],
    ['Arquitetura','DataJud, DJEN e portal oficial são fontes independentes; resultado parcial deve ser preservado.'],
    ['Implementação',found?'Há eventos suficientes para montar timeline.':'Sem evento normalizado, o sistema deve manter hipóteses abertas e buscar fonte oficial adicional.'],
    ['UX','A resposta final deve trazer fatos e implicação, deixando detalhes técnicos recolhidos.'],
    ['Domínio',portal?.found?'O portal oficial localizou o processo e deve pesar mais que ausência em agregadores.':'Ausência pública ainda pode significar atraso, sigilo, migração ou número incorreto.'],
    ['Segurança','Sem bypass de CAPTCHA/WAF, sem acesso a sigilo e sem credencial/certificado de terceiro.'],
    ['Falhas','Timeout/403 não são “zero resultados”; são falhas de fonte.'],
    ['Jurídico/privacidade','Metadados não substituem teor de decisão quando mérito/prazo depende do texto.'],
    ['Operações','Retry deve ser seletivo e com backoff para não martelar fonte externa.'],
    ['Contra-caso','Mesmo um evento público pode estar desatualizado; a conclusão forte exige confronto com o ato/inteiro teor quando necessário.']
  ];
}

export function legalChatAnswer(bundle:LegalProcessBundle,prompt='',recall?:{count:number;titles?:string[]}){
  const d=bundle.datajud;
  const latest=bundle.timeline.slice(0,8);
  const portal=bundle.officialPortals.find(x=>x.found)||bundle.officialPortals[0];
  const parts:string[]=[];

  parts.push('**'+bundle.processNumber+' · '+bundle.tribunalLabel+'**');

  const metadata=[
    d.class?.name?('Classe: **'+d.class.name+'**'):'',
    d.court?.name?('Órgão/vara: **'+d.court.name+'**'):'',
    d.filedAt?('Ajuizamento: **'+dateBR(d.filedAt)+'**'):'',
    d.lastUpdate?('Última atualização pública: **'+dateBR(d.lastUpdate)+'**'):''
  ].filter(Boolean);
  if(metadata.length)parts.push(metadata.join(' · '));

  if(latest.length){
    parts.push('**Situação pública:** '+bundle.summary.status+'.');
    parts.push('### Eventos mais recentes\n'+latest.map((x,i)=>
      (i+1)+'. **'+dateBR(x.date)+' — '+x.title+'**'+(x.body?'\n   '+compact(x.body,430):'')+' · '+x.source
    ).join('\n'));
    if(bundle.djen.publications.length){
      const pubs=bundle.djen.publications.slice(0,4);
      parts.push('### Publicações DJEN\n'+pubs.map(p=>
        '- **'+dateBR(p.availableAt||p.publishedAt)+' · '+(p.type||'Publicação')+'**'+
        (p.courtUnit?' · '+p.courtUnit:'')+
        (p.text?'\n  '+compact(p.text,650):'')
      ).join('\n'));
    }
  }else{
    const sourceLines=[
      'DataJud: '+(d.ok?(d.found?'processo localizado, sem movimento normalizado':'consulta respondeu sem hit'):'não respondeu'+(d.error?' — '+compact(d.error,220):'')),
      'DJEN: '+(bundle.djen.ok?(bundle.djen.count+' publicação(ões)'):'não respondeu'+(bundle.djen.error?' — '+compact(bundle.djen.error,220):'')),
      portal?(portal.name+': '+(portal.found?(portal.message||'processo localizado'):(portal.message||'sem informação pública confirmada'))):''
    ].filter(Boolean);
    parts.push('Não encontrei evento público suficiente para descrever a fase do processo com segurança nesta consulta.');
    parts.push(sourceLines.map(x=>'- '+x).join('\n'));
    parts.push([
      'Isso **não prova que o processo inexista**. As hipóteses que continuam abertas são: atraso de indexação, limitação/sigilo de consulta pública, migração de sistema, indisponibilidade da fonte ou erro no número informado.'
    ].join('\n'));
  }

  const critical=bundle.lenses.filter(x=>x.level==='high').flatMap(x=>x.findings.slice(0,2));
  if(critical.length&&latest.length){
    parts.push('### Pontos que merecem atenção\n'+critical.slice(0,5).map(x=>'- '+x).join('\n'));
  }

  if(strategyRequested(prompt))parts.push(filingGuidance(bundle,prompt));

  if(councilRequested(prompt)){
    parts.push('### Revisão X10\n'+councilX10(bundle).map(([name,text])=>'- **'+name+':** '+text).join('\n'));
  }

  // Só pede confirmação adicional quando a própria pergunta depende dela.
  if((/prazo|recurso|senten[cç]a|decis[aã]o|mérito|merito/i.test(prompt))&&!latest.length){
    parts.push('Para responder **prazo, recurso ou mérito**, falta o teor do ato/decisão. Nessa situação, preciso do documento ou de uma fonte oficial que o exponha.');
  }

  if(recall?.count){
    parts.push('_Há '+recall.count+' registro(s) anterior(es) deste CNJ na memória local do app._');
  }

  return parts.join('\n\n');
}

export function legalSources(bundle:LegalProcessBundle){
  const out:{title:string;source:string}[]=[];
  if(bundle.datajud.endpoint)out.push({title:'DataJud · '+bundle.tribunalLabel,source:bundle.datajud.endpoint});
  if(bundle.djen.endpoint)out.push({title:'DJEN · Comunicações do processo',source:bundle.djen.endpoint});
  for(const portal of bundle.officialPortals)if(portal.endpoint)out.push({title:portal.name+' · consulta oficial',source:portal.endpoint});
  for(const p of bundle.djen.publications.slice(0,2))if(p.certificateUrl)out.push({title:'Certidão DJEN · '+(p.type||'Publicação'),source:p.certificateUrl});
  return Array.from(new Map(out.map(x=>[x.source,x])).values()).slice(0,6);
}
