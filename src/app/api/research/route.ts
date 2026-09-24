import { isSensitiveResearchQuery, sourceQuality, suppressRawResearchContent } from '@/lib/security/source-quality';

export const runtime='nodejs';

function safeHost(url:string){try{return new URL(url).hostname}catch{return ''}}
function stripHtml(input:string){return String(input||'').replace(/<[^>]+>/g,' ').replace(/&quot;/g,'"').replace(/&#039;/g,"'").replace(/&amp;/g,'&').replace(/\s+/g,' ').trim()}

function normalized(input:string){
  return String(input||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/\s+/g,' ').trim();
}

type ResearchDomain='health'|'stem'|'software'|'legal'|'finance'|'history'|'factcheck'|'security'|'human'|'general';

function researchDomain(query:string):ResearchDomain{
  const q=normalized(query);
  if(/\b(saude|saúde|medic|doenca|doença|sintoma|tratamento|clinico|clínico|farmaco|fármaco|vacina|biomed|epidemi)\b/.test(q))return 'health';
  if(/\b(codigo|code|software|javascript|typescript|python|react|next\.?js|api|github|framework|backend|frontend|database|devops|vercel)\b/.test(q))return 'software';
  if(/\b(jurid|processo|tribunal|cnj|datajud|djen|lei|sentenca|sentença|jurisprud|contrato)\b/.test(q))return 'legal';
  if(/\b(financ|juros|selic|bacen|bcb|sgs|credito|crédito|mercado|econom|inflacao|inflação)\b/.test(q))return 'finance';
  if(/\b(histori|arquivo|acervo|hemeroteca|documento historico|documento histórico|seculo|século)\b/.test(q))return 'history';
  if(/\b(fake news|desinform|boato|checagem|fact.?check|viral|alegacao|alegação)\b/.test(q))return 'factcheck';
  if(/\b(seguranc|security|fraude|fraud|phishing|malware|ransomware|vulnerab|threat|ameaca|ameaça|dark web|leak|breach|vazamento|doxx)\b/.test(q))return 'security';
  if(/\b(psicolog|comportamento|humano|humanos|emo[cç]ao|sentimento|manipul|persuas|coerc|grupo|sociedade|relacionamento)\b/.test(q))return 'human';
  if(/\b(matemat|fisic|física|quimic|química|engenharia|estatistic|quant|qubit|cientif|ciência|science)\b/.test(q))return 'stem';
  return 'general';
}

function authorityQueryFor(query:string){
  const domain=researchDomain(query);
  if(domain==='health')return query+' (site:pubmed.ncbi.nlm.nih.gov OR site:clinicaltrials.gov OR site:cochranelibrary.com OR site:who.int)';
  if(domain==='stem')return query+' (site:arxiv.org OR site:ieeexplore.ieee.org OR site:dl.acm.org OR site:openalex.org)';
  if(domain==='software')return query+' (official documentation OR site:github.com)';
  if(domain==='legal')return query+' (site:cnj.jus.br OR site:stj.jus.br OR site:stf.jus.br OR site:gov.br)';
  if(domain==='finance')return query+' (site:bcb.gov.br OR site:ibge.gov.br OR site:gov.br)';
  if(domain==='history')return query+' (site:bndigital.bn.gov.br OR site:scielo.br OR site:jstor.org)';
  if(domain==='factcheck')return query+' (site:poynter.org OR site:reuters.com OR site:apnews.com OR site:aosfatos.org)';
  if(domain==='security')return query+' (site:cert.br OR site:cisa.gov OR site:nist.gov OR site:analyzer.vecert.io)';
  if(domain==='human')return query+' (site:apa.org OR site:pubmed.ncbi.nlm.nih.gov OR site:scielo.br OR site:openalex.org)';
  return query+' official documentation';
}

const STOPWORDS=new Set(['como','criar','fazer','uma','um','de','da','do','das','dos','para','com','sem','que','por','em','no','na','e','ou','o','a','os','as','me','eu','quero','preciso']);

function queryTokens(input:string){
  return normalized(input).split(/[^a-z0-9]+/).filter(x=>x.length>=3&&!STOPWORDS.has(x));
}

function sourceRelevance(query:string,item:any){
  const core=queryTokens(query);
  if(!core.length)return {score:1,matches:1,titleMatches:0};
  const title=normalized(item?.title||'');
  const body=normalized((item?.summary||item?.description||'')+' '+(item?.site||'')+' '+(item?.source||''));
  let score=0,matches=0,titleMatches=0;
  for(const token of core){
    if(new RegExp('\\b'+token+'\\b').test(title)){score+=7;matches++;titleMatches++}
    else if(new RegExp('\\b'+token+'\\b').test(body)){score+=3;matches++}
  }
  const q=normalized(query);
  if(/dragao|dragon/.test(q)&&/(dragao|dragon|escultura|sculpture)/.test(title+' '+body)){score+=4;matches++}
  if(/metal|aco|ferro|solda/.test(q)&&/(metal|aco|steel|ferro|solda|welding|fabrication)/.test(title+' '+body)){score+=4;matches++}
  if(/starlink|spacex|nasa|satelite/.test(q)&&/(starlink|spacex|nasa|satellite|telemetry|gibs|earthdata)/.test(title+' '+body)){score+=5;matches++}
  if(/quant|qubit|matemat|calculo|algebra/.test(q)&&/(quant|qubit|math|matemat|calculo|algebra|matrix|statistic)/.test(title+' '+body)){score+=5;matches++}
  if(/sgs|bacen|bcb|juros|pericia/.test(q)&&/(bcb|bacen|sgs|juros|interest|pericia|forensic)/.test(title+' '+body)){score+=5;matches++}
  if(/datajud|djen|jurid|processo|tribunal/.test(q)&&/(datajud|djen|jurid|process|tribunal|cnj)/.test(title+' '+body)){score+=5;matches++}
  return {score,matches,titleMatches};
}

function researchQueryPlan(query:string){
  const q=normalized(query);
  const planned=[query.trim()];
  if(/dragao|dragon/.test(q)&&/metal|aco|ferro/.test(q)){
    planned.push(query+' escultura metálica estrutura armação soldagem fabricação acabamento segurança');
  }else if(/starlink|spacex|satelite|nasa|gibs/.test(q)){
    planned.push(query+' telemetry API satellite Earth observation official documentation');
  }else if(/quant|qubit|matemat|calculo|algebra/.test(q)){
    planned.push(query+' formula derivation symbolic numerical verification academic');
  }else if(/sgs|bacen|bcb|juros|pericia/.test(q)){
    planned.push(query+' Banco Central SGS série oficial modalidade taxa metodologia');
  }else if(/datajud|djen|jurid|processo|tribunal/.test(q)){
    planned.push(query+' CNJ DataJud DJEN fonte oficial');
  }
  return Array.from(new Set(planned)).slice(0,2);
}

function isSoftwareResearchQuery(query:string){
  return /\b(codigo|code|software|programa|javascript|typescript|python|react|next\.?js|api|github|biblioteca|framework|package|npm|bug|erro|backend|frontend|database|banco de dados)\b/.test(normalized(query));
}

function isAutomotiveResearchQuery(query:string){
  return /\b(carro|carros|veiculo|veiculos|automovel|automoveis|automotivo|automotiva)\b/.test(normalized(query));
}

function expandResearchQuery(query:string){
  const q=normalized(query);
  if(isAutomotiveResearchQuery(query)){
    return query+' automotive engineering vehicle design chassis suspension braking powertrain safety homologation prototype';
  }
  if(/dragao|dragon/.test(q)&&/metal|aco|ferro/.test(q)){
    return query+' escultura metálica estrutura armação soldagem fabricação acabamento segurança metal sculpture fabrication welding';
  }
  return query;
}

function openAlexAbstract(index:any){
  if(!index||typeof index!=='object')return '';
  const words:string[]=[];
  for(const [word,positions] of Object.entries(index)){
    for(const pos of Array.isArray(positions)?positions:[])words[Number(pos)]=word;
  }
  return words.filter(Boolean).join(' ').slice(0,2200);
}

async function openAlexSearch(query:string,limit:number){
  const url='https://api.openalex.org/works?search='+encodeURIComponent(query.slice(0,420))+'&per_page='+Math.max(2,Math.min(6,limit));
  const r=await fetch(url,{headers:{'User-Agent':'PredictLM-Studio/6.0'},cache:'no-store'});
  if(!r.ok)throw new Error('OpenAlex '+r.status);
  const data=await r.json();
  return (data?.results||[]).map((x:any)=>{
    const sourceUrl=String(x?.doi||x?.id||'').trim();
    return sourceUrl?{
      type:'web',
      url:sourceUrl,
      title:String(x?.display_name||x?.title||'OpenAlex work'),
      description:openAlexAbstract(x?.abstract_inverted_index)||String(x?.primary_location?.source?.display_name||'')+(x?.publication_year?' · '+x.publication_year:''),
      site:safeHost(sourceUrl)||'openalex.org',
      source:'OpenAlex',
      academic:true,
      citedBy:Number(x?.cited_by_count||0)
    }:null;
  }).filter(Boolean);
}

async function semanticScholarSearch(query:string,limit:number){
  const url='https://api.semanticscholar.org/graph/v1/paper/search?query='+encodeURIComponent(query.slice(0,420))+'&limit='+Math.max(2,Math.min(6,limit))+'&fields=title,url,abstract,year,citationCount,venue';
  const r=await fetch(url,{headers:{'User-Agent':'PredictLM-Studio/6.0'},cache:'no-store'});
  if(!r.ok)throw new Error('Semantic Scholar '+r.status);
  const data=await r.json();
  return (data?.data||[]).map((x:any)=>x?.url?{
    type:'web',
    url:String(x.url),
    title:String(x.title||'Semantic Scholar paper'),
    description:String(x.abstract||x.venue||'').replace(/\s+/g,' ').trim().slice(0,2200)+(x.year?' · '+x.year:''),
    site:safeHost(x.url)||'semanticscholar.org',
    source:'Semantic Scholar',
    academic:true,
    citedBy:Number(x.citationCount||0)
  }:null).filter(Boolean);
}

async function academicSearch(query:string,limit:number){
  const domain=researchDomain(query);
  if(!['health','stem','human','finance','legal'].includes(domain))return [] as any[];
  const tasks=await Promise.allSettled([
    openAlexSearch(query,limit),
    semanticScholarSearch(query,limit)
  ]);
  return tasks.flatMap(x=>x.status==='fulfilled'?x.value:[]);
}

async function wikiIntro(title:string){
  try{
    const url='https://pt.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(title.replace(/ /g,'_'));
    const r=await fetch(url,{headers:{'User-Agent':'PredictLM-Studio/5.1'}});
    if(!r.ok)return '';
    const data=await r.json();
    return String(data?.extract||data?.description||'').replace(/\s+/g,' ').trim().slice(0,1800);
  }catch{return ''}
}

async function firecrawlSearch(query:string,limit:number,key:string){
  const response=await fetch('https://api.firecrawl.dev/v2/search',{
    method:'POST',
    headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
    body:JSON.stringify({
      query:query.slice(0,500),
      sources:['web','news','images'],
      limit,
      scrapeOptions:{formats:['markdown'],onlyMainContent:true,maxAge:86400000}
    })
  });
  const raw=await response.json();
  if(!response.ok) throw new Error(raw?.error||('Firecrawl error '+response.status));
  const data=raw?.data||{};
  return {
    provider:'firecrawl',
    web:(data.web||[]).map((x:any)=>({type:'web',url:x.url,title:x.title||x.url,description:x.description||x.snippet||'',markdown:String(x.markdown||x.content||'').slice(0,12000),site:safeHost(x.url)})).filter((x:any)=>x.url),
    news:(data.news||[]).map((x:any)=>({type:'news',url:x.url,title:x.title||x.url,description:x.snippet||x.description||'',publishedDate:x.date,site:x.source||safeHost(x.url)})).filter((x:any)=>x.url),
    images:(data.images||[]).map((x:any)=>({type:'image',url:x.url,imageUrl:x.imageUrl,title:x.title||'',site:safeHost(x.url)})).filter((x:any)=>x.url&&x.imageUrl)
  };
}

async function apifyItems(limit:number){
  const token=String(process.env.APIFY_API_TOKEN||'').trim();
  if(!token)return [] as any[];
  const datasetId=String(process.env.APIFY_DATASET_ID||'').trim();
  const runId=String(process.env.APIFY_RUN_ID||'').trim();
  let dataset=datasetId;
  if(!dataset&&runId){
    const meta=await fetch('https://api.apify.com/v2/actor-runs/'+encodeURIComponent(runId)+'?token='+encodeURIComponent(token),{cache:'no-store'});
    if(!meta.ok)throw new Error('Apify run '+meta.status);
    const data=await meta.json();
    dataset=String(data?.data?.defaultDatasetId||'').trim();
  }
  if(!dataset)return [] as any[];
  const res=await fetch('https://api.apify.com/v2/datasets/'+encodeURIComponent(dataset)+'/items?clean=true&format=json&limit='+Math.max(3,Math.min(30,limit))+'&token='+encodeURIComponent(token),{cache:'no-store'});
  if(!res.ok)throw new Error('Apify dataset '+res.status);
  const rows=await res.json();
  if(!Array.isArray(rows))return [];
  return rows.map((x:any)=>{
    const url=String(x?.url||x?.link||x?.tweetUrl||x?.postUrl||x?.profileUrl||x?.sourceUrl||'').trim();
    const text=String(x?.description||x?.text||x?.content||x?.caption||x?.body||'').replace(/\s+/g,' ').trim();
    const title=String(x?.title||x?.name||x?.authorName||x?.username||text.slice(0,90)||'Apify result').trim();
    return url?{type:'web',url,title,description:text.slice(0,2200),site:safeHost(url),source:'Apify'}:null;
  }).filter(Boolean);
}


function decodeDuckUrl(raw:string){
  try{
    const url=raw.startsWith('//')?'https:'+raw:raw;
    const parsed=new URL(url,'https://duckduckgo.com');
    const target=parsed.searchParams.get('uddg');
    return target?decodeURIComponent(target):parsed.toString();
  }catch{return raw}
}

async function duckHtmlSearch(query:string,limit:number){
  const r=await fetch('https://html.duckduckgo.com/html/?q='+encodeURIComponent(query),{
    headers:{'User-Agent':'Mozilla/5.0 PredictLM-Studio/5.4','Accept-Language':'pt-BR,pt;q=0.9,en;q=0.7'}
  });
  if(!r.ok)throw new Error('DuckDuckGo HTML '+r.status);
  const html=await r.text();
  const out:any[]=[];
  const re=/<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m:RegExpExecArray|null;
  while((m=re.exec(html))&&out.length<limit){
    const url=decodeDuckUrl(m[1]);
    const title=stripHtml(m[2]);
    if(!/^https?:\/\//i.test(url)||!title)continue;
    const tail=html.slice(re.lastIndex,re.lastIndex+1800);
    const sm=tail.match(/class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(?:a|div)>/i);
    out.push({type:'web',url,title,description:sm?stripHtml(sm[1]):'',site:safeHost(url),source:'DuckDuckGo Web'});
  }
  return out;
}

function enrichAndRank(query:string,items:any[],limit:number){
  const sensitive=isSensitiveResearchQuery(query);
  const enriched=items.filter(x=>x?.url).map(x=>{
    const q=sourceQuality(x.url,x.source);
    const rel=sourceRelevance(query,x);
    const authority=Math.floor(q.score/12);
    const citationBonus=Math.min(6,Math.floor(Math.log10(Math.max(1,Number(x.citedBy||0)))+1));
    const rank=rel.score*4+authority+(x.academic?4:0)+citationBonus;
    const scrub=suppressRawResearchContent(x.url);
    return {
      ...x,
      description:scrub?'Fonte adversarial monitorada apenas para threat-model; conteúdo bruto, PII, credenciais e mídia não são ingeridos.':x.description,
      markdown:scrub?'':x.markdown,
      qualityScore:q.score,
      qualityTier:q.tier,
      qualityReasons:q.reasons,
      relevanceScore:rel.score,
      relevanceMatches:rel.matches,
      rankScore:rank,
      researchUse:q.tier==='threat-reference'?'threat-model-only':'evidence'
    };
  });
  const deduped=Array.from(new Map(enriched.map(x=>[x.url,x])).values()) as any[];
  const coreCount=Math.max(1,queryTokens(query).length);
  const relevant=deduped.filter((x:any)=>{
    if(x.qualityTier==='threat-reference'&&!sensitive)return false;
    if(x.relevanceMatches>=2)return true;
    if(coreCount===1&&x.relevanceMatches>=1)return true;
    return x.relevanceScore>=7&&x.qualityScore>=65;
  }).sort((a:any,b:any)=>Number(b.rankScore||0)-Number(a.rankScore||0));

  const selected:any[]=[];
  let threatRefs=0;
  for(const row of relevant){
    if(row.qualityTier==='threat-reference'){
      if(threatRefs>=2)continue;
      threatRefs++;
    }
    selected.push(row);
    if(selected.length>=Math.max(limit,12))break;
  }
  return selected;
}

function coverage(items:any[]){
  const hosts=new Set(items.map(x=>safeHost(x.url)).filter(Boolean));
  return {
    total:items.length,
    distinctHosts:hosts.size,
    strong:items.filter(x=>Number(x.qualityScore)>=70).length,
    official:items.filter(x=>x.qualityTier==='official').length,
    academic:items.filter(x=>x.qualityTier==='academic').length
  };
}

async function freeSearch(query:string,limit:number){
  const web:any[]=[];
  const warnings:string[]=[];
  const sensitive=isSensitiveResearchQuery(query);
  const automotive=isAutomotiveResearchQuery(query);
  const expanded=expandResearchQuery(query);
  const authorityQuery=sensitive
    ? authorityQueryFor(query)
    : automotive
      ? expanded+' (site:nhtsa.gov OR site:unece.org OR site:sae.org OR site:iso.org)'
      : authorityQueryFor(query);
  const [wiki,duck,github,duckWeb,duckAuthority,academic]=await Promise.allSettled([
    fetch('https://pt.wikipedia.org/w/api.php?action=query&list=search&format=json&utf8=1&srlimit='+limit+'&srsearch='+encodeURIComponent(query),{headers:{'User-Agent':'PredictLM-Studio/4.0'}}).then(r=>r.json()),
    fetch('https://api.duckduckgo.com/?format=json&no_html=1&skip_disambig=1&q='+encodeURIComponent(query),{headers:{'User-Agent':'PredictLM-Studio/4.0'}}).then(r=>r.json()),
    isSoftwareResearchQuery(query)?fetch('https://api.github.com/search/repositories?per_page='+Math.min(5,limit)+'&q='+encodeURIComponent(query),{headers:{'Accept':'application/vnd.github+json','User-Agent':'PredictLM-Studio'}}).then(async r=>{if(!r.ok)throw new Error('GitHub '+r.status);return r.json()}):Promise.resolve({items:[]}),
    duckHtmlSearch(expanded,Math.min(10,limit)),
    duckHtmlSearch(authorityQuery,Math.min(6,limit)),
    academicSearch(query,Math.min(6,limit))
  ]);

  if(wiki.status==='fulfilled'){
    const searchItems=(wiki.value?.query?.search||[]).slice(0,Math.max(limit,3));
    const intros=await Promise.all(searchItems.slice(0,3).map((item:any)=>wikiIntro(item.title)));
    for(let i=0;i<searchItems.length;i++){
      const item=searchItems[i];
      const summary=intros[i]||'';
      web.push({type:'web',url:'https://pt.wikipedia.org/?curid='+item.pageid,title:item.title,description:summary||stripHtml(item.snippet),summary,site:'wikipedia.org',source:'Wikipedia'});
    }
  }else warnings.push('Wikipedia indisponível');

  if(duck.status==='fulfilled'){
    const d=duck.value||{};
    if(d.AbstractURL&&d.AbstractText)web.unshift({type:'web',url:d.AbstractURL,title:d.Heading||query,description:d.AbstractText,site:safeHost(d.AbstractURL),source:'DuckDuckGo'});
    const related=(d.RelatedTopics||[]).flatMap((x:any)=>Array.isArray(x.Topics)?x.Topics:[x]).filter((x:any)=>x?.FirstURL&&x?.Text).slice(0,3);
    for(const item of related)web.push({type:'web',url:item.FirstURL,title:String(item.Text).split(' - ')[0].slice(0,120),description:item.Text,site:safeHost(item.FirstURL),source:'DuckDuckGo'});
  }else warnings.push('DuckDuckGo indisponível');

  if(github.status==='fulfilled'){
    for(const item of github.value?.items||[]){
      web.push({type:'web',url:item.html_url,title:item.full_name,description:item.description||('GitHub repository · '+(item.language||'code')),site:'github.com',source:'GitHub'});
    }
  }else warnings.push('GitHub Search indisponível ou limitado');

  if(duckWeb.status==='fulfilled')web.push(...duckWeb.value);
  else warnings.push('DuckDuckGo Web indisponível');
  if(duckAuthority.status==='fulfilled')web.push(...duckAuthority.value);
  else warnings.push('Busca de fontes fortes indisponível');
  if(academic.status==='fulfilled')web.push(...academic.value);
  else warnings.push('Índice acadêmico indisponível');

  const ranked=enrichAndRank(query,web,limit);
  return {provider:'free-search',web:ranked,news:[],images:[],warnings,coverage:coverage(ranked)};
}

export async function POST(req:Request){
  try{
    const body=await req.json();
    const query=body?.query;
    const limit=Math.max(3,Math.min(16,Number(body?.limit)||12));
    if(!query||typeof query!=='string') return Response.json({error:'query is required'},{status:400});

    const key=process.env.FIRECRAWL_API_KEY;
    if(key){
      try{
        const plan=researchQueryPlan(query);
        const searches=await Promise.all(plan.map(q=>firecrawlSearch(expandResearchQuery(q),Math.max(5,Math.ceil(limit/plan.length)+2),key)));
        const merged={
          provider:'firecrawl',
          web:searches.flatMap(x=>x.web||[]),
          news:searches.flatMap(x=>x.news||[]),
          images:searches.flatMap(x=>x.images||[])
        };
        let apify:any[]=[];
        try{apify=await apifyItems(limit)}catch{}
        let academic:any[]=[];
        try{academic=await academicSearch(query,Math.min(6,limit))}catch{}
        const web=enrichAndRank(query,[...merged.web,...apify,...academic],limit);
        const news=enrichAndRank(query,merged.news,limit);
        return Response.json({query,provider:'firecrawl',researchPlan:plan,web,news,images:merged.images,coverage:coverage([...web,...news])});
      }catch(error:any){
        const fallback=await freeSearch(query,limit);
        return Response.json({query,...fallback,warnings:['Firecrawl falhou: '+(error?.message||'erro desconhecido'),...(fallback.warnings||[])]});
      }
    }

    const fallback=await freeSearch(query,limit);
    try{
      const apify=await apifyItems(limit);
      if(apify.length){
        const web=enrichAndRank(query,[...(fallback.web||[]),...apify],limit);
        return Response.json({query,...fallback,web,coverage:coverage(web)});
      }
    }catch{}
    return Response.json({query,...fallback});
  }catch(err:any){
    return Response.json({error:err?.message||'Research failed'},{status:500});
  }
}
