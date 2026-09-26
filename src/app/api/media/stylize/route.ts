import {NextResponse} from 'next/server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;

function privateHost(host:string){
  const h=host.toLowerCase();
  if(h==='localhost'||h==='0.0.0.0'||h==='::1'||h.endsWith('.local'))return true;
  if(/^127\.|^10\.|^192\.168\.|^169\.254\./.test(h))return true;
  const m=h.match(/^172\.(\d+)\./);
  return !!(m&&Number(m[1])>=16&&Number(m[1])<=31);
}

async function sourceAsDataUrl(sourceUrl:string,requestUrl:string){
  if(/^data:image\/(?:png|jpeg|webp);base64,/i.test(sourceUrl))return sourceUrl;
  const resolved=new URL(sourceUrl,requestUrl);
  const own=new URL(requestUrl);
  if(!['http:','https:'].includes(resolved.protocol))throw new Error('URL de imagem inválida.');
  if(resolved.origin!==own.origin&&privateHost(resolved.hostname))throw new Error('Host privado não permitido.');
  const r=await fetch(resolved,{cache:'no-store',redirect:'follow',signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw new Error('Falha ao carregar imagem: HTTP '+r.status);
  const mime=String(r.headers.get('content-type')||'').split(';')[0].toLowerCase();
  if(!['image/png','image/jpeg','image/webp'].includes(mime))throw new Error('Fonte não é uma imagem suportada.');
  const buf=Buffer.from(await r.arrayBuffer());
  if(buf.byteLength>12_000_000)throw new Error('Imagem acima do limite do stylizer.');
  return 'data:'+mime+';base64,'+buf.toString('base64');
}

export async function GET(){
  const base=String(process.env.ANIMEGAN_BASE_URL||'').trim();
  return NextResponse.json({
    configured:!!base,
    provider:'animeganv3-bridge',
    model:String(process.env.ANIMEGAN_MODEL||'animeganv3'),
    purpose:'optional anime/toon postprocess; identity preservation remains a hard gate'
  },{headers:{'Cache-Control':'no-store'}});
}

export async function POST(req:Request){
  try{
    const body=await req.json().catch(()=>({}));
    const sourceUrl=String(body?.sourceUrl||'').trim();
    if(!sourceUrl)return NextResponse.json({error:'sourceUrl is required'},{status:400});

    const base=String(process.env.ANIMEGAN_BASE_URL||'').trim().replace(/\/$/,'');
    if(!base){
      return NextResponse.json({
        stylized:false,
        code:'ANIMEGAN_NOT_CONFIGURED',
        url:sourceUrl
      },{status:200});
    }

    const image=await sourceAsDataUrl(sourceUrl,req.url);
    const key=String(process.env.ANIMEGAN_API_KEY||'').trim();
    const headers:Record<string,string>={'Content-Type':'application/json','Accept':'application/json'};
    if(key)headers.Authorization='Bearer '+key;

    const upstream=await fetch(base,{
      method:'POST',
      headers,
      body:JSON.stringify({
        image,
        source:image,
        model:String(body?.model||process.env.ANIMEGAN_MODEL||'animeganv3').slice(0,120),
        style:String(body?.style||'anime').slice(0,80),
        preserveIdentity:true,
        preserveComposition:true
      }),
      cache:'no-store',
      signal:AbortSignal.timeout(55000)
    });
    const data=await upstream.json().catch(()=>({}));
    if(!upstream.ok){
      return NextResponse.json({
        stylized:false,
        error:'AnimeGAN upstream HTTP '+upstream.status,
        url:sourceUrl
      },{status:200});
    }
    const b64=String(data?.b64_json||data?.image_base64||data?.data?.[0]?.b64_json||'').trim();
    const url=String(data?.url||data?.image||data?.data?.[0]?.url||'').trim()||(b64?'data:image/png;base64,'+b64:'');
    if(!url)return NextResponse.json({stylized:false,url:sourceUrl,error:'AnimeGAN não retornou imagem.'});
    return NextResponse.json({
      stylized:true,
      url,
      provider:'animeganv3-bridge',
      model:String(data?.model||process.env.ANIMEGAN_MODEL||'animeganv3')
    },{headers:{'Cache-Control':'no-store'}});
  }catch(error:any){
    return NextResponse.json({stylized:false,error:String(error?.message||'Falha no stylizer.')},{status:500});
  }
}
