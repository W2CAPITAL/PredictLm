import type { LegalProcessBundle, LegalTimelineItem } from './types';
import { legalAttackFramework, tjspFilingChecklist } from './filing';
import { isAggressiveLegalRequest } from './mode';
import {fuseBioIntelligence} from '@/lib/biointelligence-fabric';

function dateBR(value?:string){
  if(!value)return '';
  const d=new Date(value);
  return Number.isNaN(d.getTime())?value:d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:value.includes('T')?'short':undefined});
}

function compact(text:string,max=560){
  const clean=String(text||'').replace(/\s+/g,' ').trim();
  return clean.length<=max?clean:clean.slice(0,max).trim()+'…';
}

function strategyRequested(prompt:string){
  return /\b(atacar|processar|ajuizar|entrar com a[cç][aã]o|abrir processo|peticionar|medida judicial|medida cab[ií]vel|qual a[cç][aã]o|como mover a[cç][aã]o|estrat[eé]gia)\b/i.test(prompt);
}

function councilRequested(prompt:string){
  return isAggressiveLegalRequest(prompt)||/council|x10|tese e contra|pior caso|auditar|an[aá]lise profunda/i.test(prompt);
}

function detailRequested(prompt:string){
  return /inteiro teor|publica[cç][oõ]es?|movimenta[cç][oõ]es?|linha do tempo completa|detalh(?:e|es|ar)|todos os eventos/i.test(prompt);
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
    ['Produto','A resposta precisa dizer o que aconteceu, o impacto prático e a próxima medida — não despejar eventos crus.'],
    ['Arquitetura','DataJud, DJEN e portal oficial são fontes independentes; sucesso parcial deve ser preservado.'],
    ['Implementação',found?'Há eventos suficientes para formar uma cronologia.':'Sem evento normalizado, manter hipóteses abertas e buscar fonte oficial adicional.'],
    ['UX','Estado atual e avaliação prática devem vir antes da linha do tempo.'],
    ['Domínio',portal?.found?'O portal oficial localizou o processo e deve pesar mais que ausência em agregadores.':'Ausência pública ainda pode significar atraso, sigilo, migração ou número incorreto.'],
    ['Segurança','Sem bypass de CAPTCHA/WAF, sem acesso indevido e sem credencial/certificado de terceiro.'],
    ['Falhas','Timeout/403 não são “zero resultados”; são falhas de fonte.'],
    ['Jurídico/privacidade','Pagamento posterior de custas não deve ser interpretado como reabertura sem ato expresso de prosseguimento.'],
    ['Operações','Retry seletivo e com backoff; não martelar fonte externa.'],
    ['Contra-caso','Mesmo com trânsito ou custas satisfeitas, o ato integral pode revelar nuance que o metadado não mostra.']
  ];
}

function eventMeaning(item:LegalTimelineItem){
  const text=((item.title||'')+' '+(item.body||'')).toLowerCase();

  if(/custas?\s+satisfeitas?/.test(text)){
    return 'Custas satisfeitas: houve registro de quitação da pendência de custas. Isso, sozinho, não reabre processo já extinto.';
  }
  if(/senten[cç]a/.test(text)&&(/art\.?\s*290|extin[cç][aã]o|cancelamento\s+da\s+distribui[cç][aã]o/.test(text))){
    return 'Sentença: o feito foi extinto por problema no recolhimento/comprovação das custas iniciais, com referência ao art. 290 do CPC.';
  }
  if(/tr[aâ]nsito\s+em\s+julgado/.test(text)){
    return 'Trânsito em julgado: a decisão passou a ser tratada como definitiva nesse processo.';
  }
  if(/gratuidade/.test(text)&&/indef|negad/.test(text)){
    return 'Gratuidade de justiça negada; o juízo determinou o recolhimento das custas.';
  }
  if(/taxa judici[aá]ria|custas?\s+(?:processuais|iniciais)/.test(text)){
    return 'Determinação relacionada ao recolhimento das custas/taxa judiciária.';
  }
  if(/aceito?\s+a\s+compet[eê]ncia|compet[eê]ncia/.test(text)&&/gratuidade/.test(text)){
    return 'O juízo aceitou a competência e passou a tratar do pedido de gratuidade/custas.';
  }
  if(/intima[cç][aã]o/.test(text)){
    return compact(item.body||item.title,280);
  }
  return compact(item.body||item.title,320);
}

function keyTimeline(bundle:LegalProcessBundle,limit=6){
  const scored=bundle.timeline.map(item=>{
    const t=((item.title||'')+' '+(item.body||'')).toLowerCase();
    let score=0;
    if(/senten[cç]a|extin[cç][aã]o|art\.?\s*290/.test(t))score+=10;
    if(/tr[aâ]nsito\s+em\s+julgado/.test(t))score+=9;
    if(/gratuidade.*indef|indef.*gratuidade/.test(t))score+=8;
    if(/custas?\s+satisfeitas?/.test(t))score+=8;
    if(/custas?|taxa judici[aá]ria/.test(t))score+=5;
    if(item.type==='publication')score+=2;
    return {item,score};
  });

  const selected:LegalTimelineItem[]=[];
  for(const row of scored.sort((a,b)=>b.score-a.score||String(b.item.date).localeCompare(String(a.item.date)))){
    const meaning=eventMeaning(row.item);
    if(selected.some(x=>eventMeaning(x)===meaning))continue;
    selected.push(row.item);
    if(selected.length>=Math.max(4,Math.min(10,limit)))break;
  }
  return selected.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
}

function sourceFailureDetails(bundle:LegalProcessBundle){
  const details:string[]=[];
  if(!bundle.datajud.ok)details.push('DataJud: '+(bundle.datajud.error||'falha sem detalhe'));
  if(!bundle.djen.ok)details.push('DJEN: '+(bundle.djen.error||'falha sem detalhe'));
  for(const p of bundle.officialPortals)if(!p.ok)details.push(p.name+': '+(p.message||'falha sem detalhe'));
  return details;
}

function aggressiveReview(bundle:LegalProcessBundle){
  const findings=bundle.lenses
    .filter(x=>x.level==='high'||x.level==='attention')
    .flatMap(x=>x.findings.map(item=>x.title+': '+item))
    .slice(0,8);
  const base=[
    ...findings,
    ...bundle.interpretation.evidence.slice(0,4).map(x=>'Evidência a conferir: '+x)
  ];
  return Array.from(new Set(base)).slice(0,10);
}

function sourceHealth(bundle:LegalProcessBundle){
  const failed:string[]=[];
  if(!bundle.datajud.ok)failed.push('DataJud');
  if(!bundle.djen.ok)failed.push('DJEN');
  for(const p of bundle.officialPortals)if(!p.ok)failed.push(p.name);
  return failed;
}

export function legalChatAnswer(bundle:LegalProcessBundle,prompt='',recall?:{count:number;titles?:string[]}){
  const sourceFailures=[!bundle.datajud.ok,!bundle.djen.ok,...bundle.officialPortals.map(x=>!x.ok)].filter(Boolean).length;
  const bioLegal=fuseBioIntelligence({
    surface:'processes',
    action:'synthesize process '+bundle.processNumber,
    kind:'legal',
    success:bundle.timeline.length>0,
    uncertainty:sourceFailures?Math.min(.92,.48+sourceFailures*.12):.24,
    salience:.78,
    novelty:bundle.timeline.length?Math.min(1,.35+bundle.timeline.length/40):.7
  });
  const d=bundle.datajud;
  const interpretation=bundle.interpretation;
  const parts:string[]=[];

  parts.push('**'+bundle.processNumber+' · '+bundle.tribunalLabel+'**');

  const metadata=[
    d.class?.name?('Classe: **'+d.class.name+'**'):'',
    d.court?.name?('Órgão/vara: **'+d.court.name+'**'):'',
    d.filedAt?('Ajuizamento: **'+dateBR(d.filedAt)+'**'):''
  ].filter(Boolean);
  if(metadata.length)parts.push(metadata.join(' · '));

  if(bundle.timeline.length){
    parts.push(
      '### Como o processo está agora\n'+
      '**'+interpretation.postureLabel+'.** '+interpretation.currentState
    );

    if(interpretation.whatHappened.length){
      parts.push('### O que aconteceu\n'+interpretation.whatHappened.map((x,i)=>(i+1)+'. '+x).join('\n'));
    }

    if(interpretation.whyItMatters.length){
      parts.push('### Isso é bom ou ruim?\n'+interpretation.whyItMatters.map(x=>'- '+x).join('\n'));
    }

    if(interpretation.nextActions.length){
      parts.push('### O que eu faria agora\n'+interpretation.nextActions.map((x,i)=>(i+1)+'. '+x).join('\n'));
    }

    const essential=keyTimeline(bundle,bioLegal.consensus.inhibition>.62||bioLegal.researchGap?8:6);
    if(essential.length){
      parts.push('### Linha do tempo essencial\n'+essential.map(item=>
        '- **'+dateBR(item.date)+' — '+item.title+'** · '+eventMeaning(item)+' · '+item.source
      ).join('\n'));
    }

    if(detailRequested(prompt)&&bundle.djen.publications.length){
      parts.push('### Publicações encontradas\n'+bundle.djen.publications.slice(0,8).map(p=>
        '- **'+dateBR(p.availableAt||p.publishedAt)+' · '+(p.type||'Publicação')+'**'+
        (p.courtUnit?' · '+p.courtUnit:'')+
        (p.text?'\n  '+compact(p.text,900):'')
      ).join('\n'));
    }
  }else{
    const portal=bundle.officialPortals.find(x=>x.found)||bundle.officialPortals[0];
    const sourceLines=[
      'DataJud: '+(d.ok?(d.found?'processo localizado, sem movimento normalizado':'consulta respondeu sem hit'):'não respondeu'+(d.error?' — '+compact(d.error,220):'')),
      'DJEN: '+(bundle.djen.ok?(bundle.djen.count+' publicação(ões)'):'não respondeu'+(bundle.djen.error?' — '+compact(bundle.djen.error,220):'')),
      portal?(portal.name+': '+(portal.found?(portal.message||'processo localizado'):(portal.message||'sem informação pública confirmada'))):''
    ].filter(Boolean);
    parts.push('Não há evento público suficiente para eu dizer em que fase o processo está.');
    parts.push(sourceLines.map(x=>'- '+x).join('\n'));
    parts.push('Isso não prova que o processo inexista: pode haver atraso de indexação, sigilo/limitação da consulta pública, migração de sistema, indisponibilidade da fonte ou erro no número.');
  }

  const failed=sourceHealth(bundle);
  const failureDetails=sourceFailureDetails(bundle);
  if(failed.length&&bundle.timeline.length){
    parts.push('### Falhas de fonte\n'+failureDetails.map(x=>'- '+x).join('\n')+'\n\nA leitura acima preserva apenas as fontes que realmente retornaram dados.');
  }

  if(strategyRequested(prompt))parts.push(filingGuidance(bundle,prompt));

  if(isAggressiveLegalRequest(prompt)){
    const findings=aggressiveReview(bundle);
    parts.push('### AEGIS — revisão adversarial (pedido expresso)\n'+
      (findings.length?findings.map(x=>'- '+x).join('\n'):'- Não há evidência pública suficiente para sustentar um ataque técnico além dos caveats já apontados.')+
      '\n\nO modo adversarial continua limitado aos fatos disponíveis; ausência de dado não vira acusação ou certeza.');
  }

  if(councilRequested(prompt)){
    parts.push('### Revisão X10\n'+councilX10(bundle).map(([name,text])=>'- **'+name+':** '+text).join('\n'));
  }

  // Recall continua útil internamente, mas só aparece quando o usuário pede histórico/memória.
  if(recall?.count&&/mem[oó]ria|hist[oó]rico|registro anterior|já vimos|ja vimos/i.test(prompt)){
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


export function legalDossierSummary(bundle:LegalProcessBundle,mode:'standard'|'aggressive'='standard'){
  const i=bundle.interpretation;
  const lines=[
    '**Dossiê HTML gerado · '+bundle.processNumber+' · '+bundle.tribunalLabel+'**',
    '**Modo:** '+(mode==='aggressive'?'AEGIS/agressivo — solicitado expressamente':'standard/neutro-profissional'),
    '**Estado atual:** '+i.currentState,
    i.whatHappened[0]?('**Evento-chave:** '+i.whatHappened[0]):'',
    i.whyItMatters[0]?('**Impacto:** '+i.whyItMatters[0]):'',
    i.nextActions[0]?('**Próximo passo:** '+i.nextActions[0]):'',
    '**Fontes:** '+bundle.summary.sourceSummary,
    (!bundle.datajud.ok||!bundle.djen.ok)?'**Atenção:** há fonte com erro; o HTML registra o erro literal e mantém os dados das fontes que responderam.':''
  ].filter(Boolean);
  return lines.join('\n');
}
