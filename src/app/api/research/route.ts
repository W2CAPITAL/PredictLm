import { isSensitiveResearchQuery, sourceQuality } from '@/lib/security/source-quality';

export const runtime='nodejs';

function safeHost(url:string){try{return new URL(url).hostname}catch{return ''}}
function stripHtml(input:string){return String(input||'').replace(/<[^>]+>/g,' ').replace(/&quot;/g,'"').replace(/&#039;/g,"'").replace(/&amp;/g,'&').replace(/\s+/g,' ').trim()}

function normalized(input:string){
  return String(input||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'');
}

function isSoftwareResearchQuery(query:string){
  return /\b(codigo|code|software|programa|javascript|typescript|python|react|next\.?js|api|github|biblioteca|framework|package|npm|bug|erro|backend|frontend|database|banco de dados)\b/.test(normalized(query));
}

function isAutomotiveResearchQuery(query:string){
  return /\b(carro|carros|veiculo|veiculos|automovel|automoveis|automotivo|automotiva)\b/.test(normalized(query));
}

function expandResearchQuery(query:string){
  if(isAutomotiveResearchQuery(query)){
    return query+' automotive engineering vehicle design chassis suspension braking powertrain safety homologation prototype';
  }
  return query;
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

function enrichAndRank(items:any[],limit:number){
  const enriched=items.filter(x=>x?.url).map(x=>{
    const q=sourceQuality(x.url,x.source);
    return {...x,qualityScore:q.score,qualityTier:q.tier,qualityReasons:q.reasons};
  });
  const deduped=Array.from(new Map(enriched.map(x=>[x.url,x])).values());
  return deduped.sort((a:any,b:any)=>Number(b.qualityScore||0)-Number(a.qualityScore||0)).slice(0,Math.max(limit,12));
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
    ? query+' (site:gov.br OR site:bcb.gov.br OR site:cert.br OR site:cnj.jus.br OR site:cvm.gov.br)'
    : automotive
      ? expanded+' (site:nhtsa.gov OR site:unece.org OR site:sae.org OR site:iso.org)'
      : query+' official documentation';
  const [wiki,duck,github,duckWeb,duckAuthority]=await Promise.allSettled([
    fetch('https://pt.wikipedia.org/w/api.php?action=query&list=search&format=json&utf8=1&srlimit='+limit+'&srsearch='+encodeURIComponent(query),{headers:{'User-Agent':'PredictLM-Studio/4.0'}}).then(r=>r.json()),
    fetch('https://api.duckduckgo.com/?format=json&no_html=1&skip_disambig=1&q='+encodeURIComponent(query),{headers:{'User-Agent':'PredictLM-Studio/4.0'}}).then(r=>r.json()),
    isSoftwareResearchQuery(query)?fetch('https://api.github.com/search/repositories?per_page='+Math.min(5,limit)+'&q='+encodeURIComponent(query),{headers:{'Accept':'application/vnd.github+json','User-Agent':'PredictLM-Studio'}}).then(async r=>{if(!r.ok)throw new Error('GitHub '+r.status);return r.json()}):Promise.resolve({items:[]}),
    duckHtmlSearch(expanded,Math.min(10,limit)),
    duckHtmlSearch(authorityQuery,Math.min(6,limit))
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

  const ranked=enrichAndRank(web,limit);
  return {provider:'free-fallback',web:ranked,news:[],images:[],warnings,coverage:coverage(ranked)};
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
        const result=await firecrawlSearch(expandResearchQuery(query),limit,key);
        let apify:any[]=[];
        try{apify=await apifyItems(limit)}catch{}
        const web=enrichAndRank([...(result.web||[]),...apify],limit);
        const news=enrichAndRank(result.news||[],limit);
        return Response.json({query,...result,web,news,coverage:coverage([...web,...news])});
      }catch(error:any){
        const fallback=await freeSearch(query,limit);
        return Response.json({query,...fallback,warnings:['Firecrawl falhou: '+(error?.message||'erro desconhecido'),...(fallback.warnings||[])]});
      }
    }

    const fallback=await freeSearch(query,limit);
    try{
      const apify=await apifyItems(limit);
      if(apify.length){
        const web=enrichAndRank([...(fallback.web||[]),...apify],limit);
        return Response.json({query,...fallback,web,coverage:coverage(web)});
      }
    }catch{}
    return Response.json({query,...fallback});
  }catch(err:any){
    return Response.json({error:err?.message||'Research failed'},{status:500});
  }
}
