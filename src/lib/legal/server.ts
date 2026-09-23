import { buildLegalLenses, mergeTimeline } from './analysis';
import { cnjDigits, datajudTribunal, isValidCnj, maskCnj } from './cnj';
import type { LegalMovement, LegalProcessBundle, LegalPublication } from './types';

const DATAJUD_KEY_FALLBACK='cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';
let keyCache:{key:string;expires:number}|null=null;

async function fetchTimeout(url:string,init:RequestInit={},timeout=14000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeout);
  try{return await fetch(url,{...init,signal:controller.signal,cache:'no-store'});}
  finally{clearTimeout(timer)}
}

async function datajudKey(){
  if(process.env.DATAJUD_API_KEY?.trim())return process.env.DATAJUD_API_KEY.trim().replace(/^APIKey\s+/i,'');
  if(keyCache&&keyCache.expires>Date.now())return keyCache.key;
  try{
    const r=await fetchTimeout('https://datajud-wiki.cnj.jus.br/api-publica/acesso/',{},8000);
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
  const s=String(value);
  if(/^\d{14}$/.test(s))return s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6,8)+'T'+s.slice(8,10)+':'+s.slice(10,12)+':'+s.slice(12,14);
  if(/^\d{8}$/.test(s))return s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6,8);
  const d=new Date(s);
  return Number.isNaN(d.getTime())?s:d.toISOString();
}

function stripHtml(value:any){
  return String(value||'').replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/\s+/g,' ').trim();
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
  const dedupe=new Map<string,LegalMovement>();
  for(const m of all){
    const key=m.date+'|'+m.code+'|'+m.name;
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
    certificateUrl:hash?'https://comunicaapi.pje.jus.br/api/v1/comunicacao/'+encodeURIComponent(hash)+'/certidao':undefined,
    source:'DJEN'
  };
}

function statusFromTimeline(name:string){
  const t=name.toLowerCase();
  if(/extin/.test(t))return 'Há indicação de extinção no evento mais recente';
  if(/baixa|arquiv/.test(t))return 'Há indicação de baixa/arquivamento';
  if(/transit/.test(t))return 'Há indicação de trânsito em julgado';
  if(/senten/.test(t))return 'Sentença aparece entre os eventos recentes';
  if(/distribu/.test(t))return 'Distribuição registrada';
  return name?'Último evento público: '+name:'Sem evento público normalizado';
}

async function queryDatajud(digits:string,alias:string){
  const endpoint='https://api-publica.datajud.cnj.jus.br/api_publica_'+alias+'/_search';
  try{
    const key=await datajudKey();
    const r=await fetchTimeout(endpoint,{
      method:'POST',
      headers:{Authorization:'APIKey '+key,'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify({
        size:10,
        track_total_hits:true,
        query:{match:{numeroProcesso:digits}},
        sort:[{'@timestamp':{order:'desc'}}]
      })
    });
    const text=await r.text();
    if(!r.ok)return {ok:false,found:false,endpoint,error:'DataJud HTTP '+r.status+(text?' — '+text.slice(0,180):''),hits:[] as any[]};
    const json=JSON.parse(text);
    const hits=Array.isArray(json?.hits?.hits)?json.hits.hits.filter((x:any)=>x?._source):[];
    return {ok:true,found:hits.length>0,endpoint,hits,error:hits.length?'':'Processo não localizado no índice público do tribunal.'};
  }catch(error:any){
    return {ok:false,found:false,endpoint,error:error?.name==='AbortError'?'DataJud excedeu o tempo de resposta.':String(error?.message||error),hits:[] as any[]};
  }
}

async function queryDjen(digits:string){
  const url=new URL('https://comunicaapi.pje.jus.br/api/v1/comunicacao');
  url.searchParams.set('numeroProcesso',digits);
  url.searchParams.set('pagina','1');
  url.searchParams.set('itensPorPagina','50');
  try{
    const r=await fetchTimeout(url.toString(),{headers:{Accept:'application/json'}},14000);
    const text=await r.text();
    if(!r.ok){
      const geo=r.status===403?' O DJEN pode bloquear IP de origem fora do Brasil.':'';
      return {ok:false,endpoint:url.toString(),count:0,items:[] as any[],error:'DJEN HTTP '+r.status+'.'+geo};
    }
    const json=JSON.parse(text);
    return {ok:true,endpoint:url.toString(),count:Number(json?.count||0),items:Array.isArray(json?.items)?json.items:[],error:''};
  }catch(error:any){
    return {ok:false,endpoint:url.toString(),count:0,items:[] as any[],error:error?.name==='AbortError'?'DJEN excedeu o tempo de resposta.':String(error?.message||error)};
  }
}

export async function queryLegalProcess(value:string):Promise<LegalProcessBundle>{
  const digits=cnjDigits(value);
  if(digits.length!==20)throw new Error('Informe um número CNJ com 20 dígitos.');
  const tribunal=datajudTribunal(digits);
  if(!tribunal)throw new Error('Não consegui mapear o tribunal a partir do número CNJ.');

  const [dj,djen]=await Promise.all([queryDatajud(digits,tribunal.alias),queryDjen(digits)]);
  const hits=dj.hits||[];
  const sources=hits.map((h:any)=>h._source||{});
  const primary=sources[0]||{};
  const movements=datajudMovements(hits);
  const publications=(djen.items||[]).map((x:any,i:number)=>normalizePublication(x,i,digits)).sort((a:LegalPublication,b:LegalPublication)=>String(b.availableAt).localeCompare(String(a.availableAt)));
  const timeline=mergeTimeline(movements,publications);
  const latest=timeline[0];
  const subjects=(Array.isArray(primary.assuntos)?primary.assuntos:[]).map((x:any)=>({code:x?.codigo,name:x?.nome})).filter((x:any)=>x.name);
  const lastUpdate=normalizeDate(primary?.dataHoraUltimaAtualizacao||primary?.['@timestamp']||primary?.data_ultima_atualizacao);
  const className=primary?.classe?.nome;
  const lenses=buildLegalLenses(movements,publications,{className,subjects:subjects.map((x:any)=>x.name),lastUpdate});

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
      class:primary?.classe?{code:primary.classe.codigo,name:primary.classe.nome}:undefined,
      subjects,
      court:primary?.orgaoJulgador?{code:primary.orgaoJulgador.codigo,name:primary.orgaoJulgador.nome,municipalityCode:primary.orgaoJulgador.codigoMunicipioIBGE}:undefined,
      movements
    },
    djen:{
      ok:djen.ok,
      error:djen.error||undefined,
      endpoint:djen.endpoint,
      count:djen.count,
      publications
    },
    timeline,
    lenses,
    summary:{
      headline:[className,primary?.orgaoJulgador?.nome].filter(Boolean).join(' · ')||('Processo '+maskCnj(digits)),
      status:statusFromTimeline(latest?.title||''),
      latestEvent:latest?.title,
      latestEventAt:latest?.date,
      publicationCount:djen.count,
      movementCount:movements.length,
      caveats:[
        'A API Pública do DataJud disponibiliza metadados e movimentações de processos públicos; não substitui os autos completos.',
        'O DJEN é usado para publicações/comunicações. Para prazo, confirme o inteiro teor, a data legal e o calendário do tribunal.',
        !dj.ok?'DataJud indisponível nesta consulta: '+dj.error:'',
        !djen.ok?'DJEN indisponível nesta consulta: '+djen.error:''
      ].filter(Boolean)
    }
  };
}
