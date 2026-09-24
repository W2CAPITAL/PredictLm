import { ENTITY_REFERENCE_IMAGE } from '@/lib/entity-self-model';
import { compactText } from '@/lib/token-budget';
import { buildDefaultNegativePrompt, buildLiteralImagePrompt, chooseImagePromptMode, expandImagePromptForParity, parityCaptionPtBr, type ImagePromptMode } from '@/lib/media/grok-imagine-parity';
import { mediaErrorText } from '@/lib/media/media-errors';
import { buildDisplayTitle, buildSafeCaptionPtBr, recommendedImageStyle, shouldForceLiteralMode } from '@/lib/media/media-fidelity';
import {
  buildReferenceEvidencePrompt,
  buildVisualIdentityLock,
  fetchReferenceInlineData,
  inlineImageFromDataUrl,
  isPersistentSelfPortraitRequest,
  resolveVisualReferences
} from '@/lib/media/visual-reference';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function clamp(value:number,min:number,max:number){
  return Math.max(min,Math.min(max,Math.round(value||0)));
}

function geminiAspectRatio(width:number,height:number){
  const ratio=width/Math.max(1,height);
  if(ratio>1.45)return '16:9';
  if(ratio<0.72)return '9:16';
  if(ratio>1.18)return '4:3';
  if(ratio<0.86)return '3:4';
  return '1:1';
}

function providerImageSize(width:number,height:number,nano:boolean){
  if(!nano)return width+'x'+height;
  const ratio=width/Math.max(1,height);
  if(ratio>1.3)return '1792x1024';
  if(ratio<0.77)return '1024x1792';
  return '1024x1024';
}

function localRenderUrl(prompt:string,width:number,height:number,seed:number,model:string){
  const q=new URLSearchParams({
    prompt,
    width:String(width),
    height:String(height),
    seed:String(seed),
    model:model||'flux'
  });
  return '/api/media/render?'+q.toString();
}

export async function POST(req:Request){
  try{
    const body=await req.json().catch(()=>({}));
    const rawPrompt=String(body?.prompt||'').trim();
    const originalPrompt=String(body?.originalPrompt||rawPrompt).trim();
    if(!rawPrompt||!originalPrompt)return Response.json({error:'Descreva a imagem.'},{status:400});

    const width=clamp(Number(body?.width)||1024,256,2048);
    const height=clamp(Number(body?.height)||1024,256,2048);
    const seed=Math.max(1,Math.min(2147483646,Math.floor(Number(body?.seed)||1)));

    // A autoimagem persistente não sofre reimaginação/drift do provider.
    if(isPersistentSelfPortraitRequest(originalPrompt)){
      return Response.json({
        url:ENTITY_REFERENCE_IMAGE,
        provider:'entity-self-reference',
        model:'predict-persistent-identity',
        width,
        height,
        seed,
        identityLocked:true,
        exactReference:true,
        referencesUsed:[],
        originalPrompt,
        expandedPrompt:originalPrompt,
        caption:buildSafeCaptionPtBr(originalPrompt,parityCaptionPtBr(originalPrompt)),
        displayTitle:buildDisplayTitle(originalPrompt)
      });
    }

    const preparedPrompt=compactText(rawPrompt,1100);
    const sourcePrompt=compactText(originalPrompt,700);
    const requestedStyle=String(body?.style||'Cinematic').trim()||'Cinematic';
    const style=recommendedImageStyle(sourcePrompt,requestedStyle);
    const attempt=Math.max(0,Math.min(20,Math.floor(Number(body?.attempt)||0)));
    const requestedPromptMode=(['auto','literal','imagine'].includes(String(body?.promptMode||'auto').toLowerCase())
      ? String(body?.promptMode||'auto').toLowerCase()
      : 'auto') as ImagePromptMode;
    const effectivePromptMode=chooseImagePromptMode(requestedPromptMode,shouldForceLiteralMode(sourcePrompt));
    const userNegative=compactText(String(body?.negativePrompt||'').trim(),500);
    const negativePrompt=buildDefaultNegativePrompt(sourcePrompt,userNegative);
    const referenceMode=String(body?.referenceMode||'auto').toLowerCase();
    const referencePlan=referenceMode==='off'
      ? {query:'',references:[],warnings:[] as string[]}
      : await resolveVisualReferences(sourcePrompt);
    const identityLock=buildVisualIdentityLock(sourcePrompt);
    const evidencePrompt=buildReferenceEvidencePrompt(referencePlan.references);
    const groundedPrompt=effectivePromptMode==='literal'
      ? buildLiteralImagePrompt({
          originalPrompt:sourcePrompt,
          style,
          identityLock,
          referenceEvidence:evidencePrompt,
          negativePrompt
        })
      : expandImagePromptForParity({
          originalPrompt:sourcePrompt,
          preparedPrompt,
          style,
          width,
          height,
          attempt,
          identityLock,
          referenceEvidence:evidencePrompt
        })+'\n\nNEGATIVE CONSTRAINTS: '+negativePrompt+'.';

    const userInline=(Array.isArray(body?.referenceImages)?body.referenceImages:[])
      .slice(0,3)
      .map((x:any)=>inlineImageFromDataUrl(String(x||'')))
      .filter(Boolean) as {mimeType:string;data:string}[];

    const searchedInline=(await Promise.all(
      referencePlan.references.slice(0,Math.max(0,3-userInline.length)).map(ref=>fetchReferenceInlineData(ref))
    )).filter(Boolean) as {mimeType:string;data:string}[];
    const inlineReferences=[...userInline,...searchedInline].slice(0,3);

    const mediaBase=String(process.env.MEDIA_IMAGE_BASE_URL||'').trim();
    const mediaKey=String(process.env.MEDIA_IMAGE_API_KEY||'').trim();
    const mediaReferenceField=String(process.env.MEDIA_IMAGE_REFERENCE_FIELD||'').trim();
    const mediaNegativeField=String(process.env.MEDIA_IMAGE_NEGATIVE_FIELD||'').trim();
    const geminiKey=String(process.env.GEMINI_API_KEY||'').trim();
    const geminiBase=String(process.env.GEMINI_IMAGE_BASE_URL||'https://generativelanguage.googleapis.com/v1').trim().replace(/\/$/,'');
    const geminiModel=String(process.env.GEMINI_IMAGE_MODEL||'gemini-3.1-flash-image').trim();
    const nanoKey=String(process.env.NANO_BANANA_API_KEY||'').trim();
    const nanoBase=String(process.env.NANO_BANANA_BASE_URL||'https://nanobanana.aikit.club').trim();
    const requestedModel=String(body?.model||process.env.MEDIA_IMAGE_MODEL||'flux').trim();
    const nanoModel=String(process.env.NANO_BANANA_MODEL||'nano-banana').trim();
    const order=String(process.env.PREDICTLM_IMAGE_PROVIDER_ORDER||'gemini,nano,configured')
      .split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
    if(geminiKey&&!order.includes('gemini'))order.unshift('gemini');
    const providers=[
      ...(order.includes('gemini')&&geminiKey?[{id:'gemini-nano-banana-2',base:geminiBase,key:geminiKey,model:geminiModel,nano:false,gemini:true}]:[]),
      ...(order.includes('nano')&&nanoKey?[{id:'nano-banana',base:nanoBase,key:nanoKey,model:nanoModel,nano:true,gemini:false}]:[]),
      ...(order.includes('configured')&&mediaBase?[{id:'configured-image',base:mediaBase,key:mediaKey,model:requestedModel,nano:false,gemini:false}]:[])
    ];

    for(const provider of providers){
      try{
        const url=provider.gemini
          ? provider.base+'/models/'+encodeURIComponent(provider.model)+':generateContent'
          : provider.base.replace(/\/$/,'')+(provider.base.endsWith('/v1')?'/images/generations':'/v1/images/generations');

        const configuredReferenceValues=[
          ...userInline.map(x=>'data:'+x.mimeType+';base64,'+x.data),
          ...referencePlan.references.map(x=>x.imageUrl)
        ].slice(0,4);

        const providerBody=provider.gemini?{
          contents:[{
            parts:[
              ...inlineReferences.map(x=>({inlineData:{mimeType:x.mimeType,data:x.data}})),
              {text:groundedPrompt}
            ]
          }],
          generationConfig:{responseFormat:{image:{aspectRatio:geminiAspectRatio(width,height),imageSize:'2K'}}}
        }:{
          model:provider.model,
          prompt:groundedPrompt,
          size:providerImageSize(width,height,provider.nano),
          n:1,
          quality:'high',
          ...(provider.id==='configured-image'&&mediaReferenceField&&configuredReferenceValues.length
            ? {[mediaReferenceField]:configuredReferenceValues}
            : {}),
          ...(provider.id==='configured-image'&&mediaNegativeField&&negativePrompt
            ? {[mediaNegativeField]:negativePrompt}
            : {})
        };

        const upstream=await fetch(url,{
          method:'POST',
          headers:provider.gemini
            ? {'Content-Type':'application/json','x-goog-api-key':provider.key}
            : {'Content-Type':'application/json',...(provider.key?{'Authorization':'Bearer '+provider.key}:{})},
          body:JSON.stringify(providerBody),
          signal:AbortSignal.timeout(90000)
        });
        const data=await upstream.json().catch(()=>({}));
        if(!upstream.ok)continue;
        const first=data?.data?.[0]||{};
        const parts=Array.isArray(data?.candidates?.[0]?.content?.parts)?data.candidates[0].content.parts:[];
        const inline=parts.find((x:any)=>x?.inlineData?.data||x?.inline_data?.data);
        const remoteUrl=first.url||data?.url||null;
        const b64=inline?.inlineData?.data||inline?.inline_data?.data||first.b64_json||data?.b64_json||null;
        const mime=inline?.inlineData?.mimeType||inline?.inline_data?.mime_type||'image/png';
        const dataUrl=b64?'data:'+mime+';base64,'+b64:null;
        if(remoteUrl||dataUrl){
          return Response.json({
            url:remoteUrl||dataUrl,
            provider:provider.id,
            model:provider.model,
            width,height,seed,
            identityLocked:true,
            referenceQuery:referencePlan.query||null,
            referencesUsed:referencePlan.references.map(x=>({provider:x.provider,title:x.title,sourceUrl:x.sourceUrl,site:x.site})),
            referenceImagesPassed:provider.gemini?inlineReferences.length:(mediaReferenceField?configuredReferenceValues.length:0),
            referenceWarnings:referencePlan.warnings,
            originalPrompt:sourcePrompt,
            expandedPrompt:groundedPrompt,
            caption:buildSafeCaptionPtBr(sourcePrompt),
            displayTitle:buildDisplayTitle(sourcePrompt),
            parityContract:'grok-imagine-parity',
            promptMode:effectivePromptMode,
            negativePrompt,
            style,
            fidelityLimited:false
          });
        }
      }catch{
        // Continue to the next configured provider; public fallback remains available.
      }
    }

    // O fallback textual continua recebendo o identity lock. Referências visuais reais
    // exigem Gemini multimodal ou um provider configurado com MEDIA_IMAGE_REFERENCE_FIELD.
    return Response.json({
      url:localRenderUrl(groundedPrompt,width,height,seed,requestedModel),
      provider:'pollinations-proxy',
      model:requestedModel,
      width,
      height,
      seed,
      identityLocked:true,
      referenceQuery:referencePlan.query||null,
      referencesUsed:referencePlan.references.map(x=>({provider:x.provider,title:x.title,sourceUrl:x.sourceUrl,site:x.site})),
      referenceImagesPassed:0,
      referenceWarnings:referencePlan.warnings,
      originalPrompt:sourcePrompt,
      expandedPrompt:groundedPrompt,
      caption:buildSafeCaptionPtBr(sourcePrompt),
      displayTitle:buildDisplayTitle(sourcePrompt),
      parityContract:'grok-imagine-parity',
      promptMode:effectivePromptMode,
      negativePrompt,
      style,
      fidelityLimited:true,
      providerWarning:'Fallback público ativo: fidelidade de personagens e franquias pode ser limitada. Configure um provider de imagem forte para melhor identidade.'
    });
  }catch(error:any){
    return Response.json({error:mediaErrorText(error,'Falha ao gerar imagem.')},{status:500});
  }
}
