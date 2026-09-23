import { buildLegalLenses, mergeTimeline } from './analysis';
import { cnjDigits, datajudTribunal, isValidCnj, maskCnj } from './cnj';
import type { LegalMovement, LegalPortalResult, LegalProcessBundle, LegalPublication, LegalTraceStep } from './types';

const DATAJUD_KEY_FALLBACK='cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';
let keyCache:{key:string;expires:number}|null=null;

const BROWSER_HEADERS={
  'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36 PredictLM/5.3',
  'Accept-Language':'pt-BR,pt;q=0.9,en;q=0.6'
};

async function fetchTimeout(url:string,init:RequestInit={},timeout=16000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeout);
  try{return await fetch(url,{...init,signal:controller.signal,cache:'no-store'});}
  finally{clearTimeout(timer)}
}

async function retryFetch(url:string,init:RequestInit={},timeouts=[12000,20000]){
  let last:any;
  for(const timeout of timeouts){
    try{
      const r=await fetchTimeout(url,init,timeout);
      if(r.ok||![408,425,429,500,502,503,504].includes(r.status))return r;
      last=new Error('HTTP '+r.status);
    }catch(e){last=e}
  }
  throw last||new Error('Falha de rede');
}

async function datajudKey(){
  if(process.env.DATAJUD_API_KEY?.trim())return process.env.DATAJUD_API_KEY.trim().replace(/^APIKey\s+/i,'');
  if(keyCache&&keyCache.expires>Date.now())return keyCache.key;
  try{
    const r=await fetchTimeout('https://datajud-wiki.cnj.jus.br/api-publica/acesso/',{headers:BROWSER_HEADERS},9000);
    const html=await r.text();
    const match=html.match(/Authorization:\s*APIKey\s+([A-Za-z0-9_+=\/-]+)/i)||html.match(/APIKey\s+([A-Za-z0-9_+=\/-]{30,})/i);
    if(match?.[1]){
      keyCache={key:match[1],expires:Date.now()+6*60*60*1000};
      return match[1];
    }
  }catch{}
  return DATAJUD_KEY_FALLBACK;
}

function normalizeDate(value:any){
  if(!value)return '';
  const s=String(value).trim();
  if(/^\d{14}$/.test(s))return s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6,8)+'T'+s.slice(8,10)+':'+s.slice(10,12)+':'+s.slice(12,14);
  if(/^\d{8}$/.test(s))return s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6,8);
  if(/^\d{2}\/\d{2}\/\d{4}/.test(s)){
    const [date,time='']=s.split(/\s+/,2);
    const [d,m,y]=date.split('/');
    return y+'-'+m+'-'+d+(time?'T'+time:'');
  }
  const d=new Date(s);
  return Number.isNaN(d.getTime())?s:d.toISOString();
}

function decodeEntities(value:string){
  return value
    .replace(/&nbsp;|&#160;/gi,' ')
    .replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'")
    .replace(/&lt;/gi,'<').replace(/&gt;/gi,'>')
    .replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)));
}

function stripHtml(value:any){
  return decodeEntities(String(value||'').replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();
}

function htmlLines(html:string){
  const normalized=html
    .replace(/<script[\s\S]*?<\/script>/gi,' ')
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<\/(?:tr|td|th|div|p|li|h\d|section)>/gi,'\n')
    .replace(/<br\s*\/?>/gi,'\n')
    .replace(/<[^>]+>/g,' ');
  return decodeEntities(normalized).split(/\r?\n/).map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);
}

function labelValue(lines:string[],label:string){
  const wanted=label.toLowerCase();
  for(let i=0;i<lines.length;i++){
    const l=lines[i].replace(/:$/,'').trim().toLowerCase();
    if(l===wanted){
      for(let j=i+1;j<Math.min(lines.length,i+5);j++){
        const v=lines[j].trim();
        if(v&&v.toLowerCase()!==wanted)return v;
      }
    }
    if(l.startsWith(wanted+':')){
      const v=lines[i].slice(lines[i].indexOf(':')+1).trim();
      if(v)return v;
    }
  }
  return '';
}

function movementDetails(raw:any){
  const rows:any[]=Array.isArray(raw?.complementosTabelados)?raw.complementosTabelados:Array.isArray(raw?.complementosTabelaDos)?raw.complementosTabelaDos:[];
  return rows.map(x=>String(x?.nome||x?.descricao||x?.valor||'').trim()).filter(Boolean).slice(0,8);
}

function datajudMovements(hits:any[]):LegalMovement[]{
  const all:LegalMovement[]=[];
  for(const hit of hits){
    const source=hit?._source||{};
    for(const m of Array.isArray(source.movimentos)?source.movimentos:[]){
      all.push({
        date:normalizeDate(m?.dataHora||m?.data_hora),
        code:m?.codigo,
        name:String(m?.nome||m?.descricao||'Movimentação').trim(),
        details:movementDetails(m),
        source:'DataJud'
      });
    }
  }
  return dedupeMovements(all);
}

function dedupeMovements(all:LegalMovement[]){
  const dedupe=new Map<string,LegalMovement>();
  for(const m of all){
    const key=(m.date+'|'+m.name+'|'+(m.details||[]).join('|')).toLowerCase();
    if(!dedupe.has(key))dedupe.set(key,m);
  }
  return Array.from(dedupe.values()).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
}

function normalizePublication(x:any,index:number,digits:string):LegalPublication{
  const hash=String(x?.hash||x?.hashComunicacao||'').trim();
  const number=String(x?.numeroprocessocommascara||x?.numeroProcesso||x?.numero_processo||digits);
  return {
    id:String(x?.id??hash??index),
    hash:hash||undefined,
    processNumber:maskCnj(number),
    type:String(x?.tipoComunicacao||x?.tipo_comunicacao||x?.tipo||'Comunicação'),
    availableAt:normalizeDate(x?.dataDisponibilizacao||x?.data_disponibilizacao||x?.datadisponibilizacao),
    publishedAt:normalizeDate(x?.dataPublicacao||x?.data_publicacao||x?.datapublicacao)||undefined,
    recipient:String(x?.nomeDestinatario||x?.nome_destinatario||x?.destinatario||'').trim()||undefined,
    courtUnit:String(x?.nomeOrgao||x?.nome_orgao||x?.orgao||'').trim()||undefined,
    tribunal:String(x?.siglaTribunal||x?.sigla_tribunal||x?.tribunal||'').trim()||undefined,
    text:stripHtml(x?.texto||x?.textoComunicacao||x?.conteudo||''),
    certificateUrl:hash?'https://comunicaapi.cnj.jus.br/api/v1/comunicacao/'+encodeURIComponent(hash)+'/certidao':undefined,
    source:'DJEN'
  };
}

function statusFromTimeline(name:string,portalMessage=''){
  const t=name.toLowerCase();
  if(/extin/.test(t))return 'Há indicação de extinção no evento mais recente';
  if(/baixa|arquiv/.test(t))return 'Há indicação de baixa/arquivamento';
  if(/transit/.test(t))return 'Há indicação de trânsito em julgado';
  if(/senten/.test(t))return 'Sentença aparece entre os eventos recentes';
  if(/distribu/.test(t))return 'Distribuição registrada';
  if(name)return 'Último evento público: '+name;
  if(/não existem informações disponíveis/i.test(portalMessage))return 'O e-SAJ não retornou informações públicas para os parâmetros informados';
  return 'Sem evento público normalizado';
}

async function queryDatajud(digits:string,alias:string){
  const endpoint='https://api-publica.datajud.cnj.jus.br/api_publica_'+alias+'/_search';
  try{
    const key=await datajudKey();
    const body=JSON.stringify({
      size:3,
      track_total_hits:false,
      timeout:'12s',
      query:{match:{numeroProcesso:digits}}
    });
    const r=await retryFetch(endpoint,{
      method:'POST',
      headers:{Authorization:'APIKey '+key,'Content-Type':'application/json','Accept':'application/json',...BROWSER_HEADERS},
      body
    },[14000,22000]);
    const text=await r.text();
    if(!r.ok)return {ok:false,found:false,endpoint,error:'DataJud HTTP '+r.status+(text?' — '+stripHtml(text).slice(0,180):''),hits:[] as any[]};
    const json=JSON.parse(text);
    const hits=Array.isArray(json?.hits?.hits)?json.hits.hits.filter((x:any)=>x?._source):[];
    return {ok:true,found:hits.length>0,endpoint,hits,error:hits.length?'':'Processo não localizado no índice público do tribunal.'};
  }catch(error:any){
    return {ok:false,found:false,endpoint,error:error?.name==='AbortError'?'DataJud excedeu o tempo de resposta após nova tentativa.':String(error?.message||error),hits:[] as any[]};
  }
}

async function queryDjen(digits:string){
  const url=new URL('https://comunicaapi.pje.jus.br/api/v1/comunicacao');
  url.searchParams.set('numeroProcesso',digits);
  url.searchParams.set('pagina','1');
  url.searchParams.set('itensPorPagina','50');
  try{
    const r=await retryFetch(url.toString(),{headers:{Accept:'application/json',Referer:'https://comunica.pje.jus.br/',...BROWSER_HEADERS}},[12000,18000]);
    const text=await r.text();
    if(!r.ok){
      const geo=r.status===403?' A API pública de consulta DJEN exige origem de rede brasileira; o deployment está configurado para gru1, mas o provedor ainda pode negar alguns egressos.':'';
      return {ok:false,endpoint:url.toString(),count:0,items:[] as any[],error:'DJEN HTTP '+r.status+'.'+geo};
    }
    const json=JSON.parse(text);
    return {ok:true,endpoint:url.toString(),count:Number(json?.count||0),items:Array.isArray(json?.items)?json.items:[],error:''};
  }catch(error:any){
    return {ok:false,endpoint:url.toString(),count:0,items:[] as any[],error:error?.name==='AbortError'?'DJEN excedeu o tempo de resposta.':String(error?.message||error)};
  }
}

function parseEsajMovements(lines:string[]):LegalMovement[]{
  const rows:LegalMovement[]=[];
  const headings=/^(Apensos|Petições|Audiências|Histórico|Incidentes|Partes do Processo|Dados do Processo|Movimentações|Mais|Recolher)$/i;
  for(let i=0;i<lines.length;i++){
    if(!/^\d{2}\/\d{2}\/\d{4}$/.test(lines[i]))continue;
    const date=normalizeDate(lines[i]);
    const chunk:string[]=[];
    for(let j=i+1;j<Math.min(lines.length,i+7);j++){
      if(/^\d{2}\/\d{2}\/\d{4}$/.test(lines[j])||headings.test(lines[j]))break;
      if(lines[j].length<2)continue;
      chunk.push(lines[j]);
    }
    if(!chunk.length)continue;
    const name=chunk[0].replace(/^\|+|\|+$/g,'').trim();
    if(!name||name==='Movimento')continue;
    rows.push({date,name,details:chunk.slice(1,4),source:'e-SAJ TJSP'});
  }
  return dedupeMovements(rows).slice(0,120);
}

function firstProcessLink(html:string){
  const matches=[...html.matchAll(/href=["']([^"']*show\.do\?[^"']*processo\.codigo=[^"']+)["']/gi)];
  return matches[0]?.[1]||'';
}

async function queryEsajTjsp(digits:string):Promise<LegalPortalResult>{
  const masked=maskCnj(digits);
  const prefix=masked.slice(0,20); // NNNNNNN-DD.AAAA
  const foro=digits.slice(16,20);
  const params=new URLSearchParams();
  params.set('conversationId','');
  params.set('cbPesquisa','NUMPROC');
  params.set('numeroDigitoAnoUnificado',prefix);
  params.set('foroNumeroUnificado',foro);
  params.append('dadosConsulta.valorConsultaNuUnificado',masked);
  params.append('dadosConsulta.valorConsultaNuUnificado','UNIFICADO');
  params.set('dadosConsulta.valorConsulta','');
  params.set('dadosConsulta.tipoNuProcesso','UNIFICADO');
  const endpoint='https://esaj.tjsp.jus.br/cpopg/search.do?'+params.toString();

  try{
    let r=await retryFetch(endpoint,{headers:{Accept:'text/html,application/xhtml+xml',...BROWSER_HEADERS}},[12000,20000]);
    let html=await r.text();
    if(!r.ok)return {id:'esaj-tjsp',name:'e-SAJ TJSP',ok:false,found:false,endpoint,message:'e-SAJ HTTP '+r.status,movements:[]};

    const noInfo=/Não existem informações disponíveis para os parâmetros informados/i.test(html);
    if(noInfo){
      return {id:'esaj-tjsp',name:'e-SAJ TJSP',ok:true,found:false,endpoint,message:'Não existem informações disponíveis para os parâmetros informados.',movements:[]};
    }

    const link=firstProcessLink(html);
    if(link){
      const detail=new URL(decodeEntities(link),'https://esaj.tjsp.jus.br/cpopg/').toString();
      r=await retryFetch(detail,{headers:{Accept:'text/html,application/xhtml+xml',...BROWSER_HEADERS}},[12000,20000]);
      if(r.ok){html=await r.text();}
    }

    const lines=htmlLines(html);
    const found=lines.some(x=>x.includes(masked))||(/Classe/i.test(lines.join(' '))&&/Assunto/i.test(lines.join(' ')));
    const secret=/segredo de justiça|sigilo absoluto|senha do processo/i.test(lines.join(' '));
    const metadata:Record<string,string>={};
    const labels=['Classe','Assunto','Foro','Vara','Juiz','Área','Distribuição','Controle','Valor da ação'];
    for(const label of labels){
      const value=labelValue(lines,label);
      if(value)metadata[label]=value;
    }
    const movements=parseEsajMovements(lines);
    const message=found
      ? (secret?'Processo localizado com acesso público limitado/possível sigilo.':'Processo localizado na consulta pública do e-SAJ.')
      : 'A página respondeu, mas não foi possível confirmar detalhes públicos do processo.';

    return {id:'esaj-tjsp',name:'e-SAJ TJSP',ok:true,found,endpoint:r.url||endpoint,message,metadata,movements};
  }catch(error:any){
    return {id:'esaj-tjsp',name:'e-SAJ TJSP',ok:false,found:false,endpoint,message:error?.name==='AbortError'?'e-SAJ excedeu o tempo de resposta.':String(error?.message||error),movements:[]};
  }
}

export async function queryLegalProcess(value:string):Promise<LegalProcessBundle>{
  const trace:LegalTraceStep[]=[];
  const digits=cnjDigits(value);
  if(digits.length!==20)throw new Error('Informe um número CNJ com 20 dígitos.');
  const tribunal=datajudTribunal(digits);
  if(!tribunal)throw new Error('Não consegui mapear o tribunal a partir do número CNJ.');

  trace.push({id:'cnj',label:'Identificar processo',status:'done',detail:maskCnj(digits)+' → '+tribunal.label});

  const [dj,djen]=await Promise.all([queryDatajud(digits,tribunal.alias),queryDjen(digits)]);
  trace.push({
    id:'datajud',label:'Consultar DataJud',
    status:dj.ok?(dj.found?'done':'warn'):'error',
    detail:dj.ok?(dj.found?'Metadados públicos encontrados.':dj.error||'Sem hit no índice.'):(dj.error||'Falha'),
    source:dj.endpoint
  });
  trace.push({
    id:'djen',label:'Consultar DJEN',
    status:djen.ok?(djen.count?'done':'warn'):'error',
    detail:djen.ok?(djen.count+' publicação(ões) encontrada(s).'):(djen.error||'Falha'),
    source:djen.endpoint
  });

  const officialPortals:LegalPortalResult[]=[];
  if(tribunal.alias==='tjsp'&&(!dj.found||!dj.ok||!djen.ok)){
    const esaj=await queryEsajTjsp(digits);
    officialPortals.push(esaj);
    trace.push({
      id:'esaj',label:'Fallback oficial e-SAJ TJSP',
      status:esaj.ok?(esaj.found?'done':'warn'):'error',
      detail:esaj.message||'Consulta concluída.',
      source:esaj.endpoint
    });
  }else{
    trace.push({id:'portal',label:'Portal oficial adicional',status:'skip',detail:dj.found?'DataJud retornou o processo; fallback adicional não foi necessário.':'Não há adapter adicional registrado para este tribunal.'});
  }

  const hits=dj.hits||[];
  const sources=hits.map((h:any)=>h._source||{});
  const primary=sources[0]||{};
  const datajudMoves=datajudMovements(hits);
  const portalMoves=officialPortals.flatMap(x=>x.movements);
  const movements=dedupeMovements([...datajudMoves,...portalMoves]);
  const publications=(djen.items||[]).map((x:any,i:number)=>normalizePublication(x,i,digits)).sort((a:LegalPublication,b:LegalPublication)=>String(b.availableAt).localeCompare(String(a.availableAt)));
  const timeline=mergeTimeline(movements,publications);
  const latest=timeline[0];
  const subjects=(Array.isArray(primary.assuntos)?primary.assuntos:[]).map((x:any)=>({code:x?.codigo,name:x?.nome})).filter((x:any)=>x.name);
  const lastUpdate=normalizeDate(primary?.dataHoraUltimaAtualizacao||primary?.['@timestamp']||primary?.data_ultima_atualizacao);
  const esaj=officialPortals.find(x=>x.id==='esaj-tjsp');
  const className=primary?.classe?.nome||esaj?.metadata?.Classe;
  const courtName=primary?.orgaoJulgador?.nome||esaj?.metadata?.Vara||esaj?.metadata?.Foro;
  const lenses=buildLegalLenses(movements,publications,{className,subjects:subjects.map((x:any)=>x.name),lastUpdate});
  const portalMessage=officialPortals.map(x=>x.message||'').join(' ');

  const sourceSummary=[
    'DataJud: '+(dj.ok?(dj.found?'processo encontrado':'sem hit'):'falhou'),
    'DJEN: '+(djen.ok?(djen.count+' publicação(ões)'):'falhou'),
    ...(officialPortals.map(x=>x.name+': '+(x.found?'processo localizado':x.ok?'sem informação pública':'falhou')))
  ].join(' · ');

  const caveats=[
    'DataJud disponibiliza metadados/movimentações de processos públicos e não substitui os autos completos.',
    'DJEN organiza comunicações/publicações; prazo exige conferência do inteiro teor, data legal e calendário aplicável.',
    esaj?.message&& !esaj.found?'e-SAJ TJSP: '+esaj.message:'',
    !dj.ok?'DataJud: '+dj.error:'',
    !djen.ok?'DJEN: '+djen.error:'',
    'Ausência numa fonte pública pode significar atraso de indexação, sigilo, migração de sistema, parâmetro incorreto ou inexistência; não deve ser tratada como prova isolada de inexistência.'
  ].filter(Boolean) as string[];

  trace.push({
    id:'synthesis',label:'Sintetizar evidência',
    status:'done',
    detail:movements.length||publications.length?'Timeline consolidada com '+movements.length+' movimento(s) e '+publications.length+' publicação(ões).':'Nenhum evento público normalizado; a resposta deve reportar o resultado das fontes e hipóteses, sem inventar fatos.'
  });

  return {
    query:value,
    processNumber:maskCnj(digits),
    digits,
    validCnj:isValidCnj(digits),
    tribunalAlias:tribunal.alias,
    tribunalLabel:String(primary?.tribunal||tribunal.label),
    fetchedAt:new Date().toISOString(),
    datajud:{
      ok:dj.ok,
      error:dj.error||undefined,
      endpoint:dj.endpoint,
      found:dj.found,
      tribunal:primary?.tribunal,
      degree:primary?.grau,
      filedAt:normalizeDate(primary?.dataAjuizamento)||undefined,
      lastUpdate:lastUpdate||undefined,
      confidentiality:primary?.nivelSigilo,
      format:primary?.formato?.nome,
      system:primary?.sistema?.nome,
      class:primary?.classe?{code:primary.classe.codigo,name:primary.classe.nome}:className?{name:className}:undefined,
      subjects,
      court:primary?.orgaoJulgador?{code:primary.orgaoJulgador.codigo,name:primary.orgaoJulgador.nome,municipalityCode:primary.orgaoJulgador.codigoMunicipioIBGE}:courtName?{name:courtName}:undefined,
      movements:datajudMoves
    },
    djen:{
      ok:djen.ok,
      error:djen.error||undefined,
      endpoint:djen.endpoint,
      count:djen.count,
      publications
    },
    officialPortals,
    trace,
    timeline,
    lenses,
    summary:{
      headline:[className,courtName].filter(Boolean).join(' · ')||('Processo '+maskCnj(digits)),
      status:statusFromTimeline(latest?.title||'',portalMessage),
      latestEvent:latest?.title,
      latestEventAt:latest?.date,
      publicationCount:djen.count,
      movementCount:movements.length,
      caveats,
      sourceSummary
    }
  };
}
