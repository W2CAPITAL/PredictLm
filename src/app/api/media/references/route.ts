import { compactText } from '@/lib/token-budget';

export const runtime='nodejs';
export const dynamic='force-dynamic';

type Ref={
  id:string;
  title:string;
  imageUrl:string;
  thumbnailUrl?:string;
  pageUrl?:string;
  source:'google-images'|'pinterest-via-google'|'pinterest-provider';
  width?:number;
  height?:number;
  snippet?:string;
};

function validHttpUrl(value:string){
  try{
    const url=new URL(value);
    return url.protocol==='https:'||url.protocol==='http:';
  }catch{return false}
}

function normalizeGoogleItem(item:any,source:Ref['source'],index:number):Ref|null{
  const imageUrl=String(item?.link||'').trim();
  if(!validHttpUrl(imageUrl))return null;
  const meta=item?.image||{};
  return {
    id:source+'-'+index+'-'+Buffer.from(imageUrl).toString('base64url').slice(0,14),
    title:compactText(String(item?.title||item?.htmlTitle||'Referência visual'),140),
    imageUrl,
    thumbnailUrl:validHttpUrl(String(meta?.thumbnailLink||''))?String(meta.thumbnailLink):undefined,
    pageUrl:validHttpUrl(String(meta?.contextLink||''))?String(meta.contextLink):undefined,
    source,
    width:Number(meta?.width)||undefined,
    height:Number(meta?.height)||undefined,
    snippet:compactText(String(item?.snippet||''),220)||undefined
  };
}

async function googleImageSearch(query:string,siteSearch?:string){
  const key=String(process.env.GOOGLE_CSE_API_KEY||'').trim();
  const cx=String(process.env.GOOGLE_CSE_ID||'').trim();
  if(!key||!cx)return [] as Ref[];
  const url=new URL('https://customsearch.googleapis.com/customsearch/v1');
  url.searchParams.set('key',key);
  url.searchParams.set('cx',cx);
  url.searchParams.set('q',query);
  url.searchParams.set('searchType','image');
  url.searchParams.set('safe','active');
  url.searchParams.set('imgSize','large');
  url.searchParams.set('num','6');
  if(siteSearch)url.searchParams.set('siteSearch',siteSearch);
  const response=await fetch(url,{signal:AbortSignal.timeout(9000),cache:'no-store'});
  if(!response.ok)return [];
  const data=await response.json().catch(()=>({}));
  const source:Ref['source']=siteSearch?.includes('pinterest')?'pinterest-via-google':'google-images';
  return (Array.isArray(data?.items)?data.items:[])
    .map((item:any,i:number)=>normalizeGoogleItem(item,source,i))
    .filter(Boolean) as Ref[];
}

async function optionalPinterestProvider(query:string){
  const endpoint=String(process.env.PINTEREST_REFERENCE_SEARCH_URL||'').trim();
  const key=String(process.env.PINTEREST_REFERENCE_API_KEY||'').trim();
  if(!endpoint||!validHttpUrl(endpoint))return [] as Ref[];
  try{
    const url=new URL(endpoint);
    url.searchParams.set('q',query);
    url.searchParams.set('limit','6');
    const response=await fetch(url,{
      headers:key?{'Authorization':'Bearer '+key,'Accept':'application/json'}:{'Accept':'application/json'},
      signal:AbortSignal.timeout(9000),
      cache:'no-store'
    });
    if(!response.ok)return [];
    const data=await response.json().catch(()=>({}));
    const rows=Array.isArray(data?.items)?data.items:Array.isArray(data?.results)?data.results:[];
    return rows.map((item:any,i:number)=>{
      const imageUrl=String(item?.image_url||item?.imageUrl||item?.media?.images?.originals?.url||item?.media?.url||'').trim();
      if(!validHttpUrl(imageUrl))return null;
      return {
        id:'pinterest-provider-'+i+'-'+Buffer.from(imageUrl).toString('base64url').slice(0,14),
        title:compactText(String(item?.title||item?.name||item?.description||'Pinterest reference'),140),
        imageUrl,
        thumbnailUrl:validHttpUrl(String(item?.thumbnail_url||item?.thumbnailUrl||''))?String(item?.thumbnail_url||item?.thumbnailUrl):undefined,
        pageUrl:validHttpUrl(String(item?.url||item?.link||''))?String(item?.url||item?.link):undefined,
        source:'pinterest-provider' as const,
        snippet:compactText(String(item?.description||item?.text||''),220)||undefined
      };
    }).filter(Boolean) as Ref[];
  }catch{return []}
}

export async function POST(req:Request){
  try{
    const body=await req.json().catch(()=>({}));
    const query=compactText(String(body?.query||'').trim(),220);
    if(!query)return Response.json({items:[],providers:[],reason:'empty-query'});
    const limit=Math.max(2,Math.min(10,Number(body?.limit)||8));
    const [google,pinterestGoogle,pinterestProvider]=await Promise.all([
      googleImageSearch(query),
      googleImageSearch(query,'pinterest.com'),
      optionalPinterestProvider(query)
    ]);
    const merged=[...google,...pinterestProvider,...pinterestGoogle]
      .filter((row,i,all)=>all.findIndex(x=>x.imageUrl===row.imageUrl)===i)
      .slice(0,limit);
    const providers=[
      google.length?'google-images':null,
      pinterestProvider.length?'pinterest-provider':null,
      pinterestGoogle.length?'pinterest-via-google':null
    ].filter(Boolean);
    return Response.json({items:merged,providers,query});
  }catch(error:any){
    return Response.json({items:[],providers:[],error:error?.message||'Falha ao buscar referências visuais.'},{status:200});
  }
}
