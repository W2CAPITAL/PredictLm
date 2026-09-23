export const runtime='nodejs';

function safeHost(url:string){try{return new URL(url).hostname}catch{return ''}}
function stripHtml(input:string){return String(input||'').replace(/<[^>]+>/g,' ').replace(/&quot;/g,'"').replace(/&#039;/g,"'").replace(/&amp;/g,'&').replace(/\s+/g,' ').trim()}

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

async function freeSearch(query:string,limit:number){
  const web:any[]=[];
  const warnings:string[]=[];
  const [wiki,duck,github]=await Promise.allSettled([
    fetch('https://pt.wikipedia.org/w/api.php?action=query&list=search&format=json&utf8=1&srlimit='+limit+'&srsearch='+encodeURIComponent(query),{headers:{'User-Agent':'PredictLM-Studio/4.0'}}).then(r=>r.json()),
    fetch('https://api.duckduckgo.com/?format=json&no_html=1&skip_disambig=1&q='+encodeURIComponent(query),{headers:{'User-Agent':'PredictLM-Studio/4.0'}}).then(r=>r.json()),
    fetch('https://api.github.com/search/repositories?per_page='+Math.min(5,limit)+'&q='+encodeURIComponent(query),{headers:{'Accept':'application/vnd.github+json','User-Agent':'PredictLM-Studio'}}).then(async r=>{if(!r.ok)throw new Error('GitHub '+r.status);return r.json()})
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

  const deduped=Array.from(new Map(web.filter(x=>x.url).map(x=>[x.url,x])).values()).slice(0,Math.max(limit,8));
  return {provider:'free-fallback',web:deduped,news:[],images:[],warnings};
}

export async function POST(req:Request){
  try{
    const body=await req.json();
    const query=body?.query;
    const limit=Math.max(1,Math.min(8,Number(body?.limit)||6));
    if(!query||typeof query!=='string') return Response.json({error:'query is required'},{status:400});

    const key=process.env.FIRECRAWL_API_KEY;
    if(key){
      try{
        const result=await firecrawlSearch(query,limit,key);
        return Response.json({query,...result});
      }catch(error:any){
        const fallback=await freeSearch(query,limit);
        return Response.json({query,...fallback,warnings:['Firecrawl falhou: '+(error?.message||'erro desconhecido'),...(fallback.warnings||[])]});
      }
    }

    const fallback=await freeSearch(query,limit);
    return Response.json({query,...fallback});
  }catch(err:any){
    return Response.json({error:err?.message||'Research failed'},{status:500});
  }
}
