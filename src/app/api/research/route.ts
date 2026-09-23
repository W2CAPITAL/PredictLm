export const runtime='nodejs';

function safeHost(url:string){try{return new URL(url).hostname}catch{return ''}}

export async function POST(req:Request){
  try{
    const body=await req.json();
    const query=body?.query;
    const limit=body?.limit ?? 6;
    if(!query||typeof query!=='string') return Response.json({error:'query is required'},{status:400});
    const key=process.env.FIRECRAWL_API_KEY;
    if(!key) return Response.json({error:'Research provider not configured. Add FIRECRAWL_API_KEY on the server.'},{status:503});
    const response=await fetch('https://api.firecrawl.dev/v2/search',{
      method:'POST',
      headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
      body:JSON.stringify({
        query:query.slice(0,500),
        sources:['web','news','images'],
        limit:Math.max(1,Math.min(8,Number(limit)||6)),
        scrapeOptions:{formats:['markdown'],onlyMainContent:true,maxAge:86400000}
      })
    });
    const raw=await response.json();
    if(!response.ok) return Response.json({error:raw?.error||('Firecrawl error '+response.status)},{status:502});
    const data=raw?.data||{};
    const web=(data.web||[]).map((x:any)=>({type:'web',url:x.url,title:x.title||x.url,description:x.description||x.snippet||'',markdown:String(x.markdown||x.content||'').slice(0,12000),site:safeHost(x.url)})).filter((x:any)=>x.url);
    const news=(data.news||[]).map((x:any)=>({type:'news',url:x.url,title:x.title||x.url,description:x.snippet||x.description||'',publishedDate:x.date,site:x.source||safeHost(x.url)})).filter((x:any)=>x.url);
    const images=(data.images||[]).map((x:any)=>({type:'image',url:x.url,imageUrl:x.imageUrl,title:x.title||'',site:safeHost(x.url)})).filter((x:any)=>x.url&&x.imageUrl);
    return Response.json({query,web,news,images});
  }catch(err:any){return Response.json({error:err?.message||'Research failed'},{status:500})}
}
