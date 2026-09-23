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

function statusIcon(status:string){
  return status==='done'?'✓':status==='skip'?'–':status==='warn'?'△':'×';
}

function strategyRequested(prompt:string){
  return /\b(atacar|processar|ajuizar|entrar com a[cç][aã]o|abrir processo|peticionar|medida judicial|medida cab[ií]vel|qual a[cç][aã]o|como mover a[cç][aã]o)\b/i.test(prompt);
}

function filingGuidance(bundle:LegalProcessBundle){
  if(bundle.tribunalAlias!=='tjsp'){
    return [
      '**Se a intenção for ajuizar/peticionar**',
      '• Primeiro identifique o sistema eletrônico usado pelo tribunal e pela competência concreta (PJe, eproc, e-SAJ ou outro).',
      '• Para advogado, o peticionamento eletrônico normalmente exige cadastro profissional e autenticação/certificado conforme a plataforma.',
      '• A TwinCore pode preparar checklist, minuta, documentos e validação; o protocolo final deve ocorrer na conta autorizada do profissional/parte e com confirmação explícita.'
    ].join('\n');
  }
  return [
    '**Se a intenção for ajuizar/peticionar no TJSP**',
    '• Não assuma automaticamente e-SAJ ou eproc: o TJSP mantém uma página oficial que informa qual sistema usar por foro e competência.',
    '• No e-SAJ, o peticionamento de advogado exige cadastro profissional; para uso do certificado digital o portal utiliza Web Signer e certificado ICP-Brasil.',
    '• No eproc, o TJSP publica fluxos separados para advogado e, quando juridicamente cabível, cidadão/Jus Postulandi.',
    '• Antes de qualquer protocolo: competência, legitimidade, pedidos, valor da causa, custas/justiça gratuita, documentos essenciais, procuração e risco de sucumbência precisam ser conferidos.',
    '• O PredictLM pode montar a estratégia, minuta, checklist e pacote documental; não deve protocolar silenciosamente nem usar certificado de terceiro.'
  ].join('\n');
}

function councilX10(bundle:LegalProcessBundle,prompt:string){
  const found=bundle.timeline.length>0;
  const portal=bundle.officialPortals[0];
  const datajudState=bundle.datajud.ok?(bundle.datajud.found?'encontrou o processo':'não retornou hit'):'falhou';
  const djenState=bundle.djen.ok?(bundle.djen.count+' publicação(ões)'):'falhou';
  const wantsAction=strategyRequested(prompt);
  return [
    ['1 · Product / North Star',wantsAction?'Objetivo aparente: decidir uma medida jurídica útil, não apenas localizar dados. Primeiro é preciso fechar fatos, prova e competência.':'Objetivo aparente: entender o estado público do processo com a maior cobertura verificável.'],
    ['2 · Architecture / Evidence','Cobertura atual: DataJud '+datajudState+', DJEN '+djenState+(portal?' e '+portal.name+' '+(portal.found?'localizou informação':'não confirmou informação pública'):'')+'. Nenhuma fonte isolada é tratada como verdade absoluta.'],
    ['3 · Builder / Implementation','O pipeline executa CNJ → tribunal → DataJud/DJEN → fallback oficial → normalização → timeline → síntese. Falha de uma etapa não encerra silenciosamente a investigação.'],
    ['4 · UX / Human Factors',found?'Há eventos públicos suficientes para exibir uma linha do tempo, mas o usuário ainda precisa distinguir evento, publicação e inferência.':'A resposta deve explicar por que não há dados, em vez de mostrar apenas “0 movimentos”.'],
    ['5 · Research / Domain',bundle.tribunalAlias==='tjsp'?'O número aponta para TJSP; quando as APIs centrais não resolvem, a consulta pública do e-SAJ é uma fonte oficial adicional.':'O número foi roteado para '+bundle.tribunalLabel+'; adapters adicionais dependem do sistema oficial desse tribunal.'],
    ['6 · Security / Abuse','A investigação fica em fontes públicas/autorizadas. Não há bypass de CAPTCHA, autenticação, sigilo ou uso de certificado de terceiro.'],
    ['7 · Failure / QA',found?'Mesmo com eventos, pode haver atraso de indexação ou ausência de peças/decisões integrais.':'Hipóteses de falha: atraso de indexação, indisponibilidade, sigilo, migração de sistema, número incorreto ou processo ainda não publicizado.'],
    ['8 · Legal / Privacy',bundle.datajud.confidentiality&&bundle.datajud.confidentiality>0?'Há indicação de nível de sigilo nos metadados; acesso adicional depende de autorização.':'Ausência pública não autoriza inferir conteúdo protegido nem revelar dados não retornados.'],
    ['9 · Operations / Cost / Reliability','Fontes externas têm timeout, bloqueio geográfico e mudanças de portal. O sistema registra a falha e mantém fallback/rollback em vez de inventar resultado.'],
    ['10 · Devil\'s Advocate / Countercase',found?'Mesmo um evento público pode estar desatualizado ou incompleto; a tese mais forte contra a leitura atual é o inteiro teor mostrar contexto diferente.':'A hipótese mais incômoda é simples: o CNJ pode estar errado ou não corresponder a processo publicamente consultável. Ela deve ser testada, não escondida.']
  ];
}

export function legalChatAnswer(bundle:LegalProcessBundle,prompt='',recall?:{count:number;titles?:string[]}){
  const d=bundle.datajud;
  const latest=bundle.timeline.slice(0,7);
  const portal=bundle.officialPortals[0];
  const noPublicEvents=!latest.length;
  const parts:string[]=[];

  parts.push('**LEXIS TwinCore X10 — Modo processos + Recall**');
  parts.push([
    '**Processo consultado**',
    '**'+bundle.processNumber+'**',
    '• Tribunal: '+bundle.tribunalLabel,
    '• CNJ: '+(bundle.validCnj?'dígito verificador consistente':'dígito verificador não confirmado'),
    recall?.count?'• Recall local: '+recall.count+' registro(s) anterior(es) encontrado(s).':'• Recall local: sem registro anterior deste CNJ.'
  ].join('\n'));

  parts.push('**Execução das fontes**\n'+bundle.trace.map(x=>'['+statusIcon(x.status)+'] **'+x.label+'** — '+x.detail).join('\n'));

  if(portal?.ok){
    parts.push('**Resultado oficial adicional — '+portal.name+'**\n> '+(portal.message||'Consulta concluída.'));
  }

  if(!noPublicEvents){
    parts.push('**Situação pública**\n'+bundle.summary.status+'.\n\n'+
      (d.filedAt?'Ajuizamento: '+dateBR(d.filedAt)+'.\n':'')+
      (d.lastUpdate?'Última atualização DataJud: '+dateBR(d.lastUpdate)+'.\n':'')+
      'Fontes consolidadas: '+bundle.summary.sourceSummary+'.');
    parts.push('**Eventos mais recentes**\n'+latest.map((x,i)=>(i+1)+'. '+dateBR(x.date)+' — **'+x.title+'**'+(x.body?' · '+compact(x.body,320):'')+' ['+x.source+']').join('\n'));
  }else{
    parts.push([
      '**O que isso significa — FORGE + AEGIS**',
      '• **Research/Domain (FORGE):** nenhuma movimentação/publicação pública foi normalizada agora. Isso não autoriza concluir que o processo inexiste.',
      '• **Architecture/Evidence (FORGE):** DataJud e DJEN falharam ou não trouxeram dados; por isso o adapter oficial do tribunal foi acionado como fallback quando disponível.',
      '• **Legal/Privacy (AEGIS):** sigilo, limitação de consulta pública ou acesso restrito podem esconder dados que existem nos autos.',
      '• **Failure/QA (AEGIS):** atraso de indexação, migração de sistema, indisponibilidade temporária, parâmetro incorreto ou número ainda não publicado são hipóteses concorrentes.',
      '• **Devil’s Advocate:** o número também pode estar incorreto ou ainda não corresponder a processo publicamente consultável. A resposta correta é manter as hipóteses abertas.'
    ].join('\n'));
  }

  const critical=bundle.lenses.filter(x=>x.level==='high');
  if(critical.length&&latest.length){
    parts.push('**Council — pontos de atenção**\n'+critical.flatMap(x=>x.findings.slice(0,2).map(f=>'• **'+x.title+':** '+f)).join('\n'));
  }

  const council=councilX10(bundle,prompt);
  parts.push('**Council X10 — FORGE + AEGIS**\n'+council.map(([name,text])=>'• **'+name+':** '+text).join('\n'));

  if(strategyRequested(prompt))parts.push(filingGuidance(bundle));

  parts.push([
    '**Próximos passos**',
    '1. Confirmar o CNJ com a fonte original/protocolo.',
    bundle.tribunalAlias==='tjsp'?'2. Repetir a consulta pública no e-SAJ/TJSP e verificar no portal de Peticionamento Eletrônico se a competência já usa eproc.':'2. Conferir também o portal processual oficial do tribunal.',
    '3. Se houver acesso autorizado de parte/advogado, consultar o processo autenticado para dados não públicos.',
    '4. Para prazo, mérito ou estratégia, obter o inteiro teor das decisões/publicações e documentos dos autos.',
    '5. Se você fornecer classe, parte, OAB, data aproximada ou documento do processo, a TwinCore pode cruzar esses dados sem inventar o que não foi encontrado.'
  ].join('\n'));

  if(bundle.summary.caveats.length){
    parts.push('**Limitações verificadas**\n'+bundle.summary.caveats.map(x=>'• '+x).join('\n'));
  }

  return parts.join('\n\n');
}

export function legalSources(bundle:LegalProcessBundle){
  const out:{title:string;source:string}[]=[];
  if(bundle.datajud.endpoint)out.push({title:'DataJud · '+bundle.tribunalLabel,source:bundle.datajud.endpoint});
  if(bundle.djen.endpoint)out.push({title:'DJEN · Comunicações do processo',source:bundle.djen.endpoint});
  for(const portal of bundle.officialPortals){
    if(portal.endpoint)out.push({title:portal.name+' · consulta oficial',source:portal.endpoint});
  }
  for(const p of bundle.djen.publications.slice(0,2)){
    if(p.certificateUrl)out.push({title:'Certidão DJEN · '+(p.type||'Publicação'),source:p.certificateUrl});
  }
  return Array.from(new Map(out.map(x=>[x.source,x])).values()).slice(0,6);
}
